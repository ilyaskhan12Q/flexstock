# Deployment Guide

This guide covers deploying FlexStock to various hosting environments, including VPS (DigitalOcean, Linode, AWS), shared hosting, or standard Docker environments.

---

## Docker Compose Deployment (Recommended)

To deploy FlexStock as a full-stack containerized application in production, we use `docker-compose.prod.yml`. This starts:
- **PostgreSQL**: Database with health checks.
- **Server**: Node.js/Express API backend.
- **Nginx**: Web server that serves the compiled React assets and proxies API/socket requests to the backend.

### Steps:
1. Clone the repository on your server:
   ```bash
   git clone https://github.com/ilyaskhan12Q/flexstock.git
   cd flexstock
   ```
2. Copy and configure the environment variables:
   ```bash
   cp .env.example .env
   ```
   *Make sure to change `NODE_ENV` to `production`, customize database credentials, generate strong random strings for `JWT_SECRET` and `REFRESH_TOKEN_SECRET`, and set `APP_URL` to your domain.*
3. Launch the containers:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
4. Verify the application status:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

---

## VPS / Linux Server Manual Deployment

If you are not using Docker containers for the app itself, you can deploy it directly on a Linux server using PM2 for process management and Nginx as a reverse proxy.

### Prerequisites:
- Node.js (v18+)
- PostgreSQL (v14+)
- PM2 (Process Manager)
- Nginx

### Steps:
1. Clone and prepare environment variables:
   ```bash
   git clone https://github.com/ilyaskhan12Q/flexstock.git
   cd flexstock
   cp .env.example .env
   ```
2. Run the automated installer to set up packages, database migrations, and build the frontend:
   ```bash
   ./install.sh
   ```
3. Set up PM2 to run the backend server:
   ```bash
   npm install -g pm2
   pm2 start server/src/index.js --name "flexstock-api"
   pm2 save
   pm2 startup
   ```
4. Configure Nginx to serve the frontend client and proxy API requests:
   Create a virtual host configuration file (e.g., `/etc/nginx/sites-available/flexstock`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       root /home/ilyaskhan/Projects/FlexStock/client/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /socket.io/ {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
       }
   }
   ```
5. Enable the site and restart Nginx:
   ```bash
   ln -s /etc/nginx/sites-available/flexstock /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

---

## Database Backups

It is critical to schedule backups of the PostgreSQL database. You can use standard `pg_dump` tools:
```bash
pg_dump -U postgres -d flexstock > backup.sql
```
