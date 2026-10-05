<template>
  <view class="page">
    <AppHeader />
    <view class="content profile-grid">
      <view class="profile-intro">
        <view class="display">我的形象档案</view>
        <view class="lead">每一次咨询，<br />都让适合你的答案更清晰。</view>
        <image class="image-monochrome" src="/static/design/consultation-side.webp" mode="aspectFill" />
      </view>
      <view class="profile-main">
        <view class="account-card">
          <view class="avatar-editor" @click="chooseAvatar">
            <image :src="avatarPreview || '/static/mirror-logo-mark.svg'" mode="aspectFill" />
            <text>更换头像</text>
          </view>
          <view class="account-fields">
            <text class="eyebrow">ACCOUNT PROFILE</text>
            <view class="section-title">个人资料</view>
            <input v-model="nickname" maxlength="30" placeholder="请输入昵称" />
            <small>{{ email }}</small>
          </view>
          <button class="save-profile" :disabled="saving" @click="saveProfile">{{ saving ? '保存中…' : '保存资料' }}</button>
        </view>
        <view class="password-card">
          <view><text class="eyebrow">ACCOUNT SECURITY</text><view class="section-title">{{ hasPassword ? '修改登录密码' : '设置登录密码' }}</view></view>
          <view class="password-fields">
            <input v-if="hasPassword" v-model="currentPassword" password placeholder="当前密码" />
            <input v-model="newPassword" password placeholder="新密码（至少 8 位）" />
            <input v-model="confirmPassword" password placeholder="确认新密码" />
          </view>
          <button class="save-profile" :disabled="savingPassword" @click="savePassword">{{ savingPassword ? '保存中…' : (hasPassword ? '修改密码' : '设置密码') }}</button>
        </view>
        <view class="profile-card">
          <image class="image-monochrome" src="/static/design/hero.webp" mode="aspectFill" />
          <view><text class="eyebrow">MY PROFILE</text><view class="section-title">私人形象档案</view><view class="lead">清晰而真实，是你独有的风格。</view><view class="traits">清晰轮廓　/　柔和质感　/　简洁线条　/　低维护</view></view>
        </view>
        <view class="section-title domains-title">形象领域</view>
        <view class="domain-list"><view v-for="(m, key) in modules" :key="key" @click="startModule(key)"><image class="image-monochrome" :src="images[key]" mode="aspectFill" /><view class="domain-shade"></view><text>{{ m.name }}</text><small>{{ history(key) ? '已完成' : '待开启' }}　→</small></view></view>
        <view class="history-head"><view class="section-title">咨询记录</view><view class="editorial-btn" @click="start">开始新的咨询　→</view></view>
        <view v-for="x in items" :key="x.id" class="history" :class="{ pending: x.status === 'queued' || x.status === 'running' }" @click="open(x)"><text>{{ new Date(x.created_at).toLocaleDateString() }}</text><b>{{ modules[x.module as keyof typeof modules]?.name }}咨询</b><text class="status" :class="`status-${x.status}`">{{ statusText[x.status] }}</text><text class="detail">{{ x.status === 'succeeded' ? '查看详情' : '暂不可查看' }}　→</text></view>
        <view v-if="totalPages > 1" class="pagination">
          <button :disabled="page === 1 || loading" @click="changePage(page - 1)">上一页</button>
          <text>第 {{ page }} / {{ totalPages }} 页</text>
          <button :disabled="page === totalPages || loading" @click="changePage(page + 1)">下一页</button>
        </view>
        <view class="legal-row"><text @click="openLegal('agreement')">用户协议</text><i></i><text @click="openLegal('privacy')">隐私政策</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getProfile, listConsultations, updatePassword, updateProfile, uploadPhoto, type Consultation } from '../../api'
import { currentUser, isLoggedIn, openLogin, setCurrentUser, expireSession } from '../../auth'
import { startConsultation, modules } from '../../state'

const items = ref<Consultation[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const completedModules = ref<string[]>([])
const loading = ref(false)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const nickname = ref(currentUser.value?.nickname || '')
const email = ref('')
const avatar = ref(currentUser.value?.avatar || '')
const avatarPreview = ref(avatar.value)
const localAvatar = ref('')
const saving = ref(false)
const hasPassword = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)
function clearProfile() {
  items.value = []; total.value = 0; completedModules.value = []; page.value = 1
  nickname.value = ''; email.value = ''; avatar.value = ''; avatarPreview.value = ''; localAvatar.value = ''
  hasPassword.value = false; currentPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''
}
watch(currentUser, user => { if (!user) clearProfile() }, { flush: 'sync' })
const statusText: Record<Consultation['status'], string> = { queued: '排队中', running: '分析中', succeeded: '已完成', failed: '未完成' }
const images: Record<string, string> = { hair: '/static/design/profile-domain-hair.webp', skin: '/static/design/profile-domain-skin.webp', outfit: '/static/design/profile-domain-outfit-clean.png', makeup: '/static/design/profile-domain-makeup-clean.png', tryon: '/static/design/profile-domain-tryon-clean.png' }

