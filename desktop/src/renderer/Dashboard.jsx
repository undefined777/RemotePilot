import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  LogOut,
  Monitor,
  Activity,
  Key,
  Copy,
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Minus,
  Square,
  X,
} from 'lucide-react';

// 窗口控制按钮组件
function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  
  useEffect(() => {
    // 检查初始最大化状态
    window.electron?.isMaximized().then(setIsMaximized);
  }, []);
  
  const handleMinimize = () => window.electron?.minimize();
  const handleMaximize = async () => {
    window.electron?.maximize();
    const maximized = await window.electron?.isMaximized();
    setIsMaximized(maximized);
  };
  const handleClose = () => window.electron?.close();
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '8px',
      padding: '8px 16px',
      background: '#0a0a0a',
      borderBottom: '1px solid #1f1f1f',
      WebkitAppRegion: 'drag',
    }}>
      <button onClick={handleMinimize} style={btnStyle} title="最小化">
        <Minus size={14} />
      </button>
      <button onClick={handleMaximize} style={btnStyle} title={isMaximized ? "还原" : "最大化"}>
        <Square size={12} />
      </button>
      <button onClick={handleClose} style={{...btnStyle, hoverBg: '#e81123'}} title="关闭">
        <X size={14} />
      </button>
    </div>
  );
}

const btnStyle = {
  width: '32px',
  height: '32px',
  border: 'none',
  background: 'transparent',
  color: '#888',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
  WebkitAppRegion: 'no-drag',
};

function Dashboard({ user, onLogout }) {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    const serverUrl = localStorage.getItem('serverUrl');
    if (!serverUrl) return;

    const websocket = new WebSocket(serverUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      const deviceId = localStorage.getItem('deviceId') || generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
      websocket.send(JSON.stringify({
        type: 'register',
        device_id: deviceId,
        device_name: user.username || '我的电脑',
        user_id: user.username,
      }));
      addLog('已连接到服务器', 'success');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      addLog('连接已断开', 'error');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      addLog('连接错误', 'error');
    };

    setWs(websocket);
    return () => websocket.close();
  }, [user]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));
  }, []);

  const generateDeviceId = () => 'device_' + Math.random().toString(36).substr(2, 9);

  const handleMessage = (message) => {
    if (message.type === 'register_success') {
      addLog('设备注册成功: ' + message.device_name, 'success');
    } else if (message.type === 'device_list') {
      setDevices(message.devices || []);
    } else if (message.type === 'command_result') {
      addLog('命令执行结果: ' + (message.success ? '成功' : '失败') + ' - ' + message.output, 
        message.success ? 'success' : 'error');
    } else if (message.type === 'ping') {
      addLog('收到心跳', 'info');
    }
  };

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev.slice(-99), {
      id: Date.now(),
      message,
      type,
      time: new Date().toLocaleTimeString(),
    }]);
  };

  const handleLogout = () => {
    if (ws) ws.close();
    onLogout();
  };

  const copyToClipboard = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const createApiKey = () => {
    if (!newKeyName.trim()) return;
    const newKey = {
      id: Date.now(),
      name: newKeyName,
      key: 'rp_' + Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16),
      created: new Date().toLocaleDateString(),
    };
    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    localStorage.setItem('apiKeys', JSON.stringify(updatedKeys));
    setNewKeyName('');
    setShowNewKeyModal(false);
    addLog('创建 API Key: ' + newKeyName, 'success');
  };

  const deleteApiKey = (id) => {
    const updatedKeys = apiKeys.filter(k => k.id !== id);
    setApiKeys(updatedKeys);
    localStorage.setItem('apiKeys', JSON.stringify(updatedKeys));
    addLog('删除 API Key', 'info');
  };

  return (
    <>
      <TitleBar />
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #0078d4, #1084d8)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Terminal size={20} color="white" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>RemotePilot</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: connected ? 'rgba(78, 201, 176, 0.1)' : 'rgba(241, 76, 76, 0.1)',
            borderRadius: '20px',
            fontSize: '13px',
            color: connected ? 'var(--success)' : 'var(--danger)',
          }}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? '已连接' : '未连接'}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              background: 'var(--accent)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '600',
            }}>
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '14px' }}>{user.username}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <LogOut size={16} />
            登出
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '24px', overflow: 'auto', background: 'var(--bg-primary)' }}>
        <div className="dashboard-grid">
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Monitor size={18} />
                设备列表
              </h2>
              <button className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                <RefreshCw size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                padding: '12px',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="status-dot status-online" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{user.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>本地设备</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--success)' }}>
                  <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  在线
                </div>
              </div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} />
                命令日志
              </h2>
              <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setLogs([])}>
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>暂无日志</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="log-item" style={{
                    borderLeftColor: log.type === 'success' ? 'var(--success)' : log.type === 'error' ? 'var(--danger)' : 'var(--accent)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{log.time}</span>
                    </div>
                    <div style={{ fontSize: '13px' }}>{log.message}</div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
          <div className="glass-card" style={{ padding: '20px', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} />
                API Key 管理
              </h2>
              <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => setShowNewKeyModal(true)}>
                <Plus size={14} />
                创建 Key
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {apiKeys.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>暂无 API Key，点击上方按钮创建一个</div>
              ) : (
                apiKeys.map((apiKey) => (
                  <div key={apiKey.id} style={{
                    padding: '12px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{apiKey.name}</div>
                      <div className="api-key-display" style={{ padding: '8px', fontSize: '12px', marginBottom: '4px' }}>{apiKey.key}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>创建于: {apiKey.created}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => copyToClipboard(apiKey.key, apiKey.id)}>
                        {copiedKey === apiKey.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => deleteApiKey(apiKey.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      {showNewKeyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', padding: '24px', margin: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>创建新的 API Key</h3>
            <input type="text" placeholder="输入 Key 名称" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} style={{ width: '100%', marginBottom: '16px' }} autoFocus />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowNewKeyModal(false); setNewKeyName(''); }}>取消</button>
              <button className="btn btn-primary" onClick={createApiKey} disabled={!newKeyName.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;