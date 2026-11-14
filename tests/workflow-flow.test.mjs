import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import test from 'node:test'
import * as vue from 'vue'
import ts from 'typescript'

function baseFor(path='person.jpg'){return {id:path,original_url:'https://assets.test/raw/'+path,base_url:'https://assets.test/base/'+path,display_url:'https://assets.test/'+path,mask_url:'https://assets.test/mask/'+path,confirmed:false,rotation:0,perspective:0,auto_correct:true,preparation:'cutout',created_at:new Date().toISOString()}}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
function harness(storage=new Map()){
  const calls={uploads:[],creates:[],gets:[]},timers=new Map(),cache=new Map();let timerID=0,chosenPhoto='person.jpg',loggedIn=true
  const auth={currentUser:vue.ref({nickname:'test'}),isLoggedIn:()=>loggedIn,openLogin(){auth.loginOpened=true},loginOpened:false}
  const api={
    errorMessage:(_e,fallback)=>fallback, ApiError:class extends Error{},
    async getPersonBase(id){return {...baseFor(id),confirmed:true}},
    async confirmPersonBase(id){return {...baseFor(id),confirmed:true}},
    async preparePersonBase(){return {url:'https://assets.test/corrected.png',person_base:baseFor('corrected.png')}},
    async uploadPhoto(path,kind){calls.uploads.push(path);return {url:`https://assets.test/${path}`,...(kind==='person'?{person_base:baseFor(path)}:{})}},
    async createConsultation(data){calls.creates.push(data);return {...data,id:'record-'+calls.creates.length,status:'queued'}},
    async getConsultation(id){calls.gets.push(id);const submitted=calls.creates.find((_,i)=>id==='record-'+(i+1));return {...submitted,id,module:submitted?.module||'hair',status:'succeeded',photo_url:submitted?.photo_url||'https://assets.test/person.jpg',result_image_url:'https://assets.test/result.jpg',analysis:'适合自然层次。',created_at:new Date().toISOString()}},
    async listConsultations(){return {items:[],total:0}},
  }
  const uni={getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,JSON.parse(JSON.stringify(value))),chooseImage:opts=>opts.success({tempFilePaths:[chosenPhoto]})}
  function load(file){
    if(cache.has(file))return cache.get(file)
    let source=readFileSync(file,'utf8').replaceAll('import.meta.env.PROD','false').replaceAll('import.meta.env.VITE_ASSET_BASE_URL',"''")
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    const module={exports:{}}
    const req=name=>name==='vue'?{...vue,onUnmounted(){}}:name.endsWith('/api')?api:name.endsWith('/auth')?auth:load(resolve(dirname(file),name+'.ts'))
    new Function('require','module','exports','uni','setTimeout','clearTimeout',code)(req,module,module.exports,uni,(fn,delay)=>{const id=++timerID;timers.set(id,{fn,delay});return id},id=>timers.delete(id))
    cache.set(file,module.exports);return module.exports
  }
  const state=load(resolve('src/state.ts')),submission=load(resolve('src/consultation.ts'))
  const s=load(resolve('src/studio/useStudio.ts')).useStudio()
  return {s,api,auth,calls,storage,timers,...state,...submission,load,selectPhoto:path=>chosenPhoto=path,setLogin:value=>loggedIn=value,async tick(delay){const entry=[...timers].find(([,t])=>t.delay===delay);if(entry){timers.delete(entry[0]);await entry[1].fn();await new Promise(r=>setImmediate(r))}}}
}
async function personal(h,mode='hair'){h.s.consent.value=true;h.s.choosePerson();await new Promise(r=>setImmediate(r));h.s.baseChecked.value=true;await h.s.acceptBase();h.s.selections.tryon=['ivory'];h.s.selections.hair=['hair-0'];h.s.selections.makeup=['makeup-0'];h.s.setMode(mode)}

test('pose candidate never replaces current person until explicitly confirmed',async()=>{
 const h=harness();await personal(h);const previous=h.s.image.value
 h.api.getConsultation=async()=>({id:'pose-job',module:'pose',status:'succeeded',candidate_base_id:'pose-candidate'})
 h.api.getPersonBase=async id=>({...baseFor(id),preparation:'pose',confirmed:false})
 await h.s.preparePose();assert.equal(h.calls.creates[0].module,'pose');assert.deepEqual(h.calls.creates[0].studio.look.slots,{})
 await h.tick(3000);assert.equal(h.s.image.value,previous);assert.equal(h.s.panel.value,'baseConfirm');assert.equal(h.s.baseChecked.value,false)
 await h.s.acceptBase();assert.equal(h.s.image.value,previous)
 h.s.closePanel();assert.equal(h.s.image.value,previous)
})

