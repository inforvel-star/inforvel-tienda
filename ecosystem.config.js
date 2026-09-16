module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "start",
      cwd: "/var/www/frontend",
      max_memory_restart: "600M",
    },
    {
      name: "frontend-dev",
      script: "npm",
      args: "run start -- -p 3001",
      cwd: "/var/www/frontend-dev",
      max_memory_restart: "600M",
    },
  ],
};
