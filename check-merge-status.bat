@echo off
chcp 65001 >nul
echo ========================================
echo 检查合并状态
echo ========================================
echo.

echo [1] 当前 Git 状态：
git status
echo.

echo [2] 冲突文件列表：
git diff --name-only --diff-filter=U
if %errorlevel% neq 0 (
    echo 没有冲突文件
)
echo.

echo [3] 已暂存的改动文件：
git diff --cached --name-only
if %errorlevel% neq 0 (
    echo 没有已暂存的文件
)
echo.

echo [4] 未暂存的改动文件：
git diff --name-only
if %errorlevel% neq 0 (
    echo 没有未暂存的文件
)
echo.

echo ========================================
echo 重要提示：
echo ========================================
echo.
echo 如果看到 pokemon-species.ts 在改动列表中，需要检查是否需要保留私服版本
echo 如果需要保留私服版本，运行：
echo   git checkout --ours src/data/balance/pokemon-species.ts
echo   git add src/data/balance/pokemon-species.ts
echo.
pause

