import { announcementFields } from '../domain/policies.js';
import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerAnnouncementsRoutes(app, { query, audit, notify }) {
  // Residence announcements are visible to all students or to current residents
  // of one building. Staff can see archived notices for management purposes.
  app.get('/api/announcements', async (req, res) => {
    const user = requireUser(req);
    const announcements = await query(`SELECT n.id,n.title,n.body,n.audience,n.building,
      n.pinned,n.status,n.expires_at,n.created_at,n.updated_at,u.name AS author_name
      FROM announcements n JOIN users u ON u.id=n.created_by
      WHERE $1::varchar='staff' OR (
        n.status='published' AND (n.expires_at IS NULL OR n.expires_at>now())
        AND (n.audience='all' OR EXISTS (
          SELECT 1 FROM allocations a JOIN rooms r ON r.id=a.room_id
          WHERE a.student_id=$2 AND r.building=n.building
        ))
      ) ORDER BY n.pinned DESC,n.created_at DESC LIMIT 150`, [user.role,user.id]);
    res.json({ announcements });
  });
  app.post('/api/announcements', async (req,res) => {
    const user = requireUser(req,'staff');
    const [title,body,audience,building,pinned,expires] = announcementFields(req.body);
    const rows = await query(`INSERT INTO announcements(title,body,audience,building,pinned,expires_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [title,body,audience,building,pinned,expires,user.id]);
    await audit(user.id,'announcement_published','announcements',rows[0].id,`Published ${title}`);
    res.status(201).json({ id:rows[0].id });
  });
  app.put('/api/announcements/:id', async (req,res) => {
    const user = requireUser(req,'staff');
    const id = safeId(req.params.id);
    const [title,body,audience,building,pinned,expires] = announcementFields(req.body);
    const rows = await query(`UPDATE announcements SET title=$1,body=$2,audience=$3,building=$4,
      pinned=$5,expires_at=$6,updated_at=now() WHERE id=$7 RETURNING id`,
      [title,body,audience,building,pinned,expires,id]);
    if (!rows.length) fail(404,'Announcement not found.');
    await audit(user.id,'announcement_updated','announcements',id,`Updated ${title}`);
    res.json({ message:'Announcement updated.' });
  });
  app.post('/api/announcements/:id/status', async (req,res) => {
    const user = requireUser(req,'staff');
    const id = safeId(req.params.id);
    const status = oneOf(req.body.status,['published','archived'],'announcement status');
    const rows = await query(`UPDATE announcements SET status=$1,updated_at=now()
      WHERE id=$2 AND ($1::varchar='archived' OR expires_at IS NULL OR expires_at>now())
      RETURNING id,title`, [status,id]);
    if (!rows.length) fail(409,'Announcement not found or expired. Edit its expiry before republishing.');
    await audit(user.id,'announcement_status_changed','announcements',id,`${status}: ${rows[0].title}`);
    res.json({ message:'Announcement status updated.' });
  });
}
