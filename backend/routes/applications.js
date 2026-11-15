import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerApplicationsRoutes(app, { query, audit, notify }) {
  app.get('/api/applications', async (req, res) => {
    const user = requireUser(req);
    const applications = await query(`SELECT a.id,a.student_id,u.name AS student_name,u.email AS student_email,
      a.note,a.status,a.withdrawn,a.preferred_room_id,p.code AS preferred_room_code,
      a.review_note,a.created_at,a.updated_at,r.code AS assigned_room
      FROM applications a JOIN users u ON u.id=a.student_id
      LEFT JOIN rooms p ON p.id=a.preferred_room_id
      LEFT JOIN allocations al ON al.student_id=a.student_id
      LEFT JOIN rooms r ON r.id=al.room_id
      WHERE ($1::varchar='staff' OR a.student_id=$2) ORDER BY a.id DESC`, [user.role,user.id]);
    res.json({ applications });
  });
  app.post('/api/applications', async (req, res) => {
    const user = requireUser(req, 'student');
    const note = req.body.note === undefined ? '' : requiredText(req.body.note, 'Note', 0, MAX_NOTES);
    const preferred = optionalId(req.body.preferred_room_id);
    if (preferred !== null) {
      const available = await query('SELECT id FROM rooms WHERE id=$1 AND active=true', [preferred]);
      if (!available.length) fail(400, 'Preferred room is not active.');
    }
    const rows = await query(`INSERT INTO applications(student_id,note,preferred_room_id)
      SELECT $1,$2,$3 WHERE NOT EXISTS (SELECT 1 FROM allocations WHERE student_id=$1)
      ON CONFLICT DO NOTHING RETURNING id`, [user.id,note,preferred]);
    if (!rows.length) fail(409, 'You already have an active application or a room assignment.');
    await audit(user.id, 'application_submitted', 'applications', rows[0].id, 'Accommodation application submitted');
    res.status(201).json({ id:rows[0].id });
  });
  app.post('/api/applications/:id/cancel', async (req, res) => {
    const user = requireUser(req, 'student');
    const id = safeId(req.params.id);
    const rows = await query(`UPDATE applications SET status='closed',withdrawn=true,updated_at=now()
      WHERE id=$1 AND student_id=$2 AND status='pending' RETURNING id`, [id,user.id]);
    if (!rows.length) fail(409, 'Only your pending application can be withdrawn.');
    await audit(user.id, 'application_withdrawn', 'applications', id, 'Student withdrew application');
    res.json({ message: 'Application withdrawn.' });
  });
  app.post('/api/applications/:id/decision', async (req, res) => {
    const user = requireUser(req, 'staff');
    const id = safeId(req.params.id);
    const decision = oneOf(req.body.decision, ['approve', 'reject'], 'decision');
    const note = req.body.review_note === undefined ? '' : requiredText(req.body.review_note, 'Review note', 0, MAX_NOTES);
    let rows;
    if (decision === 'reject') {
      if (note.length < 3) fail(400, 'Give a brief reason for rejection.');
      rows = await query(`UPDATE applications SET status='rejected',reviewer_id=$1,
        review_note=$2,updated_at=now() WHERE id=$3 AND status='pending' RETURNING id,student_id`, [user.id,note,id]);
    } else {
      const roomId = safeId(req.body.room_id);
      // One atomic statement: lock the pending application, reserve capacity,
      // allocate the bed and approve. Unique keys guard against double assignments.
      rows = await query(`WITH eligible AS (
        SELECT a.id,a.student_id FROM applications a
        WHERE a.id=$1 AND a.status='pending'
          AND NOT EXISTS(SELECT 1 FROM allocations WHERE student_id=a.student_id)
        FOR UPDATE
      ), reserved AS (
        UPDATE rooms r SET occupied=r.occupied+1 FROM eligible e
        WHERE r.id=$2 AND r.active=true AND r.occupied<r.capacity
        RETURNING e.student_id,r.id AS room_id
      ), assigned AS (
        INSERT INTO allocations(student_id,room_id,assigned_by)
        SELECT student_id,room_id,$3 FROM reserved RETURNING student_id
      ), reviewed AS (
        UPDATE applications a SET status='approved',reviewer_id=$3,
          review_note=$4,updated_at=now() FROM assigned
        WHERE a.id=$1 AND a.student_id=assigned.student_id AND a.status='pending'
        RETURNING a.id,a.student_id
      ) SELECT id,student_id FROM reviewed`, [id,roomId,user.id,note]);
    }
    if (!rows.length) fail(409, 'Application already reviewed, student allocated, or room inactive/full.');
    await audit(user.id, decision === 'approve' ? 'application_approved' : 'application_rejected', 'applications', id,
      decision === 'approve' ? 'Application approved and room assigned' : 'Application rejected');
    await notify(rows[0].student_id, decision === 'approve' ? 'Accommodation approved' : 'Application reviewed',
      decision === 'approve' ? 'Your room assignment is now available.' : 'Your application was not approved. See the review note.',
      'applications', id);
    res.json({ message: 'Application reviewed.' });
  });
}
