// Local API + real private storage + cutout. No paid generation is submitted.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
const sharp=createRequire(import.meta.url)(process.env.MIRRORA_SHARP)
const token=process.env.MIRRORA_TEST_TOKEN
if(!token)throw Error('An isolated local API session is required')
const origin='http://127.0.0.1:8080/v1'
const api=async(path,options={})=>{const r=await fetch(origin+path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});const data=await r.json();assert.ok(r.ok,`${path}: ${r.status} ${data.error}`);return data}
const raw=await readFile(process.env.MIRRORA_CUTOUT_FIXTURE)
const form=new FormData();form.set('kind','person');form.set('file',new Blob([raw],{type:'image/png'}),'synthetic-person.png')
const prepared=await api('/assets',{method:'POST',body:form}),base=prepared.person_base
assert.equal(base.confirmed,false);assert.equal(new Set([base.original_url,base.base_url,base.display_url,base.mask_url]).size,4)
await mkdir('outputs/person-base',{recursive:true})
const buffers={}
for(const name of ['original','base','display','mask']){
 const r=await fetch(base[name+'_url']);assert.equal(r.status,200);buffers[name]=Buffer.from(await r.arrayBuffer());await writeFile(`outputs/person-base/${name}.png`,buffers[name]);
 const unsigned=new URL(base[name+'_url']);unsigned.search='';assert.notEqual((await fetch(unsigned)).status,200)
}
assert.ok(raw.equals(buffers.original),'original bytes changed')
const display=await sharp(buffers.display).ensureAlpha().raw().toBuffer({resolveWithObject:true})
const mask=await sharp(buffers.mask).greyscale().raw().toBuffer()
assert.equal(mask.length,display.info.width*display.info.height)
for(let i=0;i<mask.length;i++)assert.equal(mask[i],display.data[i*4+3])
const model=await sharp(buffers.base).ensureAlpha().raw().toBuffer()
for(let i=3;i<model.length;i+=4)assert.equal(model[i],255)
const confirmed=await api(`/person-bases/${base.id}/confirm`,{method:'POST'});assert.equal(confirmed.confirmed,true)
const reopened=await api(`/person-bases/${base.id}`);assert.equal(reopened.confirmed,true)
const corrected=await api(`/person-bases/${base.id}/prepare`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rotation:2,perspective:0,auto_correct:false})})
assert.notEqual(corrected.person_base.id,base.id);assert.equal(corrected.person_base.confirmed,false)
assert.equal((await api(`/person-bases/${base.id}`)).confirmed,true)
const metrics={passed:true,fourPrivateAssets:true,originalUnchanged:true,exactAlphaMask:true,modelOpaque:true,explicitConfirmation:true,correctionCreatesNewCandidate:true,width:display.info.width,height:display.info.height}
await writeFile('outputs/person-base/checks.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics))
