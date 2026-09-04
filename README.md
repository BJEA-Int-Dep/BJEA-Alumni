# 亦实校友宇宙 · 树莓派部署交付包

这是可直接交给部署人员的纯静态网站，不需要 Node.js、npm、数据库或 API 密钥。

## 文件说明

- `site/`：最终网页文件，服务器应直接托管这个目录。
- `yizhuang-alumni-site.tar.gz`：`site/` 内容的传输压缩包。
- `Caddyfile.example`：Caddy 配置模板；部署前把 `YOUR_DOMAIN` 换成实际域名。

## 部署前必须确认

1. 域名的 A/AAAA 记录通过 DDNS 指向树莓派当前公网地址。
2. 路由器和防火墙把公网 TCP 80、443 转发到树莓派。
3. 从家庭网络之外测试 80、443；SSH 能连通不代表网页端口也能连通。

## 推荐部署方式

1. 把 `yizhuang-alumni-site.tar.gz` 传到树莓派。
2. 将压缩包完整解压到 `/srv/yizhuang-alumni/site`；更新时完整替换该目录，避免遗留旧的哈希资源。
3. 安装 Caddy，把 `Caddyfile.example` 中的域名替换后放到 `/etc/caddy/Caddyfile`。
4. 运行 `caddy validate --config /etc/caddy/Caddyfile`，成功后重载 Caddy。
5. 用手机流量打开 `https://你的域名`，并检查首页、校友详情、创建档案流程和校徽图片。

Caddy 在域名正确解析且公网 80/443 可达时会自动申请并续期 HTTPS 证书。

## 当前产品边界

- 所有校友、经历和数据均为虚构演示内容。
- 网站完全在浏览器中运行；创建的档案不会上传或持久保存，刷新页面后会丢失。
- 当前只有一个页面，不需要服务端重写规则；模板仍配置了首页回退，便于以后增加前端路由。
