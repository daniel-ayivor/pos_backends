const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// Helper function to get default permissions based on role
function getDefaultPermissions(role) {
  const permissions = {
    administrator: [
      'user:read', 'user:write', 'user:delete',
      'employee:read', 'employee:write', 'employee:delete',
      'client:read', 'client:write', 'client:delete',
      'service:read', 'service:write', 'service:delete',
      'project:read', 'project:write', 'project:delete',
      'invoice:read', 'invoice:write', 'invoice:delete',
      'transaction:read', 'transaction:write',
      'analytics:read', 'settings:read', 'settings:write'
    ],
    supervisor: [
      'employee:read', 'employee:write',
      'client:read', 'client:write',
      'service:read', 'service:write',
      'project:read', 'project:write',
      'invoice:read', 'invoice:write',
      'transaction:read', 'transaction:write',
      'analytics:read'
    ],
    cashier: [
      'client:read',
      'service:read',
      'transaction:read', 'transaction:write',
      'invoice:read'
    ],
    staff: [
      'project:read',
      'time:read', 'time:write'
    ]
  };
  return permissions[role] || [];
}

// Register new user
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await query(
      `INSERT INTO users (id, name, email, password_hash, role, permissions, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, name, email, role, permissions, created_at`,
      [uuidv4(), name, email, hashedPassword, role, getDefaultPermissions(role), true]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await query(
      'SELECT id, name, email, password_hash, role, permissions, is_active FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

// Get current user profile
async function getProfile(req, res) {
  try {
    const result = await query(
      `SELECT id, name, email, role, permissions, avatar, created_at, last_login
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

// Update user profile
async function updateProfile(req, res) {
  try {
    const { name, email, avatar } = req.body;
    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email), 
           avatar = COALESCE($3, avatar),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, role, permissions, avatar, created_at, last_login`,
      [name, email, avatar, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// Change password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

// Refresh token
async function refreshToken(req, res) {
  try {
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    res.json({
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
}

// Logout (client-side token removal)
async function logout(req, res) {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  getDefaultPermissions
};