# 亦实校友宇宙

北京亦庄实验中学校友网站前端 MVP，用于浏览虚构校友轨迹并创建校友角色卡。项目采用 Vite、React、TypeScript 和 Tailwind CSS，当前完全在浏览器中运行，不依赖后端或数据库。

## 本地开发

需要 Node.js 20.19+ 或 22.12+，以及 pnpm。

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm check    # TypeScript 类型检查
pnpm build    # 生成 dist/ 静态部署文件
pnpm preview  # 本地预览生产构建
```

## 项目结构

```text
.
├── public/                 # 不参与打包处理的静态资源
├── src/
│   ├── components/         # 页面与通用 UI 组件
│   ├── lib/                # 演示数据和工具函数
│   ├── styles/             # Tailwind 与全局样式
│   └── main.tsx            # 应用入口
├── Caddyfile.example       # Caddy 部署模板
├── index.html              # Vite HTML 入口
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 部署

运行 `pnpm build` 后，将 `dist/` 的内容完整同步到服务器的 `/srv/yizhuang-alumni/site`。复制 `Caddyfile.example`，把 `YOUR_DOMAIN` 替换为真实域名，再用 Caddy 加载配置即可。

创建的档案目前只存在于页面状态中，刷新后会丢失；仓库内的校友、经历和其他数据均为虚构演示内容。
