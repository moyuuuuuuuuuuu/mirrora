# 镜界客户端

uni-app + Vue 3 + TypeScript + Wot UI。支持 H5、App、微信小程序和抖音小程序。

## 构建

```bash
pnpm install
pnpm type-check
pnpm build:h5
pnpm build:app
pnpm build:mp-weixin
pnpm build:mp-toutiao
```

生产环境通过 `VITE_API_BASE_URL` 指向 Go API，通过 `VITE_ASSET_BASE_URL` 指向 BOS 静态资源版本目录。App 云打包仍需在 HBuilderX 中配置正式 `appid`、签名和应用市场隐私文本。

