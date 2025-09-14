module.exports = {
  apps: [
    {
      name: 'wulang-ai-bot',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 3000,
      // WhatsApp bot specific settings
      exec_mode: 'fork', // Use fork mode for WhatsApp bot
      ignore_watch: [
        'node_modules',
        'logs',
        'temp',
        'dist',
        '.git',
        '*.log'
      ],
      // Environment variables (make sure to set these in your .env file)
      env_file: '.env'
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/bayy420-999/wulang-ai-remake.git',
      path: '/var/www/wulang-ai-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
