import { defineManifestConfig } from '@uni-helper/vite-plugin-uni-manifest'
export default defineManifestConfig({
  name:'镜界',appid:'__UNI__MIRROR',description:'AI 私人形象顾问',versionName:'0.1.0',versionCode:'10',transformPx:false,vueVersion:'3',uniStatistics:{enable:false},
  'app-plus':{usingComponents:true,nvueStyleCompiler:'uni-app',compilerVersion:3,splashscreen:{alwaysShowBeforeRender:true,waiting:true,autoclose:true,delay:0},modules:{Camera:{}},distribute:{android:{permissions:['<uses-permission android:name="android.permission.INTERNET"/>','<uses-permission android:name="android.permission.CAMERA"/>','<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>']},ios:{privacyDescription:{NSCameraUsageDescription:'用于拍摄本人正面照片并生成形象建议',NSPhotoLibraryUsageDescription:'用于选择本人照片并生成形象建议',NSPhotoLibraryAddUsageDescription:'用于保存形象建议效果图'}},sdkConfigs:{}}},
  'mp-weixin':{appid:'',usingComponents:true},'mp-toutiao':{appid:'',usingComponents:true},h5:{router:{mode:'history',base:'/'}}
})

