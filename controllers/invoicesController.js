const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');

async function getAllInvoices(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = 'all', client_id = '', start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (i.invoice_number ILIKE $1 OR c.name ILIKE $1 OR c.company ILIKE $1)';
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
    }

    if (client_id) {
      const paramIndex = params.length + 1;
      whereClause += ` AND i.client_id = $${paramIndex}`;
      params.push(client_id);
    }

    if (start_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(i.issue_date) >= $${paramIndex}`;
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(i.issue_date) <= $${paramIndex}`;
      params.push(end_date);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT i.id, i.invoice_number, i.amount, i.tax_amount, i.total_amount, i.status,
              i.issue_date, i.due_date, i.paid_date, i.notes, i.created_at,
              c.id as client_id, c.name as client_name, c.company as client_company,
              u.name as created_by_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON i.created_by = u.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      invoices: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
}

async function getInvoiceById(req, res) {
  try {
    const invoiceResult = await query(
      `SELECT i.id, i.invoice_number, i.amount, i.tax_amount, i.total_amount, i.status,
              i.issue_date, i.due_date, i.paid_date, i.notes, i.created_at,
              c.id as client_id, c.name as client_name, c.company as client_company,
              u.name as created_by_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsResult = await query(
      `SELECT ii.id, ii.description, ii.quantity, ii.unit_price, ii.total_price,
              s.id as service_id, s.name as service_name, s.category as service_category
       FROM invoice_items ii
       LEFT JOIN services s ON ii.service_id = s.id
       WHERE ii.invoice_id = $1`,
      [req.params.id]
    );

    res.json({
      invoice: invoiceResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
}

async function createInvoice(req, res) {
  const client = await getClient();
  
  try {
    const { clientId, amount, tax_amount, total_amount, issue_date, due_date, notes, items } = req.body;

    await client.query('BEGIN');

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const invoiceResult = await client.query(
      `INSERT INTO invoices (id, invoice_number, client_id, amount, tax_amount, total_amount,
                            status, issue_date, due_date, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id, invoice_number, amount, tax_amount, total_amount, status, issue_date, due_date, created_at`,
      [uuidv4(), invoiceNumber, clientId, amount, tax_amount, total_amount, 'draft', issue_date, due_date, notes, req.user.id]
    );

    const invoice = invoiceResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (id, invoice_id, service_id, description, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [uuidv4(), invoice.id, item.serviceId, item.description, item.quantity, item.unit_price, item.total_price]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: {
        ...invoice,
        items
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
}

async function updateInvoice(req, res) {
  const client = await getClient();
  
  try {
    const { clientId, amount, tax_amount, total_amount, issue_date, due_date, notes, items } = req.body;

    await client.query('BEGIN');

    const existingInvoice = await client.query(
      'SELECT id, status FROM invoices WHERE id = $1',
      [req.params.id]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (existingInvoice.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be updated' });
    }

    await client.query(
      `UPDATE invoices 
       SET client_id = $1, amount = $2, tax_amount = $3, total_amount = $4,
           issue_date = $5, due_date = $6, notes = $7, updated_at = NOW()
       WHERE id = $8`,
      [clientId, amount, tax_amount, total_amount, issue_date, due_date, notes, req.params.id]
    );

    await client.query(
      'DELETE FROM invoice_items WHERE invoice_id = $1',
      [req.params.id]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (id, invoice_id, service_id, description, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [uuidv4(), req.params.id, item.serviceId, item.description, item.quantity, item.unit_price, item.total_price]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  } finally {
    client.release();
  }
}

async function updateInvoiceStatus(req, res) {
  try {
    const { status } = req.body;

    if (!['draft', 'pending', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid invoice status' });
    }

    let paidDate = null;
    if (status === 'paid') {
      paidDate = new Date();
    }

    const result = await query(
      `UPDATE invoices 
       SET status = $1, paid_date = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, invoice_number, status, paid_date`,
      [status, paidDate, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      message: 'Invoice status updated successfully',
      invoice: result.rows[0]
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
}

async function deleteInvoice(req, res) {
  try {
    const existingInvoice = await query(
      'SELECT id, status FROM invoices WHERE id = $1',
      [req.params.id]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (existingInvoice.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be deleted' });
    }

    await query(
      'DELETE FROM invoice_items WHERE invoice_id = $1',
      [req.params.id]
    );

    await query(
      'DELETE FROM invoices WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
}

async function getInvoiceStats(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND DATE(i.issue_date) >= $1';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(i.issue_date) <= $${paramIndex}`;
      params.push(end_date);
    }

    const totalStats = await query(
      `SELECT COUNT(*) as total_invoices, SUM(total_amount) as total_amount,
              COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
              SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
              SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
              COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
              SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount
       FROM invoices i ${whereClause}`,
      params
    );

    const invoicesByStatus = await query(
      `SELECT status, COUNT(*) as count, SUM(total_amount) as total_amount
       FROM invoices i ${whereClause}
       GROUP BY status
       ORDER BY count DESC`,
      params
    );

    const topClients = await query(
      `SELECT c.name, c.company, COUNT(i.id) as invoices, SUM(i.total_amount) as total_amount
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       ${whereClause}
       GROUP BY c.id, c.name, c.company
       ORDER BY total_amount DESC
       LIMIT 10`,
      params
    );

    const monthlyInvoices = await query(
      `SELECT DATE_TRUNC('month', i.issue_date) as month,
              COUNT(i.id) as invoices,
              SUM(i.total_amount) as amount
       FROM invoices i ${whereClause}
       AND i.issue_date >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', i.issue_date)
       ORDER BY month DESC`,
      params
    );

    res.json({
      total_invoices: parseInt(totalStats.rows[0].total_invoices) || 0,
      total_amount: parseFloat(totalStats.rows[0].total_amount) || 0,
      paid_invoices: parseInt(totalStats.rows[0].paid_invoices) || 0,
      paid_amount: parseFloat(totalStats.rows[0].paid_amount) || 0,
      pending_invoices: parseInt(totalStats.rows[0].pending_invoices) || 0,
      pending_amount: parseFloat(totalStats.rows[0].pending_amount) || 0,
      overdue_invoices: parseInt(totalStats.rows[0].overdue_invoices) || 0,
      overdue_amount: parseFloat(totalStats.rows[0].overdue_amount) || 0,
      invoices_by_status: invoicesByStatus.rows,
      top_clients: topClients.rows,
      monthly_invoices: monthlyInvoices.rows
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ error: 'Failed to get invoice statistics' });
  }
}

async function exportInvoices(req, res) {
  try {
    const { start_date, end_date, status = 'all' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND DATE(i.issue_date) >= $1';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(i.issue_date) <= $${paramIndex}`;
      params.push(end_date);
    }

    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
    }

    const result = await query(
      `SELECT i.invoice_number, i.amount, i.tax_amount, i.total_amount, i.status,
              i.issue_date, i.due_date, i.paid_date, i.notes,
              c.name as client_name, c.company as client_company,
              u.name as created_by_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON i.created_by = u.id
       ${whereClause}
       ORDER BY i.issue_date DESC`,
      params
    );

    const csvHeader = 'Invoice Number,Amount,Tax,Total,Status,Issue Date,Due Date,Paid Date,Client,Company,Created By,Notes\n';
    const csvRows = result.rows.map(row => 
      `"${row.invoice_number}","${row.amount}","${row.tax_amount}","${row.total_amount}","${row.status}","${row.issue_date}","${row.due_date}","${row.paid_date || ''}","${row.client_name || ''}","${row.client_company || ''}","${row.created_by_name || ''}","${row.notes || ''}"`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export invoices error:', error);
    res.status(500).json({ error: 'Failed to export invoices' });
  }
}

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getInvoiceStats,
  exportInvoices
}; 