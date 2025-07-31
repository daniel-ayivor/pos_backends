const { query } = require('../config/database');

async function getDashboardStats(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND DATE(created_at) >= $1';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(created_at) <= $${paramIndex}`;
      params.push(end_date);
    }

    const totalRevenue = await query(
      `SELECT SUM(total_amount) as revenue FROM transactions ${whereClause} AND payment_status = 'completed'`,
      params
    );

    const totalInvoices = await query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount FROM invoices ${whereClause}`,
      params
    );

    const totalClients = await query(
      'SELECT COUNT(*) as count FROM clients WHERE is_active = true'
    );

    const totalEmployees = await query(
      'SELECT COUNT(*) as count FROM employees WHERE is_active = true'
    );

    res.json({
      total_revenue: parseFloat(totalRevenue.rows[0].revenue) || 0,
      total_invoices: parseInt(totalInvoices.rows[0].count) || 0,
      invoice_amount: parseFloat(totalInvoices.rows[0].amount) || 0,
      total_clients: parseInt(totalClients.rows[0].count) || 0,
      total_employees: parseInt(totalEmployees.rows[0].count) || 0
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
}

async function getRevenueAnalytics(req, res) {
  try {
    const { period = 'monthly' } = req.query;

    let groupBy = 'DATE_TRUNC(\'month\', created_at)';
    if (period === 'daily') {
      groupBy = 'DATE(created_at)';
    } else if (period === 'weekly') {
      groupBy = 'DATE_TRUNC(\'week\', created_at)';
    }

    const result = await query(
      `SELECT ${groupBy} as period, 
              COUNT(*) as transactions, 
              SUM(total_amount) as revenue
       FROM transactions 
       WHERE payment_status = 'completed'
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY ${groupBy}
       ORDER BY period DESC`
    );

    res.json({ revenue_data: result.rows });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to get revenue analytics' });
  }
}

async function getTopPerformers(req, res) {
  try {
    const topClients = await query(
      `SELECT c.name, c.company, COUNT(t.id) as transactions, SUM(t.total_amount) as revenue
       FROM transactions t
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.payment_status = 'completed'
       GROUP BY c.id, c.name, c.company
       ORDER BY revenue DESC
       LIMIT 10`
    );

    const topServices = await query(
      `SELECT s.name, s.category, COUNT(ti.id) as sales, SUM(ti.total_price) as revenue
       FROM transaction_items ti
       JOIN services s ON ti.service_id = s.id
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.payment_status = 'completed'
       GROUP BY s.id, s.name, s.category
       ORDER BY revenue DESC
       LIMIT 10`
    );

    res.json({
      top_clients: topClients.rows,
      top_services: topServices.rows
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({ error: 'Failed to get top performers' });
  }
}

async function getEmployeePerformance(req, res) {
  try {
    const result = await query(
      `SELECT e.name, e.role, e.department,
              COUNT(t.id) as transactions_processed,
              SUM(t.total_amount) as revenue_generated,
              AVG(te.total_hours) as avg_hours_worked
       FROM employees e
       LEFT JOIN transactions t ON e.id = t.created_by
       LEFT JOIN time_entries te ON e.id = te.employee_id
       WHERE e.is_active = true
       GROUP BY e.id, e.name, e.role, e.department
       ORDER BY revenue_generated DESC NULLS LAST`
    );

    res.json({ employee_performance: result.rows });
  } catch (error) {
    console.error('Get employee performance error:', error);
    res.status(500).json({ error: 'Failed to get employee performance' });
  }
}

async function getProjectAnalytics(req, res) {
  try {
    const projectStats = await query(
      `SELECT status, COUNT(*) as count, SUM(value) as total_value
       FROM projects 
       GROUP BY status`
    );

    const overdueProjects = await query(
      `SELECT COUNT(*) as count, SUM(value) as value
       FROM projects 
       WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'delivered')`
    );

    res.json({
      project_stats: projectStats.rows,
      overdue_projects: parseInt(overdueProjects.rows[0].count) || 0,
      overdue_value: parseFloat(overdueProjects.rows[0].value) || 0
    });
  } catch (error) {
    console.error('Get project analytics error:', error);
    res.status(500).json({ error: 'Failed to get project analytics' });
  }
}

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getTopPerformers,
  getEmployeePerformance,
  getProjectAnalytics
}; 