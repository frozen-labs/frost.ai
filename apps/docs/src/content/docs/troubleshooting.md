---
title: Troubleshooting
description: Common issues and solutions for Frost AI
---

import { Card, CardGrid, Tabs, TabItem, Aside } from '@astrojs/starlight/components';

This guide covers common issues you might encounter when setting up, developing, or deploying Frost AI, along with their solutions.

## Quick Diagnostics

Before diving into specific issues, run these quick checks:

```bash
# Check if all services are running
docker ps

# Test API health
curl http://localhost:3000/api/health

# Check application logs
docker-compose logs app

# Check database logs
docker-compose logs postgres
```

## Installation Issues

### Docker Issues

<CardGrid>
  <Card title="🐳 Docker Not Starting" icon="warning">
    **Symptoms**: `docker: command not found` or permission denied
    
    **Solutions**:
    ```bash
    # Install Docker (Ubuntu/Debian)
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    # Log out and log back in
    ```
  </Card>
  
  <Card title="⚠️ Port Already in Use" icon="warning">
    **Symptoms**: `Port 3000 is already in use`
    
    **Solutions**:
    ```bash
    # Find what's using the port
    lsof -i :3000
    
    # Kill the process or change port in .env
    echo "FROSTAI_PORT=3001" >> .env
    ```
  </Card>
</CardGrid>

### Node.js and pnpm Issues

<Tabs>
<TabItem label="Node.js Version">
**Issue**: Wrong Node.js version

```bash
# Check current version
node --version

# Install correct version with nvm
nvm install 18
nvm use 18
nvm alias default 18
```
</TabItem>

<TabItem label="pnpm Not Found">
**Issue**: `pnpm: command not found`

```bash
# Install pnpm
npm install -g pnpm

# Or use corepack
corepack enable
corepack prepare pnpm@latest --activate
```
</TabItem>

<TabItem label="Permission Errors">
**Issue**: Permission denied when installing packages

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```
</TabItem>
</Tabs>

## Database Issues

### Connection Problems

<CardGrid>
  <Card title="🔌 Database Connection Failed" icon="warning">
    **Symptoms**: `ECONNREFUSED` or `connection refused`
    
    **Diagnosis**:
    ```bash
    # Check if database container is running
    docker ps | grep postgres
    
    # Check database logs
    docker-compose logs postgres
    ```
    
    **Solutions**:
    ```bash
    # Restart database
    make dev-db-down
    make dev-db
    
    # Or reset completely
    make dev-db-clean
    make dev-db
    pnpm db:push
    ```
  </Card>
  
  <Card title="🔐 Authentication Failed" icon="warning">
    **Symptoms**: `password authentication failed`
    
    **Solutions**:
    ```bash
    # Check environment variables
    cat .env | grep POSTGRES
    
    # Reset database with correct credentials
    make dev-db-clean
    make dev-db
    ```
  </Card>
</CardGrid>

### Schema Issues

<Tabs>
<TabItem label="Schema Out of Sync">
**Symptoms**: Table doesn't exist errors

```bash
# Reset and rebuild schema
make dev-db-clean
make dev-db
pnpm db:push
```
</TabItem>

<TabItem label="Migration Failures">
**Symptoms**: Migration fails to apply

```bash
# Check migration status
pnpm db:studio

# Reset migrations
rm -rf drizzle/
pnpm db:generate
pnpm db:migrate
```
</TabItem>

<TabItem label="Data Loss">
**Symptoms**: Data disappeared after restart

```bash
# Ensure data persistence
docker volume ls | grep postgres

