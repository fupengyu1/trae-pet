# trae-pet

一个**桌面宠物**，通过 TraeCode 官方 **Hook** 机制监听 Trae 智能体的状态（进行中 / 已完成 / 需要交互），并用一只小宠物实时展示。

零第三方运行时依赖 —— `git clone` 后一条命令即可启动。

## 快速开始

```bash
npm start
# 打开 http://localhost:8787
```

## 配置 TraeCode Hook

参考 [`hooks.example.json`](./hooks.example.json)，为 `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Stop`、`Notification` 事件各添加一条 command Hook：

```bash
curl -s -X POST http://localhost:8787/event -H 'Content-Type: application/json' -d @-
```

更多说明见源码与项目结构。