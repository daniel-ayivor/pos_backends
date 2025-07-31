const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

async function getAllProjects(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = 'all', priority = 'all', client_id = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.name ILIKE $1 OR c.name ILIKE $1 OR c.company ILIKE $1)';
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
    }

    if (priority !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND p.priority = $${paramIndex}`;
      params.push(priority);
    }

    if (client_id) {
      const paramIndex = params.length + 1;
      whereClause += ` AND p.client_id = $${paramIndex}`;
      params.push(client_id);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT p.id, p.name, p.status, p.priority, p.progress, p.start_date, p.due_date, p.value, p.notes,
              p.created_at, p.updated_at,
              c.id as client_id, c.name as client_name, c.company as client_company,
              s.id as service_id, s.name as service_name, s.category as service_category
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN services s ON p.service_id = s.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      projects: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
}

async function getProjectById(req, res) {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.status, p.priority, p.progress, p.start_date, p.due_date, p.value, p.notes,
              p.assigned_to, p.created_at, p.updated_at,
              c.id as client_id, c.name as client_name, c.company as client_company,
              s.id as service_id, s.name as service_name, s.category as service_category
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN services s ON p.service_id = s.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
}

async function createProject(req, res) {
  try {
    const { name, clientId, serviceId, assigned_to, status, priority, progress, start_date, due_date, value, notes } = req.body;

    const clientExists = await query(
      'SELECT id FROM clients WHERE id = $1 AND is_active = true',
      [clientId]
    );

    if (clientExists.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const serviceExists = await query(
      'SELECT id FROM services WHERE id = $1 AND is_active = true',
      [serviceId]
    );

    if (serviceExists.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const result = await query(
      `INSERT INTO projects (id, name, client_id, service_id, assigned_to, status, priority, progress,
                            start_date, due_date, value, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING id, name, status, priority, progress, start_date, due_date, value, notes, created_at`,
      [uuidv4(), name, clientId, serviceId, assigned_to || [], status, priority, progress || 0, start_date, due_date, value, notes]
    );

    res.status(201).json({
      message: 'Project created successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
}

async function updateProject(req, res) {
  try {
    const { name, clientId, serviceId, assigned_to, status, priority, progress, start_date, due_date, value, notes } = req.body;

    const existingProject = await query(
      'SELECT id FROM projects WHERE id = $1',
      [req.params.id]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const clientExists = await query(
      'SELECT id FROM clients WHERE id = $1 AND is_active = true',
      [clientId]
    );

    if (clientExists.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const serviceExists = await query(
      'SELECT id FROM services WHERE id = $1 AND is_active = true',
      [serviceId]
    );

    if (serviceExists.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const result = await query(
      `UPDATE projects 
       SET name = $1, client_id = $2, service_id = $3, assigned_to = $4, status = $5, priority = $6,
           progress = $7, start_date = $8, due_date = $9, value = $10, notes = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING id, name, status, priority, progress, start_date, due_date, value, notes, updated_at`,
      [name, clientId, serviceId, assigned_to || [], status, priority, progress || 0, start_date, due_date, value, notes, req.params.id]
    );

    res.json({
      message: 'Project updated successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
}

async function updateProjectProgress(req, res) {
  try {
    const { progress, status } = req.body;

    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    }

    const result = await query(
      `UPDATE projects 
       SET progress = COALESCE($1, progress), 
           status = COALESCE($2, status), 
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, progress, status, updated_at`,
      [progress, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project progress updated successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Update project progress error:', error);
    res.status(500).json({ error: 'Failed to update project progress' });
  }
}

async function deleteProject(req, res) {
  try {
    const existingProject = await query(
      'SELECT id FROM projects WHERE id = $1',
      [req.params.id]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await query(
      'DELETE FROM projects WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}

async function getProjectStats(req, res) {
  try {
    const totalProjects = await query(
      'SELECT COUNT(*) as total FROM projects'
    );

    const projectsByStatus = await query(
      `SELECT status, COUNT(*) as count, SUM(value) as total_value
       FROM projects 
       GROUP BY status 
       ORDER BY count DESC`
    );

    const projectsByPriority = await query(
      `SELECT priority, COUNT(*) as count, SUM(value) as total_value
       FROM projects 
       GROUP BY priority 
       ORDER BY count DESC`
    );

    const avgValue = await query(
      'SELECT AVG(value) as average_value FROM projects'
    );

    const overdueProjects = await query(
      `SELECT COUNT(*) as count, SUM(value) as total_value
       FROM projects 
       WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'delivered')`
    );

    const dueThisWeek = await query(
      `SELECT COUNT(*) as count
       FROM projects 
       WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND status NOT IN ('completed', 'delivered')`
    );

    res.json({
      total_projects: parseInt(totalProjects.rows[0].total),
      projects_by_status: projectsByStatus.rows,
      projects_by_priority: projectsByPriority.rows,
      average_value: parseFloat(avgValue.rows[0].average_value) || 0,
      overdue_projects: parseInt(overdueProjects.rows[0].count) || 0,
      overdue_value: parseFloat(overdueProjects.rows[0].total_value) || 0,
      due_this_week: parseInt(dueThisWeek.rows[0].count) || 0
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ error: 'Failed to get project statistics' });
  }
}

async function getProjectsByClient(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const clientExists = await query(
      'SELECT id FROM clients WHERE id = $1',
      [req.params.clientId]
    );

    if (clientExists.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const countResult = await query(
      'SELECT COUNT(*) FROM projects WHERE client_id = $1',
      [req.params.clientId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT p.id, p.name, p.status, p.priority, p.progress, p.start_date, p.due_date, p.value, p.notes,
              p.created_at, p.updated_at,
              s.id as service_id, s.name as service_name, s.category as service_category
       FROM projects p
       LEFT JOIN services s ON p.service_id = s.id
       WHERE p.client_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.clientId, limit, offset]
    );

    res.json({
      projects: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get client projects error:', error);
    res.status(500).json({ error: 'Failed to get client projects' });
  }
}

async function getOverdueProjects(req, res) {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT p.id, p.name, p.status, p.priority, p.progress, p.start_date, p.due_date, p.value,
              c.name as client_name, c.company as client_company,
              EXTRACT(DAY FROM CURRENT_DATE - p.due_date) as days_overdue
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.due_date < CURRENT_DATE AND p.status NOT IN ('completed', 'delivered')
       ORDER BY p.due_date ASC
       LIMIT $1`,
      [limit]
    );

    res.json({ overdue_projects: result.rows });
  } catch (error) {
    console.error('Get overdue projects error:', error);
    res.status(500).json({ error: 'Failed to get overdue projects' });
  }
}

async function getDueSoonProjects(req, res) {
  try {
    const { days = 7, limit = 10 } = req.query;

    const result = await query(
      `SELECT p.id, p.name, p.status, p.priority, p.progress, p.start_date, p.due_date, p.value,
              c.name as client_name, c.company as client_company,
              EXTRACT(DAY FROM p.due_date - CURRENT_DATE) as days_remaining
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
         AND p.status NOT IN ('completed', 'delivered')
       ORDER BY p.due_date ASC
       LIMIT $1`,
      [limit]
    );

    res.json({ due_soon_projects: result.rows });
  } catch (error) {
    console.error('Get due soon projects error:', error);
    res.status(500).json({ error: 'Failed to get due soon projects' });
  }
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectProgress,
  deleteProject,
  getProjectStats,
  getProjectsByClient,
  getOverdueProjects,
  getDueSoonProjects
}; 