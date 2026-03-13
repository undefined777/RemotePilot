import React, { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './styles.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 强制检查登录状态 - 如果没有完整数据则清除
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('deviceId');
    
    // 如果有任何一项缺失，清除所有（防止残留数据导致异常）
    if (!savedUser || !token || !deviceId) {
      localStorage.clear();
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
        localStorage.clear();
      }
    } catch (e) {
      localStorage.clear();
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
