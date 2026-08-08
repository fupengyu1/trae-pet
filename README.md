# trae-pet

一个**桌面宠物**，通过 TraeCode 官方 **Hook** 机制监听 Trae 智能体的状态（进行中 / 已完成 / 需要交互），并用一只小宠物实时展示。已封装为 **Electron 透明置顶桌面窗口**。

## 原理

TraeCode 提供 6 类 Hook 事件，会在智能体执行的关键节点触发。本工程让 Hook 用 `curl` 把事件 JSON 转发到本地服务，服务维护状态机并通过 SSE 推送给宠物窗口。

| 你感知的状态 | Hook 事件 | 触发时机 |
|---|---|---|
| 开始工作 | `UserPromptSubmit` | 用户提交任务、智能体开始处理 |
| 进行中 | `PreToolUse` / `PostToolUse` | 工具调用前后 |
| 需要交互 | `Notification` | 工具执行等待用户确认 |
| 已完成 | `Stop` | 智能体完成输出 |

## 快速开始

```bash
# 1. 安装依赖（首次）
npm install

# 2. 启动桌面宠物窗口（Electron 透明置顶）
npm start

# 仅浏览器预览（不装 Electron 也可）
npm run server
# 打开 http://localhost:8787
```

## 桌面窗口特性

- **透明、无边框、置顶**：宠物悬浮在桌面最上层，不占任务栏。
- **可拖拽**：按住宠物本体即可拖动窗口位置。
- **右键菜单**：右键宠物弹出菜单 —— 切换置顶 / 重新加载 / 打开浏览器版 / 退出。
- **托盘常驻**：最小化后驻留系统托盘，双击托盘图标可重新显示。

## 配置 TraeCode Hook

1. 打开 TraeCode → 设置 → 搜索 `hooks`，进入 Hook 配置。
2. 参考 [`hooks.example.json`](./hooks.example.json)，为以下事件各添加一条 `command` 类型的 Hook，命令为：
   ```bash
   curl -s -X POST http://localhost:8787/event -H 'Content-Type: application/json' -d @-
   ```
   - `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Stop`、`Notification`
3. 在 TraeCode 里发起任务，宠物会实时切换：空闲 → 进行中 → 等待交互 / 已完成。

## 架构

```
Trae 智能体执行
   │  6 类 Hook 事件
   ▼
Hook 处理程序 (curl POST)
   ▼
本地事件服务 (src/server.js, :8787)   ← 维护状态机 idle/running/waiting/done
   │  SSE 推送
   ▼
Electron 透明置顶窗口 (src/main.js)
   ├ 桌面宠物页面 (public/desktop.html)  → 动画 + 气泡 + 拖拽
   └ 托盘 + 右键菜单
```

## 目录结构

```
trae-pet/
├── src/
│   ├── main.js        # Electron 主进程（透明窗口 + 托盘 + 菜单）
│   ├── preload.js     # 安全 IPC 桥（contextBridge）
│   └── server.js      # 零依赖 HTTP + SSE 状态服务（可内嵌）
├── public/
│   └── desktop.html   # 桌面宠物页面（透明窗口/浏览器通用）
├── hooks.example.json # TraeCode Hook 配置示例
└── package.json
```

## 扩展

- **直接操作 / 拦截**：在 `src/server.js` 的 `handleEvent()` 中返回 `{ behavior: "block" }` 即可通过 Hook 返回结果拦截工具调用（如高风险的 `PreToolUse`）。
- **打包分发**：`npm run dist` 使用 electron-builder 生成 Windows / macOS / Linux 安装包。注意需在对应平台各自打包。
- **多会话**：按 `sessionId` 维护多个状态机即可。
- **自定义托盘图标**：`src/main.js` 中 `createTray()` 目前用占位图标，可替换为你的 `.png`/`.ico`。

## 常见问题

- **Electron 安装慢/失败**：`npm install` 时 Electron 需从 GitHub 下载二进制，国内可设置镜像：
  ```bash
  export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
  npm install
  ```
- **Hook 事件没收到？** 确认 TraeCode 版本支持 Hook（本地 command Hook 为基础能力），并确认 `curl` 可用。
- **想改端口？** 设置环境变量 `PORT=9000` 启动，并同步修改 Hook 命令里的端口。

## License

[MIT](./LICENSE)