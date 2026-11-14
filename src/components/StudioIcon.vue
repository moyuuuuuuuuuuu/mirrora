<template><image class="studio-icon" :src="src" mode="aspectFit" /></template>
<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M18 6 6 18', arrow: 'M4 12h16m-6-6 6 6-6 6',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6', check: 'm5 12 4 4L19 6',
  sparkle: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  hanger: 'M10 6a2 2 0 1 1 3 2v3l8 6v3H3v-3l10-6',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v6l4 2',
  reset: 'M4 10a8 8 0 1 1 1 8M4 3v7h7',
  compare: 'M12 2v20M9 5H3v14h6m6-14h6v14h-6',
  user: 'M8 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 22v-3a8 8 0 0 1 16 0v3',
  save: 'M5 3h14v19l-7-5-7 5Z', download: 'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
  chevron: 'm7 10 5 5 5-5', info: 'M12 11v6m0-10v1M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0',
  logout: 'M9 4H3v16h6m-1-8h13m-5-5 5 5-5 5',
  lock: 'M6 10h12v11H6Zm2 0V6a4 4 0 0 1 8 0v4',
  zoom: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  earring: 'M8 4a7 7 0 1 0 8 0M9 3v4m6-4v4',
  necklace: 'M3 3c0 8 2 12 9 14 7-2 9-6 9-14m-9 14-3 3 3 3 3-3Z',
  bag: 'M3 9h18l-1 12H4ZM8 9V6a4 4 0 0 1 8 0v3M10 13h4',
  watch: 'M8 7V1h8v6M8 17v6h8v-6M7 7h10v10H7Zm5 2v4h3',
}
const src = computed(() => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f6eddf" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[props.name] || paths.sparkle}"/></svg>`))
</script>
<style scoped>.studio-icon{width:v-bind('`${props.size}px`');height:v-bind('`${props.size}px`');display:inline-block;flex-shrink:0;vertical-align:middle;pointer-events:none}</style>