test('personal photo requires affirmative consent and changing photos resets the editing history',async()=>{
  const h=harness();h.s.choosePerson();assert.equal(h.s.source.value,'empty');await personal(h);assert.equal(h.s.original.value,'https://assets.test/person.jpg');h.selectPhoto('new.jpg');h.s.choosePerson();await new Promise(r=>setImmediate(r));assert.equal(h.s.original.value,'https://assets.test/person.jpg');h.s.baseChecked.value=true;await h.s.acceptBase();assert.equal(h.s.versions.value.length,1);assert.equal(h.s.original.value,'https://assets.test/new.jpg')
})
test('mode switching preserves the same person and does not submit any task',async()=>{
  const h=harness();await personal(h);for(const mode of ['makeup','accessories','tryon','skin','outfit'])h.s.setMode(mode);assert.equal(h.s.original.value,'https://assets.test/person.jpg');assert.equal(h.calls.creates.length,0)
})
test('demo is offline; failures retain previous image and retries recover',async()=>{
  const h=harness();h.s.useDemo();const original=h.s.image.value;h.s.demoFail.value=true;await h.s.generate();await h.tick(1500);assert.ok(h.s.failure.value);assert.equal(h.s.image.value,original);await h.s.generate();await h.tick(1500);assert.equal(h.s.failure.value,'');assert.equal(h.s.versions.value.length,2);assert.equal(h.calls.creates.length,0)
})
test('demo saved looks survive reload without persisting private URLs',()=>{
  const h=harness();h.s.useDemo();h.s.savedName.value='周末';h.s.saveLook();const reload=harness(h.storage);assert.equal(reload.s.saved.value[0].name,'周末');assert.doesNotMatch(JSON.stringify([...h.storage]),/https:|blob:/);reload.s.deleteLook(reload.s.saved.value[0].id);assert.equal(reload.s.saved.value.length,0)
})
test('private session looks are not persisted with demo data',async()=>{
  const h=harness();await personal(h);h.s.saveLook();assert.equal(h.s.saved.value.length,1);assert.deepEqual(h.storage.get('mirrora_studio_demo_v1'),[])
})
test('built-in outfit presets generate without requiring a garment upload',async()=>{
  const h=harness();await personal(h,'tryon');await h.s.generate();assert.equal(h.calls.creates[0].module,'outfit');assert.match(h.calls.creates[0].preferences,/米白西装/);assert.equal(h.calls.creates[0].garment_url,undefined);assert.equal(h.calls.uploads.length,1)
})
test('logged-out personal generation opens login without uploading',async()=>{
  const h=harness();await personal(h);h.setLogin(false);await h.s.generate();assert.equal(h.auth.loginOpened,true);assert.equal(h.calls.uploads.length,1)
})
test('real generation uses original photo, applies the selected mode, and updates in place',async()=>{
  const h=harness();await personal(h);h.s.note.value='保留长度';h.s.selections['hair-tone']=['深棕'];await h.s.generate();assert.equal(h.calls.creates[0].module,'hair');assert.match(h.calls.creates[0].preferences,/保留长度/);assert.match(h.calls.creates[0].preferences,/发色：深棕/);assert.equal(h.calls.creates[0].adult_confirmed,true);await h.tick(3000);assert.equal(h.s.busy.value,false);assert.equal(h.s.current.value.recordId,'record-1');assert.equal(h.s.source.value,'personal');assert.equal(h.s.original.value,'https://assets.test/person.jpg')
})
test('uploaded garment is included in real try-on and mode cannot change during generation',async()=>{
  const h=harness();await personal(h,'tryon');h.selectPhoto('garment.jpg');h.s.chooseGarment();await h.s.generate();h.s.setMode('hair');assert.equal(h.s.mode.value,'tryon');assert.equal(h.calls.creates[0].garment_url,'https://assets.test/garment.jpg');assert.equal(h.calls.creates[0].photo_url,'https://assets.test/base/person.jpg')
})
test('lost creation response retries same request ID; editing instructions creates a new ID',async()=>{
  const h=harness();await personal(h);h.api.createConsultation=async data=>{h.calls.creates.push(data);throw new Error('lost response')};await h.s.generate();await h.s.generate();assert.equal(h.calls.creates[0].request_id,h.calls.creates[1].request_id);h.s.note.value='改变';await h.s.generate();assert.notEqual(h.calls.creates[1].request_id,h.calls.creates[2].request_id)
})
test('late uploads after sign-out cannot create tasks or restore private photos',async()=>{
  const h=harness(),pending=deferred();h.s.consent.value=true;h.api.uploadPhoto=()=>pending.promise;h.s.choosePerson();h.auth.currentUser.value=null;pending.resolve({url:'https://assets.test/old'});await new Promise(r=>setImmediate(r));assert.equal(h.calls.creates.length,0);assert.equal(h.s.source.value,'empty');assert.equal(h.s.original.value,'');assert.equal(h.s.busy.value,false)
})
test('late create response after logout cannot fill the new workspace',async()=>{
  const h=harness(),pending=deferred();await personal(h);h.api.createConsultation=()=>pending.promise;const request=h.s.generate();await new Promise(r=>setImmediate(r));h.auth.currentUser.value=null;h.s.useDemo();pending.resolve({id:'old',status:'queued'});await request;assert.equal(h.s.source.value,'demo');assert.equal(h.s.current.value.id,'demo-original')
})
test('polling stops for 401, 404 and five consecutive network errors',async()=>{
  for(const status of [401,404,0]){const h=harness();await personal(h);await h.s.generate();let count=0;h.api.getConsultation=async()=>{count++;throw {status}};for(let i=0;i<6;i++)await h.tick(3000);assert.equal(count,status?1:5);assert.equal(h.s.busy.value,false);assert.ok(h.s.failure.value)}
})
test('backgrounding suspends polling and repeated resume does not overlap requests',async()=>{
  const h=harness(),pending=deferred();await personal(h);await h.s.generate();h.s.suspend();await h.tick(3000);assert.equal(h.calls.gets.length,0);h.api.getConsultation=id=>{h.calls.gets.push(id);return pending.promise};h.s.resume();h.s.resume();assert.equal(h.calls.gets.length,1);pending.resolve({id:'record-1',status:'failed'});await new Promise(r=>setImmediate(r));assert.equal(h.s.busy.value,false)
})
test('missing images and missing-photo analyses never become successful displayed results',async()=>{
  for(const analysis of ['正常建议','当前未接收到您上传的待分析实拍照片，无法观察脸部轮廓比例。','当前未获取到您上传照片中的人物可见特征信息，无法针对性制定适配的发型方案。']){
    const h=harness();await personal(h);const before=h.s.image.value;await h.s.generate();h.api.getConsultation=async()=>({id:'r',module:'hair',status:'succeeded',analysis,...(analysis==='正常建议'?{}:{result_image_url:'https://assets.test/result'})});await h.tick(3000);assert.equal(h.s.image.value,before);assert.ok(h.s.failure.value)
  }
})
test('history uses requested record and requires consent before regeneration',async()=>{
  const h=harness();await h.s.openRecord('historical');assert.equal(h.calls.gets[0],'historical');assert.equal(h.s.current.value.recordId,'historical');assert.equal(h.s.consent.value,false);await h.s.generate();assert.equal(h.s.panel.value,'create');assert.equal(h.calls.creates.length,0)
})
test('stale history request after logout cannot disclose records',async()=>{
  const h=harness(),pending=deferred();h.api.listConsultations=()=>pending.promise;const request=h.s.loadRecords();h.auth.currentUser.value=null;pending.resolve({items:[{id:'private'}],total:1});await request;assert.deepEqual(h.s.records.value,[])
})
test('submission keeps module snapshots isolated across interrupted flows',async()=>{
  const h=harness(),pending=deferred();h.startConsultation('outfit',{localPhoto:'old.jpg'});h.api.uploadPhoto=()=>pending.promise;const request=h.submitDraft(true,()=>true);h.startConsultation('hair');pending.resolve({url:'https://assets.test/old'});assert.equal(await request,undefined);assert.equal(h.calls.creates.length,0)
})
test('markdown escapes untrusted content while retaining emphasis',()=>{
  const h=harness(),{renderMarkdown}=h.load(resolve('src/markdown.ts'));const html=renderMarkdown('### 建议\n**保留自然光泽**\n<script>alert(1)</script>');assert.match(html,/<strong>保留自然光泽<\/strong>/);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/)
})


