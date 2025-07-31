const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

async function getAllEmployees(req, res) {
  try {
    const { page = 1, limit = 10, search = '', role = '', department = '', status = 'all' } = req.query;
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
    if (department) {
      const paramIndex = params.length + 1;
      whereClause += ` AND department = $${paramIndex}`;
      params.push(department);
    }
    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(status === 'active');
    }
    const countResult = await query(`SELECT COUNT(*) FROM employees ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    const result = await query(
      `SELECT id, name, email, phone, role, department, salary, hire_date, is_active, created_at, updated_at
       FROM employees ${whereClause}
       ORDER BY name ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({
      employees: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
}

async function getEmployeeById(req, res) {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, department, salary, hire_date, is_active, created_at, updated_at
       FROM employees WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ employee: result.rows[0] });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to get employee' });
  }
}

async function createEmployee(req, res) {
  try {
    const { name, email, phone, role, department, salary } = req.body;
    const existingEmployee = await query('SELECT id FROM employees WHERE email = $1', [email]);
    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({ error: 'Employee with this email already exists' });
    }
    const result = await query(
      `INSERT INTO employees (id, name, email, phone, role, department, salary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, name, email, phone, role, department, salary, hire_date, is_active, created_at, updated_at`,
      [uuidv4(), name, email, phone, role, department, salary]
    );
    res.status(201).json({
      message: 'Employee created successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
}

async function updateEmployee(req, res) {
  try {
    const { name, email, phone, role, department, salary } = req.body;
    const existingEmployee = await query('SELECT id FROM employees WHERE id = $1', [req.params.id]);
    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const emailCheck = await query('SELECT id FROM employees WHERE email = $1 AND id != $2', [email, req.params.id]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already taken by another employee' });
    }
    const result = await query(
      `UPDATE employees 
       SET name = $1, email = $2, phone = $3, role = $4, department = $5, salary = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, email, phone, role, department, salary, hire_date, is_active, created_at, updated_at`,
      [name, email, phone, role, department, salary, req.params.id]
    );
    res.json({
      message: 'Employee updated successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
}

async function deleteEmployee(req, res) {
  try {
    const existingEmployee = await query('SELECT id FROM employees WHERE id = $1', [req.params.id]);
    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const hasTimeEntries = await query('SELECT id FROM time_entries WHERE employee_id = $1 LIMIT 1', [req.params.id]);
    if (hasTimeEntries.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete employee with associated time entries' });
    }
    await query('UPDATE employees SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
}

async function getEmployeeStats(req, res) {
  try {
    const employeeId = req.params.id;
    const employeeExists = await query('SELECT id FROM employees WHERE id = $1', [employeeId]);
    if (employeeExists.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const timeStats = await query(
      `SELECT 
         COUNT(*) as total_entries,
         COUNT(CASE WHEN status = 'clocked-out' THEN 1 END) as completed_entries,
         SUM(total_hours) as total_hours,
         AVG(total_hours) as average_hours_per_day
       FROM time_entries 
       WHERE employee_id = $1`,
      [employeeId]
    );
    const currentMonthStats = await query(
      `SELECT 
         COUNT(*) as entries_this_month,
         SUM(total_hours) as hours_this_month
       FROM time_entries 
       WHERE employee_id = $1 
         AND DATE_TRUNC('month', clock_in) = DATE_TRUNC('month', NOW())`,
      [employeeId]
    );
    const recentEntries = await query(
      `SELECT id, clock_in, clock_out, status, total_hours, created_at
       FROM time_entries 
       WHERE employee_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [employeeId]
    );
    res.json({
      time_stats: timeStats.rows[0],
      current_month_stats: currentMonthStats.rows[0],
      recent_entries: recentEntries.rows
    });
  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({ error: 'Failed to get employee statistics' });
  }
}

async function getDepartments(req, res) {
  try {
    const result = await query('SELECT DISTINCT department FROM employees WHERE is_active = true AND department IS NOT NULL ORDER BY department');
    const departments = result.rows.map(row => row.department);
    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
}

async function getRoles(req, res) {
  try {
    const result = await query('SELECT DISTINCT role FROM employees WHERE is_active = true ORDER BY role');
    const roles = result.rows.map(row => row.role);
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
}

async function getEmployeeOverviewStats(req, res) {
  try {
    const totalEmployees = await query('SELECT COUNT(*) as total FROM employees WHERE is_active = true');
    const employeesByRole = await query(
      `SELECT role, COUNT(*) as count
       FROM employees 
       WHERE is_active = true 
       GROUP BY role 
       ORDER BY count DESC`
    );
    const employeesByDepartment = await query(
      `SELECT department, COUNT(*) as count
       FROM employees 
       WHERE is_active = true AND department IS NOT NULL
       GROUP BY department 
       ORDER BY count DESC`
    );
    const avgSalary = await query('SELECT AVG(salary) as average_salary FROM employees WHERE is_active = true');
    const clockedInEmployees = await query(
      `SELECT COUNT(DISTINCT e.id) as count
       FROM employees e
       JOIN time_entries te ON e.id = te.employee_id
       WHERE e.is_active = true 
         AND te.status = 'clocked-in'
         AND te.clock_out IS NULL`
    );
    res.json({
      total_employees: parseInt(totalEmployees.rows[0].total),
      employees_by_role: employeesByRole.rows,
      employees_by_department: employeesByDepartment.rows,
      average_salary: parseFloat(avgSalary.rows[0].average_salary) || 0,
      clocked_in_count: parseInt(clockedInEmployees.rows[0].count) || 0
    });
  } catch (error) {
    console.error('Get employee overview stats error:', error);
    res.status(500).json({ error: 'Failed to get employee overview statistics' });
  }
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  getDepartments,
  getRoles,
  getEmployeeOverviewStats
};