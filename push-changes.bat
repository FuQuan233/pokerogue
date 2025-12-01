@echo off
chcp 65001 >nul
echo === 检查 Git 状态 ===
git status
echo.
echo === 添加所有修改的文件 ===
git add -A
echo.
echo === 查看暂存的文件 ===
git status --short
echo.
echo === 提交更改 ===
git commit -m "限时活动：提升野生宝可梦闪光概率8倍，高级扭蛋券移至COMMON池；调整部分宝可梦的招式、特性和数值"
echo.
echo === 推送到远端仓库 ===
git push
echo.
echo === 完成 ===
pause

