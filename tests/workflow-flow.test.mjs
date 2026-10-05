import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
class ApiError extends Error { constructor(status, code) { super(code); this.status=status; this.code=code } }
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

// Execute the actual page scripts with uni-app lifecycle/navigation and network calls stubbed.
function harness() {
  const calls = { uploads: [], creates: [], navigation: [], gets: [] }
  const cache = new Map(), timers = new Map()
  let hooks, selectedPhoto = '', query = {}, timerId = 0
  const api = {
    ApiError, errorMessage: (_, fallback) => fallback,
    async uploadPhoto(path) { calls.uploads.push(path); return { url: `https://assets.test/${path}` } },
    async createConsultation(data) { calls.creates.push(data); return { ...data, id: `record-${calls.creates.length}`, status: 'queued' } },
    async getConsultation(id) { calls.gets.push(id); return { id, module: 'outfit', status: 'succeeded', photo_url: 'https://assets.test/outfit', analysis: '穿搭建议' } },
    async listConsultations() { return { items: [] } },
  }
  const uni = {
    chooseImage(options) { options.success({ tempFilePaths: [selectedPhoto] }) },
    showToast() {},
    ...Object.fromEntries(['navigateTo', 'redirectTo', 'switchTab', 'navigateBack'].map(method => [method, options => calls.navigation.push({ method, ...options })])),
  }
  const lifecycle = Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, callback => { hooks[name] = callback }]))
  const fakeVue = { ...vue, onMounted(callback) { hooks.onMounted = callback }, onUnmounted(callback) { hooks.onUnmounted = callback } }
  const auth = { expireSession() {}, isLoggedIn: () => true, openLogin() {}, currentUser: vue.ref({ nickname: 'test' }), setCurrentUser() {} }
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    let source = readFileSync(file, 'utf8')
    if (file.endsWith('.vue')) source = compileScript(parse(source, { filename: file }).descriptor, { id: file }).content
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    const localRequire = name => {
      if (name === 'vue') return fakeVue
      if (name === '@dcloudio/uni-app') return lifecycle
      if (name.endsWith('/api')) return api
      if (name.endsWith('/auth')) return auth
      if (name.startsWith('.')) return load(resolve(dirname(file), `${name}.ts`))
      return require(name)
    }
    new Function('require', 'module', 'exports', 'uni', 'getCurrentPages', 'setInterval', 'clearInterval', code)(
      localRequire, module, module.exports, uni, () => [{ options: query }],
      callback => { timers.set(++timerId, callback); return timerId }, id => timers.delete(id),
    )
    cache.set(file, module.exports)
    return module.exports
  }
  function page(name) {
    const pageHooks = {}
    hooks = pageHooks
    const component = load(resolve(root, `src/pages/${name}/index.vue`))
    const state = component.default.setup({}, { expose() {} })
    return { state, async emit(name, params) { query = params || query; await pageHooks[name]?.(params) } }
  }
  const state = load(resolve(root, 'src/state.ts'))
  const submission = load(resolve(root, 'src/consultation.ts'))
  return { calls, timers, api, page, ...state, ...submission, selectPhoto(path) { selectedPhoto = path } }
}

test('all advisor entry points reset outfit inputs when starting hair, including same-module restarts', async () => {
  for (const [entry, action] of [['index', 'open'], ['modules', 'select'], ['profile', 'startModule'], ['history-detail', 'again']]) {
    const h = harness()
    h.startConsultation('outfit', { localPhoto: 'old', photoURL: 'https://assets.test/old', preferences: '旧穿搭要求', includeBeauty: true, localGarment: 'garment', garmentURL: 'https://assets.test/garment', presentation: '女' })
    h.draft.consultationId = 'old-record'
    const source = h.page(entry)
    if (entry === 'history-detail') source.state.item.value = { module: 'hair' }
    source.state[action]('hair')
    assert.equal(h.calls.navigation.at(-1).url, '/pages/preferences/index?module=hair')
    const preferences = h.page('preferences')
    await preferences.emit('onLoad', { module: 'hair' })
    await preferences.emit('onShow')
    assert.equal(h.draft.module, 'hair')
    for (const key of ['localPhoto', 'photoURL', 'localGarment', 'garmentURL', 'preferences', 'consultationId']) assert.equal(h.draft[key], '', `${entry}: ${key}`)
    assert.equal(h.draft.includeBeauty, false)
    assert.equal(h.draft.presentation, '不限定')
    h.setDraftPhoto('hair-old')
    await preferences.emit('onLoad', { module: 'hair' })
    assert.equal(h.draft.localPhoto, '')
  }
})

