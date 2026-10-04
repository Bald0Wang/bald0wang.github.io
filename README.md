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

站点托管在 GitHub Pages，当前采用 **gh-pages 分支**部署（本地一条命令）：

```bash
npm run deploy    # = 本地构建 + 把产物发布到 gh-pages 分支
```

- 线上地址：**https://bald0wang.github.io**
- 每次发布后 Pages 会自动重新构建，稍等约一分钟生效。

### 可选升级：push 即自动部署

如果希望「git push 后 GitHub Actions 自动部署」（省掉手动跑命令），需一次性给 gh 补 workflow 权限：

```bash
gh auth refresh -h github.com -s workflow   # 按提示在浏览器输入一次性代码
```

然后删除 `.gitignore` 中对 `.github/workflows/deploy.yml` 的临时忽略行、提交推送该文件，并把 Pages 的 Source 改为 **GitHub Actions**。这些步骤可以让 ZCode 代劳。
