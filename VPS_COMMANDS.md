Here’s a **clean, ordered runbook** of all the commands we used / discussed in this whole session, grouped by scenario and in the exact order you’d typically run them.

I’ll use these assumptions (match to your setup):

* **Spring API (auth)**: port `9091`, jar `pantry.jar`, folder `/opt/springapps/pantrypal-api`
* **Frontend (PantryPal UI)**: folder `/var/www/pantrypal-ui`, domain `financetbag.com`
* **VPS user**: `root` (or use your non-root user)

---

## 1️⃣ MySQL – Databases, Users, Grants

**Login as root:**

```bash
mysql -u root -p
```

**Show all databases:**

```sql
SHOW DATABASES;
```

**Create a database:**

```sql
CREATE DATABASE inventory_db;
```

**Check existing user (example: `todo_suser`):**

```sql
SELECT user, host FROM mysql.user WHERE user = 'todo_suser';
```

**Create user (if needed):**

```sql
CREATE USER 'todo_suser'@'localhost' IDENTIFIED BY 'StrongPass@123';
```

**Or update password for existing user:**

```sql
ALTER USER 'todo_suser'@'localhost' IDENTIFIED BY 'StrongPass@123';
```

**Grant privileges on DB:**

```sql
GRANT ALL PRIVILEGES ON inventory_db.* TO 'todo_suser'@'localhost';
FLUSH PRIVILEGES;
```

**Verify grants:**

```sql
SHOW GRANTS FOR 'todo_suser'@'localhost';
```

**Test login as app user:**

```bash
mysql -u todo_suser -p inventory_db
```

---

## 2️⃣ Spring Boot JAR – Stop → Replace → Start → Verify

### 2.1 Check what’s running and on which port

**Find Java processes:**

```bash
ps -ef | grep java
```

**Check if something is listening on 9091:**

```bash
ss -tulnp | grep 9091
```

---

### 2.2 Stop existing Spring app on 9091

If using plain `nohup` / java command:

```bash
ss -tulnp | grep 9091      # note PID from "users:(("java",pid=XXXXX"
kill -9 <PID>              # replace <PID> with that number
ss -tulnp | grep 9091      # should now be empty
```

(If later you use `systemd`, you’d instead do: `systemctl stop pantrypal-api`.)

---

### 2.3 Remove old jar (on VPS)

```bash
cd /opt/springapps/pantrypal-api
ls
rm pantry.jar          # or mv pantry.jar pantry-OLD-...
```

---

### 2.4 Copy new jar from Mac → VPS

On **Mac terminal** (not inside SSH):

```bash
scp /path/to/pantry.jar root@YOUR_VPS_IP:/opt/springapps/pantrypal-api/
```

On **VPS**:

```bash
cd /opt/springapps/pantrypal-api
ls -lh pantry.jar      # confirm size + modified date
stat pantry.jar        # see exact modify timestamp
```

---

### 2.5 Start the Spring app (9091) with nohup

```bash
cd /opt/springapps/pantrypal-api
nohup java -jar pantry.jar > pantrypal.log 2>&1 &
```

---

### 2.6 Verify Spring is running

**Check process + port:**

```bash
ps -ef | grep pantry.jar | grep -v grep
ss -tulnp | grep 9091
```

**Check logs live:**

```bash
cd /opt/springapps/pantrypal-api
tail -f pantrypal.log
```

(Stop tail with `Ctrl + C`.)

---

### 2.7 Test backend from VPS

**Direct Spring test (no Nginx):**

```bash
curl -i http://127.0.0.1:9091/api/v1/auth/login
```

For realistic test (POST with JSON):

