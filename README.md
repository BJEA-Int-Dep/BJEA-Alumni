# 亦中校友宇宙

北京亦庄实验中学的校友网站：用轻松的问答创建个人角色卡，并在校友墙上认识走向不同方向的同学。目前仍是 MVP，校友墙内容为演示数据。

## 公网部署

网站已部署在 [bjeaalumni.org](https://bjeaalumni.org)。生产环境与此工作目录位于同一台主机：Nginx 的配置和容器编排在相邻的 `../personal_website/` 项目中。

Nginx 直接挂载本项目的 `dist/` 目录，因此在这里成功运行 `pnpm build` 后，公网前端会随构建结果更新，不需要额外发布步骤。

公网 `/api/` 请求由 Nginx 转发到本机 `127.0.0.1:8788`。后端以名为 `bjea-alumni` 的 systemd 服务常驻运行；后端代码或运行环境变更后，需要重启该服务才会生效。

## 本地开发

复制 `.env.example` 为 `.env` 后运行 `pnpm dev`，前端和 API 会同时启动。开发 API 默认使用 `127.0.0.1:8787`（可用 `DEV_API_PORT` 覆盖），避免与生产服务的 `8788` 端口冲突；单独运行 `pnpm dev:api` 仍使用 `.env` 中的 `API_PORT`。账号、会话、邮箱验证码和用户角色卡保存在 `DATABASE_PATH` 指定的 SQLite 文件中。开发环境也使用 Resend 发送真实邮件。

邮箱验证码使用 Resend：在 Resend 验证发件域名、创建仅有发送权限的 API Key，并在 `.env` 中配置 `RESEND_API_KEY` 和 `RESEND_FROM_EMAIL`（纯邮箱地址，例如 `no-reply@bjeaalumni.org`，域名必须与 Resend 已验证的域名一致）。开发和生产环境都必须配置这两项。验证码绑定邮箱和用途，10 分钟有效、最多尝试 5 次，使用后失效；同一邮箱一分钟内不能重发，每小时最多发送 5 次。生产环境使用 HTTPS 时应设置 `SESSION_COOKIE_SECURE=true`。

头像缩略图使用系统 `python3` 与 Pillow（需支持 WebP，当前树莓派已安装）生成，首次请求时保存为原图旁的 `.thumb.webp` 文件；旧头像和新头像均自动支持。前端先显示 256px 缩略图，再加载原始 PNG，高清图失败时保留缩略图。
