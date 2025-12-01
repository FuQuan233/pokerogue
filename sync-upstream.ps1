# 同步主仓库改动到私服仓库，保留私服的活动和精灵数值修改
# 使用方法: .\sync-upstream.ps1

Write-Host "开始同步主仓库改动..." -ForegroundColor Green

# 1. 确保当前分支是 beta
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "beta") {
    Write-Host "警告: 当前分支是 $currentBranch，建议切换到 beta 分支" -ForegroundColor Yellow
    $confirm = Read-Host "是否继续? (y/n)"
    if ($confirm -ne "y") {
        exit
    }
}

# 2. 检查是否有未提交的改动
$status = git status --porcelain
if ($status) {
    Write-Host "检测到未提交的改动:" -ForegroundColor Yellow
    Write-Host $status
    $confirm = Read-Host "是否先提交这些改动? (y/n)"
    if ($confirm -eq "y") {
        git add .
        $message = Read-Host "请输入提交信息 (直接回车使用默认信息)"
        if ([string]::IsNullOrWhiteSpace($message)) {
            $message = "保存当前改动"
        }
        git commit -m $message
    }
}

# 3. 获取主仓库最新改动
Write-Host "`n获取主仓库最新改动..." -ForegroundColor Green
git fetch upstream

# 4. 查看将要合并的提交
Write-Host "`n主仓库的新提交:" -ForegroundColor Cyan
git log --oneline HEAD..upstream/beta | Select-Object -First 10

# 5. 合并主仓库改动
Write-Host "`n开始合并主仓库改动..." -ForegroundColor Green
git merge upstream/beta --no-commit --no-ff

# 6. 检查冲突
$conflicts = git diff --name-only --diff-filter=U
if ($conflicts) {
    Write-Host "`n检测到冲突文件:" -ForegroundColor Red
    Write-Host $conflicts
    
    Write-Host "`n对于以下文件，建议保留私服版本:" -ForegroundColor Yellow
    Write-Host "- src/data/balance/pokemon-species.ts (精灵数值)"
    Write-Host "- 活动相关的文件"
    Write-Host "- 其他私服特有的修改"
    
    Write-Host "`n请手动解决冲突，然后运行:" -ForegroundColor Yellow
    Write-Host "git add <解决冲突的文件>"
    Write-Host "git commit -m '合并主仓库改动，保留私服修改'"
} else {
    Write-Host "`n没有检测到冲突，检查需要保留私服版本的文件..." -ForegroundColor Green
    
    # 检查是否有需要保留私服版本的文件
    $modifiedFiles = git diff --cached --name-only
    if ($modifiedFiles -match "pokemon-species\.ts") {
        Write-Host "`n检测到 pokemon-species.ts 被修改，建议检查是否需要保留私服的精灵数值修改" -ForegroundColor Yellow
    }
    
    Write-Host "`n合并预览完成。请检查改动，然后运行:" -ForegroundColor Yellow
    Write-Host "git commit -m '合并主仓库改动，保留私服修改'"
}

Write-Host "`n同步流程完成！" -ForegroundColor Green

