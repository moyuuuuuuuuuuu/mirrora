# 镜界客户端

uni-app + Vue 3 + TypeScript + Wot UI。支持 H5、App、微信小程序和抖音小程序。

## 镜面工作台

首页现在是统一的全屏形象空间。创建形象后，试衣、发型、妆容、配饰在同一页面切换；微调输入、生成状态、原图对比、历史版本、搭配收藏、账户和协议均在工作台内完成。原来的页面地址保留为兼容入口，自动回到工作台相应面板。

- **真实接口**：邮箱验证码/密码登录、个人资料与头像、密码修改、照片与服装上传、试衣及发型/妆容/穿搭/肤质咨询、历史读取、结果下载。生成成功直接更新镜面；失败保留上一张图。登录后重新打开会尝试恢复最近一条账户记录。
- **真实生成**：以当前选中的成功版本继续编辑，跨发型／妆容／配饰／穿搭保留上一版结果；恢复原图后从头生成。文字微调和配饰移除会提交到后端。后端需配置新的 `COZE_STUDIO_EDITOR_WORKFLOW_ID`，接口使用 `parent_consultation_id` 校验归属并签发 BOS 图片。内置穿搭方案直接走 outfit 生成，不要求上传服装图；上传服装则走双图 tryon 试穿。内置卡片代表穿搭方向，不承诺复刻商品。
- **示例体验**：无需登录，不上传、不调用 AI；提供两张预制人物穿搭效果，发型、妆容、配饰选择及文字微调仅演示交互，不声称生成了新的效果。建议面板中的“演示一次生成失败”用于验收失败与重试状态。
- **保存与隐私**：示例搭配保存在本机；个人组合及本次版本仅保留在当前会话，真实生成记录由既有服务端历史提供。不会把私人照片临时路径或签名 URL 写进示例缓存。退出登录或会话失效会清理私人工作台状态。
- **端适配**：桌面为横向衣橱，手机为底部横向滑动素材区和浮层。H5 支持键盘按钮、Escape 关闭浮层、对话框焦点约束及减少动态效果偏好；原生端的玻璃模糊效果取决于设备能力。

## 素材与 BOS

新增公共素材位于 `src/static/studio/`，发布使用 WebP：`room.webp`、`person.webp`、`person-weekend.webp`，合计约 333 KiB。生成来源与提示词见 `docs/studio-assets.json`。所有新工作台的公共图片通过 `src/studio/assets.ts` 解析，用户照片与结果继续使用 API 返回的私有签名链接。

开发模式使用本地 `/static/`。生产构建填写 `VITE_ASSET_BASE_URL=https://你的BOS域名/releases/发布编号`（或 HTTPS 根域名），动态卡片、背景、人物和缩略图会使用同一前缀。H5 构建后，把 **`dist/bos-upload/` 的内容**上传到该前缀下，保留 `static/`、`assets/` 目录结构；不要只上传人物图片，也不要把整个目录再嵌套一层 `bos-upload/`。HTML/JS/CSS 仍随 Web 容器发布。

BOS 上的这些编辑素材需允许公共读取。私人图片继续执行服务端原有访问控制，不应为了公共素材而放开整个桶。照片下载所需 CORS 延续原有部署配置。当前变更没有执行 BOS 上传。

## 前端验收

`pnpm test` 覆盖接口隔离、照片授权、重复请求、异步结果失效、轮询、失败保留、结果质量与示例缓存；`pnpm type-check` 和各平台构建验证编译。依赖安装使用仓库声明的 pnpm 9.9.0，以保留定向 overrides 和 braces 补丁。

可选浏览器验收脚本 `scripts/test-studio-browser.cjs` 在本地开发服务上运行。设置 `MIRRORA_PLAYWRIGHT` 为本机 Playwright 模块路径，`MIRRORA_CHROME` 为浏览器可执行文件路径，执行 `node scripts/test-studio-browser.cjs`。脚本模拟 API，覆盖示例编辑、失败重试、保存恢复、登录、真实请求结构和退出清理，不发送真实邮件或调用付费工作流；截图写入忽略目录 `outputs/`。

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

## 人物处理与拍摄校正

本人照片在登录并确认授权后立即上传，服务端提取透明人物；工作台只在处理成功后切换形象。处理失败保留上一版本，不用带背景原图兜底。生成结果同样去背景后存入私有 BOS。

本次上传可打开右侧“校正”：自动扶正仅参考可信背景竖线，不根据人物歪头或站姿猜测；水平旋转 ±12°、俯仰透视 ±20 的手动调整必须预览后应用。校正基于本次原始文件，不重复变形；应用开启新的编辑会话。刷新后若原始本地文件已失效需重新上传。严重透视变形无法可靠恢复真实比例。
