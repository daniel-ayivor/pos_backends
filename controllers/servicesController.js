const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');

async function getAllServices(req, res) {
  try {
    const { page = 1, limit = 10, search = '', category = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = true';
    const params = [];

    if (search) {
      whereClause += ' AND (name ILIKE $1 OR description ILIKE $1)';
      params.push(`%${search}%`);
    }

    if (category) {
      const paramIndex = params.length + 1;
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
    }

    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(status === 'active');
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM services ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, name, description, price, category, duration_hours, is_active, created_at, updated_at
       FROM services ${whereClause}
       ORDER BY name ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      services: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
}

async function getServiceById(req, res) {
  try {
    const result = await query(
      `SELECT id, name, description, price, category, duration_hours, is_active, created_at, updated_at
       FROM services WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to get service' });
  }
}

async function createService(req, res) {
  try {
    const { name, description, price, category, duration_hours } = req.body;

    const existingService = await query(
      'SELECT id FROM services WHERE name = $1 AND category = $2',
      [name, category]
    );

    if (existingService.rows.length > 0) {
      return res.status(400).json({ error: 'Service with this name and category already exists' });
    }

    const result = await query(
      `INSERT INTO services (id, name, description, price, category, duration_hours, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, name, description, price, category, duration_hours, is_active, created_at, updated_at`,
      [uuidv4(), name, description, price, category, duration_hours]
    );

    res.status(201).json({
      message: 'Service created successfully',
      service: result.rows[0]
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
}

async function updateService(req, res) {
  try {
    const { name, description, price, category, duration_hours } = req.body;

    const existingService = await query(
      'SELECT id FROM services WHERE id = $1',
      [req.params.id]
    );

    if (existingService.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const nameCheck = await query(
      'SELECT id FROM services WHERE name = $1 AND category = $2 AND id != $3',
      [name, category, req.params.id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Service with this name and category already exists' });
    }

    const result = await query(
      `UPDATE services 
       SET name = $1, description = $2, price = $3, category = $4, duration_hours = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, description, price, category, duration_hours, is_active, created_at, updated_at`,
      [name, description, price, category, duration_hours, req.params.id]
    );

    res.json({
      message: 'Service updated successfully',
      service: result.rows[0]
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
}

async function deleteService(req, res) {
  try {
    const existingService = await query(
      'SELECT id FROM services WHERE id = $1',
      [req.params.id]
    );

    if (existingService.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const hasInvoiceItems = await query(
      'SELECT id FROM invoice_items WHERE service_id = $1 LIMIT 1',
      [req.params.id]
    );

    const hasTransactionItems = await query(
      'SELECT id FROM transaction_items WHERE service_id = $1 LIMIT 1',
      [req.params.id]
    );

    if (hasInvoiceItems.rows.length > 0 || hasTransactionItems.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete service with associated invoices or transactions' 
      });
    }

    await query(
      'UPDATE services SET is_active = false, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
}

async function getCategories(req, res) {
  try {
    const result = await query(
      'SELECT DISTINCT category FROM services WHERE is_active = true ORDER BY category'
    );

    const categories = result.rows.map(row => row.category);
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
}

async function getServiceStats(req, res) {
  try {
    const totalServices = await query(
      'SELECT COUNT(*) as total FROM services WHERE is_active = true'
    );

    const servicesByCategory = await query(
      `SELECT category, COUNT(*) as count
       FROM services 
       WHERE is_active = true 
       GROUP BY category 
       ORDER BY count DESC`
    );

    const topSellingServices = await query(
      `SELECT s.name, s.category, COUNT(ti.id) as sales_count, SUM(ti.total_price) as total_revenue
       FROM services s
       LEFT JOIN transaction_items ti ON s.id = ti.service_id
       LEFT JOIN transactions t ON ti.transaction_id = t.id
       WHERE s.is_active = true AND t.payment_status = 'completed'
       GROUP BY s.id, s.name, s.category
       ORDER BY total_revenue DESC NULLS LAST
       LIMIT 10`
    );

    const avgPrice = await query(
      'SELECT AVG(price) as average_price FROM services WHERE is_active = true'
    );

    res.json({
      total_services: parseInt(totalServices.rows[0].total),
      services_by_category: servicesByCategory.rows,
      top_selling_services: topSellingServices.rows,
      average_price: parseFloat(avgPrice.rows[0].average_price) || 0
    });
  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({ error: 'Failed to get service statistics' });
  }
}

async function getServiceUsage(req, res) {
  try {
    const serviceId = req.params.id;

    const serviceExists = await query(
      'SELECT id FROM services WHERE id = $1',
      [serviceId]
    );

    if (serviceExists.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const transactionUsage = await query(
      `SELECT 
         COUNT(ti.id) as total_sales,
         SUM(ti.quantity) as total_quantity,
         SUM(ti.total_price) as total_revenue,
         AVG(ti.unit_price) as average_price
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE ti.service_id = $1 AND t.payment_status = 'completed'`,
      [serviceId]
    );

    const invoiceUsage = await query(
      `SELECT 
         COUNT(ii.id) as total_invoices,
         SUM(ii.quantity) as total_quantity,
         SUM(ii.total_price) as total_amount,
         AVG(ii.unit_price) as average_price
       FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       WHERE ii.service_id = $1`,
      [serviceId]
    );

    const monthlySales = await query(
      `SELECT 
         DATE_TRUNC('month', t.created_at) as month,
         COUNT(ti.id) as sales_count,
         SUM(ti.total_price) as revenue
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE ti.service_id = $1 
         AND t.payment_status = 'completed'
         AND t.created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', t.created_at)
       ORDER BY month DESC`,
      [serviceId]
    );

    res.json({
      transaction_usage: transactionUsage.rows[0],
      invoice_usage: invoiceUsage.rows[0],
      monthly_sales: monthlySales.rows
    });
  } catch (error) {
    console.error('Get service usage error:', error);
    res.status(500).json({ error: 'Failed to get service usage statistics' });
  }
}

async function bulkUpdatePrices(req, res) {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const client = await getClient();
    await client.query('BEGIN');

    try {
      for (const update of updates) {
        const { id, price } = update;
        
        if (!id || typeof price !== 'number' || price < 0) {
          throw new Error('Invalid update data');
        }

        await client.query(
          'UPDATE services SET price = $1, updated_at = NOW() WHERE id = $2',
          [price, id]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Prices updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Bulk update prices error:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
}

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getCategories,
  getServiceStats,
  getServiceUsage,
  bulkUpdatePrices
}; 