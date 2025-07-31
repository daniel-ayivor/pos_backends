const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');

async function getAllTimeEntries(req, res) {
  try {
    const { page = 1, limit = 10, employee_id = '', status = '', start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (employee_id) {
      whereClause += ' AND te.employee_id = $1';
      params.push(employee_id);
    }

    if (status) {
      const paramIndex = params.length + 1;
      whereClause += ` AND te.status = $${paramIndex}`;
      params.push(status);
    }

    if (start_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(te.clock_in) >= $${paramIndex}`;
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(te.clock_in) <= $${paramIndex}`;
      params.push(end_date);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM time_entries te
       LEFT JOIN employees e ON te.employee_id = e.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT te.id, te.clock_in, te.clock_out, te.status, te.total_hours, 
              te.device_id, te.location, te.notes, te.created_at, te.updated_at,
              e.id as employee_id, e.name as employee_name, e.role as employee_role
       FROM time_entries te
       LEFT JOIN employees e ON te.employee_id = e.id
       ${whereClause}
       ORDER BY te.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      time_entries: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: 'Failed to get time entries' });
  }
}

async function getTimeEntryById(req, res) {
  try {
    const result = await query(
      `SELECT te.id, te.clock_in, te.clock_out, te.status, te.total_hours,
              te.device_id, te.location, te.notes, te.created_at, te.updated_at,
              e.id as employee_id, e.name as employee_name, e.role as employee_role
       FROM time_entries te
       LEFT JOIN employees e ON te.employee_id = e.id
       WHERE te.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json({ time_entry: result.rows[0] });
  } catch (error) {
    console.error('Get time entry error:', error);
    res.status(500).json({ error: 'Failed to get time entry' });
  }
}

async function clockIn(req, res) {
  try {
    const { employee_id, device_id, location, notes } = req.body;

    const employeeResult = await query(
      'SELECT id, name FROM employees WHERE id = $1 AND is_active = true',
      [employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }

    const activeEntry = await query(
      'SELECT id FROM time_entries WHERE employee_id = $1 AND status = $2 AND clock_out IS NULL',
      [employee_id, 'clocked-in']
    );

    if (activeEntry.rows.length > 0) {
      return res.status(400).json({ error: 'Employee is already clocked in' });
    }

    const result = await query(
      `INSERT INTO time_entries (id, employee_id, clock_in, status, device_id, location, notes, created_at, updated_at)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, clock_in, status, device_id, location, notes, created_at`,
      [uuidv4(), employee_id, 'clocked-in', device_id, location, notes]
    );

    res.status(201).json({
      message: 'Employee clocked in successfully',
      time_entry: result.rows[0]
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
}

async function clockOut(req, res) {
  try {
    const { employee_id, notes } = req.body;

    const employeeResult = await query(
      'SELECT id, name FROM employees WHERE id = $1 AND is_active = true',
      [employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }

    const activeEntry = await query(
      'SELECT id, clock_in FROM time_entries WHERE employee_id = $1 AND status = $2 AND clock_out IS NULL',
      [employee_id, 'clocked-in']
    );

    if (activeEntry.rows.length === 0) {
      return res.status(400).json({ error: 'Employee is not clocked in' });
    }

    const timeEntry = activeEntry.rows[0];
    const clockOut = new Date();
    const clockIn = new Date(timeEntry.clock_in);
    const totalHours = (clockOut - clockIn) / (1000 * 60 * 60);

    const result = await query(
      `UPDATE time_entries 
       SET clock_out = NOW(), status = $1, total_hours = $2, notes = COALESCE($3, notes), updated_at = NOW()
       WHERE id = $4
       RETURNING id, clock_in, clock_out, status, total_hours, notes, updated_at`,
      ['clocked-out', totalHours, notes, timeEntry.id]
    );

    res.json({
      message: 'Employee clocked out successfully',
      time_entry: result.rows[0]
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
}

async function createTimeEntry(req, res) {
  try {
    const { employee_id, clock_in, clock_out, status, device_id, location, notes } = req.body;

    const employeeResult = await query(
      'SELECT id, name FROM employees WHERE id = $1 AND is_active = true',
      [employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }

    let totalHours = null;
    if (clock_out) {
      const clockInTime = new Date(clock_in);
      const clockOutTime = new Date(clock_out);
      totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    }

    const result = await query(
      `INSERT INTO time_entries (id, employee_id, clock_in, clock_out, status, total_hours, 
                                device_id, location, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, clock_in, clock_out, status, total_hours, device_id, location, notes, created_at`,
      [uuidv4(), employee_id, clock_in, clock_out, status, totalHours, device_id, location, notes]
    );

    res.status(201).json({
      message: 'Time entry created successfully',
      time_entry: result.rows[0]
    });
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
}

async function updateTimeEntry(req, res) {
  try {
    const { employee_id, clock_in, clock_out, status, device_id, location, notes } = req.body;

    const existingEntry = await query(
      'SELECT id FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    if (existingEntry.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    let totalHours = null;
    if (clock_out) {
      const clockInTime = new Date(clock_in);
      const clockOutTime = new Date(clock_out);
      totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    }

    const result = await query(
      `UPDATE time_entries 
       SET employee_id = $1, clock_in = $2, clock_out = $3, status = $4, total_hours = $5,
           device_id = $6, location = $7, notes = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING id, clock_in, clock_out, status, total_hours, device_id, location, notes, updated_at`,
      [employee_id, clock_in, clock_out, status, totalHours, device_id, location, notes, req.params.id]
    );

    res.json({
      message: 'Time entry updated successfully',
      time_entry: result.rows[0]
    });
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
}

async function deleteTimeEntry(req, res) {
  try {
    const existingEntry = await query(
      'SELECT id FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    if (existingEntry.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    await query(
      'DELETE FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
}

async function getCurrentStatus(req, res) {
  try {
    const result = await query(
      `SELECT e.id, e.name, e.role, e.department,
              te.id as time_entry_id, te.clock_in, te.status, te.total_hours
       FROM employees e
       LEFT JOIN time_entries te ON e.id = te.employee_id 
         AND te.status = 'clocked-in' 
         AND te.clock_out IS NULL
       WHERE e.is_active = true
       ORDER BY e.name`
    );

    const employees = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      department: row.department,
      is_clocked_in: !!row.time_entry_id,
      clock_in: row.clock_in,
      status: row.status,
      total_hours: row.total_hours
    }));

    res.json({ employees });
  } catch (error) {
    console.error('Get current status error:', error);
    res.status(500).json({ error: 'Failed to get current status' });
  }
}

async function getTimeTrackingStats(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND DATE(te.clock_in) >= $1';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(te.clock_in) <= $${paramIndex}`;
      params.push(end_date);
    }

    const totalHours = await query(
      `SELECT SUM(total_hours) as total_hours, COUNT(*) as total_entries
       FROM time_entries te ${whereClause}`,
      params
    );

    const clockedInCount = await query(
      `SELECT COUNT(DISTINCT e.id) as count
       FROM employees e
       JOIN time_entries te ON e.id = te.employee_id
       WHERE e.is_active = true 
         AND te.status = 'clocked-in'
         AND te.clock_out IS NULL`
    );

    const avgHoursPerDay = await query(
      `SELECT AVG(daily_hours) as average_hours_per_day
       FROM (
         SELECT DATE(clock_in) as date, SUM(total_hours) as daily_hours
         FROM time_entries te ${whereClause}
         GROUP BY DATE(clock_in)
       ) daily_stats`,
      params
    );

    const topEmployees = await query(
      `SELECT e.name, e.role, SUM(te.total_hours) as total_hours, COUNT(te.id) as entries
       FROM time_entries te
       JOIN employees e ON te.employee_id = e.id
       ${whereClause}
       GROUP BY e.id, e.name, e.role
       ORDER BY total_hours DESC
       LIMIT 10`,
      params
    );

    res.json({
      total_hours: parseFloat(totalHours.rows[0].total_hours) || 0,
      total_entries: parseInt(totalHours.rows[0].total_entries) || 0,
      clocked_in_count: parseInt(clockedInCount.rows[0].count) || 0,
      average_hours_per_day: parseFloat(avgHoursPerDay.rows[0].average_hours_per_day) || 0,
      top_employees: topEmployees.rows
    });
  } catch (error) {
    console.error('Get time tracking stats error:', error);
    res.status(500).json({ error: 'Failed to get time tracking statistics' });
  }
}

async function exportTimeEntries(req, res) {
  try {
    const { start_date, end_date, employee_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND DATE(te.clock_in) >= $1';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(te.clock_in) <= $${paramIndex}`;
      params.push(end_date);
    }

    if (employee_id) {
      const paramIndex = params.length + 1;
      whereClause += ` AND te.employee_id = $${paramIndex}`;
      params.push(employee_id);
    }

    const result = await query(
      `SELECT te.clock_in, te.clock_out, te.status, te.total_hours, te.notes,
              e.name as employee_name, e.role as employee_role, e.department
       FROM time_entries te
       LEFT JOIN employees e ON te.employee_id = e.id
       ${whereClause}
       ORDER BY te.clock_in DESC`,
      params
    );

    const csvHeader = 'Employee Name,Role,Department,Clock In,Clock Out,Status,Total Hours,Notes\n';
    const csvRows = result.rows.map(row => 
      `"${row.employee_name || ''}","${row.employee_role || ''}","${row.department || ''}","${row.clock_in}","${row.clock_out || ''}","${row.status}","${row.total_hours || ''}","${row.notes || ''}"`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="time_entries.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export time entries error:', error);
    res.status(500).json({ error: 'Failed to export time entries' });
  }
}

module.exports = {
  getAllTimeEntries,
  getTimeEntryById,
  clockIn,
  clockOut,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getCurrentStatus,
  getTimeTrackingStats,
  exportTimeEntries
}; 