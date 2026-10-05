import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const pluginRequire = createRequire(require.resolve('@dcloudio/vite-plugin-uni'))
const sharedRequire = createRequire(pluginRequire.resolve('@dcloudio/uni-cli-shared'))
const braces = createRequire(sharedRequire.resolve('chokidar'))('braces')
test('patched braces preserves matching and rejects deeply nested strings and ASTs', () => {
  assert.deepEqual(braces.expand('static/{a,b}.png'), ['static/a.png', 'static/b.png'])
  for (const method of [braces, braces.compile, braces.expand, braces.parse]) {
    assert.throws(() => method('{'.repeat(4000) + 'x' + '}'.repeat(4000)), /safe nesting limit/)
    assert.throws(() => method('('.repeat(4000) + 'x' + ')'.repeat(4000)), /safe nesting limit/)
  }
  let node={ type:'text', value:'x' }
  for(let i=0;i<1000;i++)node={type:'root',nodes:[node]}
  for(const method of [braces.compile,braces.expand,braces.stringify])assert.throws(()=>method(node),/safe nesting limit/)
})
function apiHarness() {
  const cache=new Map(), calls=[], storage=new Map([['mirror_token','token-a']]);let expired=0
  const uni={ getStorageSync:key=>storage.get(key), getFileInfo:options=>options.success({size:1024}), request:options=>calls.push(options),uploadFile:options=>calls.push(options) }
  function load(file){
    if(cache.has(file))return cache.get(file)
    const source=readFileSync(file,'utf8').replace('import.meta.env.VITE_API_BASE_URL',"'/api'")
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    const module={exports:{}}
    new Function('require','module','exports','uni',code)(name=>name==='./auth'?{expireSession(){expired++;storage.delete('mirror_token')}}:load(resolve('src',name+'.ts')),module,module.exports,uni)
    cache.set(file,module.exports);return module.exports
  }
  return { api:load(resolve('src/api.ts')),calls,storage,uni,get expired(){return expired} }
}
test('input files over 5 MB never upload; exact boundary and each try-on file are allowed',async()=>{
  const h=apiHarness()
  h.uni.getFileInfo=options=>options.success({size:h.api.MAX_RESOURCE_BYTES+1})
  await assert.rejects(h.api.uploadPhoto('large.jpg'),error=>error.code==='coze_resource_too_large')
  assert.equal(h.calls.length,0)
  h.uni.getFileInfo=options=>options.success({size:h.api.MAX_RESOURCE_BYTES})
  const photo=h.api.uploadPhoto('person.jpg'),garment=h.api.uploadPhoto('garment.jpg')
  assert.equal(h.calls.length,2)
  for(const call of h.calls)call.success({statusCode:201,data:'{"url":"https://assets.test/image"}'})
  await Promise.all([photo,garment])
})
test('unknown file size and login changes during file inspection prevent uploads',async()=>{
  const h=apiHarness()
  h.uni.getFileInfo=options=>options.fail({})
  await assert.rejects(h.api.uploadPhoto('missing.jpg'),error=>error.code==='invalid_photo')
  let pending
  h.uni.getFileInfo=options=>{pending=options}
  const upload=h.api.uploadPhoto('person.jpg')
  h.storage.set('mirror_token','token-b');pending.success({size:1024})
  await assert.rejects(upload,error=>error.code==='session_changed')
  assert.equal(h.calls.length,0)
})
test('401 clears the current session; a late response cannot clear or populate another session',async()=>{
  const h=apiHarness(), current=h.api.getProfile()
  h.calls[0].success({statusCode:401,data:{error:'login_required'}})
  await assert.rejects(current,error=>error.status===401);assert.equal(h.expired,1)
  h.storage.set('mirror_token','token-b');const late=h.api.getProfile();h.storage.set('mirror_token','token-c')
  h.calls[1].success({statusCode:401,data:{error:'login_required'}})
  await assert.rejects(late,error=>error.code==='session_changed');assert.equal(h.storage.get('mirror_token'),'token-c');assert.equal(h.expired,1)
  const lateSuccess=h.api.getProfile();h.storage.set('mirror_token','token-d');h.calls[2].success({statusCode:200,data:{nickname:'old account'}})
  await assert.rejects(lateSuccess,error=>error.code==='session_changed')
})
test('malformed successful upload response rejects instead of hanging',async()=>{
  const h=apiHarness(), upload=h.api.uploadPhoto('photo.png');h.calls[0].success({statusCode:201,data:'not-json'})
  await assert.rejects(upload,error=>error.code==='invalid_upload_response')
})
test('H5 saving uses a browser blob download and correct image extension',async()=>{
  const clicks=[],revoked=[],link={href:'',download:'',click(){clicks.push(this.download)},remove(){}}
  const source=readFileSync('src/download.ts','utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module={exports:{}};const document={createElement:()=>link,body:{appendChild(){}}};const URL={createObjectURL:()=> 'blob:fixture',revokeObjectURL:value=>revoked.push(value)}
  new Function('module','exports','fetch','document','URL','setTimeout',code)(module,module.exports,async()=>({ok:true,blob:async()=>({type:'image/jpeg'})}),document,URL,cb=>cb())
  await module.exports.downloadInBrowser('https://assets.test/signed','result.png');assert.deepEqual(clicks,['result.jpg']);assert.deepEqual(revoked,['blob:fixture'])
})
