# 本地检查

使用 Node.js >= 24.9 和项目的 pnpm 锁文件安装依赖。

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm depcruise
pnpm build:beta
```

`lint` 只检查，`lint:fix` 自动修复安全的格式和导入顺序问题。构建成功不能替代类型、lint 或玩法验证。Windows 下源码换行由 `.gitattributes` 统一为 LF。
