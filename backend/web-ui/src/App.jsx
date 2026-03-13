import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = 'http://localhost:3000/api'

// 模拟设备数据（用于离线演示）
const mockDevices = [
  { id: 1, device_id: 'device_001', name: 'iPhone 15 Pro', status: 'online', battery: 85, last_seen: new Date().toISOString() },
  { id: 2, device_id: 'device_002', name: 'iPad Air', status: 'online', battery: 62, last_seen: new Date().toISOString() },
  { id: 3, device_id: 'device_003', name: 'MacBook Pro', status: 'offline', battery: 0, last_seen: new Date(Date.now() - 3600000).toISOString() },
  { id: 4, device_id: 'device_004', name: 'Android Phone', status: 'online', battery: 45, last_seen: new Date().toISOString() },
  { id: 5, device_id: 'device_005', name: 'Windows PC', status: 'online', battery: 100, last_seen: new Date().toISOString() },
]

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [devices, setDevices] = useState([])
  const [commands, setCommands] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [currentView, setCurrentView] = useState('devices')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 登录状态
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // API Key 创建弹窗
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  // 检查后端连接
  useEffect(() => {
    checkConnection()
  }, [])

  // 获取数据（已登录时）
  useEffect(() => {
    if (token) {
      fetchDevices()
      fetchCommands()
      fetchApiKeys()
      verifyToken()
    }
  }, [token])

  const checkConnection = async () => {
    try {
      const res = await axios.get('http://localhost:3000/', { timeout: 2000 })
      if (res.data.status === 'ok') {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (err) {
      setConnectionStatus('disconnected')
    }
  }

  const verifyToken = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setUser(res.data.user)
      }
    } catch (err) {
      // Token 无效，清除登录状态
      handleLogout()
    }
  }

  const fetchDevices = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setDevices(res.data.devices || [])
      }
    } catch (err) {
      console.error('获取设备失败:', err)
      // 离线时使用模拟数据
      if (!navigator.onLine) {
        setDevices(mockDevices)
        setError('使用离线数据')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchCommands = async () => {
    try {
      const res = await axios.get(`${API_BASE}/commands?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setCommands(res.data.commands || [])
      }
    } catch (err) {
      console.error('获取命令失败:', err)
    }
  }

  const fetchApiKeys = async () => {
    try {
      const res = await axios.get(`${API_BASE}/keys`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setApiKeys(res.data.api_keys || [])
      }
    } catch (err) {
      console.error('获取API Keys失败:', err)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)

    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        username,
        password
      })

      if (res.data.success) {
        const newToken = res.data.token
        localStorage.setItem('token', newToken)
        setToken(newToken)
        setUser(res.data.user)
      }
    } catch (err) {
      const msg = err.response?.data?.message || '登录失败'
      setLoginError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (token) {
        await axios.post(`${API_BASE}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (err) {
      console.error('登出失败:', err)
    }
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setDevices([])
    setCommands([])
    setApiKeys([])
  }

  const handleCreateApiKey = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return

    try {
      const res = await axios.post(`${API_BASE}/keys`, 
        { name: newKeyName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.success) {
        setApiKeys([res.data.api_key, ...apiKeys])
        setShowKeyModal(false)
        setNewKeyName('')
        alert(`API Key 创建成功!\n\nKey: ${res.data.api_key.key}\n\n请妥善保存，此Key只显示一次！`)
      }
    } catch (err) {
      alert(err.response?.data?.message || '创建失败')
    }
  }

  const formatTime = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return date.toLocaleDateString('zh-CN')
  }

  const getDeviceIcon = (name) => {
    if (!name) return '📱'
    const n = name.toLowerCase()
    if (n.includes('iphone') || n.includes('android') || n.includes('手机')) return '📱'
    if (n.includes('ipad') || n.includes('平板')) return '📱'
    if (n.includes('mac') || n.includes('laptop')) return '💻'
    if (n.includes('windows') || n.includes('pc') || n.includes('电脑')) return '🖥️'
    return '📱'
  }

  // ============ 登录页面 ============
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <span className="login-logo">📡</span>
            <h1>RemotePilot</h1>
            <p>管理后台</p>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>
            <div className="form-group">
              <label>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                required
              />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <div className="login-hint">
            默认账号: admin / admin123
          </div>
        </div>
      </div>
    )
  }

  // ============ 主应用 ============
  const onlineDevices = devices.filter(d => d.status === 'online')
  const avgBattery = onlineDevices.length > 0 
    ? Math.round(onlineDevices.reduce((acc, d) => acc + (d.battery || 0), 0) / onlineDevices.length)
    : 0

  return (
    <div className="app">
      {/* 顶部导航栏 */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">📡</span>
            <h1>RemotePilot</h1>
          </div>
          <span className="subtitle">管理后台</span>
        </div>
        <div className="header-right">
          <div className={`connection-status ${connectionStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {connectionStatus === 'connected' ? '已连接' : '未连接'}
            </span>
          </div>
          {user && (
            <div className="user-info">
              <span className="user-avatar">👤</span>
              <span className="username">{user.username}</span>
              <span className="user-role">({user.role})</span>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            退出
          </button>
        </div>
      </header>

      {/* 标签导航 */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab ${currentView === 'devices' ? 'active' : ''}`}
          onClick={() => setCurrentView('devices')}
        >
          📱 设备列表
        </button>
        <button 
          className={`nav-tab ${currentView === 'commands' ? 'active' : ''}`}
          onClick={() => setCurrentView('commands')}
        >
          📋 命令日志
        </button>
        <button 
          className={`nav-tab ${currentView === 'keys' ? 'active' : ''}`}
          onClick={() => setCurrentView('keys')}
        >
          🔑 API Keys
        </button>
      </nav>

      {/* 主内容区 */}
      <main className="main">
        {error && <div className="error-banner">{error}</div>}
        
        {currentView === 'devices' && (
          <>
            {/* 统计卡片 */}
            <div className="stats">
              <div className="stat-card">
                <div className="stat-icon">📱</div>
                <div className="stat-info">
                  <span className="stat-value">{devices.length}</span>
                  <span className="stat-label">设备总数</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <span className="stat-value">{onlineDevices.length}</span>
                  <span className="stat-label">在线设备</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔋</div>
                <div className="stat-info">
                  <span className="stat-value">{avgBattery}%</span>
                  <span className="stat-label">平均电量</span>
                </div>
              </div>
            </div>

            {/* 设备列表 */}
            <section className="devices-section">
              <h2>设备列表</h2>
              {loading ? (
                <div className="loading">加载中...</div>
              ) : devices.length === 0 ? (
                <div className="empty-state">
                  <p>暂无设备</p>
                  <p className="hint">后端设备连接后将自动显示</p>
                </div>
              ) : (
                <div className="devices-grid">
                  {devices.map((device) => (
                    <div key={device.id} className={`device-card ${device.status}`}>
                      <div className="device-header">
                        <div className="device-icon">
                          {getDeviceIcon(device.name)}
                        </div>
                        <div className={`device-status ${device.status}`}>
                          <span className="status-indicator"></span>
                          {device.status === 'online' ? '在线' : '离线'}
                        </div>
                      </div>
                      <div className="device-info">
                        <h3>{device.name}</h3>
                        <p className="device-id">ID: {device.device_id}</p>
                        <p className="last-seen">最后活跃: {formatTime(device.last_seen)}</p>
                      </div>
                      <div className="device-footer">
                        <div className="battery">
                          <span className={`battery-icon ${(device.battery || 0) > 20 ? 'normal' : 'low'}`}>
                            🔋
                          </span>
                          <span className="battery-value">{device.battery || 0}%</span>
                        </div>
                        <button className="action-btn" disabled={device.status !== 'online'}>
                          控制
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {currentView === 'commands' && (
          <section className="commands-section">
            <h2>命令日志</h2>
            {commands.length === 0 ? (
              <div className="empty-state">
                <p>暂无命令记录</p>
              </div>
            ) : (
              <div className="commands-table">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>设备</th>
                      <th>命令</th>
                      <th>状态</th>
                      <th>结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commands.map((cmd) => (
                      <tr key={cmd.id}>
                        <td>{formatTime(cmd.created_at)}</td>
                        <td>{cmd.device_name || cmd.device_device_id || '-'}</td>
                        <td><code className="command-text">{cmd.command}</code></td>
                        <td>
                          <span className={`status-badge ${cmd.status}`}>
                            {cmd.status === 'pending' ? '待执行' : 
                             cmd.status === 'completed' ? '已完成' : 
                             cmd.status === 'failed' ? '失败' : 
                             cmd.status === 'rejected' ? '已拒绝' : cmd.status}
                          </span>
                        </td>
                        <td className="result-text">{cmd.result || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {currentView === 'keys' && (
          <section className="keys-section">
            <div className="keys-header">
              <h2>API Keys</h2>
              <button className="create-key-btn" onClick={() => setShowKeyModal(true)}>
                + 创建新 Key
              </button>
            </div>
            {apiKeys.length === 0 ? (
              <div className="empty-state">
                <p>暂无 API Keys</p>
                <p className="hint">创建 API Key 以便外部应用访问</p>
              </div>
            ) : (
              <div className="keys-list">
                {apiKeys.map((key) => (
                  <div key={key.id} className="key-card">
                    <div className="key-info">
                      <span className="key-name">{key.name}</span>
                      <code className="key-value">{key.key}</code>
                      <span className="key-date">创建于: {formatTime(key.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* API Key 创建弹窗 */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>创建 API Key</h3>
            <form onSubmit={handleCreateApiKey}>
              <div className="form-group">
                <label>名称</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="例如: 我的应用"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowKeyModal(false)}>
                  取消
                </button>
                <button type="submit" className="confirm-btn">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 底部 */}
      <footer className="footer">
        <p>RemotePilot 管理后台 © 2026</p>
      </footer>
    </div>
  )
}

export default App