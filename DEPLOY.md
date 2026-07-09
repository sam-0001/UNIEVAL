# UniEval — Production Deployment Guide
## Domain: https://unieval.in

---

## Prerequisites

| Tool | Version |
|------|---------|
| Ubuntu | 22.04 LTS |
| Node.js | 20 LTS (LTS) |
| npm | 10+ |
| PM2 | latest |
| Nginx | 1.24+ |
| Certbot | latest |
| MongoDB Atlas | any (or self-hosted MongoDB 6+) |

---

## 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create app directory
sudo mkdir -p /var/www/unieval
sudo chown $USER:$USER /var/www/unieval
```

---

## 2. Clone & Configure

```bash
cd /var/www/unieval
git clone <your-repo-url> .

# Install dependencies (production only)
npm ci --omit=dev

# Create .env from template
cp .env.example .env
nano .env
```

Fill in every value in `.env`:
- `DATABASE_URL` — your MongoDB Atlas connection string
- `JWT_SECRET` — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `GEMINI_API_KEY` — from Google AI Studio
- `AWS_*` — from your AWS IAM user (needs S3 read/write on your bucket)
- `SMTP_*` — SMTP credentials for transactional email
- `CORS_ORIGINS=https://unieval.in,https://www.unieval.in`
- `FORCE_HTTPS=true`
- `NODE_ENV=production`

---

## 3. Build the Frontend

```bash
npm run build
# Output will be in ./dist/
```

---

## 4. Create Logs Directory

```bash
mkdir -p /var/www/unieval/logs
```

---

## 5. Start the App with PM2

```bash
# Start the server
pm2 start ecosystem.config.cjs --env production

# Save process list so it restarts on reboot
pm2 save

# Enable PM2 startup on boot
pm2 startup systemd -u $USER --hp $HOME
# Run the command it outputs, e.g.:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Verify it's running:
```bash
pm2 status
pm2 logs unieval --lines 50
```

Health check:
```bash
curl http://localhost:3000/api/health
```

---

## 6. Configure Nginx

```bash
# Copy the nginx config
sudo cp /var/www/unieval/nginx.conf /etc/nginx/sites-available/unieval.in

# Enable it
sudo ln -s /etc/nginx/sites-available/unieval.in /etc/nginx/sites-enabled/

# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 7. Obtain SSL Certificate (Let's Encrypt)

Make sure your domain's DNS A record points to this server's IP first.

```bash
sudo certbot --nginx -d unieval.in -d www.unieval.in \
  --non-interactive --agree-tos -m admin@unieval.in

# Certbot will auto-modify nginx.conf with SSL paths.
# Reload nginx after:
sudo systemctl reload nginx
```

Auto-renewal is set up automatically by Certbot. Verify:
```bash
sudo certbot renew --dry-run
```

---

## 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 9. DNS Records

At your DNS provider (e.g., GoDaddy, Cloudflare), set:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `<your-server-ip>` |
| A | `www` | `<your-server-ip>` |
| MX | `@` | your email provider |

---

## 10. S3 Bucket Policy (for video uploads)

Your IAM user needs this policy on the bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::unieval-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::unieval-uploads"
    }
  ]
}
```

Enable CORS on the bucket so the browser can upload directly:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://unieval.in"],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## Updating the App (Zero-Downtime)

```bash
cd /var/www/unieval
git pull origin main
npm ci --omit=dev
npm run build
pm2 reload unieval   # graceful reload — no downtime
```

---

## Useful Commands

```bash
pm2 status            # process status
pm2 logs unieval      # live logs
pm2 monit             # CPU/memory monitor
pm2 restart unieval   # hard restart
pm2 reload unieval    # graceful reload (zero-downtime)
sudo nginx -t         # test nginx config
sudo systemctl reload nginx
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| 502 Bad Gateway | `pm2 logs unieval` — app may have crashed |
| SSL errors | `sudo certbot certificates` — check expiry |
| DB connection fails | Whitelist server IP in MongoDB Atlas Network Access |
| Large uploads fail | `client_max_body_size` in nginx.conf; `UPLOAD_TIMEOUT` in .env |
| CORS errors | `CORS_ORIGINS` in .env must include exact origin |
