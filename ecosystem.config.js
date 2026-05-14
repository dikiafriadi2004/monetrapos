module.exports = {
  apps: [
    {
      name: 'monetrapos-api',
      cwd: 'apps/api',
      script: 'dist/src/main.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4404,
      },
    },
    {
      name: 'monetrapos-company-admin',
      cwd: 'apps/company-admin',
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4402,
        HOSTNAME: '0.0.0.0',
      },
    },
    {
      name: 'monetrapos-member-admin',
      cwd: 'apps/member-admin',
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4403,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
