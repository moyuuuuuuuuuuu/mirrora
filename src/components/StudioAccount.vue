<template>
  <view class="account-content">
    <template v-if="kind === 'login'">
      <text class="overline">YOUR PRIVATE SPACE</text><view class="panel-title">登录镜界</view><text class="muted">保存每一次，更适合自己的发现。</text>
      <view class="segmented"><button tabindex="0" role="button" :class="{active:!passwordMode}" @click="passwordMode=false">邮箱验证码</button><button tabindex="0" role="button" :class="{active:passwordMode}" @click="passwordMode=true">密码登录</button></view>
      <view class="form-field"><text>邮箱</text><input v-model="email" placeholder="请输入邮箱地址" type="text" maxlength="120" /></view>
      <view v-if="!passwordMode" class="form-field"><text>验证码</text><view class="inline-field"><input v-model="code" type="number" maxlength="6" placeholder="6 位验证码"/><button tabindex="0" role="button" class="subtle-button" :disabled="sending || countdown>0" @click="sendCode">{{countdown>0?`${countdown}s 后重试`:sending?'发送中…':'获取验证码'}}</button></view></view>
      <view v-else class="form-field"><text>密码</text><input v-model="password" password placeholder="至少 8 位密码" maxlength="128" @confirm="login" /></view>
      <view class="consent-line"><button tabindex="0" role="button" class="check-box" :class="{checked:agreed}" aria-label="同意用户协议和隐私政策" @click="agreed=!agreed">{{agreed?'✓':''}}</button><text>已阅读并同意</text><button tabindex="0" role="button" class="text-button" @click="$emit('legal','agreement')">用户协议</button><text>与</text><button tabindex="0" role="button" class="text-button" @click="$emit('legal','privacy')">隐私政策</button></view>
      <text v-if="error" class="form-error" role="alert">{{error}}</text><button :tabindex="(busy || !agreed) ? -1 : 0" :aria-disabled="busy || !agreed" role="button" class="primary-button full-button" :disabled="busy || !agreed" @click="login">{{busy?'正在登录…':'登录并继续'}}<StudioIcon name="arrow"/></button>
    </template>
    <template v-else>
      <text class="overline">PERSONAL SETTINGS</text><view class="panel-title">账户设置</view>
      <view v-if="loading" class="empty-state">正在读取账户…</view>
      <template v-else-if="isLoggedIn()">
        <view class="account-avatar"><button tabindex="0" role="button" class="avatar-large" aria-label="更换头像" @click="chooseAvatar"><image v-if="avatarPreview" :src="avatarPreview" mode="aspectFill"/><StudioIcon v-else name="user" :size="32"/></button><view><text>{{currentUser?.nickname || '我的账户'}}</text><text class="muted small">{{email}}</text><button tabindex="0" role="button" class="text-button" @click="chooseAvatar">更换头像</button></view></view>
        <view class="form-field"><text>昵称</text><input v-model="nickname" maxlength="30" placeholder="给自己一个名字" /></view>
        <button :tabindex="(busy || !profileReady) ? -1 : 0" :aria-disabled="busy || !profileReady" role="button" class="outline-button full-button" :disabled="busy || !profileReady" @click="saveProfile">{{busy?'正在保存…':'保存资料'}}</button>
        <button tabindex="0" role="button" class="setting-row" @click="passwordOpen=!passwordOpen"><StudioIcon name="lock"/><text>{{hasPassword?'修改密码':'设置密码'}}</text><StudioIcon name="chevron"/></button>
        <view v-if="passwordOpen" class="password-fields">
          <view v-if="hasPassword" class="form-field"><text>当前密码</text><input v-model="oldPassword" password placeholder="当前密码"/></view>
          <view class="form-field"><text>新密码</text><input v-model="newPassword" password maxlength="128" placeholder="至少 8 位"/></view>
          <view class="form-field"><text>确认密码</text><input v-model="confirmPassword" password maxlength="128" placeholder="再输入一次新密码"/></view>
          <button :tabindex="(busy || !profileReady) ? -1 : 0" :aria-disabled="busy || !profileReady" role="button" class="primary-button full-button" :disabled="busy || !profileReady" @click="savePassword">确认修改并重新登录</button>
        </view>
        <text v-if="error" class="form-error" role="alert">{{error}}</text>
        <button tabindex="0" role="button" class="setting-row" @click="$emit('legal','agreement')">用户协议<StudioIcon name="arrow"/></button><button tabindex="0" role="button" class="setting-row" @click="$emit('legal','privacy')">隐私政策<StudioIcon name="arrow"/></button>
        <button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="outline-button full-button logout-button" :disabled="busy" @click="logout"><StudioIcon name="logout"/>退出登录</button>
      </template>
      <view v-else class="empty-state"><StudioIcon name="user" :size="36"/><view>登录后管理你的个人资料</view><button tabindex="0" role="button" class="primary-button" @click="loginRequested=true">登录镜界</button></view>
      <text v-if="error && !isLoggedIn()" class="form-error">{{error}}</text>
    </template>
  </view>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { sendEmailCode, loginWithEmail, loginWithPassword, getProfile, updateProfile, updatePassword, uploadPhoto, errorMessage } from '../api'
