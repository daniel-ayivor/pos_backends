# POS Backend API

A comprehensive Node.js, Express.js, and PostgreSQL backend for a Point of Sale (POS) system designed for advertising agencies.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user CRUD operations with role management
- **Client Management**: Client database with contact information and history
- **Service Catalog**: Service management with pricing and categories
- **POS Transactions**: Real-time sales processing with multiple payment methods
- **Invoice Management**: Professional invoicing system with status tracking
- **Project Management**: Project tracking with deadlines and progress monitoring
- **Employee Management**: Employee database with time tracking
- **Time Tracking**: Clock in/out functionality with detailed reporting
- **Analytics & Reporting**: Comprehensive dashboard with business insights
- **Data Export**: CSV export functionality for reports

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, rate limiting
- **Logging**: morgan

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd POS_BACKEND
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pos_database
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Set up PostgreSQL database**
   - Install PostgreSQL
   - Create a database named `pos_database`
   - Update the `.env` file with your database credentials

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Database Schema

### Core Tables

- **users**: System users with roles and permissions
- **employees**: Staff members with roles and departments
- **clients**: Customer information and contact details
- **services**: Service catalog with pricing
- **projects**: Project management with deadlines
- **invoices**: Billing and invoicing system
- **transactions**: POS sales transactions
- **time_entries**: Employee time tracking
- **system_settings**: Application configuration

### Relationships

- Clients have multiple invoices and transactions
- Services are linked to projects and transaction items
- Employees have time entries and can be assigned to projects
- Users create transactions and invoices
- All tables include audit fields (created_at, updated_at)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/stats/overview` - User statistics

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/:id/stats` - Client statistics
- `GET /api/clients/:id/invoices` - Client invoices
- `GET /api/clients/:id/transactions` - Client transactions

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get service by ID
- `POST /api/services` - Create new service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `GET /api/services/categories/list` - Get service categories
- `GET /api/services/stats/overview` - Service statistics
- `GET /api/services/:id/usage` - Service usage statistics

### Transactions (POS)
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create new transaction (POS sale)
- `PATCH /api/transactions/:id/status` - Update transaction status
- `POST /api/transactions/:id/refund` - Refund transaction
- `GET /api/transactions/stats/overview` - Transaction statistics
- `GET /api/transactions/recent/list` - Recent transactions
- `GET /api/transactions/export/csv` - Export transactions

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `PATCH /api/invoices/:id/status` - Update invoice status
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/stats/overview` - Invoice statistics
- `GET /api/invoices/export/csv` - Export invoices

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `PATCH /api/projects/:id/progress` - Update project progress
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/stats/overview` - Project statistics
- `GET /api/projects/overdue/list` - Overdue projects
- `GET /api/projects/due-soon/list` - Projects due soon

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/:id/stats` - Employee statistics
- `GET /api/employees/stats/overview` - Employee overview statistics

### Time Tracking
- `GET /api/time-tracking` - Get all time entries
- `GET /api/time-tracking/:id` - Get time entry by ID
- `POST /api/time-tracking/clock-in` - Clock in
- `POST /api/time-tracking/clock-out` - Clock out
- `POST /api/time-tracking` - Create manual time entry
- `PUT /api/time-tracking/:id` - Update time entry
- `DELETE /api/time-tracking/:id` - Delete time entry
- `GET /api/time-tracking/status/current` - Current clock status
- `GET /api/time-tracking/stats/overview` - Time tracking statistics
- `GET /api/time-tracking/export/csv` - Export time entries

### Analytics
- `GET /api/analytics/dashboard/overview` - Dashboard overview
- `GET /api/analytics/revenue/analytics` - Revenue analytics
- `GET /api/analytics/sales/analytics` - Sales analytics
- `GET /api/analytics/client/analytics` - Client analytics
- `GET /api/analytics/employee/performance` - Employee performance
- `GET /api/analytics/project/analytics` - Project analytics

## Authentication & Authorization

### User Roles
- **administrator**: Full system access
- **supervisor**: Management and oversight capabilities
- **cashier**: POS and basic operations
- **staff**: Limited access for time tracking and project viewing

### JWT Token
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Data Models

### User
```javascript
{
  id: "uuid",
  name: "string",
  email: "string",
  role: "administrator|supervisor|cashier|staff",
  permissions: ["array"],
  avatar: "string",
  is_active: boolean,
  created_at: "timestamp",
  updated_at: "timestamp",
  last_login: "timestamp"
}
```

### Client
```javascript
{
  id: "uuid",
  name: "string",
  email: "string",
  phone: "string",
  company: "string",
  address: "text",
  notes: "text",
  is_active: boolean,
  created_at: "timestamp",
  updated_at: "timestamp"
}
```

### Transaction
```javascript
{
  id: "uuid",
  transaction_number: "string",
  client_id: "uuid",
  amount: "decimal",
  tax_amount: "decimal",
  total_amount: "decimal",
  payment_method: "cash|card|mobile_money|bank_transfer",
  payment_status: "pending|completed|failed|refunded",
  notes: "text",
  created_by: "uuid",
  created_at: "timestamp"
}
```

## Error Handling

The API returns consistent error responses:

```javascript
{
  "error": "Error message",
  "details": [] // Validation errors
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: express-validator for request validation
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries

## Development

### Running in Development
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
npm run migrate
```

### Seeding Data
```bash
npm run seed
```

## Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure production database
   - Set secure JWT secret
   - Configure CORS origins

2. **Database**
   - Use production PostgreSQL instance
   - Run migrations
   - Set up database backups

3. **Security**
   - Use HTTPS
   - Configure firewall rules
   - Set up monitoring and logging

4. **Performance**
   - Enable compression
   - Configure connection pooling
   - Set up caching if needed

## Default Admin Account

After running migrations, a default admin account is created:
- **Email**: admin@pos.com
- **Password**: admin123

**Important**: Change the default password immediately after first login.

## API Documentation

For detailed API documentation, refer to the individual route files or use tools like Postman to explore the endpoints.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. #   p o s _ b a c k e n d  
 