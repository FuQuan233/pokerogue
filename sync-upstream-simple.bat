@echo off
chcp 65001 >nul
echo ========================================
echo 同步主仓库改动到私服仓库
echo ========================================
echo.

echo [1/5] 检查当前分支...
git branch --show-current
echo.

echo [2/5] 检查未提交的改动...
git status --short
echo.

echo [3/5] 获取主仓库最新改动...
git fetch upstream
echo.

echo [4/5] 查看主仓库的新提交（最近10个）...
git log --oneline HEAD..upstream/beta | head -10
echo.

echo [5/5] 开始合并主仓库改动...
git merge upstream/beta --no-commit --no-ff
echo.

echo ========================================
echo 合并完成！请检查以下内容：
echo ========================================
echo.
echo 1. 检查冲突文件：
git diff --name-only --diff-filter=U
echo.
echo 2. 检查所有改动：
git status
echo.
echo 3. 如果需要保留私服版本的文件（如 pokemon-species.ts）：
echo    git checkout --ours src/data/balance/pokemon-species.ts
echo    git add src/data/balance/pokemon-species.ts
echo.
echo 4. 完成合并：
echo    git commit -m "合并主仓库改动，保留私服的活动和精灵数值修改"
echo.
echo 5. 推送到私服：
echo    git push origin beta
echo.
pause

