// pm2 process config for staging/VPS deployment.
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "nxl-api",
      script: "apps/api/dist/main.js",
      env: { PORT: 3001 },
    },
    {
      name: "nxl-web",
      script: "npm",
      args: "start --prefix apps/web",
      env: { PORT: 4001 },
    },
  ],
};
