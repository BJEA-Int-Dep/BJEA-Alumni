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

## 项目结构

```text
src/
  app.tsx                 页面路由与共享草稿状态
  pages/                  校友墙、个人主页
  features/
    onboarding/           问题选项、草稿转换、流程导航与预览
    avatar/               头像选择、图片展示与推荐请求
  components/             通用 UI 与学校页头
  lib/                    校友演示数据、通用工具
  styles/                 全局样式
server/                   Node API、OpenRouter、Emoji Kitchen 与图片缓存
shared/                   前后端共用的头像协议与选择规则
tests/                    单元、API 与浏览器回归测试
scripts/                  开发启动与可选真实服务检查
```

## 头像流程

1. 前六步收集性格、毕业年份、状态、位置、方向、感受和留言；进入最后一步时，用完整回答请求一行 AI 推荐 emoji 和几个昵称。
2. 角色卡区域显示 Emoji Kitchen 风格的两个可切换槽位和合成结果；点击任意槽位，再从 AI 推荐行或全量可合成 emoji 网格中选择。
3. 另一枚选定后，程序用 `emoji-mixer` 本地兼容表禁用无法合成的选项。支持随机组合、清空和随时换一批；用户手动选定的 emoji 会在后续 AI 请求中保留。
4. 最后一步确认昵称后生成角色卡；AI 失败不阻塞完成。进入最后一步时只请求一次，之后只有点击“换一批”才会再次请求；旧请求的迟到结果会被忽略。

AI 只返回最多 8 个有序推荐 emoji 与简短理由，不决定哪个 emoji 放在哪个位置，也不直接生成图片。程序通过同源 API 使用 `emoji-mixer` 的兼容表获取组合图片；不支持组合的 Unicode emoji 不会出现在选择网格中。

## 接口与安全

| 接口                                                   | 用途                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `POST /api/avatar/suggestions`                         | 校验完整回答，调用 OpenRouter，返回 AI 推荐 emoji 和昵称建议 |
| `GET /api/avatar/emojis`                               | 返回全部可合成 emoji；传 `?with=<emoji>` 返回兼容集合        |
| `GET /api/avatar/random`                               | 返回一个确定有效的随机组合                                   |
| `GET /api/avatar/images/<emoji 码点>_<emoji 码点>.png` | 从本站读取或下载组合图片                                     |
| `GET /api/health`                                      | 进程健康检查，不调用外部服务                                 |

`server/openrouter.ts` 管理中文提示词和严格 JSON 输出；`shared/avatar.ts` 管理请求结构、手动选择与合并规则。API 不把上游错误正文、密钥或用户回答写入日志。

图片仅允许兼容表生成的 `www.gstatic.com` 地址，拒绝任意 URL、重定向、非 PNG 和超过 1 MiB 的资源。`emoji-mixer@1.3.1` 数据存在镜像条目，部分只有另一方向才有真实图片，因此按记录尝试双向及旧版本（最多 6 个地址、总超时 15 秒），不假设第一个地址一定可访问。

同一对 emoji 交换顺序复用缓存，缓存标识包含候选资源版本。文件原子写入 `.cache/emoji/`，可用 `EMOJI_CACHE_DIR` 更改目录；最多约 1,000 张，满后仍直接返回图片但不继续落盘。浏览器缓存一天并带 ETag；Google 短暂不可达时，已落盘图片仍可使用。失败时显示原生 emoji 和提示，选择不会丢失。

每个 IP 每小时最多 30 次未缓存推荐、600 次图片请求，全局最多 3 个并发推荐、8 个并发图片下载；相同推荐合并并缓存 10 分钟。`AVATAR_DAILY_LIMIT` 默认每 UTC 日 300 次模型调用。计数在内存中，重启会重置，不跨实例共享；这是 MVP 防护，不代替 OpenRouter 账户额度限制或正式的鉴权 / 持久化限流。

## 部署

前端 `pnpm build` 后由 Nginx / Caddy 提供 `dist/`；`/api/` 必须代理至常驻后端。仅上传静态文件不能提供 AI 推荐。

生产环境不需要 Docker：在主机上安装 Node.js 20.19+ 或 22.12+、pnpm 9，构建前端并直接运行后端。用 systemd、Supervisor 或其他进程管理器保持 API 常驻；Caddy/Nginx 将 `/api/` 反代到后端端口。

```bash
pnpm install --frozen-lockfile
pnpm build
API_HOST=127.0.0.1 API_PORT=8788 pnpm start:api
```

图片缓存默认写入 `.cache/emoji/`，可通过 `EMOJI_CACHE_DIR` 放到独立的持久化目录。`.env`、图片缓存、测试截图均被 Git 忽略；密钥只放在运行时环境变量中，不要放入任何 `VITE_` 变量。`Caddyfile.example` 可直接作为反代配置参考。

创建中的草稿仍只在页面状态中，刷新会丢失；完成卡片可从当前浏览器历史条目恢复，但不代表保存到了服务器，也不能跨设备分享。登录、档案数据库、真正的公开分享仍未实现。

技术来源：[emoji-mixer](https://github.com/MattFor/emoji-mixer)、[OpenRouter 结构化输出](https://openrouter.ai/docs/guides/features/structured-outputs)。Emoji Kitchen 图片来自 Google，第三方包与图片各自的授权应分开核对。
