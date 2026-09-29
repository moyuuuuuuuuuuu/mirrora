<template>
  <view class="consult-page">
    <ConsultationAside :module="activeModule" />
    <view class="main">
      <AppHeader />
      <view class="stepbar"><text>01<br>了解需求</text><i /><text>02<br>上传照片</text><i /><text class="active">03<br>获取结果</text></view>
      <view class="analysis">
        <image src="/static/design/hero.webp" mode="aspectFill" />
        <view class="section-title">{{ isTryon ? '正在生成试衣效果' : '正在形成你的形象提案' }}</view>
        <view class="lead">{{ isTryon ? '正在匹配人物与服装，并保持你的真实身份、体态和背景。' : '我正在结合你的面部轮廓、可见特征、生活方式与真实偏好。' }}</view>
        <view class="stages"><view v-for="(s, i) in stages" :key="s" :class="{ done: i < stage, active: i === stage }"><b>{{ i < stage ? '✓' : i + 1 }}</b><text>{{ s }}</text></view></view>
        <view class="waiting">无需停留在此页，完成后会自动展示</view>
      </view>
    </view>

    <view v-if="failure" class="failure-mask">
      <view class="failure-card">
        <view class="failure-mark">MIRRORA · ANALYSIS</view>
        <view class="failure-rule" />
        <view class="failure-kicker">分析暂未完成</view>
        <view class="failure-title">这次没有得到可靠结果</view>
        <view class="failure-copy">{{ failure.message }}</view>
        <view class="failure-actions">
          <view class="failure-secondary" @click="goToProfile">查看我的档案</view>
          <view class="failure-primary" @click="tryAgain">返回重新提交</view>
        </view>
        <view v-if="failure.reference" class="failure-reference">参考代码 {{ failure.reference }}</view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getConsultation } from '../../api'
import { draft } from '../../state'

const activeModule = ref(draft.module)
const isTryon = computed(() => activeModule.value === 'tryon')
const stages = computed(() => isTryon.value ? ['读取人物全身照', '识别服装结构', '生成自然穿着效果', '保存试衣结果'] : ['读取轮廓与比例', '理解可见特征', '匹配风格与生活场景', '整理可执行建议'])
const stage = ref(0)
const failure = ref<{ message: string, reference?: string }>()
let timer: ReturnType<typeof setInterval> | undefined

function describeFailure(code?: string) {
  if (code === 'coze_api_6031')
    return { message: '分析服务正在更新，当前模块暂时不可用。我们没有消耗或生成不完整的结果，请稍后再试。', reference: '6031' }
  if (code?.startsWith('coze_http_'))
    return { message: '分析服务暂时无法连接，请稍后再试。', reference: code.slice('coze_http_'.length) }
  if (code === 'coze_output_mismatch')
    return { message: '分析已经返回，但结果不完整。为了不向你展示不可靠的建议，请重新提交一次。' }
  return { message: '分析服务暂时没有完成这次请求，请稍后重新提交。' }
}

function tryAgain() {
  uni.navigateBack({ delta: 1 })
}

function goToProfile() {
  uni.switchTab({ url: '/pages/profile/index' })
}

onMounted(async () => {
  const page = getCurrentPages().at(-1) as { options?: Record<string, string> } | undefined
  const id = String(page?.options?.id || draft.consultationId)
  activeModule.value = page?.options?.module || draft.module

  const refresh = async () => {
    try {
      const consultation = await getConsultation(id)
      activeModule.value = consultation.module
      if (consultation.status === 'succeeded')
        uni.redirectTo({ url: `/pages/result/index?id=${id}` })
      if (consultation.status === 'failed') {
        failure.value = describeFailure(consultation.error_code)
        if (timer) {
          clearInterval(timer)
          timer = undefined
        }
      }
    }
    catch {}
  }

  await refresh()
  if (failure.value)
    return
  timer = setInterval(() => {
    stage.value = Math.min(3, stage.value + 1)
    void refresh()
  }, 1800)
})
onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})
</script>
<style scoped>
.consult-page{display:grid;min-height:100vh}.main{padding:20px 22px}.stepbar{display:flex;justify-content:flex-end;align-items:center;gap:20px;margin:30px 0;color:#777;font-family:"Songti SC",serif;text-align:center}.stepbar i{width:40px;height:1px;background:#bbb}.stepbar .active{color:var(--wine);border-bottom:2px solid;padding-bottom:8px}.analysis{text-align:center;max-width:1050px;margin:35px auto}.analysis>image{width:360px;height:360px;filter:grayscale(1);mask-image:linear-gradient(to bottom,#000 60%,transparent)}.stages{display:grid;grid-template-columns:repeat(4,1fr);margin:45px 0}.stages view{display:flex;flex-direction:column;align-items:center;gap:12px;color:#8b8f96;position:relative}.stages view:after{content:'';position:absolute;top:15px;left:58%;width:84%;height:1px;background:#c8cbd0}.stages view:last-child:after{display:none}.stages b{z-index:1;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#d9dce1}.stages .done b{background:#444;color:white}.stages .active{color:var(--wine)}.stages .active b{background:var(--wine);color:white;box-shadow:0 0 0 8px rgba(151,11,38,.12)}.waiting{font-family:"Songti SC",serif;color:#777}
.failure-mask{position:fixed;z-index:1000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,17,20,.62);backdrop-filter:blur(7px)}.failure-card{width:min(520px,calc(100vw - 48px));padding:34px 34px 28px;background:linear-gradient(145deg,#fff 0%,#f5f3f2 100%);border:1px solid rgba(255,255,255,.72);box-shadow:0 30px 90px rgba(0,0,0,.28);position:relative}.failure-card:before{content:'';position:absolute;left:0;top:0;width:4px;height:100%;background:var(--wine)}.failure-mark{font-size:10px;letter-spacing:3px;color:#85817f}.failure-rule{width:42px;height:1px;margin:18px 0 28px;background:var(--wine)}.failure-kicker{font-size:13px;letter-spacing:2px;color:var(--wine)}.failure-title{margin:10px 0 16px;font-family:"Songti SC",serif;font-size:30px;line-height:1.25}.failure-copy{color:#606066;font-size:15px;line-height:1.8}.failure-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:30px}.failure-primary,.failure-secondary{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0 22px;font-size:14px}.failure-primary{background:var(--wine);color:#fff}.failure-secondary{border:1px solid #c5c1c0;color:#383638}.failure-reference{margin-top:18px;font-size:10px;letter-spacing:1px;color:#a09c9a;text-align:right}
@media(max-width:520px){.failure-card{padding:28px 24px 24px}.failure-title{font-size:26px}.failure-actions{flex-direction:column-reverse}.failure-primary,.failure-secondary{width:100%}}
@media(min-width:900px){.consult-page{grid-template-columns:430px 1fr}.main{padding:20px 48px}.analysis>image{width:450px;height:420px}}
</style>
