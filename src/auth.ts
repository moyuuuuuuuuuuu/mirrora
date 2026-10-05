import { ref } from 'vue'
import { draft, startConsultation } from './state'

export type SessionUser = { nickname: string; avatar?: string }

function storedUser(): SessionUser | null {
  try {
    const value = uni.getStorageSync('mirror_user')
    if (value && typeof value === 'object' && typeof value.nickname === 'string')
      return value as SessionUser
  }
  catch {}
  return null
}

export const currentUser = ref<SessionUser | null>(storedUser())

export function isLoggedIn() {
  return Boolean(currentUser.value && uni.getStorageSync('mirror_token'))
}

export function openLogin(redirect = 'modules') {
  uni.navigateTo({ url: `/pages/login/index?redirect=${encodeURIComponent(redirect)}` })
}

export function setCurrentUser(user: SessionUser | null) {
  currentUser.value = user
  if (user)
    uni.setStorageSync('mirror_user', user)
  else
    uni.removeStorageSync('mirror_user')
}

export function expireSession() {
  uni.removeStorageSync('mirror_token')
  setCurrentUser(null)
  startConsultation(draft.module)
  const pages = getCurrentPages()
  if (pages.at(-1)?.route !== 'pages/login/index')
    openLogin('profile')
}