```bash
curl -i -X POST http://127.0.0.1:9091/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

---

## 3️⃣ Nginx – Two Sites + API Proxy

### 3.1 See what sites are enabled

```bash
ls /etc/nginx/sites-enabled
```

You saw:

```text
financettwelve.conf
pantrypal-ui
```

---

### 3.2 Show current vhosts (server_name + root)

```bash
nginx -T | egrep "server_name|root"
```

---

### 3.3 Pantrypal UI server block (concept shape)

File: `/etc/nginx/sites-available/pantrypal-ui`

```bash
nano /etc/nginx/sites-available/pantrypal-ui
```

Example structure:

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name financetbag.com www.financetbag.com;
    return 301 https://$host$request_uri;
}

# HTTPS site + API proxy
server {
    listen 443 ssl http2;
    server_name financetbag.com www.financetbag.com;

    root /var/www/pantrypal-ui;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/financetbag.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/financetbag.com/privkey.pem;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:9091/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Make sure it’s enabled:

```bash
ln -s /etc/nginx/sites-available/pantrypal-ui /etc/nginx/sites-enabled/  # only once
```

---

### 3.4 Test and reload Nginx

```bash
nginx -t
systemctl reload nginx
```

---

### 3.5 Test routing via Nginx

**From VPS with Host header:**

```bash
curl -i http://127.0.0.1/api/v1/auth/login -H "Host: financetbag.com"
```

**Over HTTPS (like browser):**

```bash
curl -k -i https://financetbag.com/api/v1/auth/login
```

---

## 4️⃣ SSL – Certbot for `financetbag.com`

### 4.1 Install Certbot + Nginx plugin

```bash
apt update
apt install -y certbot python3-certbot-nginx
certbot --version
```

---

### 4.2 Issue SSL cert for root + www

```bash
certbot --nginx -d financetbag.com -d www.financetbag.com
```

(Choose redirect → YES.)

---

### 4.3 Confirm auto-renew

```bash
systemctl list-timers | grep certbot
```

---

## 5️⃣ Frontend – Build & Deploy Pantrypal UI

### 5.1 On Mac – build with Vite

```bash
cd /path/to/rest-express
npm run build
```

Structure:

* `dist/`

    * `index.js` (Node server – ignored in static mode)
    * `public/`

        * `index.html`
        * `assets/`

---

### 5.2 Copy build to VPS (static UI)

On Mac:

```bash
scp -r dist/public/* root@YOUR_VPS_IP:/var/www/pantrypal-ui/
```

On VPS:

```bash
cd /var/www/pantrypal-ui
ls -lh index.html
stat index.html
ls -lt | head -n 10              # latest updated UI files
ls -lt assets | head -n 10       # latest JS/CSS bundles
```

---

### 5.3 View `index.html` content on VPS

**Show whole file (for quick check):**

```bash
cat /var/www/pantrypal-ui/index.html
```

**Scroll with paging (best):**

```bash
less /var/www/pantrypal-ui/index.html
# q to quit
```

**First lines:**

```bash
head -n 40 /var/www/pantrypal-ui/index.html
```

**Last lines:**

```bash
tail -n 40 /var/www/pantrypal-ui/index.html
```

**With line numbers (for debugging):**

```bash
nl -ba /var/www/pantrypal-ui/index.html | head -n 60
```

---

## 6️⃣ Frontend Config – API base URL

Inside your React code:

```ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "/api/v1",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TOKEN_KEY: "pantrypal_auth_token",
  REFRESH_TOKEN_KEY: "pantrypal_refresh_token",
  USER_KEY: "pantrypal_user",
};
```

Then calls:

```ts
await fetch(`${API_CONFIG.BASE_URL}/auth/login`, { ... })
```

Which becomes in prod:

`https://financetbag.com/api/v1/auth/login` → Nginx → Spring (9091)

---

## 7️⃣ Debug & Utility Commands

### 7.1 Nginx & processes

**Check Nginx is listening on 80:**

```bash
ss -tulnp | grep :80
```

**All Java + Node + Nginx processes:**

```bash
ps -ef | egrep "java|node|nginx" | grep -v grep
```

---

### 7.2 Check current server time

```bash
date
timedatectl
```

---

### 7.3 Quick HTTP header tests

**Root site:**

```bash
curl -I http://financetbag.com
curl -I https://financetbag.com
```

**Specific Host via 127.0.0.1:**

```bash
curl -I -H "Host: financetbag.com" http://127.0.0.1
```

---

If you want, next step I can compress this into a **single “Pantrypal Deployment.sh” script layout** (with comments) so you literally run things block-by-block every time you deploy a new version.

### run two app/website on nginx on vps hostinger
Nice, that’s a clean setup:

* `domain1.com` → Angular SPA (static build)
* `domain2.com` → React SPA (static build)

Both can live happily on the **same Hostinger VPS** with **Nginx**.

I’ll give you an end-to-end guide that you can almost copy-paste.

---

## 1. Build your apps locally

### Angular app (for `domain1.com`)

In your Angular project:

```bash
ng build --configuration production
# or older CLIs:
# ng build --prod
```

This will create a folder like:

```text
dist/your-angular-app/
```

That folder is what you’ll upload to the server.

---

### React app (for `domain2.com`)

In your React project:

```bash
npm run build
# or
yarn build
```

This will create:

```text
build/
```

That folder is what you’ll upload to the server.

---

## 2. Upload builds to your VPS

SSH into VPS:

```bash
ssh user@YOUR_VPS_IP
```

Create folders for each site:

```bash
sudo mkdir -p /var/www/domain1.com
sudo mkdir -p /var/www/domain2.com
```

Upload:

* Upload Angular `dist/your-angular-app/*` → `/var/www/domain1.com/`
* Upload React `build/*` → `/var/www/domain2.com/`

Then fix ownership (if needed):

```bash
sudo chown -R $USER:$USER /var/www/domain1.com /var/www/domain2.com
```

> After this, both folders should have an `index.html` at the root.

---

## 3. Create Nginx server blocks

### 3.1 Angular app: `domain1.com`

Create config:

```bash
sudo nano /etc/nginx/sites-available/domain1.com.conf
```

Paste this:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name domain1.com www.domain1.com;

    root /var/www/domain1.com;
    index index.html;

    access_log /var/log/nginx/domain1_access.log;
    error_log  /var/log/nginx/domain1_error.log;

    # For Angular SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### 3.2 React app: `domain2.com`

Create config:

```bash
sudo nano /etc/nginx/sites-available/domain2.com.conf
```

Paste:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name domain2.com www.domain2.com;

    root /var/www/domain2.com;
    index index.html;

    access_log /var/log/nginx/domain2_access.log;
    error_log  /var/log/nginx/domain2_error.log;

    # For React SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> `try_files $uri $uri/ /index.html;` is **very important** for Angular/React routing (`/dashboard`, `/users/1`, etc.).

---

## 4. Enable the sites in Nginx

Create symlinks:

```bash
sudo ln -s /etc/nginx/sites-available/domain1.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/domain2.com.conf /etc/nginx/sites-enabled/
```

(Optional) disable default site:

```bash
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || true
```

Test Nginx config:

```bash
sudo nginx -t
```

If it says `syntax is ok` and `test is successful`, reload:

```bash
sudo systemctl reload nginx
```

---

## 5. Point your domains to the VPS

In your domain DNS (Hostinger panel or wherever domain is registered):

For `domain1.com`:

* **A record**

    * Name/Host: `@`
    * Type: `A`
    * Value: `YOUR_VPS_IP`

For `www.domain1.com` (optional but recommended):

* **A record**

    * Name/Host: `www`
    * Type: `A`
    * Value: `YOUR_VPS_IP`

Repeat similarly for `domain2.com` and `www.domain2.com`.

After DNS propagates, hit:

* `http://domain1.com` → Angular app
* `http://domain2.com` → React app

---

## 6. Add HTTPS with Let’s Encrypt (highly recommended)

Install Certbot:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

Get certificate for domain1:

```bash
sudo certbot --nginx -d domain1.com -d www.domain1.com
```

Then for domain2:

```bash
sudo certbot --nginx -d domain2.com -d www.domain2.com
```

Certbot will:

* Add `listen 443 ssl` blocks
* Configure SSL
* Add HTTP→HTTPS redirect

Now you’ll have:

* `https://domain1.com` → Angular
* `https://domain2.com` → React

---

## 7. Quick checklist if something doesn’t work

* `sudo nginx -t` → must be OK.
* `sudo systemctl status nginx` → Nginx running.
* `ls /var/www/domain1.com` → shows `index.html`.
* `ls /var/www/domain2.com` → shows `index.html`.
* DNS `A` records for both domains point to **correct VPS IP**.
* No firewall blocking HTTP/HTTPS (on Ubuntu):

  ```bash
  sudo ufw allow 'Nginx Full'
  sudo ufw status
  ```

---

If you want, share (sanitized) paths or any error you see (`nginx -t` output or browser error), and I’ll help you debug with exact fixes.


