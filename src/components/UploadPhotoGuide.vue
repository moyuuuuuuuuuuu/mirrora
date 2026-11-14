<template>
  <view class="photo-guide">
    <image :src="asset('studio/upload-guide.svg')" mode="aspectFit" aria-label="合格照片示意：单人正面站立，从头到鞋完整入镜，双手自然下垂"/>
    <view><text class="guide-title">这样拍，更容易保留本人特征</text><text>单人正面 · 从头到鞋完整入镜</text><text>双臂自然下垂，手和腿清晰可见</text><text>手机放平，光线均匀，背景简洁</text><text class="guide-avoid">避免插兜、遮脸、裁掉脚部和美颜滤镜</text><text class="guide-caption">拍摄示意，非生成效果</text></view>
  </view>
</template>
<script setup lang="ts">
import {asset} from '../studio/assets'
</script>
<style scoped>
.photo-guide{display:flex;gap:16px;align-items:center;text-align:left;margin:18px 0;padding:14px;border:1px solid #eadbc333;border-radius:16px;background:#ffffff08}.photo-guide image{flex:none;width:86px;height:125px}.photo-guide>view{display:flex;flex-direction:column;gap:7px;min-width:0}.photo-guide text{font-size:11px;line-height:1.6;color:#eee3d5}.photo-guide .guide-title{font-size:13px;font-weight:600}.photo-guide .guide-avoid{color:#ead0ad}.photo-guide .guide-caption{font-size:9px;opacity:.6}@media(max-width:700px){.photo-guide{gap:12px;padding:10px}.photo-guide image{width:68px;height:112px}}
</style>
