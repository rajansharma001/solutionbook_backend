module.exports = {
  apps: [
    {
      name: 'solutionbook-backend',
      script: 'dist/src/main.js',
      instances: 'max', // Uses all available CPU cores for load balancing
      exec_mode: 'cluster', // Enables clustering mode
      watch: false, // Don't restart on file changes in production
      max_memory_restart: '1G', // Restart app if it uses more than 1GB memory
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
