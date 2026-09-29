<template>
  <view class="page login-page">
    <AppHeader />
    <view class="login-layout">
      <view class="login-copy">
        <text class="eyebrow">PRIVATE IMAGE CONSULTANT</text>
        <view class="display">欢迎回来。</view>
        <view class="lead">登录后继续你的咨询，<br />并保存每一次更适合自己的发现。</view>
        <view class="silver-line"></view>
        <text class="motto">A MORE YOU　/　A RICHER LIFE</text>
      </view>
      <view class="panel-area">
        <view class="login-panel">
          <text class="eyebrow">EMAIL SIGN IN</text>
          <view class="section-title">{{ passwordMode ? '邮箱密码登录' : '邮箱验证码登录' }}</view>
          <view class="field"><text>邮箱</text><input v-model="email" type="text" placeholder="请输入邮箱地址" /></view>
          <view v-if="!passwordMode" class="field code">
            <view><text>验证码</text><input v-model="code" type="number" maxlength="6" placeholder="请输入 6 位验证码" /></view>
            <button :disabled="sending || countdown > 0" @click="sendCode">{{ countdown > 0 ? `${countdown}s 后重试` : (sending ? '发送中…' : '获取验证码') }}</button>
          </view>
          <view v-else class="field"><text>密码</text><input v-model="password" password placeholder="请输入密码" /></view>
          <view class="consent" @click="agreed = !agreed">
            <view class="consent-box" :class="{ checked: agreed }">{{ agreed ? '✓' : '' }}</view>
            <text>我已阅读并同意</text>
            <text class="legal-link" @click.stop="openLegal('agreement')">《用户协议》</text>
            <text>和</text>
            <text class="legal-link" @click.stop="openLegal('privacy')">《隐私政策》</text>
          </view>
          <button class="submit" :disabled="busy || !agreed" @click="submitLogin">{{ busy ? '登录中…' : '登录　→' }}</button>
          <text class="password-entry" @click="passwordMode = !passwordMode">{{ passwordMode ? '使用邮箱验证码登录' : '使用邮箱密码登录' }}　→</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loginWithEmail, loginWithPassword, sendEmailCode } from '../../api'
import { setCurrentUser } from '../../auth'

const email = ref('')
const code = ref('')
const password = ref('')
const passwordMode = ref(false)
const sending = ref(false)
const busy = ref(false)
const countdown = ref(0)
const agreed = ref(false)
const redirect = ref('')
let timer: ReturnType<typeof setInterval> | undefined

onLoad((options) => { redirect.value = String(options?.redirect || '') })

function validEmail() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) }

function openLegal(type: 'agreement' | 'privacy') {
  uni.navigateTo({ url: type === 'agreement' ? '/pages/user-agreement/index' : '/pages/privacy-policy/index' })
}

async function sendCode() {
  if (!validEmail()) {
    uni.showToast({ title: '请输入正确的邮箱地址', icon: 'none' })
    return
  }
  if (sending.value || countdown.value) return
  sending.value = true
  try {
    await sendEmailCode(email.value.trim())
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) {
        clearInterval(timer)
        timer = undefined
      }
    }, 1000)
  } catch {
    uni.showToast({ title: '发送失败，请检查邮箱服务配置', icon: 'none' })
  } finally {
    sending.value = false
  }
}

