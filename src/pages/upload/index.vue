<template><view class="consult-page"><ConsultationAside :module="pageModule"/><view class="main"><AppHeader/><view class="stepbar"><text>01<br/>了解需求</text><i></i><text class="active">02<br/>上传照片</text><i></i><text>03<br/>获取提案</text></view><view class="upload-panel"><view class="drop" @click="choose"><template v-if="!draft.localPhoto"><view class="face">⌗</view><view class="section-title">{{pageModule==='outfit'?'上传你的全身照片':'上传你的正面照片'}}</view><view class="lead">JPG、PNG 或 WebP · 最大 10 MB</view><view class="editorial-btn">选择照片</view><view class="ghost-btn editorial-btn">使用手机拍摄</view></template><image v-else :src="draft.localPhoto" mode="aspectFit"/></view><view class="preview"><view class="section-title">照片预览 <small v-if="!draft.localPhoto">（示例）</small></view><image :class="{'image-monochrome':!draft.localPhoto}" :src="draft.localPhoto||'/static/design/portrait-original.webp'" mode="aspectFill"/><view class="preview-actions"><view class="ghost-btn editorial-btn" @click="choose">更换照片</view><view class="ghost-btn editorial-btn" @click="remove">移除</view></view></view></view><view class="submit"><wd-checkbox v-model="consent" shape="square">我确认照片中的人物已满 18 岁，并同意将照片用于本次形象咨询。</wd-checkbox><view class="editorial-btn" :class="{disabled:!draft.localPhoto||!consent||busy}" @click="submit">{{busy?'正在提交…':'开始分析　→'}}</view></view></view></view></template>
<script setup lang="ts">
import{ref}from'vue'
import{onLoad,onShow,onHide,onUnload}from'@dcloudio/uni-app'
import{draft,setDraftPhoto}from'../../state'
import{errorMessage}from'../../api'
import{submitDraft}from'../../consultation'
const consent=ref(false),busy=ref(false),pageModule=ref(draft.module)
let sessionId=draft.sessionId,active=false
const current=()=>active&&sessionId===draft.sessionId&&pageModule.value===draft.module
onLoad(query=>{pageModule.value=(query?.module||draft.module) as typeof draft.module;sessionId=Number(query?.session??draft.sessionId)})
onShow(()=>{active=true;if(!current())uni.redirectTo({url:`/pages/preferences/index?module=${pageModule.value}`})})
onHide(()=>{active=false})
onUnload(()=>{active=false})
function choose(){if(busy.value||!current())return;uni.chooseImage({count:1,sizeType:['compressed'],sourceType:['album','camera'],success:r=>{if(current()&&r.tempFilePaths[0])setDraftPhoto(r.tempFilePaths[0])}})}
function remove(){if(!busy.value&&current())setDraftPhoto('')}
async function submit(){
  if(!draft.localPhoto||!consent.value||busy.value||!current())return
  busy.value=true
  try{const c=await submitDraft(consent.value,current);if(c)uni.redirectTo({url:`/pages/analyzing/index?id=${c.id}&module=${c.module}`})}
  catch(error){if(current())uni.showToast({title:errorMessage(error,'提交失败，请稍后重试'),icon:'none'})}
  finally{busy.value=false}
}
</script>
<style scoped>.consult-page{display:grid;min-height:100vh}.main{padding:20px 22px 80px}.stepbar{display:flex;justify-content:flex-end;align-items:center;gap:20px;margin:30px 0;color:#777;font-family:"Songti SC",serif;text-align:center}.stepbar i{width:40px;height:1px;background:#bbb}.stepbar .active{color:var(--wine);border-bottom:2px solid;padding-bottom:8px}.upload-panel{max-width:1050px;margin:55px auto 25px;background:#fff;padding:45px;display:grid;gap:40px}.drop{min-height:480px;border:1px dashed #aeb3ba;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}.drop>image{width:100%;height:480px}.face{font-size:65px;font-weight:200}.drop .editorial-btn{width:285px;margin-top:25px}.drop .ghost-btn{margin-top:10px}.preview image{width:100%;height:430px;margin:18px 0}.preview small{font-size:13px;color:#777}.preview-actions{display:flex;gap:10px}.preview-actions .editorial-btn{flex:1;height:46px}.submit{max-width:1050px;margin:auto;display:flex;align-items:center;gap:20px}.submit>.editorial-btn{margin-left:auto;min-width:220px}.disabled{opacity:.35}@media(min-width:900px){.consult-page{grid-template-columns:430px 1fr}.main{padding:20px 48px}.upload-panel{grid-template-columns:1.4fr .9fr}.preview image{height:430px}}</style>
