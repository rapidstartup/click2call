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
      WIDGET_CALL_TOKEN_SECRET: process.env.WIDGET_CALL_TOKEN_SECRET,
      TURNSTILE_SECRET: process.env.TURNSTILE_SECRET,
      WIDGET_HOSTED_HOSTNAMES: process.env.WIDGET_HOSTED_HOSTNAMES || "click2call.ai",
      VITE_SOCKET_SERVER_URL: process.env.VITE_SOCKET_SERVER_URL || "https://io.click2call.ai:3002"
    }
  }]
};
