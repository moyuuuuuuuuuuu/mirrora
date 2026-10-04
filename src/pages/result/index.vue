<template>
  <view class="page">
    <AppHeader/>
    <view v-if="loading" class="content result-head lead">正在载入本次结果…</view>
    <view v-else-if="error" class="content result-head lead">{{error}}</view>
    <template v-else-if="item&&module">
      <view class="content result-head"><text class="eyebrow">{{module.en}} CREATES A MORE YOU</text><view class="section-title">{{isTryon?'你的试衣效果':`你的${module.name}形象提案`}}</view><view class="lead">{{isTryon?'AI 生成效果仅供视觉参考，不代表实际尺码与合身度':'基于你的真实特征与生活方式'}}</view></view>
      <view class="content result-grid">
        <view class="comparison">
          <view class="result-banner">{{isTryon?'人物原图 · 服装参考 · 试穿结果':`${module.name} · 本次咨询结果`}}</view>
          <view v-if="warning" class="result-warning">{{warning}}</view>
          <view class="before-after" :class="{tryon:isTryon,'photo-only':!item.result_image_url}">
            <view><text>人物原图</text><image :src="item.photo_url" mode="aspectFit"/></view>
            <template v-if="isTryon"><b>＋</b><view><text>服装参考</text><image :src="item.garment_url" mode="aspectFit"/></view></template>
            <b v-if="item.result_image_url">→</b>
            <view v-if="item.result_image_url"><text>{{isTryon?'试穿结果':'建议效果'}}</text><image :src="item.result_image_url" mode="aspectFit"/></view>
          </view>
        </view>
        <view class="recommend"><view class="section-title">{{isTryon?'本次试穿说明':'本次形象建议'}}</view><view class="analysis-copy"><rich-text :nodes="analysisHtml"/></view><view class="actions"><view class="editorial-btn" @click="again">{{isTryon?'再试一件':'重新咨询'}}</view></view></view>
      </view>
    </template>
  </view>
</template>
<script setup lang="ts">
import{ref,computed}from'vue'
import{onLoad,onUnload}from'@dcloudio/uni-app'
import{getConsultation,type Consultation}from'../../api'
import{startConsultation,modules}from'../../state'
import{resultWarning}from'../../result-quality'
import{renderMarkdown}from'../../markdown'
const item=ref<Consultation>(),loading=ref(true),error=ref('')
let active=true
const module=computed(()=>modules[item.value?.module as keyof typeof modules])
const isTryon=computed(()=>item.value?.module==='tryon')
const warning=computed(()=>resultWarning(item.value))
const analysisHtml=computed(()=>renderMarkdown(item.value?.analysis||''))
onLoad(async query=>{
  const id=String(query?.id||'')
  try{
    if(!id)throw new Error('missing_id')
    const result=await getConsultation(id)
    if(!active)return
    if(result.id!==id||result.status!=='succeeded'||!Object.prototype.hasOwnProperty.call(modules,result.module))throw new Error('invalid_result')
    item.value=result
  }catch{if(active)error.value='本次结果不存在或暂时无法读取，请到形象档案查看记录。'}
  finally{if(active)loading.value=false}
})
onUnload(()=>{active=false})
function again(){if(isTryon.value){startConsultation('tryon');uni.switchTab({url:'/pages/tryon/index'})}else uni.navigateTo({url:'/pages/modules/index'})}
</script>
<style scoped>
.result-warning{padding:16px 18px;margin-bottom:18px;background:#fff4e9;border:1px solid #dec7a8;color:#74512c;font-size:14px;line-height:1.8}
.before-after.photo-only{grid-template-columns:minmax(0,360px)}
.before-after.tryon.photo-only{grid-template-columns:1fr 24px 1fr}
.analysis-copy :deep(h1),.analysis-copy :deep(h2),.analysis-copy :deep(h3),.analysis-copy :deep(h4){font-family:"Songti SC",serif;font-size:18px;line-height:1.4;margin:18px 0 8px}
.analysis-copy :deep(p){margin:8px 0}.analysis-copy :deep(ol),.analysis-copy :deep(ul){padding-left:24px;margin:8px 0}.analysis-copy :deep(li){margin:4px 0}
@media(max-width:700px){.before-after.tryon.photo-only{grid-template-columns:1fr}}
</style>
<style scoped>.result-head{margin-top:45px}.result-grid{display:grid;gap:45px;margin-top:20px}.result-banner{background:linear-gradient(100deg,#fff,#d8dbe0,#fff);padding:20px;font-family:"Songti SC",serif;font-size:24px;margin-bottom:18px}.before-after{display:grid;grid-template-columns:1fr 30px 1fr;align-items:center;gap:12px}.before-after.tryon{grid-template-columns:1fr 24px 1fr 24px 1fr}.before-after view{position:relative}.before-after text{position:absolute;z-index:1;left:18px;top:15px;font-family:"Songti SC",serif;background:rgba(255,255,255,.75);padding:4px 7px}.before-after image{width:100%;height:460px}.before-after b{text-align:center;font-size:26px;font-weight:300}.options{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.options image{width:100%;height:190px}.options text{display:block;font-family:"Songti SC",serif;font-size:16px;margin-top:10px}.analysis-copy{box-sizing:border-box;height:460px;overflow-y:auto;overscroll-behavior:contain;white-space:pre-wrap;line-height:1.9;margin-top:25px;padding:25px;background:rgba(255,255,255,.72);border-top:1px solid var(--line)}@media(max-width:700px){.before-after.tryon{grid-template-columns:1fr}.before-after.tryon b{transform:rotate(90deg)}.analysis-copy{height:360px}}@media(min-width:900px){.result-grid{grid-template-columns:1.35fr .8fr}.result-head .section-title{font-size:46px}.options image{height:220px}}</style>
