import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-local-games',
      configureServer(server) {
        server.middlewares.use('/dummy-game', (req, res, next) => {
          const fileUrl = req.url.split('?')[0];
          const resolvedPath = fileUrl === '/' ? 'index.html' : fileUrl.slice(1);
          const fullPath = path.resolve(__dirname, '../games/dummy-game', resolvedPath);
          
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            if (fullPath.endsWith('.js')) { res.setHeader('Content-Type', 'text/javascript'); }
            else if (fullPath.endsWith('.css')) { res.setHeader('Content-Type', 'text/css'); }
            else if (fullPath.endsWith('.html')) { res.setHeader('Content-Type', 'text/html'); }
            
            res.end(fs.readFileSync(fullPath));
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // Only proxy /games if there is something AFTER the slash (the actual assets)
      '^/games/.+': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
