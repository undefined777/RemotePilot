import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  LayoutDashboard, 
  Smartphone, 
  Terminal, 
  Key, 
  Users, 
  LogOut, 
  Wifi, 
  WifiOff,
  Battery,
  BatteryLow,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Shield,
  X
} from 'lucide-react'
import './App.css'

const API_BASE = 'http://192.168.100.223:3000/api'

// 模拟设备数据（用于离线演示）
const mockDevices = [
  { id: 1, device_id: 'device_001', name: 'iPhone 15 Pro', status: 'online', battery: 85, last_seen: new Date().toISOString() },
  { id: 2, device_id: 'device_002', name: 'iPad Air', status: 'online', battery: 62, last_seen: new Date().toISOString() },
  { id: 3, device_id: 'device_003', name: 'MacBook Pro', status: 'offline', battery: 0, last_seen: new Date(Date.now() - 3600000).toISOString() },
  { id: 4, device_id: 'device_004', name: 'Android Phone', status: 'online', battery: 45, last_seen: new Date().toISOString() },
  { id: 5, device_id: 'device_005', name: 'Windows PC', status: 'online', battery: 100, last_seen: new Date().toISOString() },
]

// 模拟用户数据
const mockUsers = [
  { id: 1, username: 'admin', role: 'admin', email: 'admin@remotepilot.io', created_at: '2026-01-15T10:00:00Z' },
  { id: 2, username: 'operator1', role: 'operator', email: 'op1@remotepilot.io', created_at: '2026-02-01T14:30:00Z' },
  { id: 3, username: 'viewer', role: 'viewer', email: 'viewer@remotepilot.io', created_at: '2026-02-20T09:15:00Z' },
]

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [devices, setDevices] = useState([])
  const [commands, setCommands] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [users, setUsers] = useState([])
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
  const [copiedKey, setCopiedKey] = useState(null)

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
      fetchUsers()
      verifyToken()
    }
  }, [token])

  const checkConnection = async () => {
    try {
      const res = await axios.get('http://192.168.100.223:3000/', { timeout: 2000 })
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

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setUsers(res.data.users || [])
      }
    } catch (err) {
      console.error('获取用户失败:', err)
      // 离线时使用模拟数据
      setUsers(mockUsers)
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
    setUsers([])
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

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleDeleteKey = async (keyId) => {
    if (!confirm('确定要删除这个 API Key 吗？')) return
    
    try {
      await axios.delete(`${API_BASE}/keys/${keyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApiKeys(apiKeys.filter(k => k.id !== keyId))
    } catch (err) {
      alert(err.response?.data?.message || '删除失败')
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

  const formatDate = (isoString) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleString('zh-CN')
  }

  // ============ 登录页面 ============
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo-wrap">
              <div className="login-logo-icon">
                <Terminal size={32} />
              </div>
            </div>
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
            {loginError && (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <div className="login-hint">
            默认账号: admin / admin123
          </div>
        </div>
        <div className="login-bg-pattern"></div>
      </div>
    )
  }

  // ============ 主应用 ============
  const onlineDevices = devices.filter(d => d.status === 'online')
  const avgBattery = onlineDevices.length > 0 
    ? Math.round(onlineDevices.reduce((acc, d) => acc + (d.battery || 0), 0) / onlineDevices.length)
    : 0

  const navItems = [
    { id: 'devices', icon: Smartphone, label: '设备管理' },
    { id: 'commands', icon: Terminal, label: '命令日志' },
    { id: 'keys', icon: Key, label: 'API Keys' },
    { id: 'users', icon: Users, label: '用户管理' },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircle size={14} />
      case 'offline': return <XCircle size={14} />
      case 'pending': return <Clock size={14} />
      default: return null
    }
  }

  return (
    <div className="app">
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Terminal size={20} />
            <span>RemotePilot</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              <ChevronRight size={14} className="nav-arrow" />
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="connection-indicator">
            {connectionStatus === 'connected' ? (
              <>
                <Wifi size={14} />
                <span>已连接</span>
              </>
            ) : (
              <>
                <WifiOff size={14} />
                <span>未连接</span>
              </>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="main">
        {/* 顶部栏 */}
        <header className="topbar">
          <div className="topbar-left">
            <h2>{navItems.find(n => n.id === currentView)?.label}</h2>
          </div>
          <div className="topbar-right">
            <div className="user-menu">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <span className="user-name">{user?.username}</span>
              <span className="user-role">({user?.role})</span>
            </div>
          </div>
        </header>

        {/* 内容 */}
        <div className="content">
          {error && <div className="error-banner">{error}</div>}
          
          {currentView === 'devices' && (
            <>
              {/* 统计卡片 */}
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <Smartphone size={20} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{devices.length}</span>
                    <span className="stat-label">设备总数</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">
                    <CheckCircle size={20} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{onlineDevices.length}</span>
                    <span className="stat-label">在线设备</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple">
                    <Battery size={20} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{avgBattery}%</span>
                    <span className="stat-label">平均电量</span>
                  </div>
                </div>
              </div>

              {/* 设备列表 */}
              <section className="section">
                <div className="section-header">
                  <h3>设备列表</h3>
                </div>
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : devices.length === 0 ? (
                  <div className="empty-state">
                    <Smartphone size={48} strokeWidth={1} />
                    <p>暂无设备</p>
                    <span>后端设备连接后将自动显示</span>
                  </div>
                ) : (
                  <div className="devices-grid">
                    {devices.map((device) => (
                      <div key={device.id} className={`device-card ${device.status}`}>
                        <div className="device-header">
                          <div className={`status-badge ${device.status}`}>
                            {getStatusIcon(device.status)}
                            <span>{device.status === 'online' ? '在线' : '离线'}</span>
                          </div>
                          <div className="battery-indicator">
                            {(device.battery || 0) > 20 ? (
                              <Battery size={16} />
                            ) : (
                              <BatteryLow size={16} className="low-battery" />
                            )}
                            <span>{device.battery || 0}%</span>
                          </div>
                        </div>
                        <div className="device-body">
                          <h4>{device.name}</h4>
                          <code className="device-id">{device.device_id}</code>
                          <span className="last-seen">最后活跃: {formatTime(device.last_seen)}</span>
                        </div>
                        <div className="device-actions">
                          <button 
                            className="action-btn" 
                            disabled={device.status !== 'online'}
                          >
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
            <section className="section">
              <div className="section-header">
                <h3>命令日志</h3>
              </div>
              {commands.length === 0 ? (
                <div className="empty-state">
                  <Terminal size={48} strokeWidth={1} />
                  <p>暂无命令记录</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
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
                          <td className="time-cell">{formatTime(cmd.created_at)}</td>
                          <td>{cmd.device_name || cmd.device_device_id || '-'}</td>
                          <td><code className="command-text">{cmd.command}</code></td>
                          <td>
                            <span className={`status-badge ${cmd.status}`}>
                              {getStatusIcon(cmd.status)}
                              <span>
                                {cmd.status === 'pending' ? '待执行' : 
                                 cmd.status === 'completed' ? '已完成' : 
                                 cmd.status === 'failed' ? '失败' : 
                                 cmd.status === 'rejected' ? '已拒绝' : cmd.status}
                              </span>
                            </span>
                          </td>
                          <td className="result-cell">{cmd.result || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {currentView === 'keys' && (
            <section className="section">
              <div className="section-header">
                <h3>API Keys</h3>
                <button className="create-btn" onClick={() => setShowKeyModal(true)}>
                  <Plus size={16} />
                  <span>创建新 Key</span>
                </button>
              </div>
              {apiKeys.length === 0 ? (
                <div className="empty-state">
                  <Key size={48} strokeWidth={1} />
                  <p>暂无 API Keys</p>
                  <span>创建 API Key 以便外部应用访问</span>
                </div>
              ) : (
                <div className="keys-list">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="key-card">
                      <div className="key-info">
                        <div className="key-header">
                          <span className="key-name">{key.name}</span>
                          <span className="key-date">创建于: {formatDate(key.created_at)}</span>
                        </div>
                        <div className="key-value-row">
                          <code className="key-value">{key.key}</code>
                          <div className="key-actions">
                            <button 
                              className="icon-btn"
                              onClick={() => handleCopyKey(key.key)}
                              title="复制"
                            >
                              {copiedKey === key.key ? <CheckCircle size={16} /> : <Copy size={16} />}
                            </button>
                            <button 
                              className="icon-btn danger"
                              onClick={() => handleDeleteKey(key.id)}
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {currentView === 'users' && (
            <section className="section">
              <div className="section-header">
                <h3>用户管理</h3>
              </div>
              {users.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} strokeWidth={1} />
                  <p>暂无用户</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>用户名</th>
                        <th>邮箱</th>
                        <th>角色</th>
                        <th>创建时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar-small">
                                <User size={14} />
                              </div>
                              <span>{u.username}</span>
                            </div>
                          </td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`role-badge ${u.role}`}>
                              <Shield size={12} />
                              <span>{u.role === 'admin' ? '管理员' : u.role === 'operator' ? '操作员' : '查看者'}</span>
                            </span>
                          </td>
                          <td className="time-cell">{formatDate(u.created_at)}</td>
                          <td>
                            <button className="icon-btn" title="编辑">
                              <ChevronRight size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* API Key 创建弹窗 */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建 API Key</h3>
              <button className="modal-close" onClick={() => setShowKeyModal(false)}>
                <X size={18} />
              </button>
            </div>
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
    </div>
  )
}

export default App