# Create backup before changes
docker exec postgres_container pg_dump -U user dbname > backup.sql
```
</TabItem>
</Tabs>

## Development Issues

### Build and Runtime Errors

<CardGrid>
  <Card title="⚡ TypeScript Errors" icon="warning">
    **Symptoms**: Type checking failures
    
    **Solutions**:
    ```bash
    # Run type checking
    pnpm typecheck
    
    # Clear cache and reinstall
    rm -rf node_modules .turbo dist
    pnpm install
    ```
  </Card>
  
  <Card title="🎨 CSS/Styling Issues" icon="warning">
    **Symptoms**: Styles not loading or incorrect
    
    **Solutions**:
    ```bash
    # Clear cache
    rm -rf .turbo dist
    pnpm dev
    
    # Check Tailwind config
    cat tailwind.config.ts
    ```
  </Card>
</CardGrid>

### Hot Reload Issues

<Tabs>
<TabItem label="Changes Not Reflected">
**Issue**: Code changes not appearing

```bash
# Restart dev server
pnpm dev

# Clear all caches
rm -rf node_modules/.cache .turbo dist
pnpm install
pnpm dev
```
</TabItem>

<TabItem label="Performance Issues">
**Issue**: Slow reload times

```bash
# Check resource usage
docker stats

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm dev
```
</TabItem>
</Tabs>

## API Issues

### Request/Response Problems

<CardGrid>
  <Card title="📡 API Not Responding" icon="warning">
    **Diagnosis**:
    ```bash
    # Test health endpoint
    curl http://localhost:3000/api/health
    
    # Check if app is running
    docker ps | grep app
    ```
    
    **Solutions**:
    ```bash
    # Restart application
    docker-compose restart app
    
    # Check application logs
    docker-compose logs app
    ```
  </Card>
  
  <Card title="❌ Validation Errors" icon="warning">
    **Symptoms**: 400/422 status codes
    
    **Solutions**:
    - Check request body format
    - Ensure all required fields are present
    - Validate data types match API expectations
    
    ```bash
    # Test with valid data
    curl -X POST http://localhost:3000/api/metering/tokens \
      -H "Content-Type: application/json" \
      -d '{"customerSlug":"test","agentSlug":"test","modelSlug":"gpt-4","inputTokens":100,"outputTokens":50}'
    ```
  </Card>
</CardGrid>

### Data Issues

<Tabs>
<TabItem label="Missing Models">
**Issue**: Model not found errors

```bash
# Check available models
pnpm db:studio
# Browse to validModels table

# Add missing model
curl -X POST http://localhost:3000/api/models \
  -H "Content-Type: application/json" \
  -d '{"slug":"custom-model","name":"Custom Model","inputCost":10,"outputCost":20}'
```
</TabItem>

<TabItem label="Cost Calculation Issues">
**Issue**: Incorrect cost calculations

1. Verify model pricing in database
2. Check token counts are positive integers
3. Ensure model slug matches exactly

```sql
-- Check model pricing
SELECT * FROM "validModels" WHERE slug = 'gpt-4';
```
</TabItem>
</Tabs>

## Production Issues

### Performance Problems

<CardGrid>
  <Card title="🐌 Slow Response Times" icon="warning">
    **Diagnosis**:
    ```bash
    # Check resource usage
    docker stats
    htop
    
    # Monitor database performance
    pnpm db:studio
    ```
    
    **Solutions**:
    - Scale up server resources
    - Add database indexes
    - Implement caching
    - Use connection pooling
  </Card>
  
  <Card title="💾 High Memory Usage" icon="warning">
    **Solutions**:
    ```bash
    # Increase container memory limits
    # In docker-compose.yml:
    services:
      app:
        mem_limit: 2g
    
    # Node.js garbage collection
    export NODE_OPTIONS="--max-old-space-size=1024"
    ```
  </Card>
</CardGrid>

### Security Issues

<Tabs>
<TabItem label="Unauthorized Access">
**Issue**: API accessible without authentication

- Implement API authentication
- Use environment-based secrets
- Configure firewall rules
- Set up reverse proxy with SSL

```nginx
# nginx.conf example
location /api/ {
    auth_basic "Frost AI API";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:3000;
}
```
</TabItem>

<TabItem label="Data Exposure">
**Issue**: Sensitive data in logs or responses

- Review log configuration
- Sanitize API responses
- Use environment variables for secrets
- Enable database encryption

```bash
# Check for exposed secrets
grep -r "password\|secret\|key" logs/
```
</TabItem>
</Tabs>

## Backup and Recovery Issues

### Backup Failures

<CardGrid>
  <Card title="💾 Backup Creation Failed" icon="warning">
    **Diagnosis**:
    ```bash
    # Test backup manually
    docker exec postgres_container pg_dump -U user dbname
    
    # Check disk space
    df -h
    ```
    
    **Solutions**:
    - Ensure sufficient disk space
    - Check database permissions
    - Verify backup script permissions
  </Card>
  
  <Card title="🔄 Recovery Issues" icon="warning">
    **Steps for recovery**:
    ```bash
    # Stop application
    docker-compose down
    
    # Restore from backup
    cat backup.sql | docker exec -i postgres_container psql -U user -d dbname
    
    # Start application
    docker-compose up -d
    ```
  </Card>
</CardGrid>

## Environment-Specific Issues

### Windows (WSL2)

<Tabs>
<TabItem label="WSL2 Issues">
**Common problems**:
- Docker Desktop not integrated with WSL2
- File permission issues
- Network connectivity problems

**Solutions**:
```bash
# Update WSL2
wsl --update

