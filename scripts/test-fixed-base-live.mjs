// Opt-in: synthetic fixture only, real Coze credits and private BOS storage.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
if(process.env.MIRRORA_LIVE_GENERATION!=='1')throw Error('Explicit live generation opt-in required')
const token=process.env.MIRRORA_TEST_TOKEN
if(!token)throw Error('Isolated local session required')
const out='outputs/fixed-base-live';await mkdir(out,{recursive:true})
async function api(path,options={}){
 const r=await fetch('http://127.0.0.1:8080/v1'+path,{...options,headers:{Authorization:`Bearer ${token}`,...(!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}})
 const d=await r.json();if(!r.ok)throw Error(`${r.status}: ${d.error}`);return d
}
async function save(name,url){const r=await fetch(url);assert.equal(r.status,200);await writeFile(`${out}/${name}.png`,Buffer.from(await r.arrayBuffer()))}
let base
if(process.env.MIRRORA_LIVE_BASE){base=await api('/person-bases/'+process.env.MIRRORA_LIVE_BASE)}else{
 const form=new FormData();form.set('kind','person');form.set('file',new Blob([await readFile(process.env.MIRRORA_LIVE_PERSON)],{type:'image/png'}),'synthetic-person.png')
 const upload=await api('/assets',{method:'POST',body:form});base=await api(`/person-bases/${upload.person_base.id}/confirm`,{method:'POST'})
}
await save('base',base.display_url)
const results=[]
async function run(module,look,preferences,parent){
 const payload={module,photo_url:base.base_url,studio:{base_id:base.id,look},presentation:'不限定',adult_confirmed:true,preferences,request_id:`fixed-live-${Date.now()}`,parent_consultation_id:parent||undefined}
 if(module==='tryon')payload.garment_url=look.slots.tryon.items[0].asset_url
 let job=await api('/consultations',{method:'POST',body:JSON.stringify(payload)});console.log(`${module} accepted ${job.id}`)
 const deadline=Date.now()+11*60*1000
 while(['queued','running'].includes(job.status)&&Date.now()<deadline){await new Promise(r=>setTimeout(r,3000));job=await api('/consultations/'+job.id)}
 results.push({id:job.id,module,status:job.status,error:job.error_code,base_id:base.id,candidate_base_id:job.candidate_base_id});await writeFile(`${out}/results.json`,JSON.stringify(results,null,2))
 console.log(`${module} ${job.status} ${job.error_code||''}`)
 if(job.status==='succeeded')await save(module+'-'+results.length,job.result_image_url)
 return job
}
const pose=process.env.MIRRORA_LIVE_BASE?{status:'skipped'}:await run('pose',{version:1,slots:{}},'自然站立，保持脸、衣着和原身体比例')
if(pose.status==='succeeded'){
 const candidate=await api('/person-bases/'+pose.candidate_base_id);assert.equal(candidate.confirmed,false);assert.equal(candidate.preparation,'pose');assert.equal(new URL(candidate.original_url).pathname,new URL(base.original_url).pathname)
 base=await api('/person-bases/'+candidate.id+'/confirm',{method:'POST'});await save('confirmed-pose',base.display_url)
}
let look={version:1,slots:{tryon:{items:[],tone:'',refinements:['仅把外套改为藏蓝色，其他衣物不变']}}}
const first=await run('outfit',look,'外套改为藏蓝色')
assert.equal(first.status,'succeeded',first.error_code)
look={version:1,slots:{tryon:{items:[],tone:'',refinements:['仅把外套改为墨绿色，其他衣物不变']}}}
const second=await run('outfit',look,'外套改为墨绿色',first.id)
assert.equal(second.status,'succeeded',second.error_code)
assert.equal(new URL(first.photo_url).pathname,new URL(second.photo_url).pathname)
const garmentForm=new FormData();garmentForm.set('kind','upload');garmentForm.set('file',new Blob([await readFile('src/static/studio/person-weekend.webp')],{type:'image/webp'}),'synthetic-garment.webp')
const garment=await api('/assets',{method:'POST',body:garmentForm})
look={version:1,slots:{tryon:{items:[{id:'fixture-knit',name:'燕麦色针织上衣',prompt:'只取上衣，保留原裤子和鞋',asset_url:garment.url}],tone:'',refinements:[]}}}
const tryon=await run('tryon',look,'只替换针织上衣，固定原脸、站姿、肩胯宽度和四肢比例',second.id)
assert.equal(tryon.status,'succeeded',tryon.error_code)
const unsigned=new URL(tryon.result_image_url);unsigned.search='';assert.notEqual((await fetch(unsigned)).status,200,'BOS result must be private')
console.log('Fixed-base live chain completed; no credentials or signed URLs logged.')
