<template>
  <view class="page tryon-page">
    <AppHeader />
    <view class="content">
      <view class="hero-copy"><text class="eyebrow">VIRTUAL TRY-ON · 2D</text><view class="display">试衣间</view><view class="lead">上传一张本人全身照和一张服装图，单件或套装均可，生成写实试穿效果。</view></view>
      <view class="upload-grid">
        <view class="upload-card" @click="choosePerson"><view class="card-head"><b>01</b><text>本人全身照</text></view><image v-if="draft.localPhoto" :src="draft.localPhoto" mode="aspectFit"/><view v-else class="empty"><text class="upload-mark">＋</text><b>上传或拍摄全身照</b><small>自然站立、全身入镜、光线清晰</small></view><view class="ghost-btn editorial-btn">{{draft.localPhoto?'更换人物照片':'选择人物照片'}}</view></view>
        <view class="upload-card" @click="chooseGarment"><view class="card-head"><b>02</b><text>服装图</text></view><image v-if="draft.localGarment" :src="draft.localGarment" mode="aspectFit"/><view v-else class="empty"><text class="upload-mark">＋</text><b>上传服装图片</b><small>单件或套装均可，优先无遮挡、完整展示</small></view><view class="ghost-btn editorial-btn">{{draft.localGarment?'更换服装图片':'选择服装图片'}}</view></view>
      </view>
      <view class="settings"><view><view class="section-title">还有什么特别要求？</view><view class="lead">无需选择服装类别，AI 会根据图片判断上装、下装、连衣裙、外套或套装。</view></view><wd-textarea v-model="preferences" :maxlength="200" show-word-limit placeholder="可选：例如整套替换、保留当前裤子、内搭不要改变、希望自然合身……"/></view>
      <view class="submit-row"><wd-checkbox v-model="consent" shape="square">我确认照片中的人物已满 18 岁、是本人或已获授权，并同意用于本次 AI 试衣。</wd-checkbox><view class="editorial-btn" :class="{disabled:!ready||busy}" @click="submit">{{busy?'正在提交…':'生成试衣效果　→'}}</view></view>
      <view v-if="recent.length" class="recent"><view class="section-title">最近试穿</view><view class="recent-grid"><view v-for="item in recent" :key="item.id" class="recent-card" @click="open(item)"><image :src="item.result_image_url||item.photo_url" mode="aspectFill"/><text>{{statusText[item.status]}}</text><small>{{new Date(item.created_at).toLocaleDateString()}}</small></view></view></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import{computed,onMounted,ref}from'vue'
import{onShow}from'@dcloudio/uni-app'
import{createConsultation,listConsultations,uploadPhoto,type Consultation}from'../../api'
import{isLoggedIn,openLogin}from'../../auth'
import{draft}from'../../state'
const statusText:Record<Consultation['status'],string>={queued:'排队中',running:'生成中',succeeded:'已完成',failed:'未完成'}
const consent=ref(false),busy=ref(false),preferences=ref(draft.preferences),recent=ref<Consultation[]>([])
const ready=computed(()=>Boolean(draft.localPhoto&&draft.localGarment&&consent.value))
onShow(()=>{if(!isLoggedIn())openLogin('tryon')})
onMounted(async()=>{draft.module='tryon';if(!isLoggedIn())return;try{recent.value=(await listConsultations()).items.filter(x=>x.module==='tryon').slice(0,6)}catch{}})
function choosePerson(){uni.chooseImage({count:1,sizeType:['compressed'],sourceType:['album','camera'],success:r=>{draft.localPhoto=r.tempFilePaths[0];draft.photoURL=''}})}
function chooseGarment(){uni.chooseImage({count:1,sizeType:['compressed'],sourceType:['album','camera'],success:r=>{draft.localGarment=r.tempFilePaths[0];draft.garmentURL=''}})}
async function submit(){if(!isLoggedIn()){openLogin('tryon');return}if(!ready.value||busy.value)return;busy.value=true;try{const[person,garment]=await Promise.all([draft.photoURL?Promise.resolve({url:draft.photoURL}):uploadPhoto(draft.localPhoto),draft.garmentURL?Promise.resolve({url:draft.garmentURL}):uploadPhoto(draft.localGarment)]);draft.photoURL=person.url;draft.garmentURL=garment.url;draft.preferences=preferences.value;const c=await createConsultation({module:'tryon',photo_url:person.url,garment_url:garment.url,presentation:draft.presentation,preferences:preferences.value,adult_confirmed:true});draft.consultationId=c.id;uni.navigateTo({url:`/pages/analyzing/index?id=${c.id}&module=${c.module}`})}catch{uni.showToast({title:'提交失败，请检查图片后重试',icon:'none'})}finally{busy.value=false}}
function open(item:Consultation){uni.navigateTo({url:item.status==='succeeded'?`/pages/history-detail/index?id=${item.id}`:`/pages/analyzing/index?id=${item.id}&module=${item.module}`})}
</script>

<style scoped>
.tryon-page{padding-bottom:90px}.hero-copy{margin:42px 0 26px}.upload-grid{display:grid;gap:16px}.upload-card{background:rgba(255,255,255,.82);border:1px solid var(--line);padding:18px;cursor:pointer}.card-head{display:flex;gap:12px;align-items:center;font-family:"Songti SC",serif;font-size:19px;margin-bottom:15px}.card-head b{font-style:italic;color:var(--wine)}.upload-card>image,.empty{width:100%;height:360px;background:#eef0f2}.empty{display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:10px}.empty small{color:#777}.upload-mark{font-size:48px;font-weight:200}.upload-card>.editorial-btn{margin-top:12px}.settings{display:grid;gap:22px;background:rgba(255,255,255,.72);padding:24px;margin-top:18px}.garment-types{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px}.garment-types text{padding:14px;text-align:center;border:1px solid var(--line);cursor:pointer}.garment-types .active{background:var(--wine);color:#fff;border-color:var(--wine)}.submit-row{display:flex;gap:22px;align-items:center;margin-top:20px}.submit-row>.editorial-btn{margin-left:auto;white-space:nowrap}.disabled{opacity:.4;pointer-events:none}.recent{margin-top:50px}.recent-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:18px}.recent-card{background:#fff;padding:10px;cursor:pointer}.recent-card image{width:100%;height:230px}.recent-card text,.recent-card small{display:block;margin-top:8px}.recent-card small{color:#777}@media(max-width:650px){.submit-row{align-items:stretch;flex-direction:column}.submit-row>.editorial-btn{margin-left:0}}@media(min-width:900px){.upload-grid{grid-template-columns:1fr 1fr}.settings{grid-template-columns:1fr 1fr;align-items:center}.garment-types{grid-template-columns:repeat(4,1fr)}.recent-grid{grid-template-columns:repeat(6,1fr)}}
</style>
