# bald0wang.github.io

个人主页与知识库，完全个人使用。基于 [VitePress](https://vitepress.dev/zh/) 构建，推送 `main` 分支后由 GitHub Actions 自动部署到 GitHub Pages。

## 本地使用

```bash
npm install      # 首次安装依赖
npm run dev      # 启动本地预览，默认 http://localhost:5173
npm run build    # 构建产物到 docs/.vitepress/dist
npm run preview  # 本地预览构建结果
```

## 目录结构

```
docs/
├── index.md              # 主页（hero + features 布局）
├── about.md              # 关于我
├── notes/                # 知识库笔记
│   ├── index.md          #   笔记目录（新笔记在这里加链接）
│   └── example.md        #   写作示例，可当笔记模板复制
└── projects/index.md     # 项目记录
.github/workflows/deploy.yml   # 自动部署
```

## 如何新增一篇笔记

1. 在 `docs/notes/` 下新建 `my-topic.md`；
2. 打开 `docs/notes/index.md`，加一行链接：`- [我的主题](/notes/my-topic)`；
3. 需要出现在侧边栏时，编辑 `docs/.vitepress/config.mts` 的 `sidebar`；
4. `git add -A && git commit -m "笔记：xxx" && git push`，推送后自动部署。

## 部署说明

- 每次推送到 `main`，Actions 会自动构建并发布，无需手动操作。
- 仓库当前为**私有**。GitHub 免费版的 Pages 仅对公开仓库开放：
  - 想让站点上线 → 仓库 Settings → General → 底部 Danger Zone → Change visibility → Public；
  - 或升级 GitHub Pro 后私有仓库也能用 Pages。
- 启用方式：Settings → Pages → Build and deployment → Source 选 **GitHub Actions**（已通过 API 自动配置）。