test('accessories and cross-mode refinements use the selected successful parent without reuploading',async()=>{
 const h=harness();await personal(h,'accessories');h.s.note.value='添加细银项链';await h.s.generate();assert.equal(h.calls.creates[0].module,'accessories');await h.tick(3000);
 h.s.setMode('makeup');h.s.note.value='唇色更淡';await h.s.generate();assert.equal(h.calls.creates[1].parent_consultation_id,'record-1');assert.equal(h.calls.uploads.length,1);await h.tick(3000);
 const first=h.s.versions.value.find(x=>x.recordId==='record-1');await h.s.restore(first);h.s.consent.value=true;h.s.note.value='链条细一点';await h.s.generate();assert.equal(h.calls.creates[2].parent_consultation_id,'record-1');await h.tick(3000);
 await h.s.reset();h.s.setMode('hair');h.s.consent.value=true;h.s.note.value='自然短发';await h.s.generate();assert.equal(h.calls.creates[3].parent_consultation_id,undefined);
})

test('same-mode text refinement avoids repeating style presets and deselection explicitly removes accessories',async()=>{
 const h=harness();await personal(h,'hair');await h.s.generate();await h.tick(3000);
 h.s.note.value='只让刘海轻薄一点';await h.s.generate();assert.equal(h.calls.creates[1].preferences,'只让刘海轻薄一点');await h.tick(3000);
 h.s.setMode('accessories');h.s.selections.accessories=['earring'];h.s.note.value='';await h.s.generate();await h.tick(3000);
 h.s.selections.accessories=[];await h.s.generate();assert.match(h.calls.creates[3].preferences,/移除这些配饰.*极简金圈/);
})

 test('failed person extraction retains the previous workspace and never displays the raw upload',async()=>{
 const h=harness();await personal(h);const before=h.s.image.value;
 h.api.uploadPhoto=async()=>{throw new Error('cutout failed')};h.selectPhoto('new.jpg');h.s.choosePerson();await new Promise(r=>setImmediate(r));
 assert.equal(h.s.image.value,before);assert.equal(h.s.busy.value,false);assert.equal(h.s.versions.value.length,1);
 });

