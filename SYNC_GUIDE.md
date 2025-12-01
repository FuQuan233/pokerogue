# 同步主仓库改动指南

## 目标
同步主仓库（pagefaultgames/pokerogue）的最新改动到私服仓库，同时保留私服的活动修改和精灵数值等改动。

## 方法一：使用脚本（推荐）

运行 PowerShell 脚本：
```powershell
.\sync-upstream.ps1
```

脚本会自动：
1. 检查当前分支和未提交的改动
2. 获取主仓库最新改动
3. 合并改动并检测冲突
4. 提示需要保留私服版本的文件

## 方法二：手动同步

### 步骤 1: 确保当前分支和状态
```bash
# 切换到 beta 分支
git checkout beta

# 检查未提交的改动
git status

# 如果有未提交的改动，先提交或暂存
git add .
git commit -m "保存当前改动"
```

### 步骤 2: 获取主仓库最新改动
```bash
# 获取主仓库最新改动
git fetch upstream
```

### 步骤 3: 查看将要合并的改动
```bash
# 查看主仓库的新提交
git log --oneline HEAD..upstream/beta

# 查看将要修改的文件
git diff --name-only HEAD upstream/beta
```

### 步骤 4: 合并主仓库改动
```bash
# 合并但不自动提交，方便检查
git merge upstream/beta --no-commit --no-ff
```

### 步骤 5: 处理需要保留私服版本的文件

#### 5.1 检查冲突
```bash
# 查看冲突文件
git diff --name-only --diff-filter=U
```

#### 5.2 对于需要保留私服版本的文件（如精灵数值）

**选项 A: 使用 checkout 保留私服版本**
```bash
# 保留私服的 pokemon-species.ts（精灵数值）
git checkout --ours src/data/balance/pokemon-species.ts
git add src/data/balance/pokemon-species.ts
```

**选项 B: 手动解决冲突**
- 打开冲突文件
- 手动选择保留私服的修改部分
- 使用 `git add <文件>` 标记为已解决

#### 5.3 对于活动相关的文件
如果主仓库的改动影响了活动相关文件，也需要保留私服版本：
```bash
# 例如，如果有活动相关的配置文件
git checkout --ours <活动相关文件路径>
git add <活动相关文件路径>
```

### 步骤 6: 完成合并
```bash
# 检查所有改动
git status

# 提交合并
git commit -m "合并主仓库改动，保留私服的活动和精灵数值修改"
```

### 步骤 7: 推送到私服仓库
```bash
git push origin beta
```

## 需要特别注意保留私服版本的文件

1. **精灵数值文件**
   - `src/data/balance/pokemon-species.ts` - 精灵数值修改

2. **活动相关文件**
   - 任何与圣诞节活动或其他私服活动相关的文件
   - 商店折扣活动相关文件（如果还在使用）

3. **配置文件**
   - 任何私服特有的配置修改

## 常见问题

### Q: 如何查看两个版本的差异？
```bash
# 查看某个文件在主仓库和私服的差异
git diff upstream/beta HEAD -- <文件路径>
```

### Q: 如果合并后发现问题怎么办？
```bash
# 撤销合并（如果还没提交）
git merge --abort

# 如果已经提交，可以重置到合并前
git reset --hard HEAD~1
```

### Q: 如何只合并特定的提交？
```bash
# 查看提交列表
git log --oneline upstream/beta

# 只合并特定提交
git cherry-pick <提交hash>
```

## 建议的工作流程

1. **定期同步**：建议每周或每两周同步一次，避免改动积累过多
2. **测试合并**：合并后先在本地测试，确保游戏正常运行
3. **保留备份**：合并前可以创建一个备份分支
   ```bash
   git branch backup-before-sync-$(Get-Date -Format "yyyyMMdd")
   ```