test('outfit then hair submits each workflow with its own photo, preferences, consent and record', async () => {
  const h = harness()
  for (const module of ['outfit', 'hair', 'skin', 'makeup']) {
    const preferences = h.page('preferences')
    await preferences.emit('onLoad', { module })
    preferences.state.note.value = `${module}要求`
    preferences.state.beauty.value = true
    preferences.state.next()
    const upload = h.page('upload')
    await upload.emit('onLoad', { module, session: String(h.draft.sessionId) })
    await upload.emit('onShow')
    assert.equal(upload.state.consent.value, false)
    assert.equal(h.draft.localPhoto, '')
    h.selectPhoto(`${module}.jpg`)
    upload.state.choose()
    upload.state.consent.value = true
    await upload.state.submit()
    const request = h.calls.creates.at(-1)
    assert.equal(request.module, module)
    assert.equal(request.photo_url, `https://assets.test/${module}.jpg`)
    assert.ok(request.preferences.includes(`${module}要求`))
    assert.equal(request.include_beauty, module === 'hair')
    assert.equal(request.adult_confirmed, true)
    assert.equal(h.calls.navigation.at(-1).url, `/pages/analyzing/index?id=${h.draft.consultationId}&module=${module}`)
    await upload.emit('onHide')
  }
})

test('replacing a previously uploaded photo sends the replacement; removal clears both values', async () => {
  const h = harness()
  h.startConsultation('hair', { localPhoto: 'old.jpg', photoURL: 'https://assets.test/old.jpg' })
  const upload = h.page('upload')
  await upload.emit('onShow')
  h.selectPhoto('new.jpg'); upload.state.choose()
  assert.equal(h.draft.photoURL, '')
  upload.state.consent.value = true
  await upload.state.submit()
  assert.deepEqual(h.calls.uploads, ['new.jpg'])
  assert.equal(h.calls.creates[0].photo_url, 'https://assets.test/new.jpg')
  upload.state.remove()
  assert.equal(h.draft.photoURL, '')
  assert.equal(h.draft.localPhoto, '')
})

test('a late upload cannot create or overwrite the next workflow', async () => {
  const h = harness(), pending = deferred()
  h.startConsultation('outfit', { localPhoto: 'old.jpg' })
  h.api.uploadPhoto = () => pending.promise
  const submission = h.submitDraft(true, () => true)
  h.startConsultation('hair')
  pending.resolve({ url: 'https://assets.test/old.jpg' })
  assert.equal(await submission, undefined)
  assert.equal(h.calls.creates.length, 0)
  assert.equal(h.draft.photoURL, '')
  assert.equal(h.draft.consultationId, '')
})

test('a late consultation response cannot redirect to the old workflow or replace the new record', async () => {
  const h = harness(), pending = deferred(), created = deferred()
  h.startConsultation('outfit', { localPhoto: 'old.jpg', photoURL: 'https://assets.test/old.jpg' })
  h.api.createConsultation = data => { h.calls.creates.push(data); created.resolve(); return pending.promise }
  const upload = h.page('upload')
  await upload.emit('onShow')
  upload.state.consent.value = true
  const submission = upload.state.submit()
  await created.promise
  await upload.emit('onHide')
  h.startConsultation('hair')
  pending.resolve({ id: 'old-record', module: 'outfit' })
  await submission
  assert.equal(h.draft.consultationId, '')
  assert.equal(h.calls.navigation.length, 0)
})

test('cached try-on tab refreshes its form after an advisor and after explicit history reuse', async () => {
  const h = harness(), tryon = h.page('tryon')
  await tryon.emit('onShow')
  tryon.state.consent.value = true
  tryon.state.preferences.value = '旧试衣要求'
  h.setDraftPhoto('old-person'); h.setDraftGarment('old-garment')
  await tryon.emit('onHide')
  h.startConsultation('outfit', { localPhoto: 'outfit', preferences: '旧穿搭要求' })
  await tryon.emit('onShow')
  assert.equal(h.draft.module, 'tryon')
  assert.equal(h.draft.localPhoto, '')
  assert.equal(tryon.state.preferences.value, '')
  assert.equal(tryon.state.consent.value, false)
  const history = h.page('history-detail')
  history.state.item.value = { module: 'tryon', photo_url: 'https://assets.test/person', garment_url: 'https://assets.test/garment', preferences: '复用要求', presentation: '中性' }
  history.state.again()
  await tryon.emit('onShow')
  assert.equal(tryon.state.preferences.value, '复用要求')
  assert.equal(tryon.state.consent.value, false)
  tryon.state.consent.value = true
  await tryon.state.submit()
  assert.equal(h.calls.creates[0].module, 'tryon')
  assert.equal(h.calls.creates[0].garment_url, 'https://assets.test/garment')
  assert.equal(h.calls.creates[0].presentation, '中性')
  assert.equal(h.calls.uploads.length, 0)
})

