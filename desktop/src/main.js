const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
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
let serverUrl = 'ws://localhost:3001';

// 从配置文件读取服务器地址
function loadServerUrl() {
  try {
    const configPath = path.join(__dirname, 'renderer', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.serverUrl) {
        serverUrl = config.serverUrl;
        console.log('[Config] 加载服务器地址:', serverUrl);
      }
    }
  } catch (error) {
    console.error('[Config] 读取配置失败:', error);
  }
}

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

// 创建托盘图标（程序化生成的图标）
function createTrayIcon() {
  // 创建一个 16x16 的图标数据
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // 创建渐变蓝色圆形图标
      const dx = x - size / 2;
      const dy = y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < size / 2 - 1) {
        // 蓝色圆形
        canvas[idx] = 0;       // R
        canvas[idx + 1] = 120; // G
        canvas[idx + 2] = 212; // B
        canvas[idx + 3] = 255; // A
      } else {
        // 透明
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }
  
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// 创建系统托盘
function createTray() {
  // 创建程序化图标
  const icon = createTrayIcon();
  
  tray = new Tray(icon);
  updateTrayMenu();
  
  tray.setToolTip('RemotePilot 桌面客户端');
  
  // 双击显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 更新托盘菜单
function updateTrayMenu() {
  const statusText = isConnected ? '🟢 已连接' : '🔴 未连接';
  const statusColor = isConnected ? '#4ec9b0' : '#f14c4c';
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'RemotePilot', 
      enabled: false,
      icon: createTrayIcon().resize({ width: 16, height: 16 }),
    },
    { type: 'separator' },
    { 
      label: statusText, 
      enabled: false,
    },
    { 
      label: `服务器: ${serverUrl.replace('ws://', '')}`, 
      enabled: false,
      visible: false,
    },
    { type: 'separator' },
    { 
      label: '📊 状态', 
      enabled: false,
    },
    { 
      label: isConnected ? '● 已连接到服务器' : '○ 未连接', 
      enabled: false,
      visible: false,
    },
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
      label: '重新连接', 
      click: () => {
        if (ws) {
          ws.close();
        }
        connectWebSocket();
      }
    },
    { type: 'separator' },
    { 
      label: '关于 RemotePilot', 
      click: () => {
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '关于 RemotePilot',
          message: 'RemotePilot 桌面客户端',
          detail: '版本: 1.0.0\n远程控制设备管理工具',
        });
      }
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        app.isQuitting = true;
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
  console.log('[WebSocket] 尝试连接:', serverUrl);
  
  ws = new WebSocket(serverUrl);
  
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
  
  switch (command) {
    case 'shutdown':
      cmd = process.platform === 'win32' ? 'shutdown /s /t 0' : 'shutdown -h now';
      break;
    case 'restart':
      cmd = process.platform === 'win32' ? 'shutdown /r /t 0' : 'reboot';
      break;
    case 'reboot':
      cmd = process.platform === 'win32' ? 'shutdown /r /t 0' : 'reboot';
      break;
    case 'logout':
    case 'logoff':
      cmd = process.platform === 'win32' ? 'shutdown /l' : 'logout';
      break;
    case 'sleep':
      // 睡眠 - Windows
      cmd = process.platform === 'win32' ? 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0' : 'systemctl suspend';
      break;
    case 'lock':
      // 锁定屏幕 - Windows
      cmd = process.platform === 'win32' ? 'rundll32.exe user32.dll,LockWorkStation' : 'loginctl lock-session';
      break;
    case 'hibernate':
      // 休眠 - Windows
      cmd = process.platform === 'win32' ? 'shutdown /h' : 'systemctl hibernate';
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

// 窗口控制 - 通过 IPC 暴露给渲染进程
function setupWindowControls() {
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.hide(); // 隐藏而不是关闭
  });
  
  ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    frame: false, // 无边框窗口
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('[Window] 加载页面:', indexPath);
    mainWindow.loadFile(indexPath);
  }
  
  // 打开开发者工具（开发模式）
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // 加载服务器地址配置
  loadServerUrl();
  
  // 设置窗口控制
  setupWindowControls();
  
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
