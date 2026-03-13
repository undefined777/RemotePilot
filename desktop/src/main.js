const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

let mainWindow = null;
let tray = null;
let ws = null;
let deviceId = null;
let isConnected = false;
let heartbeatInterval = null;
let reconnectTimeout = null;

// 设备ID文件路径
const deviceIdFile = path.join(app.getPath('userData'), 'device_id.txt');

// 生成或读取设备ID
function getOrCreateDeviceId() {
  try {
    if (fs.existsSync(deviceIdFile)) {
      deviceId = fs.readFileSync(deviceIdFile, 'utf-8').trim();
      console.log('[Device] 读取已有设备ID:', deviceId);
    } else {
      deviceId = uuidv4();
      fs.writeFileSync(deviceIdFile, deviceId, 'utf-8');
      console.log('[Device] 生成新设备ID:', deviceId);
    }
  } catch (error) {
    console.error('[Device] 获取设备ID失败:', error);
    deviceId = uuidv4();
  }
  return deviceId;
}

// 创建系统托盘
function createTray() {
  // 创建一个简单的托盘图标
  const iconPath = path.join(__dirname, 'icon.png');
  let icon;
  
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // 如果没有图标，创建一个简单的默认图标
    icon = nativeImage.createEmpty();
  }
  
  tray = new Tray(icon);
  updateTrayMenu();
  
  tray.setToolTip('RemotePilot 桌面客户端');
}

// 更新托盘菜单
function updateTrayMenu() {
  const statusText = isConnected ? '🟢 已连接' : '🔴 未连接';
  
  const contextMenu = Menu.buildFromTemplate([
    { label: statusText, enabled: false },
    { type: 'separator' },
    { 
      label: '显示窗口', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { 
      label: '退出', 
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // 更新托盘提示
  tray.setToolTip(`RemotePilot - ${statusText}`);
}

// 连接WebSocket
function connectWebSocket() {
  console.log('[WebSocket] 尝试连接...');
  
  ws = new WebSocket('ws://localhost:3001');
  
  ws.on('open', () => {
    console.log('[WebSocket] 已连接');
    isConnected = true;
    updateTrayMenu();
    
    // 发送注册信息
    sendRegister();
    
    // 启动心跳
    startHeartbeat();
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[WebSocket] 收到消息:', message);
      handleMessage(message);
    } catch (error) {
      console.error('[WebSocket] 解析消息失败:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('[WebSocket] 连接关闭');
    isConnected = false;
    updateTrayMenu();
    
    // 停止心跳
    stopHeartbeat();
    
    // 自动重连
    scheduleReconnect();
  });
  
  ws.on('error', (error) => {
    console.error('[WebSocket] 错误:', error.message);
    isConnected = false;
    updateTrayMenu();
  });
}

// 发送注册信息
function sendRegister() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const registerMessage = {
      type: 'register',
      device_id: deviceId,
      device_name: '我的电脑',
      user_id: 1
    };
    ws.send(JSON.stringify(registerMessage));
    console.log('[WebSocket] 发送注册信息:', registerMessage);
  }
}

// 启动心跳
function startHeartbeat() {
  stopHeartbeat(); // 先清除已有的
  
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
      console.log('[WebSocket] 发送心跳');
    }
  }, 30000); // 30秒
}

// 停止心跳
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// 计划重连
function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  reconnectTimeout = setTimeout(() => {
    console.log('[WebSocket] 尝试重新连接...');
    connectWebSocket();
  }, 3000); // 3秒后重连
}

// 处理消息
function handleMessage(message) {
  const { type, command, cmd_id } = message;
  
  if (type === 'command') {
    executeCommand(command, cmd_id);
  }
}

// 执行命令
function executeCommand(command, cmdId) {
  console.log('[Command] 收到命令:', command, 'ID:', cmdId);
  
  let cmd = '';
  let result = { success: false, output: '' };
  
  switch (command) {
    case 'shutdown':
      // Windows 关机命令
      cmd = process.platform === 'win32' ? 'shutdown /s /t 0' : 'shutdown -h now';
      break;
    case 'restart':
      // Windows 重启命令
      cmd = process.platform === 'win32' ? 'shutdown /r /t 0' : 'reboot';
      break;
    case 'logout':
      // Windows 注销命令
      cmd = process.platform === 'win32' ? 'shutdown /l' : 'logout';
      break;
    default:
      sendCommandResult(cmdId, false, '未知命令');
      return;
  }
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('[Command] 执行失败:', error.message);
      sendCommandResult(cmdId, false, error.message);
    } else {
      console.log('[Command] 执行成功');
      sendCommandResult(cmdId, true, stdout || '命令执行成功');
    }
  });
}

// 发送命令结果
function sendCommandResult(cmdId, success, output) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const resultMessage = {
      type: 'command_result',
      cmd_id: cmdId,
      success: success,
      output: output
    };
    ws.send(JSON.stringify(resultMessage));
    console.log('[WebSocket] 发送命令结果:', resultMessage);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 最小化到托盘时隐藏窗口而不是关闭
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // 加载 Vite 开发服务器或生产构建
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // 打包后的路径：app.asar/dist/index.html
    const isPackaged = app.isPackaged;
    if (isPackaged) {
      mainWindow.loadFile(path.join(process.resourcesPath, 'app', 'dist', 'index.html'));
    } else {
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
  }
}

app.whenReady().then(() => {
  // 获取或创建设备ID
  getOrCreateDeviceId();
  
  // 创建窗口
  createWindow();
  
  // 创建系统托盘
  createTray();
  
  // 连接WebSocket
  connectWebSocket();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 不退出，因为有托盘
});

// 退出应用
app.on('before-quit', () => {
  app.isQuitting = true;
  
  // 清理
  stopHeartbeat();
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  if (ws) {
    ws.close();
  }
});