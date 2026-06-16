module.exports = {
  apps: [
    {
      name: 'backend-admin',
      script: './dist/main.js',
      cwd: './',
      instances: 'max',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      node_args: '--max-old-space-size=1024',
      args: '',
    },
  ],
};
