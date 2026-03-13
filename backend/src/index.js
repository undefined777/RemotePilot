require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// Initialize database first
require('./db/database');

// Import routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const apiKeysRoutes = require('./routes/api_keys');
const commandsRoutes = require('./routes/commands');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/devices', devicesRoutes);
app.use('/api/keys', apiKeysRoutes.router);
app.use('/api/commands', commandsRoutes.router);
app.use('/api/public', publicRoutes.router);

// Legacy API routes compatibility
app.use('/api', apiRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'RemotePilot Backend Running' });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

// Device connections map: device_id -> WebSocket
const deviceConnections = new Map();

// Heartbeat settings
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 60000; // 60 seconds

// Device connection timeouts
const deviceTimeouts = new Map();

// Update device status in database
const { db } = require('./db/database');

function updateDeviceStatus(deviceId, status) {
  try {
    db.prepare('UPDATE devices SET status = ?, last_seen = ? WHERE device_id = ?')
      .run(status, new Date().toISOString(), deviceId);
  } catch (error) {
    console.error('Error updating device status:', error);
  }
}

// Set heartbeat for device
function setDeviceHeartbeat(deviceId) {
  // Clear existing timeout
  const existingTimeout = deviceTimeouts.get(deviceId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout
  const timeout = setTimeout(() => {
    console.log(`Device ${deviceId} timed out`);
    const ws = deviceConnections.get(deviceId);
    if (ws) {
      ws.close();
    }
    deviceConnections.delete(deviceId);
    updateDeviceStatus(deviceId, 'offline');
    deviceTimeouts.delete(deviceId);
  }, CONNECTION_TIMEOUT);

  deviceTimeouts.set(deviceId, timeout);
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  let deviceId = null;
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle device registration
      if (data.type === 'register') {
        deviceId = data.device_id;
        console.log(`Device registered: ${deviceId}`);

        // Check if device exists in database
        const device = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
        if (!device) {
          ws.send(JSON.stringify({ type: 'error', message: 'Device not found' }));
          ws.close();
          return;
        }

        // Register device connection
        deviceConnections.set(deviceId, ws);
        updateDeviceStatus(deviceId, 'online');
        setDeviceHeartbeat(deviceId);

        ws.send(JSON.stringify({ type: 'registered', device_id: deviceId }));
        return;
      }

      // Handle pong (heartbeat response)
      if (data.type === 'pong') {
        if (deviceId) {
          setDeviceHeartbeat(deviceId);
          updateDeviceStatus(deviceId, 'online');
        }
        return;
      }

      // Handle command result from device
      if (data.type === 'command_result') {
        console.log(`Command result from ${deviceId}:`, data);
        // Update command log if there's a log_id
        if (data.log_id) {
          db.prepare('UPDATE command_logs SET result = ?, status = ? WHERE id = ?')
            .run(data.result, data.status || 'completed', data.log_id);
        }
        return;
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      console.log(`Device disconnected: ${deviceId}`);
      deviceConnections.delete(deviceId);
      updateDeviceStatus(deviceId, 'offline');
      
      const timeout = deviceTimeouts.get(deviceId);
      if (timeout) {
        clearTimeout(timeout);
        deviceTimeouts.delete(deviceId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send ping periodically
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, HEARTBEAT_INTERVAL);

  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Set device connections for commands route
commandsRoutes.setDeviceConnections(deviceConnections);
publicRoutes.setDeviceConnections(deviceConnections);

console.log(`WebSocket Server running on ws://localhost:${WS_PORT}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close();
  wss.close();
  db.close();
  process.exit(0);
});

module.exports = { app, server, wss };