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
          <view class="section-title">邮箱验证码登录</view>
          <view class="field"><text>邮箱</text><input v-model="email" type="text" placeholder="请输入邮箱地址" /></view>
          <view class="field code">
            <view><text>验证码</text><input v-model="code" type="number" maxlength="6" placeholder="请输入 6 位验证码" /></view>
            <button :disabled="sending || countdown > 0" @click="sendCode">{{ countdown > 0 ? `${countdown}s 后重试` : (sending ? '发送中…' : '获取验证码') }}</button>
          </view>
          <button class="submit" :disabled="busy" @click="emailLogin">{{ busy ? '登录中…' : '登录　→' }}</button>
          <text class="agreement">登录即表示同意服务协议与隐私政策</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loginWithEmail, sendEmailCode } from '../../api'
import { setCurrentUser } from '../../auth'

const email = ref('')
const code = ref('')
const sending = ref(false)
const busy = ref(false)
const countdown = ref(0)
const redirect = ref('')
let timer: ReturnType<typeof setInterval> | undefined

onLoad((options) => { redirect.value = String(options?.redirect || '') })

function validEmail() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) }

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

async function emailLogin() {
  if (!validEmail() || code.value.trim().length !== 6) {
    uni.showToast({ title: '请填写邮箱和 6 位验证码', icon: 'none' })
    return
  }
  if (busy.value) return
  busy.value = true
  try {
    const result = await loginWithEmail(email.value.trim(), code.value.trim())
    uni.setStorageSync('mirror_token', result.token)
    setCurrentUser({ nickname: result.nickname })
    if (redirect.value === 'tryon' || redirect.value === 'profile')
      uni.switchTab({ url: redirect.value === 'tryon' ? '/pages/tryon/index' : '/pages/profile/index' })
    else
      uni.redirectTo({ url: '/pages/modules/index' })
  } catch {
    uni.showToast({ title: '验证码错误或已过期', icon: 'none' })
  } finally {
    busy.value = false
  }
}

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.login-page { padding-bottom: 0; }
.login-layout { display: grid; width: 100vw; min-height: calc(100vh - var(--status-bar-height) - 74px); margin-left: calc(50% - 50vw); background: linear-gradient(120deg, #f7f8fa 0%, #eef0f3 48%, #d8dbe0 72%, #fafafa 100%); }
.login-copy { padding: 70px max(28px, calc((100vw - 1460px) / 2 + 8vw)); display: flex; flex-direction: column; justify-content: center; }
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
.other { margin-top: 30px; padding-top: 22px; border-top: 1px solid #d9dce1; }
.other > text { display: block; text-align: center; font-size: 12px; color: #8b8f96; }
.other-actions { display: flex; align-items: center; justify-content: center; gap: 17px; margin-top: 16px; }
.other-actions > view { display: flex; align-items: center; gap: 7px; color: #555b64; cursor: pointer; transition: color .18s ease; }
.other-actions > view:hover { color: var(--wine); }
.other-actions text { font-family: "Songti SC", serif; font-size: 13px; }
.other-actions i { width: 1px; height: 18px; background: #c9cdd3; }
.agreement { display: block; margin-top: 18px; text-align: center; font-size: 11px; color: #92969d; }
@media (min-width: 900px) {
  .login-layout { grid-template-columns: 1.15fr .85fr; min-height: calc(100vh - 90px); }
  .login-copy .display { font-size: 64px; }
}
@media (max-width: 899px) {
  .login-copy { padding: 55px 28px; }
  .login-panel { width: calc(100% - 36px); margin-bottom: 40px; padding: 30px 24px; }
}
</style>
