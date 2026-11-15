import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerNotificationsRoutes(app, { query, audit, notify }) {
  app.get('/api/notifications', async (req, res) => {
    const user = requireUser(req);
    const notifications = await query(`SELECT id,title,body,target_type,target_id,read_at,created_at
      FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 50`, [user.id]);
    res.json({ notifications });
  });
  app.post('/api/notifications/:id/read', async (req, res) => {
    const user = requireUser(req);
    const id = safeId(req.params.id);
    const rows = await query(`UPDATE notifications SET read_at=COALESCE(read_at,now())
      WHERE id=$1 AND user_id=$2 RETURNING id`, [id,user.id]);
    if (!rows.length) fail(404, 'Notification not found.');
    res.json({ message:'Notification read.' });
  });
  app.post('/api/notifications/read-all', async (req, res) => {
    const user = requireUser(req);
    await query(`UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL`, [user.id]);
    res.json({ message:'Notifications marked as read.' });
  });
}
