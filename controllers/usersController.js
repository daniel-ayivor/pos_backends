const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { Op } = require('sequelize');

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
    
    // Build where conditions for Sequelize
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      whereConditions.role = role;
    }
    
    if (status !== 'all') {
      whereConditions.is_active = status === 'active';
    }
    
    // Get total count
    const total = await User.count({ where: whereConditions });
    
    // Get users with pagination
    const users = await User.findAll({
      where: whereConditions,
      attributes: ['id', 'name', 'email', 'role', 'permissions', 'is_active', 'created_at', 'updated_at', 'last_login'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      users,
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
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'role', 'permissions', 'is_active', 'created_at', 'updated_at', 'last_login']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      permissions: getDefaultPermissions(role),
      is_active: true
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

async function updateUser(req, res) {
  try {
    const { name, email, role, permissions, is_active } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByPk(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is taken by another user
    const emailCheck = await User.findOne({ 
      where: { 
        email, 
        id: { [Op.ne]: req.params.id } 
      } 
    });
    if (emailCheck) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }
    
    // Update user
    const updatedUser = await existingUser.update({
      name,
      email,
      role,
      permissions: permissions || getDefaultPermissions(role),
      is_active
    });
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
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
    
    const existingUser = await User.findByPk(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    await existingUser.update({ password: hashedPassword });
    
    res.json({ message: 'User password updated successfully' });
  } catch (error) {
    console.error('Update user password error:', error);
    res.status(500).json({ error: 'Failed to update user password' });
  }
}

async function deleteUser(req, res) {
  try {
    const existingUser = await User.findByPk(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (existingUser.role === 'administrator') {
      const adminCount = await User.count({ 
        where: { role: 'administrator', is_active: true } 
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last administrator' });
      }
    }
    
    await existingUser.update({ is_active: false });
    
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