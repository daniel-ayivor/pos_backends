const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');

async function getAllTransactions(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = 'all', payment_method = 'all', start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (t.transaction_number ILIKE $1 OR c.name ILIKE $1 OR c.company ILIKE $1)';
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND t.payment_status = $${paramIndex}`;
      params.push(status);
    }

    if (payment_method !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND t.payment_method = $${paramIndex}`;
      params.push(payment_method);
    }

    if (start_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(t.created_at) >= $${paramIndex}`;
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(t.created_at) <= $${paramIndex}`;
      params.push(end_date);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t
       LEFT JOIN clients c ON t.client_id = c.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT t.id, t.transaction_number, t.amount, t.tax_amount, t.total_amount,
              t.payment_method, t.payment_status, t.notes, t.created_at,
              c.id as client_id, c.name as client_name, c.company as client_company,
              u.name as created_by_name
       FROM transactions t
       LEFT JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u ON t.created_by = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
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
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
}

async function getTransactionById(req, res) {
  try {
    const transactionResult = await query(
      `SELECT t.id, t.transaction_number, t.amount, t.tax_amount, t.total_amount,
              t.payment_method, t.payment_status, t.notes, t.created_at,
              c.id as client_id, c.name as client_name, c.company as client_company,
              u.name as created_by_name
       FROM transactions t
       LEFT JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const itemsResult = await query(
      `SELECT ti.id, ti.description, ti.quantity, ti.unit_price, ti.total_price,
              s.id as service_id, s.name as service_name, s.category as service_category
       FROM transaction_items ti
       LEFT JOIN services s ON ti.service_id = s.id
       WHERE ti.transaction_id = $1`,
      [req.params.id]
    );

    res.json({
      transaction: transactionResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
}

async function createTransaction(req, res) {
  const client = await getClient();
  
  try {
    const { clientId, amount, tax_amount, total_amount, payment_method, notes, items } = req.body;

    await client.query('BEGIN');

    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const transactionResult = await client.query(
      `INSERT INTO transactions (id, transaction_number, client_id, amount, tax_amount, total_amount, 
                                payment_method, payment_status, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING id, transaction_number, amount, tax_amount, total_amount, payment_method, payment_status, created_at`,
      [uuidv4(), transactionNumber, clientId, amount, tax_amount, total_amount, payment_method, 'completed', notes, req.user.id]
    );

    const transaction = transactionResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO transaction_items (id, transaction_id, service_id, description, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [uuidv4(), transaction.id, item.serviceId, item.description, item.quantity, item.unit_price, item.total_price]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: {
        ...transaction,
        items
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  } finally {
    client.release();
  }
}

async function updateTransactionStatus(req, res) {
  try {
    const { payment_status } = req.body;

    if (!['pending', 'completed', 'failed', 'refunded'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const result = await query(
      `UPDATE transactions 
       SET payment_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, transaction_number, payment_status`,
      [payment_status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      message: 'Transaction status updated successfully',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
}

async function refundTransaction(req, res) {
  const client = await getClient();
  
  try {
    const { reason, refund_amount } = req.body;

    await client.query('BEGIN');

    const transactionResult = await client.query(
      'SELECT id, transaction_number, total_amount, payment_status FROM transactions WHERE id = $1',
      [req.params.id]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    if (transaction.payment_status !== 'completed') {
      return res.status(400).json({ error: 'Only completed transactions can be refunded' });
    }

    const refundAmount = refund_amount || transaction.total_amount;

    if (refundAmount > transaction.total_amount) {
      return res.status(400).json({ error: 'Refund amount cannot exceed transaction total' });
    }

    await client.query(
      'UPDATE transactions SET payment_status = $1, updated_at = NOW() WHERE id = $2',
      ['refunded', req.params.id]
    );

    await client.query(
      `INSERT INTO transactions (id, transaction_number, client_id, amount, tax_amount, total_amount,
                                payment_method, payment_status, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        uuidv4(),
        `REFUND-${transaction.transaction_number}`,
        null,
        -refundAmount,
        0,
        -refundAmount,
        'refund',
        'completed',
        `Refund for ${transaction.transaction_number}: ${reason}`,
        req.user.id
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Transaction refunded successfully',
      refund_amount: refundAmount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Refund transaction error:', error);
    res.status(500).json({ error: 'Failed to refund transaction' });
  } finally {
    client.release();
  }
}

async function getTransactionStats(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE t.payment_status = $1';
    const params = ['completed'];

    if (start_date) {
      whereClause += ' AND DATE(t.created_at) >= $2';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(t.created_at) <= $${paramIndex}`;
      params.push(end_date);
    }

    const totalStats = await query(
      `SELECT COUNT(*) as total_transactions, SUM(total_amount) as total_revenue
       FROM transactions t ${whereClause}`,
      params
    );

    const paymentMethodStats = await query(
      `SELECT payment_method, COUNT(*) as count, SUM(total_amount) as revenue
       FROM transactions t ${whereClause}
       GROUP BY payment_method
       ORDER BY revenue DESC`,
      params
    );

    const dailyRevenue = await query(
      `SELECT DATE(t.created_at) as date, COUNT(*) as transactions, SUM(total_amount) as revenue
       FROM transactions t ${whereClause}
       AND t.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(t.created_at)
       ORDER BY date DESC`,
      params
    );

    const topClients = await query(
      `SELECT c.name, c.company, COUNT(t.id) as transactions, SUM(t.total_amount) as revenue
       FROM transactions t
       LEFT JOIN clients c ON t.client_id = c.id
       ${whereClause}
       GROUP BY c.id, c.name, c.company
       ORDER BY revenue DESC
       LIMIT 10`,
      params
    );

    res.json({
      total_transactions: parseInt(totalStats.rows[0].total_transactions) || 0,
      total_revenue: parseFloat(totalStats.rows[0].total_revenue) || 0,
      payment_method_stats: paymentMethodStats.rows,
      daily_revenue: dailyRevenue.rows,
      top_clients: topClients.rows
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Failed to get transaction statistics' });
  }
}

async function getRecentTransactions(req, res) {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT t.id, t.transaction_number, t.total_amount, t.payment_method, t.payment_status, t.created_at,
              c.name as client_name, c.company as client_company
       FROM transactions t
       LEFT JOIN clients c ON t.client_id = c.id
       ORDER BY t.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ recent_transactions: result.rows });
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ error: 'Failed to get recent transactions' });
  }
}

async function exportTransactions(req, res) {
  try {
    const { start_date, end_date, status = 'all' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND DATE(t.created_at) >= $1';
      params.push(start_date);
    }

    if (end_date) {
      const paramIndex = params.length + 1;
      whereClause += ` AND DATE(t.created_at) <= $${paramIndex}`;
      params.push(end_date);
    }

    if (status !== 'all') {
      const paramIndex = params.length + 1;
      whereClause += ` AND t.payment_status = $${paramIndex}`;
      params.push(status);
    }

    const result = await query(
      `SELECT t.transaction_number, t.amount, t.tax_amount, t.total_amount,
              t.payment_method, t.payment_status, t.created_at,
              c.name as client_name, c.company as client_company,
              u.name as created_by_name
       FROM transactions t
       LEFT JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u ON t.created_by = u.id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    const csvHeader = 'Transaction Number,Amount,Tax,Total,Payment Method,Status,Date,Client,Company,Created By\n';
    const csvRows = result.rows.map(row => 
      `"${row.transaction_number}","${row.amount}","${row.tax_amount}","${row.total_amount}","${row.payment_method}","${row.payment_status}","${row.created_at}","${row.client_name || ''}","${row.client_company || ''}","${row.created_by_name || ''}"`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
}

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransactionStatus,
  refundTransaction,
  getTransactionStats,
  getRecentTransactions,
  exportTransactions
}; 