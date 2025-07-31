# 🚀 Production Deployment Guide

This guide will help you deploy the POS backend to production environments like Render, Heroku, Railway, or Vercel.

## 📋 Prerequisites

- Database (PostgreSQL) - Supabase, Railway, or any PostgreSQL provider
- Deployment platform account (Render, Heroku, Railway, Vercel)
- Environment variables configured

## 🔧 Environment Variables for Production

### Required Variables
```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration (Use your production database)
DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=your_production_db_name
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password

# JWT Configuration
JWT_SECRET=your_production_jwt_secret_key
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Optional Variables
```bash
# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🚀 Deployment Platforms

### 1. Render.com

1. **Connect your repository**
2. **Create a new Web Service**
3. **Configure the service:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   DB_HOST=your_supabase_host
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_supabase_password
   JWT_SECRET=your_jwt_secret
   CORS_ORIGIN=https://your-frontend.com
   ```

### 2. Railway.app

1. **Connect your repository**
2. **Add PostgreSQL plugin** (or use external database)
3. **Set environment variables** in the Railway dashboard
4. **Deploy automatically**

### 3. Heroku

1. **Install Heroku CLI**
2. **Create app**: `heroku create your-app-name`
3. **Add PostgreSQL**: `heroku addons:create heroku-postgresql:hobby-dev`
4. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set CORS_ORIGIN=https://your-frontend.com
   ```
5. **Deploy**: `git push heroku main`

### 4. Vercel

1. **Connect your repository**
2. **Configure build settings**:
   - **Framework Preset**: Node.js
   - **Build Command**: `npm install`
   - **Output Directory**: `.`
   - **Install Command**: `npm install`
   - **Dev Command**: `npm run dev`

3. **Add Environment Variables** in Vercel dashboard

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

1. **Create Supabase project**
2. **Get connection details** from Settings > Database
3. **Set environment variables**:
   ```
   DB_HOST=db.your-project.supabase.co
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

### Option 2: Railway PostgreSQL

1. **Create PostgreSQL service** in Railway
2. **Get connection details** from the service
3. **Set environment variables** with Railway's provided credentials

### Option 3: External PostgreSQL

1. **Use any PostgreSQL provider** (AWS RDS, DigitalOcean, etc.)
2. **Configure SSL** if required
3. **Set environment variables** with your database credentials

## 🔍 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
❌ PostgreSQL connection error: connection timeout
```
**Solutions:**
- Check if database credentials are correct
- Verify database is accessible from deployment server
- Ensure SSL is configured properly
- Check if database is running

**2. Environment Variables Not Set**
```
❌ PostgreSQL connection error: password authentication failed
```
**Solutions:**
- Verify all environment variables are set in deployment platform
- Check variable names match exactly
- Ensure no extra spaces in values

**3. CORS Issues**
```
❌ CORS error: Origin not allowed
```
**Solutions:**
- Set `CORS_ORIGIN` to your frontend domain
- Use `*` for development (not recommended for production)

**4. Port Issues**
```
❌ Error: listen EADDRINUSE
```
**Solutions:**
- Use `process.env.PORT` (deployment platforms set this)
- Don't hardcode port numbers

### Debugging Steps

1. **Check deployment logs** for specific error messages
2. **Verify environment variables** are set correctly
3. **Test database connection** locally with production credentials
4. **Check SSL configuration** for your database provider
5. **Verify CORS settings** match your frontend domain

## 🔒 Security Checklist

- [ ] Use strong, unique JWT secrets
- [ ] Set proper CORS origins (not `*`)
- [ ] Use HTTPS in production
- [ ] Keep database credentials secure
- [ ] Enable rate limiting
- [ ] Use environment variables for all secrets

## 📊 Monitoring

### Health Check Endpoint
```
GET /health
```
Returns server status and environment info.

### Database Connection Test
```bash
npm run test-connection
```

## 🚀 Quick Deploy Commands

### Render
```bash
# Connect repository and set environment variables in dashboard
# Deploy automatically on push
```

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

### Heroku
```bash
# Deploy to Heroku
heroku create your-app-name
git push heroku main
```

---

**Happy Deploying! 🎉** 