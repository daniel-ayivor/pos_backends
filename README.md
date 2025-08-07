# POS Backend API

This is the backend API for the POS (Point of Sale) system for an Advertising Agency. It uses Express.js, Sequelize ORM, and PostgreSQL.

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

5. Update the `.env` file with your database credentials and other configuration options.

### Database Setup

1. Create a PostgreSQL database for the application
2. Update the `DATABASE_URL` in your `.env` file with your database connection string
3. Run migrations to create the database tables:

```bash
npm run migrate
```

4. (Optional) Seed the database with initial data:

```bash
npm run seed
```

### Running the Application

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

## API Documentation

The API provides endpoints for managing users, clients, employees, services, projects, invoices, and transactions.

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Users

- `GET /api/users` - Get all users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user (soft delete)

### Clients

- `GET /api/clients` - Get all clients (with pagination)
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create a new client
- `PUT /api/clients/:id` - Update a client
- `DELETE /api/clients/:id` - Delete a client (soft delete)

### Services

- `GET /api/services` - Get all services (with pagination)
- `GET /api/services/:id` - Get service by ID
- `POST /api/services` - Create a new service
- `PUT /api/services/:id` - Update a service
- `DELETE /api/services/:id` - Delete a service (soft delete)

## Database Models

The application uses Sequelize ORM to interact with the PostgreSQL database. The models are defined in the `models` directory.

### User Model

Represents system users with different roles (administrator, supervisor, cashier, staff).

### Client Model

Represents clients/customers of the advertising agency.

### Employee Model

Represents employees of the advertising agency.

### Service Model

Represents services offered by the advertising agency.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request