# Restart Docker Desktop
# Enable WSL2 integration in Docker settings
```
</TabItem>

<TabItem label="File Permissions">
**Issue**: Permission denied errors

```bash
# Fix file permissions
chmod +x scripts/*.sh
chown -R $USER:$USER /path/to/project
```
</TabItem>
</Tabs>

### macOS

<Tabs>
<TabItem label="M1/M2 Mac Issues">
**Issue**: Platform compatibility errors

```bash
# Use platform-specific images
docker pull --platform linux/amd64 postgres:15

# Or in docker-compose.yml:
services:
  postgres:
    platform: linux/amd64
```
</TabItem>

<TabItem label="Homebrew Issues">
**Issue**: Dependencies not found

```bash
# Update Homebrew
brew update && brew upgrade

# Reinstall dependencies
brew reinstall node@18 docker
```
</TabItem>
</Tabs>

## Getting Additional Help

### Debug Information to Collect

When seeking help, please provide:

```bash
# System information
uname -a
docker --version
node --version
pnpm --version

# Service status
docker ps
docker-compose logs --tail=50

# Environment configuration (without secrets)
cat .env | grep -v PASSWORD | grep -v SECRET
```

### Support Channels

<CardGrid>
  <Card title="📚 Documentation" icon="document">
    Check our comprehensive documentation for detailed guides and examples.
    [Browse Docs →](/)
  </Card>
  
  <Card title="🐛 GitHub Issues" icon="external">
    Report bugs or request features on our GitHub repository.
    [Open Issue →](https://github.com/frozen-labs/frost/issues)
  </Card>
  
  <Card title="💬 Discussions" icon="comment">
    Join community discussions for help and feedback.
    [GitHub Discussions →](https://github.com/frozen-labs/frost/discussions)
  </Card>
  
  <Card title="📧 Direct Support" icon="email">
    For enterprise support or complex issues, contact our team directly.
  </Card>
</CardGrid>

## Preventive Measures

### Regular Maintenance

```bash
# Weekly maintenance script
#!/bin/bash

# Update dependencies
pnpm update

# Check for security vulnerabilities
pnpm audit

# Clean up old Docker resources
docker system prune -f

# Backup database
./scripts/backup.sh

# Test critical functionality
curl -f http://localhost:3000/api/health
```

### Monitoring Setup

<Aside type="tip">
Set up monitoring and alerting to catch issues before they become problems. Consider using tools like Grafana, Prometheus, or simple health check scripts.
</Aside>

```bash
# Simple monitoring script
#!/bin/bash
while true; do
  if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "ALERT: API health check failed at $(date)"
    # Send notification
  fi
  sleep 300  # Check every 5 minutes
done
```