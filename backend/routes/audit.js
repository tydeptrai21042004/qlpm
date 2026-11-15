import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerAuditRoutes(app, { query, audit, notify }) {
  app.get('/api/audit', async (req, res) => {
    requireUser(req, 'staff');
    const events = await query(`SELECT e.id,e.action,e.entity,e.entity_id,e.summary,e.created_at,
      COALESCE(u.name,'System') AS actor_name FROM audit_events e
      LEFT JOIN users u ON u.id=e.actor_id ORDER BY e.id DESC LIMIT 100`);
    res.json({ events });
  });
}