test('submission requires fresh consent and a garment for try-on', async () => {
  const h = harness()
  h.startConsultation('hair', { localPhoto: 'person' })
  assert.equal(await h.submitDraft(false, () => true), undefined)
  h.startConsultation('tryon', { localPhoto: 'person' })
  assert.equal(await h.submitDraft(true, () => true), undefined)
  assert.equal(h.calls.creates.length, 0)
  assert.equal(h.calls.uploads.length, 0)
})

test('returning to an older upload page starts a fresh flow instead of submitting the new draft', async () => {
  const h = harness()
  h.startConsultation('outfit', { localPhoto: 'outfit.jpg' })
  const upload = h.page('upload')
  await upload.emit('onLoad', { module: 'outfit', session: String(h.draft.sessionId) })
  await upload.emit('onShow')
  await upload.emit('onHide')
  h.startConsultation('hair', { localPhoto: 'hair.jpg' })
  await upload.emit('onShow')
  upload.state.consent.value = true
  await upload.state.submit()
  assert.equal(h.calls.creates.length, 0)
  assert.equal(h.calls.navigation.at(-1).url, '/pages/preferences/index?module=outfit')
  assert.equal(h.draft.localPhoto, 'hair.jpg')
})

test('analysis polling never overlaps and a failure stops the timer', async () => {
  const h = harness(), pending = deferred()
  h.api.getConsultation = id => { h.calls.gets.push(id); return pending.promise }
  const analyzing = h.page('analyzing')
  await analyzing.emit('onLoad', { id: 'hair-record', module: 'hair' })
  await analyzing.emit('onShow')
  for (const tick of h.timers.values()) { tick(); tick() }
  assert.deepEqual(h.calls.gets, ['hair-record'])
  pending.resolve({ id: 'hair-record', module: 'hair', status: 'failed', error_code: 'coze_output_mismatch' })
  await Promise.resolve()
  assert.ok(analyzing.state.failure.value)
  assert.equal(h.timers.size, 0)
  assert.equal(h.calls.navigation.length, 0)
})

test('analysis with no route ID never falls back to the previous consultation', async () => {
  const h = harness()
  h.draft.consultationId = 'previous-record'
  const analyzing = h.page('analyzing')
  await analyzing.emit('onLoad', {})
  await analyzing.emit('onShow')
  assert.ok(analyzing.state.failure.value)
  assert.equal(h.calls.gets.length, 0)
  assert.equal(h.timers.size, 0)
})

test('analyzing page ignores a hidden page response and stops polling before a terminal redirect', async () => {
  const h = harness(), pending = deferred()
  h.api.getConsultation = id => { h.calls.gets.push(id); return pending.promise }
  const analyzing = h.page('analyzing')
  await analyzing.emit('onLoad', { id: 'outfit-record', module: 'outfit' })
  await analyzing.emit('onShow')
  await analyzing.emit('onHide')
  pending.resolve({ id: 'outfit-record', module: 'outfit', status: 'succeeded' })
  await Promise.resolve()
  assert.equal(h.calls.navigation.length, 0)
  assert.equal(h.timers.size, 0)
  await analyzing.emit('onShow')
  await Promise.resolve()
  assert.equal(h.calls.navigation.at(-1).url, '/pages/result/index?id=outfit-record')
  assert.equal(h.timers.size, 0)
})

test('result page loads the route record even when the draft belongs to another workflow', async () => {
  const h = harness(), result = h.page('result')
  h.startConsultation('hair')
  await result.emit('onLoad', { id: 'outfit-record' })
  assert.equal(result.state.item.value.id, 'outfit-record')
  assert.equal(result.state.module.value.name, '穿搭风格')
  assert.equal(result.state.item.value.analysis, '穿搭建议')
  assert.equal(result.state.loading.value, false)
  assert.equal(result.state.error.value, '')
  await result.emit('onLoad', { id: '' })
  assert.ok(result.state.error.value)
})

test('legacy skin records without an image show an incomplete-result warning, not a fake comparison', async () => {
  const h = harness()
  h.api.getConsultation = async id => ({ id, module: 'skin', status: 'succeeded', photo_url: 'https://assets.test/person', analysis: '### 可见状态\n肤色均匀。' })
  const result = h.page('result')
  await result.emit('onLoad', { id: 'skin-record' })
  assert.match(result.state.warning.value, /结果不完整.*未返回效果图/)
  assert.equal(result.state.item.value.result_image_url, undefined)
  assert.match(result.state.analysisHtml.value, /<h3>可见状态<\/h3>/)
  const history = h.page('history-detail')
  history.state.item.value = result.state.item.value
  assert.equal(history.state.warning.value, result.state.warning.value)
})

