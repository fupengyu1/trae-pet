一个**桌面宠物**，通过 TraeCode 官方 **Hook** 机制监听 Trae 智能体的状态（进行中 / 已完成 / 需要交互），并用一只小宠物实时展示。

零第三方运行时依赖 —— `git clone` 后一条命令即可启动。

## 原理

TraeCode 提供 6 类 Hook 事件，会在智能体执行的关键节点触发。本工程让 Hook 用 `curl` 把事件 JSON 转发到本地服务，服务维护状态机并通过 SSE 推送给宠物页面。

| 你感知的状态 | Hook 事件 | 触发时机 |
|---|---|---|
| 开始工作 | `UserPromptSubmit` | 用户提交任务、智能体开始处理 |
| 进行中 | `PreToolUse` / `PostToolUse` | 工具调用前后 |
| 需要交互 | `Notification` | 工具执行等待用户确认 |
| 已完成 | `Stop` | 智能体完成输出 |

## 快速开始

```bash
# 1. 启动本地事件服务 + 宠物页面
npm start
# 打开 http://localhost:8787 即可看到宠物

# 2. 配置 TraeCode Hook（见下方）
```

## 配置 TraeCode Hook

1. 打开 TraeCode → 设置 → 搜索 `hooks`，进入 Hook 配置。
2. 参考 [`hooks.example.json`](./hooks.example.json)，为以下事件各添加一条 `command` 类型的 Hook，命令为：
   ```bash
   curl -s -X POST http://localhost:8787/event -H 'Content-Type: application/json' -d @-
   ```
   - `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Stop`、`Notification`
3. 保存后，在 TraeCode 里发起一个任务，宠物页面会实时切换状态：空闲 → 进行中 → 等待交互 / 已完成。

## 架构

```
Trae 智能体执行
   │  6 类 Hook 事件
   ▼
Hook 处理程序 (curl POST)
   ▼
本地事件服务 (server.js, :8787)   ← 维护状态机 idle/running/waiting/done
   │  SSE 推送
   ▼
桌面宠物页面 (public/index.html)   ← 动画 + 气泡 + 拖拽
```

## 扩展

- **直接操作 / 拦截**：在 `server.js` 的 `handleEvent()` 中返回 `{ behavior: "block" }` 即可通过 Hook 的返回结果拦截工具调用（如高风险的 `PreToolUse`）。
- **桌面窗口**：当前为浏览器页面。如需真正的透明置顶桌面宠物，可基于 [Electron](https://www.electronjs.org/) 或 [Tauri](https://tauri.app/) 封装 `public/index.html`，设置 `transparent: true`、`alwaysOnTop: true`、`frame: false`。
- **多会话**：按 `sessionId` 维护多个状态机即可。

## 目录结构

```
trae-pet/
├── server.js            # 零依赖 HTTP + SSE 状态服务
├── public/index.html    # 桌面宠物页面
├── hooks.example.json   # TraeCode Hook 配置示例
└── package.json
```

## FAQ

- **Hook 事件没收到？** 确认 TraeCode 版本支持 Hook（本地 command Hook 为基础能力），并确认 `curl` 可用。
- **想改端口？** 设置环境变量 `PORT=9000` 启动，并同步修改 Hook 命令里的端口。

## License

[MIT](./LICENSE)