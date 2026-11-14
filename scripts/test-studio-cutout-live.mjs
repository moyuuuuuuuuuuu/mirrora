import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const sharp=createRequire(import.meta.url)(process.env.MIRRORA_SHARP);
const token=process.env.MIRRORA_TEST_TOKEN;if(!token)throw Error('local test token required');
const base='http://127.0.0.1:8080/v1';const headers={Authorization:`Bearer ${token}`};
const api=async(path,options={})=>{const r=await fetch(base+path,{...options,headers:{...headers,...options.headers}});const d=await r.json();if(!r.ok)throw Error(`${r.status}: ${d.error}`);return d};
await mkdir('outputs/cutout',{recursive:true});
const form=new FormData();form.set('kind','person');form.set('file',new Blob([await readFile(process.env.MIRRORA_CUTOUT_FIXTURE || 'outputs/live/outfit.png')],{type:'image/png'}),'generated-fixture.png');
const start=Date.now();const prepared=await api('/assets',{method:'POST',body:form});
const data=Buffer.from(await (await fetch(prepared.url)).arrayBuffer());await writeFile('outputs/cutout/person.png',data);
async function checkAlpha(data){const meta=await sharp(data).metadata();assert.equal(meta.hasAlpha,true);const {data:pixels,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true});let clear=0,solid=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)clear++;if(pixels[i]>200)solid++};assert.ok(clear>info.width*info.height*0.1);assert.ok(solid>info.width*info.height*0.1);return {width:info.width,height:info.height,transparent:clear,solid}}
const metrics=await checkAlpha(data);console.log(JSON.stringify({upload:'passed',milliseconds:Date.now()-start,bytes:data.length,...metrics}));
const publicURL=new URL(prepared.url);publicURL.search='';assert.notEqual((await fetch(publicURL)).status,200);
if(process.env.MIRRORA_LIVE_GENERATION==='1'){
const confirmed=await api('/person-bases/'+prepared.person_base.id+'/confirm',{method:'POST'});
let item=await api('/consultations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({module:'outfit',studio:{base_id:confirmed.id,look:{version:1,slots:{tryon:{items:[],tone:'',refinements:['米白西装与深灰阔腿裤']}}}},photo_url:confirmed.base_url,presentation:'不限定',preferences:'米白西装与深灰阔腿裤，保持本人五官、自然肤质和身体比例，只调整服装。',adult_confirmed:true,request_id:`cutout-${Date.now()}`})});
console.log('Outfit preset accepted: '+item.id);const deadline=Date.now()+600000;
while(['queued','running'].includes(item.status)&&Date.now()<deadline){await new Promise(r=>setTimeout(r,3000));item=await api('/consultations/'+item.id)}
assert.equal(item.status,'succeeded',item.error_code);const result=Buffer.from(await(await fetch(item.result_image_url)).arrayBuffer());await writeFile('outputs/cutout/result.png',result);console.log(JSON.stringify({generation:'passed',bytes:result.length,...await checkAlpha(result)}));
await writeFile('outputs/cutout/results.json',JSON.stringify({id:item.id,upload:metrics,generation:await checkAlpha(result)},null,2));
}
