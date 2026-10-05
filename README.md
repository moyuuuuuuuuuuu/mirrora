# 镜界客户端

uni-app + Vue 3 + TypeScript + Wot UI。支持 H5、App、微信小程序和抖音小程序。

## 构建

```bash
pnpm install
pnpm test
pnpm type-check
pnpm build:h5
pnpm build:app
pnpm build:mp-weixin
pnpm build:mp-toutiao
```

生产环境通过 `VITE_API_BASE_URL` 指向 Go API。`VITE_ASSET_BASE_URL` 只用于 BOS 上的图片和字体；HTML、JavaScript、CSS 仍由 Web 容器本地提供。App 云打包仍需在 HBuilderX 中配置正式 `appid`、签名和应用市场隐私文本。

## 发布配置

H5 可用同域 `/api`；小程序和 App 发布必须填写绝对 HTTPS `VITE_API_BASE_URL` 与对应的 `VITE_WEIXIN_APP_ID`、`VITE_TOUTIAO_APP_ID` 或 `VITE_UNI_APP_ID`。缺少生产 API、ID 为空或使用 MIRROR 占位值时构建会失败。`MIRRORA_ALLOW_DEMO_BUILD=1` 仅用于本地编译回归，不得将产物发布。正式 ID、证书与签名需使用各平台真实账号配置。

NAS 发布脚本自动生成 `releases/<发布编号>` 资源前缀，并在切换前上传图片、字体；`VITE_ASSET_BASE_URL` 在生产 env 中填写 BOS HTTPS 根域名。H5 保存咨询图片时先刷新签名，再通过浏览器下载；需 BOS CORS 允许网页源的 GET，不可用时打开图片供手动保存。私有图片权限迁移见服务端 `docs/nas-deployment.md`。

密码修改撤销全部会话；401 会清空会话与当前草稿并引导登录。轮询遇到 401/404 停止，连续五次网络失败或超过 12 分钟停止自动轮询。相同内容的失败重试复用 `request_id`，防止创建重复付费任务。

依赖修复使用锁文件和定向 overrides。`braces@3.0.3` 尚无上游修复版本，对 GHSA-vfj7-8cjw-p6xm 加入 `patches/braces@3.0.3.patch`：解析嵌套与 AST 递归入口限制深度，并测试合法模式与恶意嵌套。`pnpm audit` 仍按版本报告这一项，不代表扫描清零；它用于构建目录匹配，不运行在生产 Nginx/Go 服务中。安装必须保留补丁和锁文件，后续有正式修复版本时替换本地补丁。
