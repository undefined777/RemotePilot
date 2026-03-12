import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      background: '#282c34',
      color: 'white'
    }}>
      <h1>RemotePilot Desktop</h1>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);