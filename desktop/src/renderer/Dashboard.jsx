import React, { useState, useEffect } from 'react';
import { Terminal, LogOut, Monitor, Activity, Key, Copy, Check, Wifi, WifiOff, RefreshCw, Plus, Trash2, Clock, Minus, Square, X } from 'lucide-react';

// 窗口控制按钮组件
function TitleBar({ onLogout, connected }) {
  const handleMinimize = () => window.electron?.minimize();
  const handleMaximize = () => window.electron?.maximize();
  const handleClose = () => window.electron?.close();
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: '40px',
      background: '#0a0a0a',
      borderBottom: '1px solid #1f1f1f',
      WebkitAppRegion: 'drag',
      userSelect: 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
    }}>
      {/* 左侧 Logo 和标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '26px', height: '26px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: '14px', color: 'white',
        }}>R</div>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>RemotePilot</span>
        <span style={{ 
          color: connected ? '#4ec9b0' : '#f14c4c', 
          fontSize: '11px', 
          marginLeft: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {connected ? <><Wifi size={12}/> 已连接</> : <><WifiOff size={12}/> 未连接</>}
        </span>
      </div>
      
      {/* 右侧控制按钮 */}
      <div style={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
        <button onClick={handleMinimize} style={btnStyle} title="最小化">
          <Minus size={14} color="#e0e0e0" />
        </button>
        <button onClick={handleMaximize} style={btnStyle} title="最大化">
          <Square size={12} color="#e0e0e0" />
        </button>
        <button onClick={handleClose} style={{...btnStyle, color: '#fff'}} title="关闭">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  width: '46px', height: '40px',
  border: 'none', background: 'transparent',
  cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

// 保持 btnHoverStyle 供参考，但在 JSX 中直接用 onMouseEnter/Leave
const btnHover = { background: '#3a3a3a' };
const btnCloseHover = { background: '#e81123', color: '#fff' };

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const httpUrl = localStorage.getItem('httpUrl') || 'http://192.168.100.223:3000';
  const wsUrl = localStorage.getItem('serverUrl') || 'ws://192.168.100.223:3001';
  const username = localStorage.getItem('username') || user.username;

  useEffect(() => {
    fetchData();
    
    // 建立 WebSocket 连接
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
      } catch (e) {}
    };
    
    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };
    
    ws.onerror = () => {
      setConnected(false);
    };
    
    return () => ws.close();
  }, [wsUrl]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const [devicesRes, logsRes, keysRes] = await Promise.all([
        fetch(`${httpUrl}/api/devices`, { headers }),
        fetch(`${httpUrl}/api/commands`, { headers }),
        fetch(`${httpUrl}/api/keys`, { headers })
      ]);
      
      const devicesData = await devicesRes.json();
      const logsData = await logsRes.json();
      const keysData = await keysRes.json();
      
      if (devicesData.success) setDevices(devicesData.devices || []);
      if (logsData.success) setLogs(logsData.commands || []);
      if (keysData.success) setApiKeys(keysData.keys || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleLogout = async () => {
    // 通知后端设备离线
    try {
      await fetch(`${httpUrl}/api/devices/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
    } catch (e) {}
    
    localStorage.clear();
    onLogout();
  };

  const createApiKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${httpUrl}/api/keys`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newKeyName })
      });
      const data = await res.json();
      if (data.success) {
        setApiKeys([...apiKeys, data.key]);
        setShowNewKey(false);
        setNewKeyName('');
      }
    } catch (err) {}
  };

  const deleteApiKey = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${httpUrl}/api/keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setApiKeys(apiKeys.filter(k => k.id !== id));
    } catch (err) {}
  };

  return (
    <div style={{ 
      background: '#0d0d0d', 
      minHeight: '100vh', 
      color: '#e0e0e0',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>
      <TitleBar onLogout={handleLogout} connected={connected} />
      
      <div style={{ paddingTop: '56px', padding: '56px 24px 24px' }}>
        {/* 用户信息栏 */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '24px', padding: '16px', background: '#141414', borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '16px'
            }}>
              {username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '500' }}>{username}</div>
              <div style={{ fontSize: '12px', color: '#858585' }}>管理员</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: 'transparent', color: '#f14c4c', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <LogOut size={16} /> 退出登录
          </button>
        </div>

        {/* 标签页导航 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'devices', icon: Monitor, label: '设备管理' },
            { id: 'logs', icon: Activity, label: '命令日志' },
            { id: 'keys', icon: Key, label: 'API Keys' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: activeTab === tab.id ? '#1f1f1f' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#858585',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '14px'
              }}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* 设备管理 */}
        {activeTab === 'devices' && (
          <div style={{ background: '#141414', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>在线设备</h3>
            {devices.length === 0 ? (
              <div style={{ color: '#858585', textAlign: 'center', padding: '40px' }}>
                暂无设备连接
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {devices.map(device => (
                  <div key={device.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px', background: '#1f1f1f', borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Monitor size={20} color="#6366f1" />
                      <div>
                        <div style={{ fontWeight: '500' }}>{device.name}</div>
                        <div style={{ fontSize: '12px', color: '#858585' }}>ID: {device.device_id}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
                      background: device.status === 'online' ? 'rgba(78, 201, 176, 0.2)' : 'rgba(241, 76, 76, 0.2)',
                      color: device.status === 'online' ? '#4ec9b0' : '#f14c4c'
                    }}>
                      {device.status === 'online' ? '在线' : '离线'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 命令日志 */}
        {activeTab === 'logs' && (
          <div style={{ background: '#141414', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '500' }}>执行历史</h3>
            {logs.length === 0 ? (
              <div style={{ color: '#858585', textAlign: 'center', padding: '40px' }}>
                暂无命令记录
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2d2d30' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#858585' }}>时间</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#858585' }}>命令</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#858585' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px' }}>{log.command}</td>
                      <td style={{ padding: '12px', color: log.status === 'success' ? '#4ec9b0' : '#f14c4c' }}>
                        {log.status === 'success' ? '成功' : '失败'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* API Keys */}
        {activeTab === 'keys' && (
          <div style={{ background: '#141414', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '500' }}>API Keys</h3>
              <button 
                onClick={() => setShowNewKey(true)}
                style={{ 
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  background: '#6366f1', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Plus size={14} /> 创建
              </button>
            </div>
            
            {apiKeys.map(key => (
              <div key={key.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px', background: '#1f1f1f', borderRadius: '8px', marginBottom: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{key.name}</div>
                  <div style={{ fontSize: '12px', color: '#858585', fontFamily: 'monospace' }}>{key.key}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(key.key); setCopiedKey(key.id); }}
                    style={{ padding: '8px', background: 'transparent', border: 'none', color: '#858585', cursor: 'pointer' }}
                  >
                    {copiedKey === key.id ? <Check size={16} color="#4ec9b0" /> : <Copy size={16} />}
                  </button>
                  <button 
                    onClick={() => deleteApiKey(key.id)}
                    style={{ padding: '8px', background: 'transparent', border: 'none', color: '#f14c4c', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {showNewKey && (
              <div style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10000
              }}>
                <div style={{ 
                  background: '#141414', padding: '24px', borderRadius: '12px', width: '400px',
                  margin: '20px'
                }}>
                  <h3 style={{ marginBottom: '16px' }}>创建新的 API Key</h3>
                  <input
                    type="text"
                    placeholder="输入名称"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    style={{ 
                      width: '100%', padding: '12px', marginBottom: '16px',
                      background: '#1f1f1f', border: '1px solid #3c3c3c', borderRadius: '6px',
                      color: '#fff', outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setShowNewKey(false); setNewKeyName(''); }}
                      style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#2d2d30', color: '#fff', cursor: 'pointer' }}
                    >
                      取消
                    </button>
                    <button 
                      onClick={createApiKey}
                      disabled={!newKeyName.trim()}
                      style={{ 
                        padding: '10px 20px', borderRadius: '6px', border: 'none', 
                        background: newKeyName.trim() ? '#6366f1' : '#3c3c3c', 
                        color: '#fff', cursor: newKeyName.trim() ? 'pointer' : 'not-allowed'
                      }}
                    >
                      创建
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
