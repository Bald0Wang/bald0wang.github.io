#!/usr/bin/env bash
# 构建 VitePress 并将产物发布到 gh-pages 分支（仅需现有 GitHub 令牌权限）
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

REPO=$(git config --get remote.origin.url)
DIST=docs/.vitepress/dist
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# 取 gh-pages 分支；不存在则新建
if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git clone -q --single-branch --branch gh-pages "$REPO" "$WORK/publish"
else
  git init -q -b gh-pages "$WORK/publish"
  git -C "$WORK/publish" remote add origin "$REPO"
fi

rsync -a --delete --exclude=.git "$DIST/" "$WORK/publish/"
touch "$WORK/publish/.nojekyll"

git -C "$WORK/publish" add -A
if git -C "$WORK/publish" diff --cached --quiet; then
  echo "站点无变更，跳过发布"
else
  git -C "$WORK/publish" commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M')"
  git -C "$WORK/publish" push -q origin gh-pages
  echo "✅ 已发布到 gh-pages 分支"
fi
