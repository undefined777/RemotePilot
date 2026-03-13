const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all devices for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const devices = db.prepare(`
      SELECT d.*, u.username as owner_username 
      FROM devices d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.user_id = ? 
      ORDER BY d.created_at DESC
    `).all(req.user.id);

    res.json({ success: true, devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single device
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const device = db.prepare(`
      SELECT d.*, u.username as owner_username 
      FROM devices d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.id = ? AND d.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    res.json({ success: true, device });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add new device
router.post('/', authenticateToken, (req, res) => {
  try {
    const { device_id, name } = req.body;

    if (!device_id || !name) {
      return res.status(400).json({ success: false, message: 'device_id and name required' });
    }

    // Check if device_id already exists
    const existing = db.prepare('SELECT id FROM devices WHERE device_id = ?').get(device_id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Device ID already exists' });
    }

    // Insert device
    const result = db.prepare(
      'INSERT INTO devices (device_id, name, user_id, status) VALUES (?, ?, ?, ?)'
    ).run(device_id, name, req.user.id, 'offline');

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      success: true,
      message: 'Device added',
      device
    });
  } catch (error) {
    console.error('Add device error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update device
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, status } = req.body;
    const deviceId = req.params.id;

    // Check ownership
    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
      .get(deviceId, req.user.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Update
    if (name) {
      db.prepare('UPDATE devices SET name = ? WHERE id = ?').run(name, deviceId);
    }
    if (status) {
      db.prepare('UPDATE devices SET status = ? WHERE id = ?').run(status, deviceId);
    }

    const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);

    res.json({
      success: true,
      message: 'Device updated',
      device: updated
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete device
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const deviceId = req.params.id;

    // Check ownership
    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
      .get(deviceId, req.user.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    db.prepare('DELETE FROM devices WHERE id = ?').run(deviceId);

    res.json({ success: true, message: 'Device deleted' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;