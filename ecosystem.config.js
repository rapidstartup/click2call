module.exports = {
  apps: [{
    name: "click2call-server",
    script: "./dist/index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3002,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_SERVICE_KEY: process.env.VITE_SUPABASE_SERVICE_KEY,
      VITE_SOCKET_SERVER_URL: process.env.VITE_SOCKET_SERVER_URL || "https://io.click2call.ai:3002"
    }
  }]
}; 