const fs = require('fs');
const path = require('path');

// Load ../.env so Forge/PM2 restarts keep Supabase credentials even without shell export
function loadEnvFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env) || !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (e) {
    // ignore missing file; PM2 may still inject env
  }
}

loadEnvFile(path.resolve(__dirname, '../.env'));
loadEnvFile(path.resolve(__dirname, '.env'));

module.exports = {
  apps: [{
    name: "click2call-server",
    script: "./dist/index.js",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    // Ubuntu 18.04 host: pin to system Node 16 (Node 18+ prebuilds need GLIBC_2.28)
    interpreter: process.env.NODE_BINARY || "/usr/local/bin/node",
    env: {
      NODE_ENV: process.env.NODE_ENV || "production",
      PORT: process.env.PORT || 3002,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_SERVICE_KEY: process.env.VITE_SUPABASE_SERVICE_KEY,
      VITE_SOCKET_SERVER_URL: process.env.VITE_SOCKET_SERVER_URL || "https://io.click2call.ai"
    }
  }]
};