async function submitLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
    return
  }
  if (!validEmail() || (passwordMode.value ? password.value.length < 8 : code.value.trim().length !== 6)) {
    uni.showToast({ title: passwordMode.value ? '请填写邮箱和至少 8 位密码' : '请填写邮箱和 6 位验证码', icon: 'none' })
    return
  }
  if (busy.value) return
  busy.value = true
  try {
    const result = passwordMode.value
      ? await loginWithPassword(email.value.trim(), password.value)
      : await loginWithEmail(email.value.trim(), code.value.trim())
    uni.setStorageSync('mirror_token', result.token)
    setCurrentUser({ nickname: result.nickname, avatar: result.avatar })
    if (redirect.value === 'tryon' || redirect.value === 'profile')
      uni.switchTab({ url: redirect.value === 'tryon' ? '/pages/tryon/index' : '/pages/profile/index' })
    else
      uni.redirectTo({ url: '/pages/modules/index' })
  } catch {
    uni.showToast({ title: passwordMode.value ? '邮箱或密码错误' : '验证码错误或已过期', icon: 'none' })
  } finally {
    busy.value = false
  }
}

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.login-page { padding-bottom: 0; }
.login-layout { display: grid; width: 100vw; min-height: calc(100vh - var(--status-bar-height) - 74px); margin-left: calc(50% - 50vw); background: linear-gradient(120deg, rgba(247,248,250,.76), rgba(222,225,230,.58)), url('/static/design/consultation-side-balanced.png') 58% center / cover no-repeat; }
.login-copy { position: relative; overflow: hidden; padding: 70px 80px 70px clamp(64px, calc((100vw - 1460px) / 2 + 80px), 600px); display: flex; flex-direction: column; justify-content: center; }
.login-copy .display { margin: 24px 0; }
.silver-line { width: 120px; height: 2px; margin-top: 55px; background: linear-gradient(90deg, #8f949b, #f9fafb, #9da2aa); }
.motto { margin-top: 18px; font-size: 9px; letter-spacing: 4px; color: #686d75; }
.panel-area { display: grid; place-items: center; }
.login-panel { width: min(506px, calc(100% - 80px)); padding: 48px; background: rgba(255, 255, 255, .9); box-shadow: 0 25px 70px rgba(33, 38, 47, .1); }
.login-panel .section-title { margin: 12px 0 28px; }
.field { padding: 14px 0; border-bottom: 1px solid #cfd2d7; }
.field > text, .field view > text { display: block; margin-bottom: 9px; font-size: 12px; color: #6f747c; }
.field input { height: 30px; font-family: "Songti SC", serif; }
.code { display: flex; align-items: end; justify-content: space-between; }
.code > view { flex: 1; }
.code button { min-width: 112px; margin: 0 0 2px 20px; padding: 0 16px; white-space: nowrap; background: none; font-size: 13px; color: #9d102b; }
.code button[disabled] { color: #a5a8ad; }
.submit { margin-top: 38px; border: 0; border-radius: 0; background: #a90929; color: #fff; font-family: "Songti SC", serif; }
.consent { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; margin-top: 22px; color: #777c84; font-size: 11px; cursor: pointer; }
.consent-box { display: grid; place-items: center; width: 15px; height: 15px; margin-right: 3px; border: 1px solid #a8abb1; color: #fff; font-size: 11px; }
.consent-box.checked { border-color: #a90929; background: #a90929; }
.legal-link { color: #8d1830; text-decoration: underline; text-underline-offset: 2px; }
.password-entry { display: block; margin-top: 20px; text-align: center; font-family: "Songti SC", serif; font-size: 13px; color: #6f747c; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.other { margin-top: 30px; padding-top: 22px; border-top: 1px solid #d9dce1; }
.other > text { display: block; text-align: center; font-size: 12px; color: #8b8f96; }
.other-actions { display: flex; align-items: center; justify-content: center; gap: 17px; margin-top: 16px; }
.other-actions > view { display: flex; align-items: center; gap: 7px; color: #555b64; cursor: pointer; transition: color .18s ease; }
.other-actions > view:hover { color: var(--wine); }
.other-actions text { font-family: "Songti SC", serif; font-size: 13px; }
.other-actions i { width: 1px; height: 18px; background: #c9cdd3; }
@media (min-width: 900px) {
  .login-layout { grid-template-columns: 1.15fr .85fr; min-height: calc(100vh - 90px); background: linear-gradient(120deg, #f7f8fa 0%, #e2e5e9 70%, #fafafa 100%); }
  .login-copy { background: #eef0f3; }
  .login-copy::before { content: ''; position: absolute; inset: 0; z-index: 0; background: linear-gradient(90deg, rgba(247,248,250,.96) 0%, rgba(242,244,247,.76) 42%, rgba(223,226,231,.08) 100%), url('/static/design/consultation-side-balanced.png') center / cover no-repeat; mask-image: linear-gradient(90deg, #000 0%, #000 78%, rgba(0,0,0,.78) 88%, transparent 100%); pointer-events: none; }
  .login-copy::after { content: 'MIRRORA'; position: absolute; left: clamp(64px, calc((100vw - 1460px) / 2 + 80px), 600px); bottom: 7%; z-index: 0; color: rgba(255, 255, 255, .58); font-family: Georgia, serif; font-size: clamp(72px, 7.5vw, 150px); letter-spacing: .14em; line-height: 1; pointer-events: none; }
  .login-copy > * { position: relative; z-index: 2; }
  .login-copy .display { font-size: 64px; white-space: nowrap; }
  .login-copy .lead { max-width: 310px; }
}
@media (max-width: 899px) {
  .login-layout { display: flex; flex-direction: column; justify-content: center; gap: 24px; min-height: calc(100vh - var(--status-bar-height) - 74px); padding: 24px 0 calc(24px + env(safe-area-inset-bottom)); }
  .login-copy { flex: none; padding: 0 28px; }
  .login-copy .display { margin: 12px 0 8px; font-size: 40px; }
  .login-copy .lead { font-size: 15px; line-height: 1.65; }
  .login-copy .silver-line { margin-top: 16px; }
  .login-copy .motto { margin-top: 8px; }
  .panel-area { flex: none; width: 100%; padding: 0 18px; }
  .login-panel { width: min(100%, 506px); margin: 0 auto; padding: 26px 24px 22px; }
  .login-panel .section-title { margin: 8px 0 18px; font-size: 28px; }
  .field { padding: 10px 0; }
  .submit { margin-top: 26px; }
  .password-entry { margin-top: 15px; }
  .consent { margin-top: 16px; }
}
</style>
