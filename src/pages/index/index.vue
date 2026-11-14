<template><MirrorStudio ref="studio" :query="query"/></template>
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import MirrorStudio from '../../components/MirrorStudio.vue'
const query=ref<Record<string,string|undefined>>({})
const studio=ref<InstanceType<typeof MirrorStudio>>()
onLoad(options=>{query.value=options || {}})
onShow(()=>studio.value?.resume())
onHide(()=>studio.value?.suspend())
</script>
