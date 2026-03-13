const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

// Command whitelist - only these commands are allowed
const ALLOWED_COMMANDS = ['shutdown', 'reboot', 'restart', 'logout', 'logoff', 'suspend', 'wake', 'sleep', 'lock', 'hibernate'];

// Global device connections map (set from index.js)
let deviceConnections = new Map();

// Set device connections from outside
function setDeviceConnections(connections) {
  deviceConnections = connections;
}

// Send command to device via WebSocket
function sendCommandToDevice(deviceId, command) {
  const ws = deviceConnections.get(deviceId);
  if (ws && ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify({
      type: 'command',
      command: command,
      timestamp: Date.now()
    }));
    return true;
  }
  return false;
}

// Validate API key and return associated user
function validateApiKey(apiKey) {
  if (!apiKey) return null;
  
  const key = db.prepare('SELECT * FROM api_keys WHERE key = ?').get(apiKey);
  return key ? { user_id: key.user_id, key_id: key.id, key_name: key.name } : null;
}

// Public API endpoint for executing commands via API key
// No authentication required, uses API key instead
router.post('/execute', async (req, res) => {
  try {
    const { api_key, command, device_id } = req.body;

    // Validate required parameters
    if (!api_key) {
      return res.status(400).json({ 
        success: false, 
        error: 'api_key is required' 
      });
    }

    if (!command) {
      return res.status(400).json({ 
        success: false, 
        error: 'command is required' 
      });
    }

    // Validate API key
    const keyInfo = validateApiKey(api_key);
    if (!keyInfo) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    // Normalize command
    const normalizedCommand = command.toLowerCase().trim();
    
    // Validate command against whitelist
    if (!ALLOWED_COMMANDS.includes(normalizedCommand)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid command. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`,
        allowed_commands: ALLOWED_COMMANDS
      });
    }

    // Find devices for this user
    let devices;
    if (device_id) {
      // Specific device requested
      devices = db.prepare(`
        SELECT * FROM devices 
        WHERE device_id = ? AND user_id = ?
      `).all(device_id, keyInfo.user_id);
      
      if (devices.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Device not found or access denied' 
        });
      }
    } else {
      // Get all online devices for this user
      devices = db.prepare(`
        SELECT * FROM devices 
        WHERE user_id = ? AND status = 'online'
      `).all(keyInfo.user_id);
    }

    if (devices.length === 0) {
      // Log failed attempt
      const logDevice = device_id ? 
        db.prepare('SELECT id FROM devices WHERE device_id = ?').get(device_id) : null;
      
      if (logDevice) {
        db.prepare(`
          INSERT INTO command_logs (user_id, device_id, command, result, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(keyInfo.user_id, logDevice.id, command, 'No online devices', 'failed');
      }

      return res.status(400).json({ 
        success: false, 
        error: 'No online devices found',
        message: device_id ? '指定的设备不在线' : '没有在线的设备'
      });
    }

    // Send command to devices
    const results = [];
    for (const device of devices) {
      const sent = sendCommandToDevice(device.device_id, normalizedCommand);
      
      // Always log the command attempt
      const logResult = db.prepare(`
        INSERT INTO command_logs (user_id, device_id, command, result, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(keyInfo.user_id, device.id, command, sent ? 'Command sent' : 'Device not connected', sent ? 'pending' : 'failed');

      results.push({
        device_id: device.device_id,
        device_name: device.name,
        status: device.status,
        sent: sent,
        log_id: logResult.lastInsertRowid
      });
    }

    // Determine overall success
    const sentCount = results.filter(r => r.sent).length;
    const success = sentCount > 0;

    res.json({
      success: success,
      message: success ? 
        `Command sent to ${sentCount} device(s)` : 
        'Failed to send command to any device',
      command: normalizedCommand,
      results: results,
      total_devices: devices.length,
      sent_count: sentCount
    });

  } catch (error) {
    console.error('Public execute command error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Get allowed commands (public endpoint)
router.get('/commands', (req, res) => {
  res.json({
    success: true,
    allowed_commands: ALLOWED_COMMANDS
  });
});

// Health check for public API
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RemotePilot Public API',
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  router,
  setDeviceConnections,
  ALLOWED_COMMANDS
};