test('photo correction requires a fresh preview and preserves current version until accepted',async()=>{
 const h=harness();await personal(h);const before=h.s.image.value;
 h.s.openPhotoAdjust();h.s.rotation.value=4;assert.equal(h.s.correctionReady.value,false);h.s.acceptCorrection();assert.equal(h.s.image.value,before);
 h.api.uploadPhoto=async()=>({url:'https://assets.test/corrected.png'});await h.s.previewCorrection();assert.equal(h.s.image.value,before);assert.equal(h.s.correctionReady.value,true);
 h.s.acceptCorrection();assert.equal(h.s.image.value,before);assert.equal(h.s.panel.value,'baseConfirm');h.s.baseChecked.value=true;await h.s.acceptBase();assert.equal(h.s.image.value,'https://assets.test/corrected.png');assert.equal(h.s.versions.value.length,1);
});

test('outfit preset history reopens in the wardrobe with try-on controls',async()=>{
 const h=harness();h.api.getConsultation=async()=>({id:'preset',module:'outfit',status:'succeeded',photo_url:'https://assets.test/person.jpg',result_image_url:'https://assets.test/result.jpg',analysis:'穿搭建议',preferences:'米白西装',created_at:new Date().toISOString()});
 await h.s.openRecord('preset');assert.equal(h.s.mode.value,'tryon');assert.equal(h.s.current.value.mode,'tryon');
});

test('base confirmation is explicit and cancelling a replacement preserves the workspace',async()=>{
 const h=harness();h.s.consent.value=true;h.s.choosePerson();await new Promise(r=>setImmediate(r));
 assert.equal(h.s.panel.value,'baseConfirm');assert.equal(h.s.source.value,'empty');await h.s.acceptBase();assert.equal(h.s.source.value,'empty');
 h.s.baseChecked.value=true;await h.s.acceptBase();const before=h.s.current.value;
 h.selectPhoto('replacement.jpg');h.s.choosePerson();await new Promise(r=>setImmediate(r));h.s.closePanel();
 assert.equal(h.s.current.value.id,before.id);assert.equal(h.s.personBase.value.id,'person.jpg');assert.equal(h.s.candidateBase.value,undefined);
});

test('full look survives cross-mode generation, branch restore and history reload',async()=>{
 const h=harness();await personal(h,'tryon');h.selectPhoto('garment.jpg');h.s.chooseGarment();h.s.note.value='袖口收窄';await h.s.generate();await h.tick(3000);
 const first=h.s.current.value;assert.equal(first.studio.look.slots.tryon.items[0].asset_url,'https://assets.test/garment.jpg');
 h.s.setMode('hair');h.s.selections.hair=['hair-0'];h.s.note.value='保留长度';await h.s.generate();await h.tick(3000);
 assert.equal(h.s.appliedLook.value.slots.tryon.refinements[0],'袖口收窄');assert.equal(h.s.appliedLook.value.slots.hair.refinements[0],'保留长度');
 await h.s.restore(first);assert.equal(h.s.appliedLook.value.slots.hair,undefined);assert.equal(h.s.uploads.value[0].image,'https://assets.test/garment.jpg');assert.equal(h.s.note.value,'');
 await h.s.openRecord('record-2');assert.equal(h.s.appliedLook.value.slots.hair.refinements[0],'保留长度');assert.equal(h.s.original.value,'https://assets.test/person.jpg');assert.equal(h.s.photoSource.value,'');
 h.s.openPhotoAdjust();assert.equal(h.s.panel.value,'photoAdjust');await h.s.previewCorrection();assert.equal(h.s.candidateBase.value.id,'corrected.png');
});
