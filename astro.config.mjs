import { defineConfig } from 'astro/config';
import fs from 'fs';
import path from 'path';

const subProjects = ['fractured-jukebox', 'lissajous', 'sound-synth', 'resonator', 'karplus-strong', 'intervals'];

// Redirects from old paths to new paths
const redirects = {
  '/fractals/': '/apps/fractured-jukebox/',
};

// Astro integration to serve sub-project index.html files in dev mode
function serveSubProjectsIntegration() {
  return {
    name: 'serve-sub-projects',
    hooks: {
      'astro:server:setup': ({ server }) => {
        // Insert at the beginning of middleware stack
        server.middlewares.stack.unshift({
          route: '',
          handle: (req, res, next) => {
            const url = req.url || '';

            // Handle redirects
            for (const [from, to] of Object.entries(redirects)) {
              if (url === from || url === from.slice(0, -1)) {
                res.writeHead(301, { Location: to });
                res.end();
                return;
              }
            }

            for (const project of subProjects) {
              // Serve apps from /apps/{project}/
              if (url === `/apps/${project}/` || url === `/apps/${project}`) {
                const indexPath = path.join(process.cwd(), 'public', 'apps', project, 'index.html');
                if (fs.existsSync(indexPath)) {
                  res.setHeader('Content-Type', 'text/html');
                  fs.createReadStream(indexPath).pipe(res);
                  return;
                }
              }
            }

            next();
          }
        });
      }
    }
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://erathe.github.io',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  build: {
    assets: '_astro'
  },
  integrations: [serveSubProjectsIntegration()]
});
