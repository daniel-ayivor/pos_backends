const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

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

async function getAllUsers(req, res) {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (search) {
      whereClause += ' AND (name ILIKE $1 OR email ILIKE $1)';
      params.push(`%${search}%`);
    }
    if (role) {
      const paramIndex = params.length + 1;
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
    }
    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(status === 'active');
    }
    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    const result = await query(
      `SELECT id, name, email, role, permissions, avatar, is_active, created_at, updated_at, last_login
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
}

async function getUserById(req, res) {
  try {
    const result = await query(
      `SELECT id, name, email, role, permissions, avatar, is_active, created_at, updated_at, last_login
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await query(
      `INSERT INTO users (id, name, email, password_hash, role, permissions, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, name, email, role, permissions, avatar, is_active, created_at`,
      [uuidv4(), name, email, hashedPassword, role, getDefaultPermissions(role), true]
    );
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

async function updateUser(req, res) {
  try {
    const { name, email, role, permissions, is_active } = req.body;
    const existingUser = await query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.params.id]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }
    const result = await query(
      `UPDATE users 
       SET name = $1, email = $2, role = $3, permissions = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, role, permissions, avatar, is_active, created_at, updated_at`,
      [name, email, role, permissions || getDefaultPermissions(role), is_active, req.params.id]
    );
    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

async function updateUserPassword(req, res) {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existingUser = await query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.params.id]);
    res.json({ message: 'User password updated successfully' });
  } catch (error) {
    console.error('Update user password error:', error);
    res.status(500).json({ error: 'Failed to update user password' });
  }
}

async function deleteUser(req, res) {
  try {
    const existingUser = await query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (existingUser.rows[0].role === 'administrator') {
      const adminCount = await query('SELECT COUNT(*) as count FROM users WHERE role = $1 AND is_active = true', ['administrator']);
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last administrator' });
      }
    }
    await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

async function getUserStats(req, res) {
  try {
    const totalUsers = await query('SELECT COUNT(*) as total FROM users WHERE is_active = true');
    const usersByRole = await query(
      `SELECT role, COUNT(*) as count
       FROM users 
       WHERE is_active = true 
       GROUP BY role 
       ORDER BY count DESC`
    );
    const recentLogins = await query(
      `SELECT name, email, role, last_login
       FROM users 
       WHERE is_active = true AND last_login IS NOT NULL
       ORDER BY last_login DESC
       LIMIT 10`
    );
    const newUsersThisMonth = await query(
      `SELECT COUNT(*) as count
       FROM users 
       WHERE is_active = true 
         AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
    );
    res.json({
      total_users: parseInt(totalUsers.rows[0].total),
      users_by_role: usersByRole.rows,
      recent_logins: recentLogins.rows,
      new_users_this_month: parseInt(newUsersThisMonth.rows[0].count)
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
}

async function getUserRoles(req, res) {
  try {
    const roles = [
      { value: 'administrator', label: 'Administrator' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'cashier', label: 'Cashier' },
      { value: 'staff', label: 'Staff' }
    ];
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
}

async function getUserPermissions(req, res) {
  try {
    const permissions = [
      { value: 'user:read', label: 'Read Users' },
      { value: 'user:write', label: 'Create/Update Users' },
      { value: 'user:delete', label: 'Delete Users' },
      { value: 'employee:read', label: 'Read Employees' },
      { value: 'employee:write', label: 'Create/Update Employees' },
      { value: 'employee:delete', label: 'Delete Employees' },
      { value: 'client:read', label: 'Read Clients' },
      { value: 'client:write', label: 'Create/Update Clients' },
      { value: 'client:delete', label: 'Delete Clients' },
      { value: 'service:read', label: 'Read Services' },
      { value: 'service:write', label: 'Create/Update Services' },
      { value: 'service:delete', label: 'Delete Services' },
      { value: 'project:read', label: 'Read Projects' },
      { value: 'project:write', label: 'Create/Update Projects' },
      { value: 'project:delete', label: 'Delete Projects' },
      { value: 'invoice:read', label: 'Read Invoices' },
      { value: 'invoice:write', label: 'Create/Update Invoices' },
      { value: 'invoice:delete', label: 'Delete Invoices' },
      { value: 'transaction:read', label: 'Read Transactions' },
      { value: 'transaction:write', label: 'Create Transactions' },
      { value: 'analytics:read', label: 'Read Analytics' },
      { value: 'settings:read', label: 'Read Settings' },
      { value: 'settings:write', label: 'Update Settings' }
    ];
    res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  getUserStats,
  getUserRoles,
  getUserPermissions,
  getDefaultPermissions
};