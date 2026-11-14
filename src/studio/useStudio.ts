import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { createConsultation, getConsultation, listConsultations, uploadPhoto, errorMessage, ApiError, getPersonBase, confirmPersonBase, preparePersonBase, type PersonBase, type Consultation } from '../api'
import {emptyLook, cloneLook, updateLook, lookSelections, lookUploads, type LookState, type StudioContext} from './look-state'
import { currentUser, isLoggedIn, openLogin } from '../auth'
import { draft, startConsultation } from '../state'
import { submitDraft } from '../consultation'
import { catalog, modeNames, type Material, type Mode } from './catalog'
import { studioImages } from './assets'
import { resultWarning } from '../result-quality'

export type Version = {
  id: string; name: string; image: string; original: string; mode: Mode; note: string
  demo: boolean; created: string; selections: Record<string, string[]>; recordId?: string; analysis?: string
  studio?:StudioContext; base?:PersonBase; presentation?:string
}
export type Panel = '' | 'create' | 'history' | 'gallery' | 'account' | 'advice' | 'legal' | 'save' | 'confirmReset' | 'photoAdjust' | 'baseConfirm' | 'lookState'
const demoKey = 'mirrora_studio_demo_v1'
const workspaceMode = (module: string): Mode => module === 'outfit' ? 'tryon' : module as Mode
export function useStudio() {
  const mode = ref<Mode>('tryon'), panel = ref<Panel>(''), source = ref<'empty' | 'demo' | 'personal'>('empty')
  const original = ref(''), originalRemote = ref(''), consent = ref(false), note = ref(''), filter = ref('全部')
  const selections = reactive<Record<string, string[]>>({ tryon: ['ivory'], hair: ['hair-0'], makeup: ['makeup-0'], accessories: [] })
  const uploads = ref<Material[]>([]), versions = ref<Version[]>([]), saved = ref<Version[]>([]), current = ref<Version>()
  const compare = ref(false), comparePosition = ref(50), dockOpen = ref(true), zoomed = ref(false)
  const busy = ref(false), status = ref(''), failure = ref(''), message = ref(''), scanning = ref(false)
  const recordId = ref(''), records = ref<Consultation[]>([]), recordsPage = ref(1), recordsTotal = ref(0), recordsLoading = ref(false)
  const recordsError = ref(''), savedName = ref(''), demoFail = ref(false), previewId = ref('')
  const presentation = ref('不限定')
  const personBase=ref<PersonBase>(), candidateBase=ref<PersonBase>(), baseChecked=ref(false), appliedLook=ref<LookState>(emptyLook())
  const candidateSource=ref('')
  const photoSource = ref(''), adjustedPhoto = ref(''), rotation = ref(0), perspective = ref(0), autoCorrect = ref(true)
  const adjustedSettings = ref('')
  let appliedCorrection: [number,number,boolean] = [0,0,true]
  const correctionSettings = () => JSON.stringify([rotation.value,perspective.value,autoCorrect.value])
  const correctionReady = computed(() => Boolean(adjustedPhoto.value) && adjustedSettings.value === correctionSettings())
  let epoch = 0, fingerprint = '', pollTimer: ReturnType<typeof setTimeout> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined, scanTimer: ReturnType<typeof setTimeout> | undefined
  let demoTimer: ReturnType<typeof setTimeout> | undefined, deadline = 0, errors = 0, visible = true
  let polling = false
  let pending: { original: string; mode: Mode; note: string; selections: Record<string, string[]> } | undefined
  const snapshot = () => JSON.parse(JSON.stringify(selections)) as Record<string, string[]>
  const materials = computed(() => [...(mode.value === 'tryon' ? uploads.value : []), ...catalog[mode.value]])
  const categories = computed(() => ['全部', ...new Set(materials.value.map(x => x.category))])
  const filtered = computed(() => materials.value.filter(x => filter.value === '全部' || x.category === filter.value))
  const chosen = computed(() => materials.value.filter(x => selections[mode.value]?.includes(x.id)))
  const preview = computed(() => versions.value.find(x => x.id === previewId.value) || current.value)
  const image = computed(() => preview.value?.image || original.value)
  const hasPerson = computed(() => source.value !== 'empty')
  const isDemo = computed(() => source.value === 'demo')
  const framing = computed(() => zoomed.value ? 'face' : mode.value === 'makeup' ? 'face' : mode.value === 'hair' || mode.value === 'accessories' ? 'half' : 'full')
  const notify = (text: string) => { message.value = text; if (noticeTimer) clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { message.value = '' }, 4200) }
  function closePanel() { if(busy.value && ['baseConfirm','photoAdjust'].includes(panel.value))return; if(panel.value==='baseConfirm'||panel.value==='photoAdjust'){candidateBase.value=undefined;candidateSource.value='';baseChecked.value=false} panel.value = ''; previewId.value = '' }
  function setMode(next: Mode) {
    if (busy.value) { notify('请等待当前任务完成后切换'); return }
    mode.value = next; filter.value = '全部'; zoomed.value = false; previewId.value = ''; compare.value = false; failure.value = ''
  }
  function select(item: Material) {
    if (busy.value) return
    if (!hasPerson.value) { panel.value = 'create'; return }
    const ids = selections[mode.value] || []
    selections[mode.value] = mode.value === 'accessories' ? ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id] : [item.id]
    failure.value = ''; previewId.value = ''
  }
  function clearWork() {
    epoch++; if (pollTimer) clearTimeout(pollTimer); if (demoTimer) clearTimeout(demoTimer)
    busy.value = false; failure.value = ''; status.value = ''; recordId.value = ''; fingerprint = ''; pending = undefined
    compare.value = false; previewId.value = ''; versions.value = []; current.value = undefined; uploads.value = []; note.value = ''; originalRemote.value = ''
    appliedLook.value=emptyLook()
  }
  function useDemo() {
    if (busy.value) return
    photoSource.value = ''; personBase.value=undefined; candidateBase.value=undefined; clearWork(); source.value = 'demo'; original.value = studioImages.person; consent.value = false
    selections.tryon = ['ivory']; selections.hair = ['hair-0']; selections.makeup = ['makeup-0']; selections.accessories = []
    current.value = { id: 'demo-original', name: '初始形象', image: studioImages.person, original: studioImages.person, mode: 'tryon', note: '', demo: true, created: new Date().toISOString(), selections: snapshot() }
    versions.value = [current.value]; panel.value = ''; notify('示例体验已开启 · 展示预置素材，不消耗生成额度')
  }
  function choosePerson() {
    if (busy.value) return
    if (!consent.value) { notify('请先确认照片授权与成年声明'); return }
    if (!isLoggedIn()) { openLogin(); return }
    const ticket = epoch
    uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: async result => {
      if (ticket !== epoch || !result.tempFilePaths[0]) return
      busy.value = true; status.value = '正在提取人物，请稍候…'; failure.value = ''
      try {
        const prepared = await uploadPhoto(result.tempFilePaths[0], 'person')
        if (ticket !== epoch) return
        if(!prepared.person_base)throw new Error('人物素材信息不完整，请稍后重试')
        candidateBase.value=prepared.person_base;candidateSource.value=result.tempFilePaths[0];baseChecked.value=false;panel.value='baseConfirm'
      } catch (error) {
        if (ticket === epoch) notify(errorMessage(error, '人物提取未完成，请重新选择清晰的人物照片'))
      } finally { if (ticket === epoch) { busy.value = false; status.value = '' } }
    } })
  }
  async function acceptBase() {
    if(busy.value || !candidateBase.value || !baseChecked.value)return
    const ticket=epoch, candidate=candidateBase.value, localSource=candidateSource.value
    busy.value=true;status.value='正在确认人物底图…'
    try {
      const confirmed=await confirmPersonBase(candidate.id)
      if(ticket!==epoch)return
      clearWork();personBase.value=confirmed;source.value='personal';original.value=confirmed.display_url;originalRemote.value=confirmed.base_url;photoSource.value=localSource
      appliedCorrection=[confirmed.rotation,confirmed.perspective*100,confirmed.auto_correct]
      ;[rotation.value,perspective.value,autoCorrect.value]=appliedCorrection
      for(const key of Object.keys(selections))selections[key]=[]
      appliedLook.value=emptyLook()
      current.value={id:`original-${confirmed.id}`,name:'已确认底图',image:confirmed.display_url,original:confirmed.display_url,mode:mode.value,note:'',demo:false,created:confirmed.created_at,selections:snapshot(),base:confirmed,studio:{base_id:confirmed.id,look:emptyLook()},presentation:presentation.value}
      versions.value=[current.value];candidateBase.value=undefined;candidateSource.value='';baseChecked.value=false;panel.value='';notify('底图已确认，可以开始搭配')
    }catch(error){if(ticket===epoch)notify(errorMessage(error,'底图确认失败，原工作台已保留'))}
    finally{if(ticket===epoch){busy.value=false;status.value=''}}
  }
  function openPhotoAdjust() {
    if (busy.value) return
    if (!photoSource.value && !personBase.value) { notify('此旧记录未保存原照片，请重新选择照片'); return }
    candidateBase.value=undefined;candidateSource.value=''
    if(personBase.value)appliedCorrection=[personBase.value.rotation,personBase.value.perspective*100,personBase.value.auto_correct]
    ;[rotation.value,perspective.value,autoCorrect.value] = appliedCorrection
    adjustedPhoto.value = original.value; adjustedSettings.value = ''; panel.value = 'photoAdjust'
  }
  async function previewCorrection() {
    if (busy.value || (!photoSource.value && !personBase.value)) return
    const ticket = epoch, settings = correctionSettings()
    busy.value = true; status.value = '正在校正并提取人物…'
    try {
      const correction={rotation:rotation.value,perspective:perspective.value/100,auto_correct:autoCorrect.value}
      const prepared = personBase.value?await preparePersonBase(personBase.value.id,correction):await uploadPhoto(photoSource.value,'person',correction)
      if (ticket !== epoch) return
      adjustedPhoto.value = prepared.url; adjustedSettings.value = settings
      candidateBase.value=prepared.person_base;candidateSource.value=photoSource.value
    } catch(error) { if (ticket === epoch) notify(errorMessage(error,'校正未完成，原形象已保留')) }
    finally { if (ticket === epoch) { busy.value = false; status.value = '' } }
  }
  function acceptCorrection() {
    if (busy.value || !correctionReady.value) return
    if(!candidateBase.value){notify('请先生成新的校正预览');return}
    baseChecked.value=false;panel.value='baseConfirm'
  }
  function chooseGarment() {
    if (busy.value) return
    if (!hasPerson.value) { panel.value = 'create'; return }
    const ticket = epoch
    uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: result => {
      if (ticket !== epoch || !result.tempFilePaths[0]) return
      const item: Material = { id: `upload-${Date.now()}`, name: `我的服装 ${uploads.value.length + 1}`, category: '我的上传', image: result.tempFilePaths[0], prompt: '', local: true }
      uploads.value.unshift(item); selections.tryon = [item.id]; filter.value = '我的上传'
      notify(isDemo.value ? '服装已加入本次衣橱；示例人物仅演示预置效果' : '服装已选中，点击生成试穿')
    } })
  }
  function reveal(version: Version) {
    current.value = version; versions.value.unshift(version); versions.value = versions.value.slice(0, 30)
    busy.value = false; failure.value = ''; status.value = ''; scanning.value = true
    if (scanTimer) clearTimeout(scanTimer)
    scanTimer = setTimeout(() => { scanning.value = false }, 1100)
  }
  async function generate() {
    if (busy.value) return
    if (!hasPerson.value) { panel.value = 'create'; return }
    previewId.value = ''; compare.value = false; failure.value = ''
    if (isDemo.value) {
      busy.value = true; status.value = '正在预览示例效果…'
      const ticket = epoch, chosenMode = mode.value, selected = snapshot(), instruction = note.value
      demoTimer = setTimeout(() => {
        if (ticket !== epoch) return
        if (demoFail.value) { demoFail.value = false; busy.value = false; failure.value = '这是失败状态演示，上一次效果已保留。'; return }
        const weekend = chosenMode === 'tryon' && selected.tryon?.includes('weekend')
        reveal({ id: `demo-${Date.now()}`, name: chosenMode === 'tryon' ? weekend ? '燕麦周末' : '松弛通勤' : `${modeNames[chosenMode]}方案演示`, image: weekend ? studioImages.weekend : current.value?.image || studioImages.person, original: studioImages.person, mode: chosenMode, note: instruction, demo: true, created: new Date().toISOString(), selections: selected })
        notify(chosenMode === 'tryon' ? '预置效果已展示；文字不会改变示例图片' : '已记录方案选择；示例人物不生成新的发型、妆容或配饰')
      }, 1500)
      return
    }
    if (!isLoggedIn()) { openLogin(); return }
    if (!consent.value) { panel.value = 'create'; notify('请确认照片授权后再生成'); return }
    if(candidateBase.value && panel.value==='baseConfirm'){notify('请先确认或取消候选底图');return}
    const garment = chosen.value.find(x => x.local)
    const generationMode = mode.value === 'tryon' && !garment ? 'outfit' : mode.value
    const tone = selections[`${mode.value}-tone`]?.[0]
    const parentConsultationId = current.value?.recordId || ''
    const previous = current.value?.selections || {}
    const unchangedSelection = JSON.stringify(previous[mode.value] || []) === JSON.stringify(selections[mode.value] || [])
      && JSON.stringify(previous[`${mode.value}-tone`] || []) === JSON.stringify(selections[`${mode.value}-tone`] || [])
    const refinementOnly = parentConsultationId && current.value?.mode === mode.value && unchangedSelection && note.value.trim()
    const removed = parentConsultationId && mode.value === 'accessories'
      ? catalog.accessories.filter(x => previous.accessories?.includes(x.id) && !selections.accessories.includes(x.id)).map(x => x.name) : []
    const preferences = [
      refinementOnly ? '' : chosen.value.map(x => x.prompt).filter(Boolean).join('，'),
      !refinementOnly && tone ? `${mode.value === 'hair' ? '发色' : '唇色'}：${tone}` : '',
      removed.length ? `移除这些配饰，不添加替代物：${removed.join('、')}` : '',
      note.value.trim(),
    ].filter(Boolean).join('；')
    if(!preferences && !garment){notify('请先选择方案，或输入想要调整的内容');return}
    const look=updateLook(appliedLook.value,mode.value,chosen.value,tone||'',note.value)
    const studio=personBase.value?{base_id:personBase.value.id,look}:undefined
    const nextFingerprint = JSON.stringify([mode.value, parentConsultationId, original.value, garment?.image, preferences, presentation.value,studio])
    if (fingerprint !== nextFingerprint) {
      startConsultation(generationMode, { studio,parentConsultationId, localPhoto: original.value, photoURL: originalRemote.value, localGarment: garment?.image || '', garmentURL: garment && /^https?:\/\//.test(garment.image) ? garment.image : '', preferences, presentation: presentation.value })
      fingerprint = nextFingerprint
    }
    const ticket = epoch
    pending = { original: original.value, mode: mode.value, note: preferences, selections: snapshot() }
    busy.value = true; status.value = '正在上传并提交…'
    try {
      const item = await submitDraft(true, () => ticket === epoch)
      if (ticket !== epoch) return
      if (!item) throw new Error('submission_interrupted')
      originalRemote.value = draft.photoURL
      recordId.value = item.id; deadline = Date.now() + 12 * 60 * 1000; errors = 0
      await receive(item, ticket)
    } catch (error) {
      if (ticket !== epoch) return
      busy.value = false; failure.value = errorMessage(error, '本次提交未完成，请检查网络后重试。')
    }
  }
  async function preparePose() {
    if(busy.value || !personBase.value || isDemo.value)return
    if(!consent.value){panel.value='create';notify('请先确认照片授权与成年声明');return}
    const ticket=epoch
    busy.value=true;failure.value='';status.value='正在检查人物并准备姿态候选…'
    try{
      const item=await createConsultation({module:'pose',photo_url:personBase.value.base_url,presentation:presentation.value,preferences:'自然站立，保留身份、衣着和身体比例',adult_confirmed:true,request_id:`pose-${personBase.value.id}-${Date.now()}`,studio:{base_id:personBase.value.id,look:emptyLook()}})
      if(ticket!==epoch)return
      recordId.value=item.id;deadline=Date.now()+12*60*1000;errors=0;pending=undefined
      await receive(item,ticket)
    }catch(error){if(ticket===epoch){busy.value=false;status.value='';failure.value=errorMessage(error,'姿态候选未生成，当前形象已保留')}}
  }
  async function receive(item: Consultation, ticket: number) {
    if (ticket !== epoch) return
    if(item.module==='pose' && item.status==='succeeded' && item.candidate_base_id){
      const candidate=await getPersonBase(item.candidate_base_id)
      if(ticket!==epoch)return
      candidateBase.value=candidate;candidateSource.value=photoSource.value;baseChecked.value=false;panel.value='baseConfirm';busy.value=false;status.value='';recordId.value=''
      notify('请核对候选的脸部、体型和肢体，确认后才会替换底图');return
    }
    const warning = item.status === 'succeeded' ? resultWarning(item) : ''
    if (item.status === 'succeeded' && item.result_image_url && !warning) {
      const context = pending || { original: personBase.value?.display_url||item.photo_url, mode: workspaceMode(item.module), note: item.preferences, selections: snapshot() }
      if(item.studio){appliedLook.value=cloneLook(item.studio.look);Object.assign(selections,lookSelections(appliedLook.value));const remote=lookUploads(appliedLook.value);uploads.value=[...remote,...uploads.value.filter(x=>!remote.some(y=>y.id===x.id))]}
      reveal({ id: item.id, recordId: item.id, image: item.result_image_url, original: context.original, name: `${modeNames[context.mode] || '形象'}方案`, mode: context.mode, note: context.note, selections: item.studio?lookSelections(item.studio.look):context.selections, studio:item.studio,base:personBase.value,presentation:item.presentation,demo: false, created: item.created_at, analysis: item.analysis })
      note.value=''
      notify('新效果已就绪，可以对比或保存'); return
    }
    if (item.status === 'failed' || item.status === 'succeeded') {
      busy.value = false; failure.value = warning || errorMessage(new ApiError(422,item.error_code||'generation_failed'),'本次未能生成可靠效果，上一次形象已保留。你可以修改描述后重新生成。')
      fingerprint = ''; return
    }
    busy.value = true; status.value = item.status === 'queued' ? '正在排队，请稍候…' : '正在生成新效果…'
    if (visible) pollTimer = setTimeout(() => { void poll(ticket) }, 3000)
  }
  async function poll(ticket = epoch) {
    if (ticket !== epoch || !recordId.value || !visible || polling) return
    if (Date.now() > deadline) { busy.value = false; failure.value = '等待时间较长，请在历史记录中查看任务状态。'; return }
    polling = true
    try { const item = await getConsultation(recordId.value); errors = 0; await receive(item, ticket) }
    catch (error) {
      if (ticket !== epoch) return
      const httpStatus = (error as { status?: number }).status
      if (httpStatus === 401 || httpStatus === 404 || ++errors >= 5) { busy.value = false; failure.value = errorMessage(error, '连接中断，请到历史记录查看任务。'); return }
      pollTimer = setTimeout(() => { void poll(ticket) }, 3000)
    }
    finally { polling = false }
  }
  function suspend() { visible = false; if (pollTimer) clearTimeout(pollTimer) }
  function resume() { visible = true; if (pollTimer) clearTimeout(pollTimer); if (busy.value && recordId.value) void poll() }
  async function restore(version: Version) {
    if (busy.value) { notify('请先等待当前任务完成'); return }
    const ticket = ++epoch
    recordsLoading.value = false
    if (version.recordId) {
      if (!isLoggedIn()) { openLogin(); return }
      try {
        const item = await getConsultation(version.recordId)
        if (ticket !== epoch) return
        if (item.status !== 'succeeded' || !item.result_image_url || resultWarning(item)) { notify('此版本结果不可用，请重新生成'); return }
        const base=item.studio?await getPersonBase(item.studio.base_id):undefined
        if(ticket!==epoch)return
        version = { ...version, image: item.result_image_url, original: base?.display_url||item.photo_url,studio:item.studio,base,presentation:item.presentation,selections:item.studio?lookSelections(item.studio.look):version.selections }
      } catch (error) { if (ticket === epoch) notify(errorMessage(error, '版本读取失败，请重试')); return }
    }
    if(!version.recordId && version.base){
      try{const base=await getPersonBase(version.base.id);if(ticket!==epoch)return;version={...version,base,image:base.display_url,original:base.display_url}}
      catch(error){if(ticket===epoch)notify(errorMessage(error,'底图读取失败，请重试'));return}
    }
    if (version.base ? personBase.value?.id!==version.base.id : original.value !== version.original) { consent.value = false; photoSource.value = '' }
    if (!versions.value.some(x => x.id === version.id)) {
      versions.value = [version, { ...version, id: `original-${Date.now()}`, name: '人物底图', image: version.original, recordId: undefined, analysis: undefined,note:'',studio:version.base?{base_id:version.base.id,look:emptyLook()}:undefined,selections:lookSelections(emptyLook()) }]
    }
    current.value = version; source.value = version.demo ? 'demo' : 'personal'; original.value = version.original
    recordId.value = version.recordId || ''; pending = undefined
    personBase.value=version.base;appliedLook.value=version.studio?cloneLook(version.studio.look):emptyLook();uploads.value=lookUploads(appliedLook.value)
    originalRemote.value = version.base?.base_url || (!version.demo && /^https?:\/\//.test(version.original) ? version.original : '')
    mode.value = version.mode; note.value = '';presentation.value=version.presentation||'不限定';for(const key of Object.keys(selections))selections[key]=[];Object.assign(selections, JSON.parse(JSON.stringify(version.selections)))
    compare.value = false; previewId.value = ''; filter.value = '全部'; panel.value = ''; fingerprint = ''; failure.value = ''
    notify('已恢复这个版本，可以继续编辑')
  }
  async function reset() {
    if (busy.value) return
    const initial = versions.value.find(x => x.id.startsWith('original-') || x.id === 'demo-original')
    if (initial) await restore(initial)
    else if (current.value) await restore({ ...current.value, id: `original-${Date.now()}`, recordId: undefined, image: original.value, name: '原始照片', analysis: undefined })
    note.value = ''; panel.value = ''
  }
  function persistDemo() {
    // Never persist local personal-photo paths, signed URLs or credentials with demo data.
    uni.setStorageSync(demoKey, saved.value.filter(x => x.demo).map(x => ({ ...x, image: x.image === studioImages.weekend ? 'weekend' : 'person', original: 'person' })))
  }
  function saveLook() {
    if (!current.value) return
    const version = { ...current.value, id: `saved-${Date.now()}`, name: savedName.value.trim() || current.value.name, selections: JSON.parse(JSON.stringify(current.value.selections)) }
    saved.value.unshift(version); saved.value = saved.value.slice(0, 30); persistDemo(); panel.value = ''
    notify(version.demo ? '示例搭配已保存在本机' : '搭配已保存在本次会话；真实生成记录可在历史中找回')
  }
  function deleteLook(id: string) { saved.value = saved.value.filter(x => x.id !== id); persistDemo() }
  async function loadRecords(page = 1) {
    if (!isLoggedIn()) return
    const ticket = epoch; recordsLoading.value = true; recordsError.value = ''
    try { const result = await listConsultations({ page, page_size: 8 }); if (ticket !== epoch) return; records.value = result.items; recordsTotal.value = result.total; recordsPage.value = page }
    catch (error) { if (ticket === epoch) recordsError.value = errorMessage(error, '历史记录加载失败，请重试') }
    finally { if (ticket === epoch) recordsLoading.value = false }
  }
  async function openRecord(id: string) {
    if (busy.value) { notify('请先等待当前任务完成'); return }
    if (!isLoggedIn()) { openLogin(); return }
    const ticket = epoch
    try {
      const item = await getConsultation(id)
      if (ticket !== epoch) return
      if(item.module==='pose'){
        if(item.status==='succeeded'&&item.candidate_base_id){candidateBase.value=await getPersonBase(item.candidate_base_id);if(ticket!==epoch)return;baseChecked.value=false;candidateSource.value='';panel.value='baseConfirm'}
        else if(item.status==='failed'){notify(errorMessage(new ApiError(422,item.error_code||'generation_failed'),'姿态候选生成失败'))}
        else{recordId.value=item.id;deadline=Date.now()+12*60*1000;errors=0;await receive(item,ticket)}
        return
      }
      if (!Object.prototype.hasOwnProperty.call(catalog, item.module)) { notify('暂不支持此记录类型'); return }
      const base=item.studio?await getPersonBase(item.studio.base_id):undefined
      if(ticket!==epoch)return
      photoSource.value = ''; clearWork();personBase.value=base; source.value = 'personal'; original.value = base?.display_url||item.photo_url; originalRemote.value = base?.base_url||item.photo_url
      mode.value = workspaceMode(item.module); note.value = ''; consent.value = false;presentation.value=item.presentation
      for(const key of Object.keys(selections))selections[key]=[]
      if(item.studio){appliedLook.value=cloneLook(item.studio.look);Object.assign(selections,lookSelections(appliedLook.value));uploads.value=lookUploads(appliedLook.value)}
      if (!item.studio && item.garment_url) { const garment: Material = { id: 'history-garment', name: '历史服装', category: '我的上传', image: item.garment_url, prompt: '', local: true }; uploads.value = [garment]; selections.tryon = [garment.id] }
      current.value = { id: `original-${id}`, name: '人物底图', image: original.value, original: original.value, mode: mode.value, note: '', demo: false, created: item.created_at, selections: lookSelections(emptyLook()),base,studio:base?{base_id:base.id,look:emptyLook()}:undefined }
      versions.value = [current.value]; panel.value = ''; recordId.value = id; deadline = Date.now() + 12 * 60 * 1000
      await receive(item, epoch)
    } catch (error) { if (ticket === epoch) notify(errorMessage(error, '无法读取这条记录')) }
  }
  async function resumeLatest() {
    if (!isLoggedIn() || hasPerson.value) return
    const ticket = epoch
    try {
      const result = await listConsultations({ page_size: 1 })
      if (ticket !== epoch || hasPerson.value || !result.items.length) return
      await openRecord(result.items[0].id)
    } catch { /* First-use remains available when history is offline. */ }
  }
  function clearPersonal() {
    clearWork(); personBase.value=undefined;candidateBase.value=undefined;candidateSource.value='';baseChecked.value=false;source.value = 'empty'; original.value = ''; consent.value = false; photoSource.value = ''; adjustedPhoto.value = ''
    saved.value = saved.value.filter(x => x.demo); records.value = []; recordsTotal.value = 0; recordsLoading.value = false; panel.value = ''
  }
  // A token invalidation must remove all private images and in-flight work immediately.
  const stopSessionWatch = watch(currentUser, (user, previous) => { if (!user && previous) clearPersonal() }, { flush: 'sync' })
  try {
    const cached = uni.getStorageSync(demoKey)
    if (Array.isArray(cached)) saved.value = cached.filter(x => x?.demo === true && ['person', 'weekend'].includes(x.image) && typeof x.name === 'string' && Object.prototype.hasOwnProperty.call(catalog, x.mode)).slice(0, 30).map(x => ({ ...x, original: studioImages.person, image: x.image === 'weekend' ? studioImages.weekend : studioImages.person, selections: x.selections && typeof x.selections === 'object' ? x.selections : {} }))
  } catch {}
  onUnmounted(() => { clearWork(); stopSessionWatch(); if (noticeTimer) clearTimeout(noticeTimer); if (scanTimer) clearTimeout(scanTimer) })
  return { preparePose, personBase,candidateBase,baseChecked,acceptBase,appliedLook,photoSource, adjustedPhoto, rotation, perspective, autoCorrect, correctionReady, openPhotoAdjust, previewCorrection, acceptCorrection, mode, panel, source, original, consent, note, filter, selections, uploads, versions, saved, current, compare, comparePosition, dockOpen, zoomed, busy, status, failure, message, scanning, records, recordsPage, recordsTotal, recordsLoading, recordsError, savedName, demoFail, previewId, presentation, materials, categories, filtered, chosen, preview, image, hasPerson, isDemo, framing, notify, closePanel, setMode, select, useDemo, choosePerson, chooseGarment, generate, suspend, resume, restore, reset, saveLook, deleteLook, loadRecords, openRecord, resumeLatest, clearPersonal }
}