import { currentUser, isLoggedIn, setCurrentUser, loginRequested, expireSession } from '../auth'
import StudioIcon from './StudioIcon.vue'
const props = defineProps<{kind:'login'|'account'}>()
const emit = defineEmits<{(e:'legal',type:'agreement'|'privacy'):void;(e:'done',message:string):void}>()
const email=ref(''),code=ref(''),password=ref(''),passwordMode=ref(false),agreed=ref(false),busy=ref(false),sending=ref(false),countdown=ref(0),error=ref('')
const nickname=ref(''),avatar=ref(''),avatarPreview=ref(''),localAvatar=ref(''),hasPassword=ref(false),profileReady=ref(false),loading=ref(false),passwordOpen=ref(false),oldPassword=ref(''),newPassword=ref(''),confirmPassword=ref('')
let timer: ReturnType<typeof setInterval>|undefined, alive=true
const validEmail=()=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
async function sendCode(){
  if(sending.value||countdown.value)return
  if(!validEmail()){error.value='请输入正确的邮箱地址';return}
  sending.value=true;error.value=''
  try{await sendEmailCode(email.value.trim());if(!alive)return;countdown.value=60;timer=setInterval(()=>{if(--countdown.value<=0&&timer)clearInterval(timer)},1000)}catch(e){if(alive)error.value=errorMessage(e,'验证码发送失败，请稍后再试')}finally{sending.value=false}
}
async function login(){
  if(busy.value||!agreed.value)return
  if(!validEmail()||(passwordMode.value?password.value.length<8:!/^\d{6}$/.test(code.value))){error.value='请填写正确的邮箱和验证码或密码';return}
  busy.value=true;error.value=''
  try{const user=await(passwordMode.value?loginWithPassword(email.value.trim(),password.value):loginWithEmail(email.value.trim(),code.value));if(!alive)return;uni.setStorageSync('mirror_token',user.token);setCurrentUser({nickname:user.nickname,avatar:user.avatar});loginRequested.value=false;emit('done','登录成功，可以继续编辑')}catch(e){if(alive)error.value=errorMessage(e,'登录失败，请检查输入')}finally{busy.value=false}
}
onMounted(async()=>{if(props.kind!=='account'||!isLoggedIn())return;loading.value=true;try{const p=await getProfile();if(!alive)return;email.value=p.email;nickname.value=p.nickname;avatar.value=p.avatar;avatarPreview.value=p.avatar;hasPassword.value=p.has_password;profileReady.value=true}catch(e){if(alive)error.value=errorMessage(e,'账户读取失败，请关闭面板后重试')}finally{loading.value=false}})
function chooseAvatar(){if(busy.value||!profileReady.value)return;uni.chooseImage({count:1,sizeType:['compressed'],success:r=>{if(alive&&r.tempFilePaths[0]){localAvatar.value=r.tempFilePaths[0];avatarPreview.value=r.tempFilePaths[0]}}})}
async function saveProfile(){if(busy.value||!profileReady.value)return;if(!nickname.value.trim()){error.value='请输入昵称';return}busy.value=true;error.value='';try{const url=localAvatar.value?(await uploadPhoto(localAvatar.value,'avatar')).url:avatar.value;if(!alive)return;const p=await updateProfile({nickname:nickname.value.trim(),avatar:url});if(!alive)return;setCurrentUser({nickname:p.nickname,avatar:p.avatar});avatar.value=p.avatar;localAvatar.value='';emit('done','个人资料已更新')}catch(e){if(alive)error.value=errorMessage(e,'保存失败，请重试')}finally{busy.value=false}}
async function savePassword(){if(busy.value||!profileReady.value)return;if(newPassword.value.length<8||newPassword.value!==confirmPassword.value||(hasPassword.value&&!oldPassword.value)){error.value='请填写当前密码，并确保两次新密码一致且至少 8 位';return}busy.value=true;error.value='';try{await updatePassword({current_password:oldPassword.value,new_password:newPassword.value});if(!alive)return;expireSession();emit('done','密码已修改，请重新登录')}catch(e){if(alive)error.value=errorMessage(e,'密码修改失败')}finally{busy.value=false}}
function logout(){uni.removeStorageSync('mirror_token');setCurrentUser(null);emit('done','已退出登录，私人照片已从工作台清除')}
onUnmounted(()=>{alive=false;if(timer)clearInterval(timer)})
</script>
