const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all API keys for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const keys = db.prepare(`
      SELECT id, key, name, created_at 
      FROM api_keys 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);

    // Mask keys for security (show only last 8 chars)
    const maskedKeys = keys.map(k => ({
      ...k,
      key: k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 8)
    }));

    res.json({ success: true, api_keys: maskedKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new API key
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name required' });
    }

    // Generate unique API key
    const apiKey = `rp_${uuidv4().replace(/-/g, '')}`;

    // Insert API key
    const result = db.prepare(
      'INSERT INTO api_keys (key, name, user_id) VALUES (?, ?, ?)'
    ).run(apiKey, name, req.user.id);

    res.json({
      success: true,
      message: 'API key created',
      api_key: {
        id: result.lastInsertRowid,
        key: apiKey,
        name,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete API key
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const keyId = req.params.id;

    // Check ownership
    const apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?')
      .get(keyId, req.user.id);

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    db.prepare('DELETE FROM api_keys WHERE id = ?').run(keyId);

    res.json({ success: true, message: 'API key deleted' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Validate API key (for external API access)
function validateApiKey(apiKey) {
  if (!apiKey) return null;
  
  const key = db.prepare('SELECT * FROM api_keys WHERE key = ?').get(apiKey);
  return key ? { user_id: key.user_id, key_id: key.id } : null;
}

module.exports = {
  router,
  validateApiKey
};