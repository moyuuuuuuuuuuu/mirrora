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
    {path:'pages/history-detail/index'}
    ,{path:'pages/login/index'}
  ],
  globalStyle:{navigationStyle:'custom',backgroundColor:'#f4f5f7',backgroundTextStyle:'dark'},
  tabBar:{color:'#8b8e94',selectedColor:'#701f32',backgroundColor:'#ffffff',borderStyle:'white',list:[
    {pagePath:'pages/index/index',text:'顾问'},
    {pagePath:'pages/tryon/index',text:'试衣间'},
    {pagePath:'pages/profile/index',text:'我的'}
  ]}
})
