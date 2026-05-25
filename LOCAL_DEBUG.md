# 本地调试指南

## 推荐访问地址

使用 `http://127.0.0.1:3000`，不要用 `localhost`（避免 DNS 解析差异）。

## 端口检查

```bash
# 确认只有九章后端占用 3000 端口
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

## 后端日志

```bash
# 开发服务器日志（ts watch 输出）
tail -f /private/tmp/jiuzhang-dev.log

# 错误日志（Sentry 等）
tail -f backend/logs/error.log
```

## 启动 / 重启

```bash
cd backend
# 杀掉旧进程
lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill -9 2>/dev/null
# 启动
npm run dev > /private/tmp/jiuzhang-dev.log 2>&1 &
```

## 本地开发降噪

`.env` 中支持细粒度开关：

| 开关 | 关闭什么 | 默认 |
|------|---------|------|
| `DISABLE_TREND_SCHEDULER=true` | 趋势热点定时拉取（每日 9:00/21:00） | 开 |
| `DISABLE_AGENT_WORKER=true` | Agent job 自动执行 | 关（保留） |
| `DISABLE_PROACTIVE_SCANNER=true` | 主动建议扫描器（每 30s） | 开 |
| `DISABLE_SCHEDULER=true` | 以上全部（向后兼容，优先级最高） | 关 |

**测试 L8 主动建议时**：把 `DISABLE_PROACTIVE_SCANNER` 注释掉或删掉。
**测试 Agent job 自动执行时**：把 `DISABLE_AGENT_WORKER` 注释掉或删掉。
**测试热点功能时**：把 `DISABLE_TREND_SCHEDULER` 注释掉或删掉。

## 已知非致命噪声

| 现象 | 原因 | 处理 |
|------|------|------|
| `/api/works/:id/style-dna` 无请求 | 未保存足够章节，无风格 DNA | 正常空态，无需处理 |
| error.log 中 Redis ECONNREFUSED | 旧版本遗留日志 | 清空 error.log 后不再出现 |
| `agent-jobs/:id/stream` 多条请求 | 恢复 running 状态的 job | 已限制最多恢复 3 个 |
| suggestions 轮询 30s 一次 | 主动建议检查 | 失败后自动退避到 5 分钟 |

## 前端兜底规则

- style-dna 无数据 → 显示"暂无风格分析"
- suggestions 空列表 → 不弹气泡，Dashboard 显示"暂无新建议"
- agent job 恢复失败 → console.warn，不影响页面
- API 请求超时 → 30s 后 abort，显示"请求超时"
