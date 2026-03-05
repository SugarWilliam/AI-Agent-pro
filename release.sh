#!/bin/bash
# AI Agent Pro 正式发布脚本
# 1. 推送到 gh-pages 并部署
# 2. 创建 release 标签
# 3. 同步到 main 分支

set -e

REPO="SugarWilliam/AI-Agent-pro"
VERSION="${1:-8.4.0}"

echo "=========================================="
echo "🚀 AI Agent Pro v${VERSION} 正式发布"
echo "=========================================="
echo ""

# 检查当前分支
if [ "$(git branch --show-current)" != "gh-pages" ]; then
    echo "❌ 请在 gh-pages 分支执行此脚本"
    exit 1
fi

# 步骤1: 推送到 gh-pages
echo "📤 步骤1: 推送到 GitHub gh-pages..."
git push origin gh-pages
echo "✅ gh-pages 已推送，GitHub Actions 将自动部署"
echo "   部署进度: https://github.com/${REPO}/actions"
echo "   访问地址: https://sugarwilliam.github.io/AI-Agent-pro/"
echo ""

# 步骤2: 创建 release 标签
echo "🏷️ 步骤2: 创建 release 标签 v${VERSION}..."
git tag -a "v${VERSION}" -m "AI Agent Pro v${VERSION} 正式发布

- 项目评审与整理
- 决策矩阵 Markdown 表格解析
- 版本号统一至 ${VERSION}"
git push origin "v${VERSION}"
echo "✅ 标签 v${VERSION} 已创建并推送"
echo ""

# 步骤3: 同步到 main 分支
echo "🔄 步骤3: 同步到 main 分支..."
git checkout main
git merge gh-pages -m "release: 合并 v${VERSION} 到 main"
git push origin main
git checkout gh-pages
echo "✅ main 分支已同步"
echo ""

echo "=========================================="
echo "✅ v${VERSION} 发布完成！"
echo "=========================================="
echo ""
echo "后续操作（可选）："
echo "  1. 在 GitHub 创建 Release: https://github.com/${REPO}/releases/new?tag=v${VERSION}"
echo "  2. 填写 Release 说明，可参考 CHANGELOG.md"
echo "  3. 上传源码 zip（或使用自动生成的 Source code）"
echo ""
echo "用法: ./release.sh [版本号]  默认 8.4.0"
echo ""
