// Explicitly opt-in: uses real BOS and Coze through a local API, consuming quota.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
if (process.env.MIRRORA_LIVE_GENERATION !== '1') throw new Error('Set MIRRORA_LIVE_GENERATION=1 to run paid generation checks')
const token=process.env.MIRRORA_TEST_TOKEN
if (!token) throw new Error('MIRRORA_TEST_TOKEN must be a session from the isolated local API')
const base='http://127.0.0.1:8080/v1'
const jsonHeaders={Authorization:`Bearer ${token}`,'Content-Type':'application/json'}
async function api(path,options={}) {
 const response=await fetch(base+path,{...options,headers:options.headers||jsonHeaders})
 const data=await response.json()
 if(!response.ok) throw new Error(`${path}: ${response.status} ${data.error}`)
 return data
}
let personBase;
async function upload(path,kind='upload') {
 const png=path.endsWith('.png');const form=new FormData();form.set('kind',kind);form.set('file',new Blob([await readFile(path)],{type:png?'image/png':'image/webp'}),png?'generated-fixture.png':'generated-fixture.webp')
 const asset=await api('/assets',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});if(kind==='person'){personBase=await api('/person-bases/'+asset.person_base.id+'/confirm',{method:'POST'});return personBase.base_url}return asset.url
}
const output=process.env.MIRRORA_LIVE_OUTPUT||'outputs/live'
await mkdir(output,{recursive:true})
const original=await upload(process.env.MIRRORA_LIVE_PERSON||'src/static/studio/person.webp','person')
await writeFile(`${output}/original.png`,Buffer.from(await(await fetch(original)).arrayBuffer()))
const garment=await upload('src/static/studio/person-weekend.webp')
const steps=[
 ['outfit','只把外套改成藏蓝色，保留人物五官、姿势和其他衣物。'],
 ['accessories','添加一对小号银色圆环耳饰，保留藏蓝外套和全部其他细节。'],
 ['tryon','仅取服装参考图中的燕麦色针织上衣替换当前外套和内搭，保留黑色长裤、耳环、发型、人物身份、姿势和背景。不要拼图或前后对比。'],
]
let parent='';const results=[],look={version:1,slots:{}}
for (const [module,preferences] of steps) {
 const slot=module==='outfit'?'tryon':module;look.slots[slot]={items:module==='tryon'?[{id:'fixture-garment',name:'针织上衣',prompt:'',asset_url:garment}]:[],tone:'',refinements:[preferences]};
 const payload={module,studio:{base_id:personBase.id,look},photo_url:original,parent_consultation_id:parent||undefined,garment_url:module==='tryon'?garment:undefined,presentation:'不限定',preferences,include_beauty:false,adult_confirmed:true,request_id:`live-${Date.now()}-${module}`}
 let record=await api('/consultations',{method:'POST',body:JSON.stringify(payload)})
 const replay=await api('/consultations',{method:'POST',body:JSON.stringify(payload)});assert.equal(replay.id,record.id)
 console.log(`${module}: accepted ${record.id}`)
 const deadline=Date.now()+10*60*1000
 while(['queued','running'].includes(record.status)&&Date.now()<deadline) {await new Promise(r=>setTimeout(r,3000));record=await api('/consultations/'+record.id)}
 assert.equal(record.status,'succeeded',`${module}: ${record.error_code||record.status}`)
 assert.equal(record.parent_consultation_id||'',parent)
 assert.equal(new URL(record.photo_url).pathname,new URL(original).pathname)
 const image=await fetch(record.result_image_url);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image\//)
 const bytes=Buffer.from(await image.arrayBuffer());assert.ok(bytes.length>100)
 await writeFile(`${output}/${module}.png`,bytes)
 const anonymous=new URL(record.result_image_url);anonymous.search='';const denied=await fetch(anonymous);assert.notEqual(denied.status,200,'BOS result must remain private')
 results.push({id:record.id,module,parent:parent||null,analysis:record.analysis,bytes:bytes.length,private:true})
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2))
 parent=record.id;console.log(`${module}: succeeded, private BOS output ${bytes.length} bytes`)
}
console.log('Live generation chain verified; credentials and signed URLs omitted.')
