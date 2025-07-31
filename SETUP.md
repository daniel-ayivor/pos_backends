# 🚀 POS Backend Setup Guide

This guide will help you set up the POS backend for development.

## 📋 Prerequisites

Before starting, make sure you have:
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [PostgreSQL](https://www.postgresql.org/) installed and running
- Git (for cloning the repository)

## 🔧 Quick Setup

### 1. Clone and Install
```bash
# Clone the repository
git clone <your-repo-url>
cd POS_BACKEND

# Install dependencies
npm install
```

### 2. Environment Configuration

**Option A: Interactive Setup (Recommended)**
```bash
npm run setup
```
This will guide you through creating your `.env` file interactively.

**Option B: Manual Setup**
```bash
# Copy the environment template
cp env.example .env

# Edit the .env file with your database credentials
# Use your preferred text editor
```

### 3. Database Setup
```bash
# Create the database
createdb pos_database

# Run database migrations
npm run migrate

# (Optional) Seed with sample data
npm run seed
```

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## 🔍 Verification

Once the server is running, you can verify it's working:

1. **Health Check**: Visit `http://localhost:5000/health`
2. **API Documentation**: Check the README.md for available endpoints

## 📝 Environment Variables

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | Your PostgreSQL password | `mypassword123` |
| `JWT_SECRET` | Secret for JWT tokens | Auto-generated |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | pos_database |
| `DB_USER` | Database user | postgres |

## 🛠️ Development Workflow

### Making Changes
1. Create a feature branch
2. Make your changes
3. Test your changes
4. Submit a pull request

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
# Create a new migration
npm run migrate

# Reset database (development only)
npm run migrate:reset
```

## 🔒 Security Notes

- **Never commit `.env` files** - they contain sensitive information
- Use strong passwords for production databases
- Generate unique JWT secrets for each environment
- Keep your dependencies updated

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Error**
```
❌ PostgreSQL connection error: password authentication failed
```
**Solution**: Check your `DB_PASSWORD` in the `.env` file

**2. Port Already in Use**
```
❌ Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change the `PORT` in your `.env` file or kill the process using port 5000

**3. Module Not Found**
```
❌ Error: Cannot find module 'pg'
```
**Solution**: Run `npm install` to install dependencies

**4. Database Doesn't Exist**
```
❌ Error: database "pos_database" does not exist
```
**Solution**: Create the database with `createdb pos_database`

### Getting Help

If you encounter issues:
1. Check the error logs in the console
2. Verify your `.env` configuration
3. Ensure PostgreSQL is running
4. Check the README.md for more details

## 📞 Support

For additional help:
- Check the main README.md
- Review the API documentation
- Contact the development team

---

**Happy Coding! 🎉** 