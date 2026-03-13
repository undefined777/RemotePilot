import React, { useState } from 'react';
import { Terminal, Lock, Server, Eye, EyeOff, LogIn, X, Square, Minus } from 'lucide-react';

function Login({ onLogin }) {
  const [serverUrl, setServerUrl] = useState('http://192.168.100.223:3000');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(null);

  const handleMinimize = () => window.electron?.minimize();
  const handleMaximize = () => window.electron?.maximize();
  const handleClose = () => window.electron?.close();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 只用 HTTP 3000 端口登录，不需要 WebSocket
      const loginRes = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const loginData = await loginRes.json();
      
      if (!loginData.success) {
        setError(loginData.message || '登录失败');
        setLoading(false);
        return;
      }
      
      // 转换为 WebSocket URL（自动把 3000 变成 3001）
      let wsUrl = serverUrl;
      if (serverUrl.startsWith('http://')) {
        wsUrl = serverUrl.replace('http://', 'ws://').replace(':3000', ':3001');
      } else if (serverUrl.startsWith('https://')) {
        wsUrl = serverUrl.replace('https://', 'wss://').replace(':443', ':3001');
      }
      
      // 关键：保留 deviceId，不要 clear！如果之前有就复用
      const existingDeviceId = localStorage.getItem('deviceId');
      if (!existingDeviceId) {
        // 首次登录，创建新设备ID
        const newDeviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', newDeviceId);
        localStorage.setItem('deviceName', '我的电脑');
      }
      
      // 保存登录信息
      localStorage.setItem('serverUrl', wsUrl);
      localStorage.setItem('httpUrl', serverUrl);
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('username', username);
      
      onLogin({ username, serverUrl, token: loginData.token });

    } catch (err) {
      setError('登录失败: ' + err.message);
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 14px 14px 44px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const btnStyle = {
    width: '46px', height: '40px',
    border: 'none', background: 'transparent',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{
      background: '#0d0d0d', minHeight: '100vh',
      color: '#e0e0e0', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* 顶部标题栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: '40px',
        background: '#0a0a0a', borderBottom: '1px solid #1f1f1f',
        WebkitAppRegion: 'drag', userSelect: 'none', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '26px', height: '26px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '14px', color: 'white',
          }}>R</div>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>RemotePilot - 登录</span>
        </div>
        <div style={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
          {[
            { id: 'min', icon: Minus, action: handleMinimize, title: '最小化' },
            { id: 'max', icon: Square, action: handleMaximize, title: '最大化', size: 12 },
            { id: 'close', icon: X, action: handleClose, title: '关闭', danger: true }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={btn.action}
              onMouseEnter={() => setHoverBtn(btn.id)}
              onMouseLeave={() => setHoverBtn(null)}
              style={{
                width: '46px', height: '40px', border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
                background: hoverBtn === btn.id ? (btn.danger ? '#e81123' : '#3a3a3a') : 'transparent',
              }}
              title={btn.title}
            >
              <btn.icon size={btn.size || 14} color={hoverBtn === btn.id && btn.danger ? '#fff' : '#e0e0e0'} />
            </button>
          ))}
        </div>
      </div>

      {/* 登录表单 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{
          width: '100%', maxWidth: '400px',
          background: '#141414', borderRadius: '16px', padding: '40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Terminal size={32} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>欢迎回来</h1>
            <p style={{ color: '#858585', fontSize: '14px' }}>登录到 RemotePilot</p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(241, 76, 76, 0.1)', border: '1px solid #f14c4c',
              color: '#f14c4c', padding: '12px', borderRadius: '8px',
              marginBottom: '20px', fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 服务器地址 */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <Server size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#666' }} />
              <input
                type="text"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="服务器地址 (例如 http://192.168.1.100:3000)"
                style={{ ...inputStyle }}
              />
            </div>

            {/* 用户名 */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <Terminal size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#666' }} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用户名"
                style={{ ...inputStyle }}
              />
            </div>

            {/* 密码 */}
            <div style={{ marginBottom: '32px', position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#666' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                style={{ ...inputStyle }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '14px', top: '14px',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#666'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '14px',
                background: username && password ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#333',
                border: 'none', borderRadius: '8px',
                color: username && password ? '#fff' : '#666',
                fontSize: '16px', fontWeight: '500',
                cursor: username && password ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.1s, box-shadow 0.2s',
              }}
            >
              {loading ? '登录中...' : <><LogIn size={18} /> 登录</>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', color: '#555', fontSize: '12px' }}>
            RemotePilot v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
