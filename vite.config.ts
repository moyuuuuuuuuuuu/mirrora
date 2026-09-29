import Uni from '@uni-helper/plugin-uni'
import Components from '@uni-helper/vite-plugin-uni-components'
import Manifest from '@uni-helper/vite-plugin-uni-manifest'
import Pages from '@uni-helper/vite-plugin-uni-pages'
import { defineConfig } from 'vite'
import { WotResolver } from './src/resolver'
export default defineConfig({server:{port:5173,proxy:{'/api':{target:'http://127.0.0.1:8080',changeOrigin:true,rewrite:p=>p.replace(/^\/api/,'')}}},plugins:[Manifest(),Pages({dts:'src/uni-pages.d.ts'}),Components({resolvers:[WotResolver()],dts:'src/components.d.ts'}),Uni()]})

