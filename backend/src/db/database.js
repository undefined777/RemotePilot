const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/remote_pilot.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Load and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log('Database initialized successfully');

// Create admin user if not exists
function createAdminUser() {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    ).run('admin', passwordHash, 'admin');
    console.log('Admin user created: username=admin, password=admin123');
  } else {
    console.log('Admin user already exists');
  }
}

// Initialize admin user
createAdminUser();

// Database helper functions
function getDb() {
  return db;
}

function closeDb() {
  db.close();
}

module.exports = {
  db,
  getDb,
  closeDb,
  createAdminUser
};