<template><view class="route-loading">正在返回镜面…</view></template>
<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
onLoad(query=>{
  const params: Record<string,string> = {}
  const panel = ''
  if(panel)params.panel=panel
  if(query?.module)params.mode=String(query.module)
  if(query?.id)params.id=String(query.id)
  uni.reLaunch({url:`/pages/index/index?${Object.entries(params).map(([key,value])=>key+'='+encodeURIComponent(value)).join('&')}`})
})
</script>
<style scoped>.route-loading{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#887762;color:#f6edde;font-size:14px}</style>
