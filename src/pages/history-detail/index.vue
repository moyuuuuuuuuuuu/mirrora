<template>
  <view class="page">
    <AppHeader />
    <view class="content detail">
      <view class="crumb">我的形象档案　/　{{module.name}}　/　历史记录</view>
      <view class="detail-head">
        <view><view class="section-title">{{isTryon?'试穿记录':`${module.name}咨询记录`}}</view><small v-if="item">{{new Date(item.created_at).toLocaleString()}}</small></view>
        <view class="actions"><view class="editorial-btn" @click="again">{{isTryon?'再次试穿':'再次咨询'}}</view><view v-if="item?.result_image_url" class="editorial-btn ghost-btn" @click="download">保存结果图</view></view>
      </view>
      <view v-if="loading" class="state">正在载入记录…</view>
      <view v-else-if="error" class="state">{{error}}</view>
      <view v-else-if="item" class="record" :class="{tryon:isTryon}">
        <view class="image-panel"><text>人物原图</text><image :src="item.photo_url||'/static/design/portrait-original.webp'" mode="aspectFill"/></view>
        <view v-if="isTryon" class="image-panel garment"><text>服装参考</text><image :src="item.garment_url" mode="aspectFit"/></view>
        <view class="image-panel"><text>{{isTryon?'试穿结果':'推荐效果'}}</text><image :src="item.result_image_url||'/static/design/portrait-result.webp'" mode="aspectFill"/></view>
        <view class="advice">
          <view class="section-title">{{isTryon?'本次试穿说明':'本次形象建议'}}</view>
          <view v-if="item.preferences" class="prefs"><b>我的要求</b><text>{{item.preferences}}</text></view>
          <view class="analysis">{{item.analysis||(isTryon?'AI 生成效果仅供视觉参考，请以真实试穿和商品尺码为准。':'在保留个人气质的基础上，选择自然且容易执行的方向。')}}</view>
          <view v-if="isTryon" class="notice">服装范围由 AI 根据上传图片自动判断，图片可为上装、下装、连衣裙、外套或套装。</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getConsultation, type Consultation } from '../../api'
import { draft, modules } from '../../state'

const item = ref<Consultation>()
const loading = ref(true)
const error = ref('')
const module = computed(() => modules[(item.value?.module || 'hair') as keyof typeof modules])
const isTryon = computed(() => item.value?.module === 'tryon')

onMounted(async () => {
  const page = getCurrentPages().at(-1) as { options?: Record<string, string> } | undefined
  const id = String(page?.options?.id || '')
  try {
    if (!id) throw new Error('missing_id')
    item.value = await getConsultation(id)
  } catch {
    error.value = '记录不存在或暂时无法读取'
  } finally {
    loading.value = false
  }
})

function again() {
  if (!item.value) return
  if (isTryon.value) {
    draft.module = 'tryon'
    draft.localPhoto = item.value.photo_url
    draft.photoURL = item.value.photo_url
    draft.localGarment = item.value.garment_url || ''
    draft.garmentURL = item.value.garment_url || ''
    draft.preferences = item.value.preferences || ''
    uni.switchTab({ url: '/pages/tryon/index' })
    return
  }
  draft.module = item.value.module
  uni.navigateTo({ url: `/pages/preferences/index?module=${item.value.module}` })
}

function download() {
  const url = item.value?.result_image_url
  if (!url) return
  uni.showLoading({ title: '正在保存' })
  uni.downloadFile({
    url,
    success: res => {
      if (res.statusCode !== 200) return uni.showToast({ title: '下载失败', icon: 'none' })
      uni.saveImageToPhotosAlbum({ filePath: res.tempFilePath, success: () => uni.showToast({ title: '已保存到相册' }), fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }) })
    },
    fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
    complete: () => uni.hideLoading(),
  })
}
</script>

<style scoped>
.detail{margin-top:35px}.crumb{font-family:"Songti SC",serif;color:#676b72}.detail-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:22px 0}.detail-head small{display:block;color:#777;margin-top:8px}.actions{display:flex;gap:10px}.record{display:grid;gap:24px;background:rgba(255,255,255,.72);padding:18px}.image-panel>text{display:block;font-family:"Songti SC",serif;font-size:18px;margin-bottom:14px}.image-panel image{width:100%;height:420px;background:#eef0f2}.prefs{display:grid;gap:8px;padding:16px 0;border-bottom:1px solid var(--line)}.prefs b{font-family:"Songti SC",serif}.prefs text,.analysis,.notice{white-space:pre-wrap;line-height:1.9}.analysis{margin-top:18px}.notice{color:#676b72;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}.state{padding:70px 20px;text-align:center;background:rgba(255,255,255,.7);color:#676b72}@media(max-width:650px){.detail-head{align-items:flex-start;flex-direction:column}.actions{width:100%;flex-direction:column}.image-panel image{height:390px}}@media(min-width:900px){.record{grid-template-columns:290px 370px 1fr}.record.tryon{grid-template-columns:1fr 1fr 1.2fr}.record.tryon .advice{grid-column:1/-1}.image-panel image{height:500px}}
</style>
