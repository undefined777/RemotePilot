const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all custom commands for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const commands = db.prepare(`
      SELECT * FROM custom_commands 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ success: true, commands });
  } catch (error) {
    console.error('Get custom commands error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new custom command
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, command } = req.body;

    if (!name || !command) {
      return res.status(400).json({ success: false, message: 'name and command are required' });
    }

    const result = db.prepare(`
      INSERT INTO custom_commands (name, command, user_id)
      VALUES (?, ?, ?)
    `).run(name.trim(), command.trim(), req.user.id);

    const newCommand = db.prepare('SELECT * FROM custom_commands WHERE id = ?').get(result.lastInsertRowid);

    res.json({ success: true, command: newCommand });
  } catch (error) {
    console.error('Create custom command error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete custom command
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const command = db.prepare('SELECT * FROM custom_commands WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!command) {
      return res.status(404).json({ success: false, message: 'Command not found' });
    }

    db.prepare('DELETE FROM custom_commands WHERE id = ?').run(id);

    res.json({ success: true, message: 'Command deleted' });
  } catch (error) {
    console.error('Delete custom command error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = { router };