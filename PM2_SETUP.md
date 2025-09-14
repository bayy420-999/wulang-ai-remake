# PM2 Setup Guide for Wulang AI Bot

This guide explains how to run the Wulang AI Bot using PM2 process manager for production deployment.

## Prerequisites

1. **PM2 Installed**: PM2 should be installed globally
   ```bash
   npm install -g pm2
   ```

2. **Application Built**: Make sure the application is built
   ```bash
   npm run build
   ```

3. **Environment Variables**: Ensure your `.env` file is properly configured

## PM2 Configuration

The application uses `ecosystem.config.js` for PM2 configuration with the following features:

- **Process Management**: Automatic restart on crashes
- **Memory Management**: Restart if memory usage exceeds 1GB
- **Logging**: Comprehensive logging to `./logs/` directory
- **Environment Support**: Separate configs for development and production
- **WhatsApp Bot Optimized**: Fork mode for better WhatsApp Web.js compatibility

## Available PM2 Commands

### Basic Commands
```bash
# Start the application
npm run pm2:start

# Start in development mode
npm run pm2:dev

# Start in production mode
npm run pm2:prod

# Stop the application
npm run pm2:stop

# Restart the application
npm run pm2:restart

# Reload the application (zero-downtime)
npm run pm2:reload

# Delete the application from PM2
npm run pm2:delete
```

### Monitoring Commands
```bash
# View logs
npm run pm2:logs

# View real-time logs
npm run pm2:logs -- --lines 100

# Monitor processes
npm run pm2:monit

# Check status
npm run pm2:status
```

### Direct PM2 Commands
```bash
# Start with ecosystem file
pm2 start ecosystem.config.js

# Start with specific environment
pm2 start ecosystem.config.js --env production

# View all processes
pm2 list

# View logs for specific app
pm2 logs wulang-ai-bot

# Monitor in real-time
pm2 monit

# Save current process list
pm2 save

# Restore saved processes
pm2 resurrect
```

## Production Deployment Steps

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   npm run pm2:prod
   ```

3. **Save PM2 Configuration**
   ```bash
   pm2 save
   ```

4. **Setup PM2 Startup (Optional)**
   ```bash
   pm2 startup
   # Follow the instructions provided by PM2
   ```

## Log Management

Logs are stored in the `./logs/` directory:
- `err.log`: Error logs
- `out.log`: Standard output logs
- `combined.log`: Combined logs

### Log Rotation
PM2 automatically handles log rotation. You can configure it in `ecosystem.config.js`:
```javascript
log_rotate: {
  max_size: '10M',
  retain: 7,
  compress: true,
  dateFormat: 'YYYY-MM-DD'
}
```

## Environment Variables

Make sure your `.env` file contains all required variables:
```env
# Database
DATABASE_URL="your_database_url"

# OpenAI
OPENAI_API_KEY="your_openai_api_key"

# WhatsApp Bot
WHATSAPP_SESSION_NAME="wulang-ai-session"
ENABLE_GROUP_MESSAGES=true
RESET_KEYWORD="!reset"

# Logging
LOG_LEVEL="info"
```

## Troubleshooting

### Common Issues

1. **Application Won't Start**
   ```bash
   # Check logs
   npm run pm2:logs
   
   # Check if build is successful
   npm run build
   ```

2. **Memory Issues**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Restart if needed
   npm run pm2:restart
   ```

3. **WhatsApp Connection Issues**
   ```bash
   # Check WhatsApp session
   ls -la .wwebjs_auth/
   
   # Restart to reinitialize session
   npm run pm2:restart
   ```

### Useful Commands

```bash
# View detailed process info
pm2 show wulang-ai-bot

# Reset restart counter
pm2 reset wulang-ai-bot

# Flush logs
pm2 flush

# Reload with zero downtime
pm2 reload wulang-ai-bot
```

## Performance Monitoring

Use PM2's built-in monitoring:
```bash
# Real-time monitoring
pm2 monit

# Web-based monitoring (requires PM2 Plus)
pm2 plus
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Logs**: Regularly rotate and clean logs
3. **Process Isolation**: Run PM2 as a non-root user in production
4. **Firewall**: Ensure proper firewall configuration

## Backup and Recovery

1. **Save PM2 Configuration**
   ```bash
   pm2 save
   ```

2. **Backup Application Data**
   ```bash
   # Backup database
   # Backup .wwebjs_auth/ directory
   # Backup logs if needed
   ```

3. **Recovery**
   ```bash
   # Restore PM2 processes
   pm2 resurrect
   ```

## Production Checklist

- [ ] Application built successfully
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] PM2 process started
- [ ] Logs being written
- [ ] WhatsApp session initialized
- [ ] PM2 configuration saved
- [ ] Startup script configured (optional)
- [ ] Monitoring setup
- [ ] Backup strategy in place
