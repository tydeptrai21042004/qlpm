import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerAllocationsRoutes(app, { query, audit, notify }) {
  app.get('/api/allocations', async (req, res) => {
    const user = requireUser(req);
    const allocations = await query(`SELECT a.id,a.student_id,u.name AS student_name,
      a.room_id,r.code AS room_code,r.building,r.floor,a.assigned_at
      FROM allocations a JOIN users u ON u.id=a.student_id JOIN rooms r ON r.id=a.room_id
      WHERE ($1::varchar='staff' OR a.student_id=$2) ORDER BY a.id DESC`, [user.role,user.id]);
    res.json({ allocations });
  });
  app.delete('/api/allocations/:id', async (req, res) => {
    const user = requireUser(req, 'staff');
    const id = safeId(req.params.id);
    // Preserve checkout history while atomically releasing the occupied bed.
    const rows = await query(`WITH removed AS (
      DELETE FROM allocations WHERE id=$1 RETURNING student_id,room_id,assigned_at
    ), released AS (
      UPDATE rooms r SET occupied=r.occupied-1 FROM removed
      WHERE r.id=removed.room_id AND r.occupied>0
      RETURNING removed.student_id,removed.room_id,removed.assigned_at
    ), historical AS (
      INSERT INTO allocation_history(student_id,room_id,assigned_at,checked_out_by)
      SELECT student_id,room_id,assigned_at,$2 FROM released RETURNING student_id
    ), closed AS (
      UPDATE applications a SET status='closed',updated_at=now() FROM historical
      WHERE a.student_id=historical.student_id AND a.status='approved' RETURNING a.id
    ), cancelled_changes AS (
      UPDATE housing_changes c SET status='cancelled',updated_at=now(),
        review_note='Assignment ended by residence staff',reviewed_by=$2
      FROM historical h WHERE c.student_id=h.student_id AND c.status='pending' RETURNING c.id
    ) SELECT historical.student_id,(SELECT id FROM closed LIMIT 1) AS application_id FROM historical`, [id,user.id]);
    if (!rows.length) fail(404, 'Allocation not found.');
    await audit(user.id, 'student_checked_out', 'allocations', id, 'Room assignment ended');
    if (rows[0].application_id) await notify(rows[0].student_id, 'Check-out recorded', 'Your room assignment has ended.', 'applications', rows[0].application_id);
    res.json({ message: 'Student checked out.' });
  });
  app.get('/api/allocations/history', async (req, res) => {
    requireUser(req, 'staff');
    const history = await query(`SELECT h.id,u.name AS student_name,r.code AS room_code,
      h.assigned_at,h.checked_out_at,s.name AS checked_out_by
      FROM allocation_history h JOIN users u ON u.id=h.student_id
      JOIN rooms r ON r.id=h.room_id JOIN users s ON s.id=h.checked_out_by
      ORDER BY h.id DESC LIMIT 100`);
    res.json({ history });
  });
}