test('missing-photo analysis warns on both result and history even when an image exists', async () => {
  const h = harness()
  h.api.getConsultation = async id => ({ id, module: 'hair', status: 'succeeded', photo_url: 'https://assets.test/person', result_image_url: 'https://assets.test/result', analysis: '当前未接收到您上传照片的可见人物特征数据，无法提供方案。' })
  const result = h.page('result')
  await result.emit('onLoad', { id: 'hair-record' })
  assert.match(result.state.warning.value, /不是针对你的有效建议/)
  const history = h.page('history-detail')
  history.state.item.value = result.state.item.value
  assert.equal(history.state.warning.value, result.state.warning.value)
})

test('the real hairstyle retry missing-features reply is also rejected by the result warning', async () => {
  const h = harness()
  h.api.getConsultation = async id => ({ id, module: 'hair', status: 'succeeded', photo_url: 'https://assets.test/person', result_image_url: 'https://assets.test/result', analysis: '当前未获取到您上传照片中的人物可见特征信息，无法针对性制定适配的发型方案。' })
  const result = h.page('result')
  await result.emit('onLoad', { id: 'hair-retry-record' })
  assert.match(result.state.warning.value, /不是针对你的有效建议/)
})

test('complete advice is formatted safely and lighting uncertainty is not an analysis failure', async () => {
  const h = harness()
  h.api.getConsultation = async id => ({ id, module: 'skin', status: 'succeeded', photo_url: 'https://assets.test/person', result_image_url: 'https://assets.test/result', analysis: '### 说明\n照片光线影响判断。\n1. **保留自然光泽**\n<script>alert(1)</script>' })
  const result = h.page('result')
  await result.emit('onLoad', { id: 'skin-record' })
  assert.equal(result.state.warning.value, '')
  assert.match(result.state.analysisHtml.value, /<strong>保留自然光泽<\/strong>/)
  assert.doesNotMatch(result.state.analysisHtml.value, /<script>/)
  assert.match(result.state.analysisHtml.value, /&lt;script&gt;/)
})

test('workflow missing-image and missing-photo failures stop polling with specific messages', async () => {
  for (const [code, message] of [['coze_image_missing', /没有生成效果图/], ['coze_photo_not_analyzed', /未能读取上传照片/], ['result_image_invalid', /效果图未能通过校验/]]) {
    const h = harness()
    h.api.getConsultation = async id => ({ id, module: 'skin', status: 'failed', error_code: code })
    const analyzing = h.page('analyzing')
    await analyzing.emit('onLoad', { id: 'failed-record', module: 'skin' })
    await analyzing.emit('onShow')
    await Promise.resolve()
    assert.match(analyzing.state.failure.value.message, message)
    assert.equal(h.calls.navigation.length, 0)
    assert.equal(h.timers.size, 0)
  }
})

test('lost creation response retries the same ID; changing input creates a new ID', async () => {
  const h = harness()
  h.startConsultation('hair', { localPhoto: 'portrait.jpg', photoURL: 'https://assets.test/portrait.jpg' })
  h.api.createConsultation = async data => { h.calls.creates.push(data); if (h.calls.creates.length === 1) throw new Error('lost response'); return { id: 'same-record', status: 'queued' } }
  await assert.rejects(h.submitDraft(true, () => true), /lost response/)
  await h.submitDraft(true, () => true)
  assert.equal(h.calls.creates[0].request_id, h.calls.creates[1].request_id)
  assert.ok(h.calls.creates[0].request_id)
  h.draft.preferences = 'changed request'
  await h.submitDraft(true, () => true)
  assert.notEqual(h.calls.creates[1].request_id, h.calls.creates[2].request_id)
})

test('analysis stops polling after unauthorized, missing record or five network failures', async () => {
  for (const error of [new ApiError(401, 'login_required'), new ApiError(404, 'not_found'), new Error('offline')]) {
    const h = harness(), page = h.page('analyzing')
    h.api.getConsultation = async () => { h.calls.gets.push('failure'); throw error }
    await page.emit('onLoad', { id: 'record-a', module: 'hair' }); await page.emit('onShow')
    for (let i = 0; i < 6; i++) { for (const timer of [...h.timers.values()]) await timer() }
    assert.equal(h.timers.size, 0)
    assert.equal(h.calls.gets.length, error instanceof ApiError ? 1 : 5)
  }
})
