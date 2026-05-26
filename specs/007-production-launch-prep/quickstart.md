# Quickstart: 生产环境部署指南

**Phase**: 1 — Design & Contracts  
**Date**: 2026-05-26  
**Plan**: [plan.md](./plan.md)

> 面向运维人员。完整的部署检查清单见 [contracts/deployment-checklist.md](./contracts/deployment-checklist.md)。

## 前置条件

- 服务器：2 vCPU / 4GB RAM / 50GB SSD (Ubuntu 22.04+)
- 域名：`pawpalai.cn`（已 ICP 备案）
- 工具：Docker 24+、Docker Compose v2、Nginx、certbot

## 快速部署

### 1. 服务器初始化

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# 安装 Nginx + certbot
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. 获取 SSL 证书

```bash
sudo certbot certonly --standalone \
  -d api.pawpalai.cn \
  -d admin.pawpalai.cn
```

### 3. 部署后端

```bash
# 克隆代码
git clone https://github.com/zxvnoo-agj/pet-store.git /opt/pet-store
cd /opt/pet-store

# 配置环境变量
cp deploy/production/.env.production.example backend/.env
# 编辑 backend/.env，填入正式密钥

# 构建并启动
docker compose -f deploy/production/docker-compose.yml build
docker compose -f deploy/production/docker-compose.yml up -d

# 验证
curl https://api.pawpalai.cn/health
```

### 4. 配置 Nginx

```bash
# 将 deploy/production/nginx/ 下的 conf 文件复制到 sites-available
sudo cp deploy/production/nginx/api.pawpalai.cn.conf /etc/nginx/sites-available/
sudo cp deploy/production/nginx/admin.pawpalai.cn.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. 构建前端小程序

```bash
cd frontend
npm install
npm run build:weapp
# 输出在 frontend/dist/，通过微信开发者工具上传
```

### 6. 验证上线

```bash
# 健康检查
curl https://api.pawpalai.cn/health

# 分类接口
curl https://api.pawpalai.cn/v1/categories

# AI 对话（需 token）
curl -X POST https://api.pawpalai.cn/v1/chat/stream \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"session_id": 1, "content": "hello"}'
```

## 日常运维

### 查看日志

```bash
docker compose -f deploy/production/docker-compose.yml logs -f backend
```

### 更新部署

```bash
cd /opt/pet-store
git pull
docker compose -f deploy/production/docker-compose.yml build
docker compose -f deploy/production/docker-compose.yml up -d
```

### 备份与恢复

```bash
# 备份
./deploy/scripts/backup.sh

# 恢复
gunzip -c /backups/db_20260526.sql.gz | docker exec -i petstore-postgres psql -U petshop petshop
```

### 续期证书

```bash
# certbot 已配置 cron 自动续期，手动触发：
sudo certbot renew
sudo systemctl reload nginx
```
