# 亦实校友宇宙

北京亦庄实验中学校友网站 MVP：Vite + React + TypeScript + Tailwind 前端，搭配独立 Node.js 头像后端。校友墙仍为虚构演示数据，创建档案的头像已接入真实 AI 推荐和 Emoji Kitchen。

## 本地开发

需要 Node.js 20.19+ 或 22.12+、pnpm 9。安装依赖，将 `.env.example` 复制为 `.env` 并填写 `OPENROUTER_API_KEY`；已有 `.env` 不要覆盖。

```bash
pnpm install
pnpm dev
```

同时启动 Vite（`0.0.0.0:5173`，支持局域网访问和热更新）与头像 API（默认 `127.0.0.1:8787`）。浏览器的 `/api` 请求由 Vite 转发到后端；Ctrl+C 同时停止两者，修改 `.env` 后需重启。

默认模型为 `openai/gpt-5.6-terra`，可通过 `OPENROUTER_MODEL` 明确更改。不会静默换模型；配置缺失、额度不足或上游不可用时显示可重试的错误，仍允许使用当前头像继续。

```bash
pnpm check         # TypeScript 检查
pnpm test          # 单元和 API 测试，不调用付费模型
pnpm test:browser  # 桌面 / 手机浏览器测试，模拟 AI 和图片响应
pnpm build         # 构建 dist/ 静态文件
pnpm dev:api       # 仅启动带热重载的后端
pnpm start:api     # 仅启动后端
pnpm preview       # 预览 dist/；API 需要另行启动
```

浏览器测试默认使用 `/usr/bin/chromium`，其他系统通过 `CHROMIUM_PATH` 指定路径。原生 emoji 字体由用户系统提供（Linux 可安装 Noto Color Emoji）；合成头像是图片，不依赖 emoji 字体。

可选真实端到端检查：启动开发服务后执行 `node scripts/smoke-avatar.mjs`。这会向配置的付费模型发送一组虚构回答，校验图片加载、确认浏览器不直连提供商，并将截图写入忽略的 `test-results/`；普通测试不会产生模型费用。

## 头像流程

1. 第一阶段结束：用性格、昵称、形象描述和脑洞偏好生成主体、特征两个列表，每栏 3–5 个有效候选。
2. 第二阶段结束：加入毕业年份、状态、地点、方向，更新两个列表。选择不透露时也进入阶段总结。
3. 第三阶段结束：加入真心话与留言，最后更新一次；确认后进入完整角色卡。

AI 只返回两个有序列表与简短理由；程序用 `emoji-mixer` 本地兼容表验证组合，按两栏优先级推荐配对。主体与特征是语义角色，不保证图片中谁位于哪边或占多大比例。

点击单枚只锁定对应位置；点击一整组锁定两枚。锁定位置在后续阶段、回退修改答案、换一批及请求等待中再次点击后都不会被覆盖，随时可以解锁。不兼容选项置灰。答题期间可展开“调整我的 emoji 配方”。相同阶段、相同回答不会因前进后退再次调用模型；旧请求的迟到结果会被忽略。

## 接口与安全

| 接口 | 用途 |
| --- | --- |
| `POST /api/avatar/suggestions` | 校验阶段回答，调用 OpenRouter，返回候选和有效配对 |
| `GET /api/avatar/images/<主体码点>_<特征码点>.png` | 从本站读取或下载组合图片 |
| `GET /api/health` | 进程健康检查，不调用外部服务 |

`server/openrouter.ts` 管理中文提示词和严格 JSON 输出；`shared/avatar.ts` 管理请求结构、手动选择与合并规则。API 剔除尚未到达阶段的回答，不把上游错误正文、密钥或用户回答写入日志。

图片仅允许兼容表生成的 `www.gstatic.com` 地址，拒绝任意 URL、重定向、非 PNG 和超过 1 MiB 的资源。`emoji-mixer@1.3.1` 数据存在镜像条目，部分只有另一方向才有真实图片，因此按记录尝试双向及旧版本（最多 6 个地址、总超时 15 秒），不假设第一个地址一定可访问。

同一对 emoji 交换顺序复用缓存，缓存标识包含候选资源版本。文件原子写入 `.cache/emoji/`，可用 `EMOJI_CACHE_DIR` 更改目录；最多约 1,000 张，满后仍直接返回图片但不继续落盘。浏览器缓存一天并带 ETag；Google 短暂不可达时，已落盘图片仍可使用。失败时显示原生 emoji 和提示，选择不会丢失。

每个 IP 每小时最多 30 次未缓存推荐、600 次图片请求，全局最多 3 个并发推荐、8 个并发图片下载；相同推荐合并并缓存 10 分钟。`AVATAR_DAILY_LIMIT` 默认每 UTC 日 300 次模型调用。计数在内存中，重启会重置，不跨实例共享；这是 MVP 防护，不代替 OpenRouter 账户额度限制或正式的鉴权 / 持久化限流。

## 部署

前端 `pnpm build` 后由 Nginx / Caddy 提供 `dist/`；`/api/` 必须代理至常驻后端。仅上传静态文件不能提供 AI 推荐。

本机部署位于相邻 `personal_website`：Compose 中 `alumni-avatar` 服务构建本仓库 Dockerfile，读取本仓库 `.env`，通过 host 网络只监听 `127.0.0.1:8788`，用 `alumni-emoji-cache` 命名卷保存图片。`bjeaalumni.org` 的 `/api/` 转发至该端口，不与开发端口 8787 冲突，也不更改个人网站 API。

```bash
# 在本仓库构建前端
pnpm build
# 在相邻 personal_website 目录更新后端
docker compose up -d --build --no-deps alumni-avatar
# 修改 Nginx 后先检查，再平滑重载
docker exec web-nginx nginx -t
docker exec web-nginx nginx -s reload
```

其他服务器可参考 `Caddyfile.example`，以 `API_PORT=8788 pnpm start:api` 运行后端，并用服务管理器保持常驻。Docker 构建上下文采用白名单，**不将 `.env` 打入镜像**，密钥仅在运行时注入。`.env`、图片缓存、测试截图均被 Git 忽略。不要把密钥放入任何 `VITE_` 变量。

本机内核目前不支持 Docker 内存配额，因此 Compose 的 `mem_limit` 不生效；Node 仍设有 256 MiB V8 堆上限，但它不等于整个进程的内存上限。

创建中的草稿仍只在页面状态中，刷新会丢失；完成卡片可从当前浏览器历史条目恢复，但不代表保存到了服务器，也不能跨设备分享。登录、档案数据库、真正的公开分享仍未实现。

技术来源：[emoji-mixer](https://github.com/MattFor/emoji-mixer)、[OpenRouter 结构化输出](https://openrouter.ai/docs/guides/features/structured-outputs)。Emoji Kitchen 图片来自 Google，第三方包与图片各自的授权应分开核对。
