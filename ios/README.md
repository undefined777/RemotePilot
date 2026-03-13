# iOS 快捷指令设置说明

本目录包含用于控制 RemotePilot 设备的 iOS 快捷指令相关文件。

## 📁 目录结构

```
ios/
├── README.md           # 本说明文件
└── shortcuts/          # 快捷指令文件目录
    └── (快捷指令文件)
```

## 🚀 快捷指令使用方法

### 方式一：从文件导入

1. 打开 iPhone 上的 **快捷指令** App
2. 点击右上角 **「+」** 号
3. 选择 **「添加 App 动作」** 或从文件导入
4. 在 `shortcuts/` 目录中找到对应的快捷指令文件
5. 按照提示完成配置

### 方式二：扫码添加

（如果提供了二维码，在相机中扫描即可快速添加）

## ⚙️ 添加自定义命令

### 支持的命令类型

| 命令 | 说明 | 请求方法 |
|------|------|----------|
| `shutdown` | 关机 | POST |
| `reboot` | 重启 | POST |
| `custom` | 自定义命令 | POST |

### 添加自定义命令步骤

1. 打开 **快捷指令** App
2. 创建新的快捷指令
3. 添加 **「URL」** 操作
4. 配置 URL 为：`http://<设备IP>:<端口>/api/command`
5. 添加 **「获取 URL 内容」** 操作
6. 配置方法为 **「POST」**
7. 添加 **「字典」** 操作，配置请求体：

```json
{
  "command": "shutdown",
  "device_id": "your-device-id"
}
```

## 🖼️ 示意图

### 快捷指令创建流程

```
┌─────────────────┐
│  打开快捷指令   │
│      App        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  点击 "+" 添加  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  添加 URL 操作  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  配置 POST 请求 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  编写请求体     │
│   (JSON 字典)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   保存并命名    │
└─────────────────┘
```

### API 请求示例

### 1. 关机命令

**请求：**
- URL: `http://192.168.1.100:8080/api/command`
- 方法: `POST`
- Headers: `Content-Type: application/json`
- Body:

```json
{
  "command": "shutdown",
  "device_id": "device-001"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "Shutdown command sent",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 2. 重启命令

**请求：**
- URL: `http://192.168.1.100:8080/api/command`
- 方法: `POST`
- Body:

```json
{
  "command": "reboot",
  "device_id": "device-001"
}
```

### 3. 自定义命令

**请求：**
```json
{
  "command": "custom",
  "action": "execute_script",
  "params": {
    "script": "your-script-name",
    "arg1": "value1",
    "arg2": "value2"
  },
  "device_id": "device-001"
}
```

### 4. 查询设备状态

**请求：**
- URL: `http://192.168.1.100:8080/api/status`
- 方法: `GET`

**响应示例：**
```json
{
  "device_id": "device-001",
  "status": "online",
  "uptime": 3600,
  "cpu_usage": 45,
  "memory_usage": 62
}
```

## 🌐 公开 API 接口（推荐用于快捷指令）

为方便 iOS 快捷指令使用，我们提供了**无需登录**的公开 API 接口。

### 接口地址

```
POST http://<你的IP>:3000/api/public/execute
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `api_key` | String | ✅ | API 密钥（在服务器管理界面生成） |
| `command` | String | ✅ | 命令类型 |
| `device_id` | String | ❌ | 目标设备 ID，不填则发送到所有在线设备 |

### 支持的命令

| 命令 | 说明 |
|------|------|
| `shutdown` | 关机 |
| `reboot` | 重启 |
| `restart` | 重启（同 reboot） |
| `logout` | 登出 |
| `suspend` | 挂起 |
| `wake` | 唤醒 |

### 快捷指令配置示例

#### 1. 关机快捷指令

**步骤：**
1. 打开 **快捷指令** App
2. 点击右上角 **「+」** 创建新快捷指令
3. 添加 **「URL」** 操作，填写：
   ```
   http://你的服务器IP:3000/api/public/execute
   ```
4. 添加 **「获取 URL 内容」** 操作
5. 配置方法为 **「POST」**
6. 添加 **「字典」** 操作，配置以下内容：

```json
{
  "api_key": "你的API密钥",
  "command": "shutdown"
}
```

7. 添加 **「文本」** 键入 API key 的值

> **提示:** 可以在服务器 Web UI 的「API 密钥」页面创建新的 API 密钥

#### 2. 重启快捷指令

```json
{
  "api_key": "你的API密钥",
  "command": "reboot"
}
```

#### 3. 发送到指定设备

```json
{
  "api_key": "你的API密钥",
  "command": "shutdown",
  "device_id": "device-001"
}
```

### API 调用示例

#### 关机示例

**请求：**
- URL: `http://192.168.1.100:3000/api/public/execute`
- 方法: `POST`
- Headers: `Content-Type: application/json`
- Body:

```json
{
  "api_key": "rp_xxxxxxxxxxxxxxxxxxxx",
  "command": "shutdown"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "Command sent to 1 device(s)",
  "command": "shutdown",
  "results": [
    {
      "device_id": "device-001",
      "device_name": "My PC",
      "status": "online",
      "sent": true,
      "log_id": 123
    }
  ],
  "total_devices": 1,
  "sent_count": 1
}
```

**失败响应（无在线设备）：**
```json
{
  "success": false,
  "error": "No online devices found",
  "message": "没有在线的设备",
  "command": "shutdown"
}
```

**失败响应（无效 API Key）：**
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

**失败响应（无效命令）：**
```json
{
  "success": false,
  "error": "Invalid command. Allowed commands: shutdown, reboot, restart, logout, suspend, wake",
  "allowed_commands": ["shutdown", "reboot", "restart", "logout", "suspend", "wake"]
}
```

#### 重启示例

**请求：**
```json
{
  "api_key": "rp_xxxxxxxxxxxxxxxxxxxx",
  "command": "reboot"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Command sent to 1 device(s)",
  "command": "reboot",
  "results": [...],
  "total_devices": 1,
  "sent_count": 1
}
```

### 获取可用命令列表

```
GET http://你的服务器IP:3000/api/public/commands
```

**响应：**
```json
{
  "success": true,
  "allowed_commands": ["shutdown", "reboot", "restart", "logout", "suspend", "wake"]
}
```

### 公开 API 健康检查

```
GET http://你的服务器IP:3000/api/public/health
```

**响应：**
```json
{
  "status": "ok",
  "service": "RemotePilot Public API",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🔧 高级配置

### 添加到主屏幕

1. 在快捷指令中，长按刚创建的指令
2. 选择 **「共享」**
3. 选择 **「添加到主屏幕」**
4. 可以自定义图标和名称

### 添加到小组件

1. 长按主屏幕空白处
2. 点击左上角 **「+」**
3. 搜索 **「快捷指令」**
4. 选择小组件样式
5. 添加需要的快捷指令

## 📝 注意事项

1. 确保 iOS 设备与设备在同一局域网内
2. 请将示例中的 `192.168.1.100:8080` 替换为实际设备 IP 和端口
3. `device_id` 需要与服务器上注册的设备 ID 匹配
4. 首次使用可能需要在「设置 > 快捷指令」中允许不受信任的快捷指令

## 🔍 故障排除

- **连接失败**: 检查设备 IP 是否正确，防火墙是否阻止
- **命令无效**: 确认设备支持该命令
- **超时**: 检查网络连接，增加超时时间设置

---

如有问题，请查看主项目文档或提交 Issue。