onShow(async () => {
  if (!isLoggedIn()) {
    clearProfile()
    setTimeout(() => openLogin('profile'), 0)
    return
  }
  try {
    const [profile] = await Promise.all([getProfile(), loadConsultations(1)])
    nickname.value = profile.nickname
    email.value = profile.email
    avatar.value = profile.avatar
    avatarPreview.value = profile.avatar
    hasPassword.value = profile.has_password
    setCurrentUser({ nickname: profile.nickname, avatar: profile.avatar })
  } catch { uni.showToast({ title: '资料暂时无法读取，请稍后重试', icon: 'none' }) }
})

async function loadConsultations(targetPage: number) {
  loading.value = true
  try {
    const consultations = await listConsultations({ page: targetPage, page_size: pageSize })
    items.value = consultations.items
    total.value = consultations.total
    completedModules.value = consultations.completed_modules
    page.value = consultations.page
  } finally { loading.value = false }
}
async function savePassword() {
  if (newPassword.value.length < 8 || newPassword.value.length > 72) { uni.showToast({ title: '密码长度需为 8～72 位', icon: 'none' }); return }
  if (newPassword.value !== confirmPassword.value) { uni.showToast({ title: '两次输入的密码不一致', icon: 'none' }); return }
  if (savingPassword.value) return
  savingPassword.value = true
  try {
    await updatePassword({ current_password: currentPassword.value, new_password: newPassword.value })
    hasPassword.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    uni.showToast({ title: '密码已保存，请重新登录', icon: 'success' })
    expireSession()
  } catch { uni.showToast({ title: hasPassword.value ? '当前密码不正确' : '密码设置失败', icon: 'none' }) }
  finally { savingPassword.value = false }
}
async function changePage(targetPage: number) {
  if (loading.value || targetPage < 1 || targetPage > totalPages.value) return
  try { await loadConsultations(targetPage) }
  catch { uni.showToast({ title: '记录加载失败，请稍后重试', icon: 'none' }) }
}

