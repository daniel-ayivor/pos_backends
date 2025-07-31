const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// Get all clients with pagination and search
async function getAllClients(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = true';
    const params = [];

    if (search) {
      whereClause += ' AND (name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1)';
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(status === 'active');
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM clients ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get clients
    const result = await query(
      `SELECT id, name, email, phone, company, address, notes, is_active, created_at, updated_at
       FROM clients ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      clients: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
}

// Get single client by ID
async function getClientById(req, res) {
  try {
    const result = await query(
      `SELECT id, name, email, phone, company, address, notes, is_active, created_at, updated_at
       FROM clients WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client: result.rows[0] });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
}

// Create new client
async function createClient(req, res) {
  try {
    const { name, email, phone, company, address, notes } = req.body;

    // Check if client with email already exists
    const existingClient = await query(
      'SELECT id FROM clients WHERE email = $1',
      [email]
    );

    if (existingClient.rows.length > 0) {
      return res.status(400).json({ error: 'Client with this email already exists' });
    }

    const result = await query(
      `INSERT INTO clients (id, name, email, phone, company, address, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, name, email, phone, company, address, notes, is_active, created_at, updated_at`,
      [uuidv4(), name, email, phone, company, address, notes]
    );

    res.status(201).json({
      message: 'Client created successfully',
      client: result.rows[0]
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
}

// Update client
async function updateClient(req, res) {
  try {
    const { name, email, phone, company, address, notes } = req.body;

    // Check if client exists
    const existingClient = await query(
      'SELECT id FROM clients WHERE id = $1',
      [req.params.id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if email is already taken by another client
    const emailCheck = await query(
      'SELECT id FROM clients WHERE email = $1 AND id != $2',
      [email, req.params.id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already taken by another client' });
    }

    const result = await query(
      `UPDATE clients 
       SET name = $1, email = $2, phone = $3, company = $4, address = $5, notes = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, email, phone, company, address, notes, is_active, created_at, updated_at`,
      [name, email, phone, company, address, notes, req.params.id]
    );

    res.json({
      message: 'Client updated successfully',
      client: result.rows[0]
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
}

// Delete client (soft delete)
async function deleteClient(req, res) {
  try {
    // Check if client exists
    const existingClient = await query(
      'SELECT id FROM clients WHERE id = $1',
      [req.params.id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if client has associated invoices or transactions
    const hasInvoices = await query(
      'SELECT id FROM invoices WHERE client_id = $1 LIMIT 1',
      [req.params.id]
    );

    const hasTransactions = await query(
      'SELECT id FROM transactions WHERE client_id = $1 LIMIT 1',
      [req.params.id]
    );

    if (hasInvoices.rows.length > 0 || hasTransactions.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete client with associated invoices or transactions' 
      });
    }

    // Soft delete
    await query(
      'UPDATE clients SET is_active = false, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
}

// Get client statistics
async function getClientStats(req, res) {
  try {
    const clientId = req.params.id;

    // Check if client exists
    const clientExists = await query(
      'SELECT id FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientExists.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get invoice statistics
    const invoiceStats = await query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
         COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
         SUM(total_amount) as total_amount,
         SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount
       FROM invoices 
       WHERE client_id = $1`,
      [clientId]
    );

    // Get transaction statistics
    const transactionStats = await query(
      `SELECT 
         COUNT(*) as total_transactions,
         SUM(total_amount) as total_amount
       FROM transactions 
       WHERE client_id = $1`,
      [clientId]
    );

    // Get project statistics
    const projectStats = await query(
      `SELECT 
         COUNT(*) as total_projects,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
         COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as active_projects,
         SUM(value) as total_value
       FROM projects 
       WHERE client_id = $1`,
      [clientId]
    );

    res.json({
      invoice_stats: invoiceStats.rows[0],
      transaction_stats: transactionStats.rows[0],
      project_stats: projectStats.rows[0]
    });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ error: 'Failed to get client statistics' });
  }
}

// Get client invoices
async function getClientInvoices(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if client exists
    const clientExists = await query(
      'SELECT id FROM clients WHERE id = $1',
      [req.params.id]
    );

    if (clientExists.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM invoices WHERE client_id = $1',
      [req.params.id]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get invoices
    const result = await query(
      `SELECT id, invoice_number, amount, tax_amount, total_amount, status, 
              issue_date, due_date, paid_date, notes, created_at
       FROM invoices 
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
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
    console.error('Get client invoices error:', error);
    res.status(500).json({ error: 'Failed to get client invoices' });
  }
}

// Get client transactions
async function getClientTransactions(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if client exists
    const clientExists = await query(
      'SELECT id FROM clients WHERE id = $1',
      [req.params.id]
    );

    if (clientExists.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM transactions WHERE client_id = $1',
      [req.params.id]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get transactions
    const result = await query(
      `SELECT id, transaction_number, amount, tax_amount, total_amount, 
              payment_method, payment_status, notes, created_at
       FROM transactions 
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json({
      transactions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get client transactions error:', error);
    res.status(500).json({ error: 'Failed to get client transactions' });
  }
}

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
  getClientInvoices,
  getClientTransactions
};