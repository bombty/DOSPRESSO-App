# DOSPRESSO Deployment Guide

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ database
- SMTP email service (IONOS, SendGrid, etc.)
- AWS S3 or compatible object storage (optional, for file uploads)

---

## 🚀 Deployment Steps

### 1. Extract ZIP File

```bash
unzip dospresso-webapp.zip
cd dospresso-webapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required Variables:**
- `DATABASE_URL`: Your PostgreSQL connection string
- `SESSION_SECRET`: Random secure string (generate with `openssl rand -hex 32`)
- `SMTP_*`: Email service credentials
- Object storage credentials (if using file uploads)

### 4. Restore Database

```bash
# Create a new PostgreSQL database
createdb dospresso

# Restore from backup
psql $DATABASE_URL < dospresso_backup.sql
```

**Alternative: Fresh database setup**
```bash
npm run db:push
```

### 5. Run the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build  # if you have a build step
npm start
```

The application will be available at: `http://localhost:5000`

---

## 🔧 Configuration

### Database Migration

If you need to update the schema:

```bash
npm run db:push
```

### Environment-Specific Settings

- **PORT**: Change in `.env` or `server/index.ts`
- **Session Secret**: Must be secure in production
- **SMTP**: Configure your email provider

---

## 📦 Deployment Platforms

### DigitalOcean App Platform

1. Create new app from GitHub or upload
2. Set environment variables in dashboard
3. Choose Node.js environment
4. Deploy

### AWS EC2

1. Launch Ubuntu instance
2. Install Node.js and PostgreSQL client
3. Clone repository or upload ZIP
4. Follow deployment steps above
5. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start npm --name "dospresso" -- start
   pm2 save
   pm2 startup
   ```

### Railway / Render

1. Connect GitHub repository or upload
2. Set environment variables
3. Railway/Render will auto-detect Node.js
4. Deploy

### Heroku

```bash
heroku create dospresso-app
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku config:set SESSION_SECRET=your-secret
```

---

## 🗄️ Database Backup & Restore

### Create Backup

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore Backup

```bash
psql $DATABASE_URL < backup_20250120.sql
```

---

## 🔐 Security Checklist

- [ ] Change `SESSION_SECRET` to a secure random value
- [ ] Use strong database password
- [ ] Enable SSL for PostgreSQL connection
- [ ] Configure CORS if needed
- [ ] Set `NODE_ENV=production`
- [ ] Never commit `.env` file to Git
- [ ] Use HTTPS in production
- [ ] Configure firewall rules

---

## 📊 Monitoring & Logs

### View Logs

```bash
# Using PM2
pm2 logs dospresso

# Direct Node.js
npm start 2>&1 | tee app.log
```

### Health Check Endpoint

```
GET /api/auth/user
```

Should return 401 if not authenticated, or user object if logged in.

---

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"
```

### Port Already in Use

Change PORT in `.env` or:
```bash
PORT=3000 npm start
```

### Missing Dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### SMTP Email Not Sending

- Verify SMTP credentials
- Check firewall/port 587 or 465
- Enable "Less secure apps" if using Gmail (not recommended)
- Use app-specific password

---

## 📞 Support

For issues or questions:
- Check logs: `pm2 logs` or console output
- Verify environment variables
- Ensure database is accessible
- Check Node.js version: `node --version` (should be 18+)

---

## 🎯 Production Optimization

### Performance

```bash
# Use production build
NODE_ENV=production npm start

# Enable gzip compression (already configured in Express)
# Use CDN for static assets
# Add Redis for session store (optional)
```

### Scaling

- Use load balancer (nginx, HAProxy)
- Deploy multiple instances behind load balancer
- Use managed PostgreSQL (AWS RDS, DigitalOcean Managed Database)
- Consider container orchestration (Docker, Kubernetes)

---

## 📝 File Structure

```
dospresso-webapp/
├── client/              # React frontend
├── server/              # Express backend
├── shared/              # Shared types and schemas
├── attached_assets/     # Uploaded files (not in ZIP, backup separately)
├── dospresso_backup.sql # Database backup
├── .env.example         # Environment template
├── package.json         # Dependencies
└── DEPLOYMENT.md        # This file
```

---

## ✅ Post-Deployment Checklist

- [ ] Application starts without errors
- [ ] Database connection successful
- [ ] Admin user can log in
- [ ] Email notifications working
- [ ] File uploads working (if configured)
- [ ] All environment variables set
- [ ] SSL certificate configured (production)
- [ ] Backups configured
- [ ] Monitoring enabled

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