function chooseAvatar() { uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: r => { localAvatar.value = r.tempFilePaths[0]; avatarPreview.value = localAvatar.value } }) }
async function saveProfile() {
  const name = nickname.value.trim()
  if (!name) { uni.showToast({ title: '昵称不能为空', icon: 'none' }); return }
  if (saving.value) return
  saving.value = true
  try {
    if (localAvatar.value) avatar.value = (await uploadPhoto(localAvatar.value, 'avatar')).url
    const profile = await updateProfile({ nickname: name, avatar: avatar.value })
    nickname.value = profile.nickname
    avatar.value = profile.avatar
    avatarPreview.value = profile.avatar
    localAvatar.value = ''
    setCurrentUser({ nickname: profile.nickname, avatar: profile.avatar })
    uni.showToast({ title: '资料已保存', icon: 'success' })
  } catch { uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' }) }
  finally { saving.value = false }
}
function history(key: string) { return completedModules.value.includes(key) }
function open(item: Consultation) { if (item.status === 'succeeded') { uni.navigateTo({ url: `/pages/history-detail/index?id=${item.id}` }); return } uni.showToast({ title: item.status === 'failed' ? '本次咨询未完成，请重新发起' : '咨询还没结束，请再等等', icon: 'none' }) }
function start() { isLoggedIn() ? uni.navigateTo({ url: '/pages/modules/index' }) : openLogin('profile') }
function startModule(key: string) { if (!isLoggedIn()) { openLogin(key === 'tryon' ? 'tryon' : 'profile'); return } if (key === 'tryon') { startConsultation(key); uni.switchTab({ url: '/pages/tryon/index' }) } else uni.navigateTo({ url: `/pages/preferences/index?module=${key}` }) }
function openLegal(type: 'agreement' | 'privacy') { uni.navigateTo({ url: type === 'agreement' ? '/pages/user-agreement/index' : '/pages/privacy-policy/index' }) }
</script>

<style scoped>
.profile-grid{display:grid;margin-top:30px}.profile-intro{position:relative;overflow:hidden;min-height:430px;padding:28px 22px}.profile-intro:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(247,248,249,.94) 0%,rgba(247,248,249,.72) 25%,rgba(247,248,249,.08) 62%,rgba(17,19,23,.16) 100%);pointer-events:none}.profile-intro .display,.profile-intro .lead{position:relative;z-index:2}.profile-intro image{position:absolute;inset:0;width:100%;height:100%;filter:grayscale(1)}.profile-main{background:rgba(255,255,255,.75);padding:25px}.account-card{display:flex;align-items:center;gap:22px;margin-bottom:32px;padding:22px;border:1px solid var(--line);background:#fff}.avatar-editor{position:relative;width:82px;height:82px;flex:0 0 82px;overflow:hidden;border-radius:50%;cursor:pointer}.avatar-editor image{width:100%;height:100%}.avatar-editor text{position:absolute;left:0;right:0;bottom:0;padding:5px 0;background:rgba(22,24,28,.7);color:#fff;text-align:center;font-size:10px}.account-fields{flex:1}.account-fields .section-title{margin:4px 0 8px}.account-fields input{height:34px;border-bottom:1px solid #bfc3c9;font-family:"Songti SC",serif;font-size:18px}.account-fields small{display:block;margin-top:7px;color:#8b8f96}.save-profile{margin:0;padding:0 22px;border:0;border-radius:0;background:#a90929;color:#fff;font-family:"Songti SC",serif;font-size:13px}.save-profile[disabled]{opacity:.55}.profile-card{display:grid;gap:24px}.profile-card>image{width:100%;height:315px}.traits{margin-top:28px;font-family:"Songti SC",serif}.domains-title{margin-top:30px}.domain-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}.domain-list>view{position:relative;height:145px;overflow:hidden;cursor:pointer;color:#fff}.domain-list image,.domain-shade{position:absolute;inset:0;width:100%;height:100%}.domain-shade{background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.7))}.domain-list text,.domain-list small{position:absolute;z-index:1;left:16px;display:block}.domain-list text{bottom:38px;font-family:"Songti SC",serif;font-size:17px}.domain-list small{bottom:16px;color:#eee}.history-head{display:flex;align-items:center;justify-content:space-between;margin-top:30px}.history{display:grid;grid-template-columns:160px minmax(180px,1fr) 90px 130px;align-items:center;column-gap:20px;margin-top:30px;border-top:1px solid var(--line);padding:18px 0;font-family:"Songti SC",serif;cursor:pointer}.history b{text-align:center}.history.pending .detail{color:#999}.status{text-align:center;font-size:13px}.status-queued,.status-running{color:#9a6a18}.status-succeeded{color:#277447}.status-failed{color:#9b3341}.detail{text-align:right}@media(max-width:620px){.account-card{align-items:flex-start;flex-wrap:wrap}.account-fields{min-width:calc(100% - 110px)}.save-profile{width:100%}.history{grid-template-columns:1fr auto;gap:10px}.history b{grid-column:1;text-align:left}.history .status{grid-column:2;grid-row:1}.history .detail{grid-column:2;grid-row:2}}@media(min-width:900px){.profile-grid{grid-template-columns:330px 1fr}.profile-intro{min-height:780px;padding:18px}.profile-main{padding:34px}.profile-card{grid-template-columns:310px 1fr}.domain-list{grid-template-columns:repeat(4,1fr)}}
.legal-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:42px;padding-top:22px;border-top:1px solid var(--line);color:#777c84;font-size:12px}.legal-row text{cursor:pointer;text-decoration:underline;text-underline-offset:3px}.legal-row i{width:1px;height:12px;background:#c9cdd3}
.pagination{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:24px}.pagination button{width:auto;margin:0;padding:0 18px;border:1px solid var(--line);border-radius:0;background:#fff;color:var(--ink);font-family:"Songti SC",serif;font-size:13px;line-height:38px}.pagination button[disabled]{opacity:.4}.pagination text{color:#666;font-size:13px}
.password-card{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(260px,1.4fr) auto;align-items:end;gap:22px;margin:-12px 0 32px;padding:22px;border:1px solid var(--line);background:rgba(255,255,255,.82)}.password-card .section-title{margin:4px 0 0;font-size:24px}.password-fields{display:grid;gap:10px}.password-fields input{height:36px;border-bottom:1px solid #bfc3c9;font-family:"Songti SC",serif;font-size:15px}@media(max-width:760px){.password-card{grid-template-columns:1fr;align-items:stretch}.password-card .save-profile{width:100%;height:42px}}
</style>
