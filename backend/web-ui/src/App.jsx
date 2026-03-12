import { useState } from 'react'
import './App.css'

// 模拟设备数据
const mockDevices = [
  { id: 1, name: 'iPhone 15 Pro', status: 'online', battery: 85, lastSeen: '2分钟前' },
  { id: 2, name: 'iPad Air', status: 'online', battery: 62, lastSeen: '5分钟前' },
  { id: 3, name: 'MacBook Pro', status: 'offline', battery: 0, lastSeen: '1小时前' },
  { id: 4, name: 'Android Phone', status: 'online', battery: 45, lastSeen: '1分钟前' },
  { id: 5, name: 'Windows PC', status: 'online', battery: 100, lastSeen: '刚刚' },
]

function App() {
  const [connectionStatus, setConnectionStatus] = useState('connected')
  const [devices] = useState(mockDevices)

  const getStatusColor = (status) => {
    return status === 'online' ? '#4ade80' : '#94a3b8'
  }

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
        </div>
      </header>

      {/* 主内容区 */}
      <main className="main">
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
              <span className="stat-value">{devices.filter(d => d.status === 'online').length}</span>
              <span className="stat-label">在线设备</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔋</div>
            <div className="stat-info">
              <span className="stat-value">{Math.round(devices.filter(d => d.status === 'online').reduce((acc, d) => acc + d.battery, 0) / devices.filter(d => d.status === 'online').length) || 0}%</span>
              <span className="stat-label">平均电量</span>
            </div>
          </div>
        </div>

        {/* 设备列表 */}
        <section className="devices-section">
          <h2>设备列表</h2>
          <div className="devices-grid">
            {devices.map((device) => (
              <div key={device.id} className={`device-card ${device.status}`}>
                <div className="device-header">
                  <div className="device-icon">
                    {device.name.includes('iPhone') ? '📱' : 
                     device.name.includes('iPad') ? '📱' :
                     device.name.includes('Mac') ? '💻' :
                     device.name.includes('Android') ? '📱' : '🖥️'}
                  </div>
                  <div className={`device-status ${device.status}`}>
                    <span className="status-indicator"></span>
                    {device.status === 'online' ? '在线' : '离线'}
                  </div>
                </div>
                <div className="device-info">
                  <h3>{device.name}</h3>
                  <p className="last-seen">最后活跃: {device.lastSeen}</p>
                </div>
                <div className="device-footer">
                  <div className="battery">
                    <span className={`battery-icon ${device.battery > 20 ? 'normal' : 'low'}`}>
                      🔋
                    </span>
                    <span className="battery-value">{device.battery}%</span>
                  </div>
                  <button className="action-btn">控制</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 底部 */}
      <footer className="footer">
        <p>RemotePilot 管理后台 © 2026</p>
      </footer>
    </div>
  )
}

export default App