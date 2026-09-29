<template><view><AppHeader/><view class="back" @click="back">← 返回上一步</view><text class="eyebrow"><slot name="eyebrow"/></text><view class="section-title"><slot/></view><view class="lead"><slot name="lead"/></view></view></template>
<script setup lang="ts">function back(){uni.navigateBack()}</script>
<style scoped>.back{margin:28px 0 32px;color:#62666e;font-family:"Songti SC",serif;font-size:14px}</style>
