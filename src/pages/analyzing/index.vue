<template><view class="consult-page"><ConsultationAside :module="draft.module"/><view class="main"><AppHeader/><view class="stepbar"><text>01<br/>了解需求</text><i></i><text>02<br/>上传照片</text><i></i><text class="active">03<br/>获取结果</text></view><view class="analysis"><image src="/static/design/hero.webp" mode="aspectFill"/><view class="section-title">{{isTryon?'正在生成试衣效果':'正在形成你的形象提案'}}</view><view class="lead">{{isTryon?'正在匹配人物与服装，并保持你的真实身份、体态和背景。':'我正在结合你的面部轮廓、可见特征、生活方式与真实偏好。'}}</view><view class="stages"><view v-for="(s,i) in stages" :key="s" :class="{done:i<stage,active:i===stage}"><b>{{i<stage?'✓':i+1}}</b><text>{{s}}</text></view></view><view class="waiting">无需停留在此页，完成后会自动展示</view></view></view></view></template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getConsultation } from '../../api'
import { draft } from '../../state'

const isTryon = computed(() => draft.module === 'tryon')
const stages = computed(() => isTryon.value ? ['读取人物全身照', '识别服装结构', '生成自然穿着效果', '保存试衣结果'] : ['读取轮廓与比例', '理解可见特征', '匹配风格与生活场景', '整理可执行建议'])
const stage = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  const page = getCurrentPages().at(-1) as { options?: Record<string, string> } | undefined
  const id = String(page?.options?.id || draft.consultationId)
  timer = setInterval(async () => {
    stage.value = Math.min(3, stage.value + 1)
    try {
      const consultation = await getConsultation(id)
      if (consultation.status === 'succeeded')
        uni.redirectTo({ url: `/pages/result/index?id=${id}` })
      if (consultation.status === 'failed')
        uni.showModal({ title: '本次分析未完成', content: consultation.error_code || '请稍后重试', showCancel: false })
    }
    catch {}
  }, 1800)
})
onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})
</script>
<style scoped>.consult-page{display:grid;min-height:100vh}.main{padding:20px 22px}.stepbar{display:flex;justify-content:flex-end;align-items:center;gap:20px;margin:30px 0;color:#777;font-family:"Songti SC",serif;text-align:center}.stepbar i{width:40px;height:1px;background:#bbb}.stepbar .active{color:var(--wine);border-bottom:2px solid;padding-bottom:8px}.analysis{text-align:center;max-width:1050px;margin:35px auto}.analysis>image{width:360px;height:360px;filter:grayscale(1);mask-image:linear-gradient(to bottom,#000 60%,transparent)}.stages{display:grid;grid-template-columns:repeat(4,1fr);margin:45px 0}.stages view{display:flex;flex-direction:column;align-items:center;gap:12px;color:#8b8f96;position:relative}.stages view:after{content:'';position:absolute;top:15px;left:58%;width:84%;height:1px;background:#c8cbd0}.stages view:last-child:after{display:none}.stages b{z-index:1;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#d9dce1}.stages .done b{background:#444;color:white}.stages .active{color:var(--wine)}.stages .active b{background:var(--wine);color:white;box-shadow:0 0 0 8px rgba(151,11,38,.12)}.waiting{font-family:"Songti SC",serif;color:#777}@media(min-width:900px){.consult-page{grid-template-columns:430px 1fr}.main{padding:20px 48px}.analysis>image{width:450px;height:420px}}</style>
