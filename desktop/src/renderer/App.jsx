import React, { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './styles.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 检查登录状态 - 只验证不删除数据
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    // 如果没有登录数据，清除用户相关数据但保留deviceId
    if (!savedUser || !token) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      // 保留 deviceId 和 deviceName
      setIsLoggedIn(false);
      setUser(null);
      return;
    }
    
    // 验证数据格式
    try {
      const userData = JSON.parse(savedUser);
      if (userData && userData.username && token) {
        setUser(userData);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } catch (e) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('user');
  };

  return (
    <div className="app">
      {isLoggedIn && user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
