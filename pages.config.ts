import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'
export default defineUniPages({
  pages:[
    {path:'pages/index/index',type:'home'},
    {path:'pages/modules/index'},
    {path:'pages/preferences/index'},
    {path:'pages/upload/index'},
    {path:'pages/analyzing/index'},
    {path:'pages/result/index'},
    {path:'pages/profile/index'},
    {path:'pages/tryon/index'},
    {path:'pages/history-detail/index'},
    {path:'pages/login/index'},
    {path:'pages/user-agreement/index'},
    {path:'pages/privacy-policy/index'}
  ],
  globalStyle:{navigationStyle:'custom',backgroundColor:'#a89882',backgroundTextStyle:'light',disableScroll:true}
})
