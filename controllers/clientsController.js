const { v4: uuidv4 } = require('uuid');
const { Client } = require('../models');
const { Op } = require('sequelize');

// Get all clients with pagination and search
async function getAllClients(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    // Build where conditions for Sequelize
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (status !== 'all') {
      whereConditions.is_active = (status === 'active');
    }

    // Get clients with count using Sequelize
    const { count, rows } = await Client.findAndCountAll({
      where: whereConditions,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      clients: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
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
    const client = await Client.findByPk(req.params.id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client });
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
    const existingClient = await Client.findOne({
      where: { email }
    });

    if (existingClient) {
      return res.status(400).json({ error: 'Client with this email already exists' });
    }

    // Create new client using Sequelize
    const client = await Client.create({
      id: uuidv4(),
      name,
      email,
      phone,
      company,
      address,
      notes
    });

    res.status(201).json({
      message: 'Client created successfully',
      client
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
    const existingClient = await Client.findByPk(req.params.id);

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if email is already taken by another client
    const emailCheck = await Client.findOne({
      where: {
        email,
        id: { [Op.ne]: req.params.id }
      }
    });

    if (emailCheck) {
      return res.status(400).json({ error: 'Email is already taken by another client' });
    }

    // Update client using Sequelize
    await existingClient.update({
      name,
      email,
      phone,
      company,
      address,
      notes
    });

    // Reload to get updated data
    await existingClient.reload();

    res.json({
      message: 'Client updated successfully',
      client: existingClient
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
    const existingClient = await Client.findByPk(req.params.id);

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if client has associated invoices or transactions
    // We'll need to import the models for this check
    const db = require('../models');
    
    // Check for invoices if the Invoice model exists
    let hasInvoices = false;
    if (db.Invoice) {
      const invoiceCount = await db.Invoice.count({
        where: { client_id: req.params.id }
      });
      hasInvoices = invoiceCount > 0;
    }

    // Check for transactions if the Transaction model exists
    let hasTransactions = false;
    if (db.Transaction) {
      const transactionCount = await db.Transaction.count({
        where: { client_id: req.params.id }
      });
      hasTransactions = transactionCount > 0;
    }

    if (hasInvoices || hasTransactions) {
      return res.status(400).json({ 
        error: 'Cannot delete client with associated invoices or transactions' 
      });
    }

    // Soft delete using Sequelize
    await existingClient.update({
      is_active: false
    });

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
    const clientExists = await Client.findByPk(clientId);

    if (!clientExists) {
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