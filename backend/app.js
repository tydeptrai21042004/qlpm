import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as neonAdapter from './db/index.js';
import { createRequestContext } from './lib/context.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerRoomsRoutes } from './routes/rooms.js';
import { registerPeopleRoutes } from './routes/people.js';
import { registerApplicationsRoutes } from './routes/applications.js';
import { registerAllocationsRoutes } from './routes/allocations.js';
import { registerAnnouncementsRoutes } from './routes/announcements.js';
import { registerHousingRoutes } from './routes/housing.js';
import { registerRequestsRoutes } from './routes/requests.js';
import { registerNotificationsRoutes } from './routes/notifications.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerRoomInspectionsRoutes } from './routes/room-inspections.js';
import { registerEvidenceRoutes } from './routes/evidence.js';
import { ApiError } from './lib/validation.js';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Dependencies are injectable for API-contract tests; production uses Neon.
export function createApp(adapter = neonAdapter) {
  const app = express();
  const { ensureDatabase, query, passwordHash } = adapter;
  const { loadUser, audit, notify } = createRequestContext({ query });
  const context = { query, audit, notify, passwordHash };
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb', strict: true }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    res.set('X-Frame-Options', 'DENY');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      const host = req.get('host');
      if (origin && origin !== `https://${host}` && origin !== `http://${host}`) {
        return res.status(403).json({ error: 'Cross-origin request blocked.' });
      }
      // Requests without Origin (CLI clients) still require authentication and permissions.
    }
    next();
  });

  // Liveness is intentionally independent of the database so Vercel's process can be probed.
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'campus-housing-api' }));
  // Readiness verifies the deployed database connection and schema.
  app.get('/api/ready', async (_req, res, next) => {
    try {
      await ensureDatabase();
      await query('SELECT 1 AS ready');
      res.json({ ok: true, database: 'ready' });
    } catch (error) { next(error); }
  });
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.path !== '/auth/logout' && !/^\/evidence\/\d+\/file$/.test(req.path)) {
      if (!req.is('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json.' });
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Expected a JSON object.' });
      }
    }
    next();
  });
  app.use('/api', async (req, res, next) => {
    try { await ensureDatabase(); req.user = await loadUser(req); next(); }
    catch (error) { next(error); }
  });

  app.get('/api/me', (req, res) => res.json({ user: req.user }));

  registerAuthRoutes(app, context);
  registerRoomsRoutes(app, context);
  registerPeopleRoutes(app, context);
  registerApplicationsRoutes(app, context);
  registerAllocationsRoutes(app, context);
  registerAnnouncementsRoutes(app, context);
  registerHousingRoutes(app, context);
  registerRequestsRoutes(app, context);
  registerNotificationsRoutes(app, context);
  registerAuditRoutes(app, context);
  registerRoomInspectionsRoutes(app, context);
  registerEvidenceRoutes(app, context);

  app.use('/api', (_req, res) => res.status(404).json({ error:'API endpoint not found.' }));
  app.use(express.static(PUBLIC, { index:'index.html', dotfiles:'deny' }));
  app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
  app.use((error, _req, res, _next) => {
    if (error instanceof ApiError || (error.status && error.status >= 400 && error.status <= 499)) {
      return res.status(error.status).json({ error:error.message });
    }
    if (['23505','23514','23503','23502'].includes(error.code)) {
      return res.status(409).json({ error:'Conflicting or invalid record.' });
    }
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error:'Invalid JSON body.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error:'Request body too large.' });
    console.error('Unexpected API error:', error);
    return res.status(500).json({ error:'Unexpected server error. Check the deployment logs.' });
  });
  return app;
}
