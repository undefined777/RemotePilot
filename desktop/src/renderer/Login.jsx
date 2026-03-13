import React, { useState, useEffect } from 'react';
import { Terminal, Lock, Server, Eye, EyeOff } from 'lucide-react';

function Login({ onLogin }) {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载保存的服务器地址
  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(data => {
        if (data.serverUrl) {
          setServerUrl(data.serverUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 保存服务器地址到 localStorage（供前端使用）
      localStorage.setItem('serverUrl', serverUrl);
      localStorage.setItem('username', username);

      // 测试 WebSocket 连接
      const ws = new WebSocket(serverUrl);

      ws.onopen = () => {
        ws.close();
        onLogin({ username, serverUrl });
      };

      ws.onerror = () => {
        setError('无法连接到服务器');
        setLoading(false);
      };

      ws.onclose = () => {
        // 连接测试完成
      };

      // 超时处理
      setTimeout(() => {
        if (loading) {
          setError('连接超时，请检查服务器地址');
          setLoading(false);
        }
      }, 3000);

    } catch (err) {
      setError('连接失败，请检查服务器地址');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d30 100%)',
    }}>
      <div className="glass-card slide-up" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        margin: '20px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #0078d4, #1084d8)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 120, 212, 0.3)',
          }}>
            <Terminal size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}>
            RemotePilot
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}>
            桌面客户端登录
          </p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit}>
          {/* 服务器地址 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}>
              <Server size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              服务器地址
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="ws://localhost:3001"
                required
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                }}
              />
              <Server size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }} />
            </div>
          </div>

          {/* 用户名 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}>
              <Terminal size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              用户名
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                }}
              />
              <Terminal size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }} />
            </div>
          </div>

          {/* 密码 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}>
              <Lock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              密码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '40px',
                }}
              />
              <Lock size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="fade-in" style={{
              padding: '12px',
              marginBottom: '16px',
              background: 'rgba(241, 76, 76, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: '6px',
              color: 'var(--danger)',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* 登录按钮 */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>连接中...</>
            ) : (
              <>登录</>
            )}
          </button>
        </form>

        {/* 底部提示 */}
        <p style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}>
          RemotePilot 桌面客户端 v1.0.0
        </p>
      </div>
    </div>
  );
}

export default Login;