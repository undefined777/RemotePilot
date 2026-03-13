const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `).all();

    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    ).run(username, passwordHash, role);

    res.json({ 
      success: true, 
      user: { id: result.lastInsertRowid, username, role }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, password } = req.body;

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent modifying own admin account
    if (parseInt(id) === req.user.id && user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot modify your own admin account' });
    }

    let query = 'UPDATE users SET ';
    const params = [];

    if (username) {
      // Check if new username exists
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
      query += 'username = ?, ';
      params.push(username);
    }

    if (role) {
      query += 'role = ?, ';
      params.push(role);
    }

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      query += 'password_hash = ?, ';
      params.push(passwordHash);
    }

    query = query.slice(0, -2) + ' WHERE id = ?';
    params.push(id);

    db.prepare(query).run(...params);

    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting own account
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = { router };