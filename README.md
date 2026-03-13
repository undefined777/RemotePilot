# RemotePilot

一个美观的 Windows 远程控制工具，通过 iOS 快捷指令实现远程关机、重启等命令。

## 🎯 功能特性

- 📱 iOS 快捷指令远程控制
- 💻 Windows 桌面客户端（开机自启动）
- 🎨 现代美观的 UI 设计
- 🔐 用户系统 + API Key 鉴权
- 📊 Web 管理后台
- ⚡ 实时 WebSocket 通信
- 📝 命令执行日志

## 🛠 技术栈

- **后端**: Node.js + Express + SQLite + WebSocket
- **桌面端**: Electron + React + TypeScript
- **iOS**: 快捷指令 (Shortcuts)
- **数据库**: SQLite

## 🚀 快速开始

### 1. 启动后端

```bash
cd backend
npm install
npm start
```

- HTTP: http://localhost:3000
- WebSocket: ws://localhost:3001
- 管理后台: http://localhost:3000 (开发模式) 或 build 后部署

默认账号：admin / admin123

### 2. 桌面客户端

```bash
cd desktop
npm install
npm run electron:dev  # 开发模式
npm run dist          # 打包（需要 Windows 或 wine）
```

### 3. iOS 快捷指令

详见 [ios/README.md](ios/README.md)

## 📁 项目结构

```
RemotePilot/
├── backend/          # 后端服务
│   └── src/
│       ├── db/       # 数据库
│       └── routes/   # API 路由
├── desktop/          # Electron 桌面客户端
└── ios/              # iOS 快捷指令
```

## 🔌 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/devices | GET | 设备列表 |
| /api/keys | POST | 创建 API Key |
| /api/public/execute | POST | 公开接口（iOS调用）|

## 📜 命令白名单

- shutdown - 关机
- restart - 重启
- logout - 注销

## 🤝 开源协议

MIT License