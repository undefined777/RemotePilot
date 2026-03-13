const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Command whitelist - only these commands are allowed
const ALLOWED_COMMANDS = ['shutdown', 'reboot', 'restart', 'logout', 'logoff', 'sleep', 'lock', 'hibernate'];

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

// Get all command history for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const { device_id, limit = 50 } = req.query;

    let query = `
      SELECT cl.*, d.device_id as device_device_id, d.name as device_name 
      FROM command_logs cl 
      JOIN devices d ON cl.device_id = d.id 
      WHERE cl.user_id = ?
    `;
    const params = [req.user.id];

    if (device_id) {
      query += ' AND cl.device_id = ?';
      params.push(device_id);
    }

    query += ' ORDER BY cl.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = db.prepare(query).all(...params);

    res.json({ success: true, commands: logs });
  } catch (error) {
    console.error('Get commands error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Execute command on device
router.post('/', authenticateToken, (req, res) => {
  try {
    const { device_id, command } = req.body;

    if (!device_id || !command) {
      return res.status(400).json({ success: false, message: 'device_id and command required' });
    }

    // Validate command against whitelist
    const normalizedCommand = command.toLowerCase().trim();
    if (!ALLOWED_COMMANDS.includes(normalizedCommand)) {
      // Log failed attempt
      const device = db.prepare('SELECT id FROM devices WHERE device_id = ? AND user_id = ?')
        .get(device_id, req.user.id);
      
      if (device) {
        db.prepare(`
          INSERT INTO command_logs (user_id, device_id, command, result, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(req.user.id, device.id, command, 'Command not allowed', 'rejected');
      }

      return res.status(400).json({
        success: false,
        message: `Command not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`
      });
    }

    // Check device ownership
    const device = db.prepare('SELECT * FROM devices WHERE device_id = ? AND user_id = ?')
      .get(device_id, req.user.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Check if device is online
    if (device.status !== 'online') {
      db.prepare(`
        INSERT INTO command_logs (user_id, device_id, command, result, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.id, device.id, command, 'Device offline', 'failed');

      return res.status(400).json({ success: false, message: 'Device is offline' });
    }

    // Try to send command via WebSocket
    const sent = sendCommandToDevice(device_id, normalizedCommand);

    if (sent) {
      // Log successful command
      db.prepare(`
        INSERT INTO command_logs (user_id, device_id, command, result, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.id, device.id, command, 'Command sent', 'pending');

      res.json({
        success: true,
        message: 'Command sent to device',
        command: normalizedCommand,
        device_id
      });
    } else {
      // Device not connected
      db.prepare(`
        INSERT INTO command_logs (user_id, device_id, command, result, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.id, device.id, command, 'Device not connected', 'failed');

      res.status(400).json({ success: false, message: 'Device not connected' });
    }
  } catch (error) {
    console.error('Execute command error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get allowed commands
router.get('/allowed', (req, res) => {
  res.json({
    success: true,
    allowed_commands: ALLOWED_COMMANDS
  });
});

module.exports = {
  router,
  setDeviceConnections,
  sendCommandToDevice,
  ALLOWED_COMMANDS
};