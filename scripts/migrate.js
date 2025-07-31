const { query, getClient } = require('../config/database');

const createTables = async () => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('administrator', 'supervisor', 'cashier', 'staff')),
        permissions TEXT[] DEFAULT '{}',
        avatar VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);

    // Create employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL CHECK (role IN ('designer', 'developer', 'marketer', 'manager', 'assistant')),
        department VARCHAR(50),
        salary DECIMAL(10,2),
        hire_date DATE DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        company VARCHAR(100),
        address TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        duration_hours INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        assigned_to UUID[] DEFAULT '{}',
        status VARCHAR(50) NOT NULL CHECK (status IN ('brief-received', 'in-progress', 'review', 'revision', 'completed', 'delivered')),
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        start_date DATE NOT NULL,
        due_date DATE NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'pending', 'paid', 'overdue')),
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create invoice_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        description VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_number VARCHAR(50) UNIQUE NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'bank_transfer')),
        payment_status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create transaction_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        description VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create time_entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        clock_in TIMESTAMP NOT NULL,
        clock_out TIMESTAMP,
        status VARCHAR(20) NOT NULL CHECK (status IN ('clocked-in', 'clocked-out', 'break')),
        total_hours DECIMAL(5,2),
        device_id VARCHAR(100),
        location VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create system_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        updated_by UUID REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
      CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
      CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
      CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
      CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
      CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in);
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables created successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Insert default data
const insertDefaultData = async () => {
  try {
    // Insert default admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await query(`
      INSERT INTO users (id, name, email, password_hash, role, permissions, is_active)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'Admin User',
        'admin@pos.com',
        $1,
        'administrator',
        ARRAY['user:read', 'user:write', 'user:delete', 'employee:read', 'employee:write', 'employee:delete', 'client:read', 'client:write', 'client:delete', 'service:read', 'service:write', 'service:delete', 'project:read', 'project:write', 'project:delete', 'invoice:read', 'invoice:write', 'invoice:delete', 'transaction:read', 'transaction:write', 'analytics:read', 'settings:read', 'settings:write'],
        true
      )
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    // Insert default services
    await query(`
      INSERT INTO services (name, description, price, category, duration_hours) VALUES
      ('Logo Design', 'Professional logo design with multiple concepts', 500.00, 'Design', 8),
      ('Business Card Design', 'Custom business card design', 150.00, 'Print', 2),
      ('Website Design', 'Complete website design and development', 2500.00, 'Web', 40),
      ('Social Media Package', 'Social media management and content creation', 800.00, 'Marketing', 20),
      ('Brochure Design', 'Professional brochure design', 300.00, 'Print', 4),
      ('SEO Optimization', 'Search engine optimization services', 1200.00, 'Marketing', 16)
      ON CONFLICT DO NOTHING
    `);

    // Insert default clients
    await query(`
      INSERT INTO clients (name, email, phone, company) VALUES
      ('TechCorp Ltd', 'contact@techcorp.com', '+233 24 123 4567', 'TechCorp Ltd'),
      ('Local Restaurant', 'info@restaurant.com', '+233 26 234 5678', 'Local Restaurant'),
      ('Fashion Store', 'hello@fashion.com', '+233 20 345 6789', 'Fashion Store'),
      ('Startup Inc', 'team@startup.com', '+233 54 456 7890', 'Startup Inc')
      ON CONFLICT DO NOTHING
    `);

    // Insert default employees
    await query(`
      INSERT INTO employees (name, email, phone, role, department, salary) VALUES
      ('James Asante', 'james@pos.com', '+233 24 111 1111', 'designer', 'Design', 2500.00),
      ('Sarah Mensah', 'sarah@pos.com', '+233 26 222 2222', 'developer', 'Development', 3000.00),
      ('Kwame Osei', 'kwame@pos.com', '+233 20 333 3333', 'marketer', 'Marketing', 2200.00),
      ('Ama Kufuor', 'ama@pos.com', '+233 54 444 4444', 'manager', 'Management', 3500.00)
      ON CONFLICT DO NOTHING
    `);

    // Insert default system settings
    await query(`
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES
      ('company_name', 'POS Advertising Agency', 'Company name'),
      ('tax_rate', '0.125', 'Tax rate as decimal (12.5%)'),
      ('currency', 'GHS', 'Default currency'),
      ('invoice_prefix', 'INV', 'Invoice number prefix'),
      ('transaction_prefix', 'TXN', 'Transaction number prefix')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    console.log('✅ Default data inserted successfully');

  } catch (error) {
    console.error('❌ Failed to insert default data:', error);
    throw error;
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    console.log('🔄 Starting database migration...');
    await createTables();
    await insertDefaultData();
    console.log('🎉 Database migration completed successfully!');
    console.log('📧 Default admin login: admin@pos.com / admin123');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { createTables, insertDefaultData, runMigrations }; 