import { defineConfig } from 'vite';

function rewritePrivacyRequest(req, _res, next) {
  const path = (req.url || '').split('?')[0];
  if (path === '/privacy' || path === '/privacy/') req.url = '/index.html';
  next();
}

function privacyRoute() {
  return {
    name: 'privacy-route',
    configureServer(server) {
      server.middlewares.use(rewritePrivacyRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewritePrivacyRequest);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [privacyRoute()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
