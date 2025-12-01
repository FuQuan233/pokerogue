# 检查并推送改动到远端仓库
Write-Host "=== 检查 Git 状态 ===" -ForegroundColor Cyan
git status

Write-Host "`n=== 查看修改的文件 ===" -ForegroundColor Cyan
git diff --name-only
git diff --cached --name-only

Write-Host "`n=== 添加所有修改的文件 ===" -ForegroundColor Cyan
git add -A

Write-Host "`n=== 查看暂存的文件 ===" -ForegroundColor Cyan
git status --short

Write-Host "`n=== 提交更改 ===" -ForegroundColor Cyan
$commitMessage = "限时活动：提升野生宝可梦闪光概率8倍，高级扭蛋券移至COMMON池；调整部分宝可梦的招式、特性和数值"
git commit -m $commitMessage

Write-Host "`n=== 推送到远端仓库 ===" -ForegroundColor Cyan
git push

Write-Host "`n=== 完成 ===" -ForegroundColor Green

