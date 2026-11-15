import { housingChangeFields } from '../domain/policies.js';
import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerHousingRoutes(app, { query, audit, notify }) {
  app.get('/api/housing-changes', async (req,res) => {
    const user=requireUser(req);
    const changes=await query(`SELECT c.id,c.student_id,u.name AS student_name,u.email AS student_email,
      c.kind,c.reason,c.status,c.review_note,c.target_room_id,t.code AS target_room_code,
      r.code AS current_room_code,c.created_at,c.updated_at,v.name AS reviewer_name
      FROM housing_changes c JOIN users u ON u.id=c.student_id
      LEFT JOIN rooms t ON t.id=c.target_room_id
      LEFT JOIN allocations a ON a.student_id=c.student_id
      LEFT JOIN rooms r ON r.id=a.room_id
      LEFT JOIN users v ON v.id=c.reviewed_by
      WHERE ($1::varchar='staff' OR c.student_id=$2)
      ORDER BY CASE WHEN c.status='pending' THEN 0 ELSE 1 END,c.id DESC LIMIT 200`,[user.role,user.id]);
    res.json({ changes });
  });
  app.post('/api/housing-changes', async (req,res) => {
    const user=requireUser(req,'student');
    const { kind, reason, target } = housingChangeFields(req.body);
    const allocations=await query('SELECT room_id FROM allocations WHERE student_id=$1',[user.id]);
    if (!allocations.length) fail(409,'You need an active room assignment to submit a housing change.');
    if (kind==='transfer') {
      if (allocations[0].room_id===target) fail(400,'Choose a different room.');
      const rooms=await query('SELECT id FROM rooms WHERE id=$1 AND active AND occupied<capacity',[target]);
      if (!rooms.length) fail(409,'Selected room is no longer available.');
    }
    const rows=await query(`INSERT INTO housing_changes(student_id,kind,target_room_id,reason)
      VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,[user.id,kind,target,reason]);
    if (!rows.length) fail(409,'You already have a pending housing change.');
    await audit(user.id,'housing_change_requested','housing_changes',rows[0].id,`${kind} requested`);
    res.status(201).json({ id:rows[0].id });
  });
  app.post('/api/housing-changes/:id/cancel', async (req,res) => {
    const user=requireUser(req,'student');
    const id=safeId(req.params.id);
    const rows=await query(`UPDATE housing_changes SET status='cancelled',updated_at=now()
      WHERE id=$1 AND student_id=$2 AND status='pending' RETURNING id`,[id,user.id]);
    if (!rows.length) fail(409,'Only your pending request may be cancelled.');
    await audit(user.id,'housing_change_cancelled','housing_changes',id,'Student cancelled request');
    res.json({ message:'Housing change cancelled.' });
  });
  app.post('/api/housing-changes/:id/decision', async (req,res) => {
    const user=requireUser(req,'staff');
    const id=safeId(req.params.id);
    const decision=oneOf(req.body.decision,['approve','reject'],'decision');
    const note=requiredText(req.body.review_note??'','Review note',decision==='reject'?5:0,1000);
    let rows;
    if (decision==='reject') {
      rows=await query(`UPDATE housing_changes SET status='rejected',review_note=$1,reviewed_by=$2,updated_at=now()
        WHERE id=$3 AND status='pending' RETURNING id,student_id,kind`,[note,user.id,id]);
    } else {
      const request=await query('SELECT kind FROM housing_changes WHERE id=$1 AND status=$2',[id,'pending']);
      if (!request.length) fail(409,'Housing change already processed or not found.');
      if (request[0].kind==='transfer') {
        rows=await query(`WITH eligible AS MATERIALIZED (
          SELECT c.id,c.student_id,c.target_room_id,a.id AS allocation_id,a.room_id AS old_room_id
          FROM housing_changes c JOIN allocations a ON a.student_id=c.student_id
          WHERE c.id=$1 AND c.status='pending' AND c.kind='transfer' FOR UPDATE OF c,a
        ), reserved AS (
          UPDATE rooms r SET occupied=r.occupied+1 FROM eligible e
          WHERE r.id=e.target_room_id AND r.id<>e.old_room_id AND r.active=true AND r.occupied<r.capacity
          RETURNING e.student_id,e.allocation_id,e.old_room_id,r.id AS new_room_id
        ), shifted AS (
          UPDATE allocations a SET room_id=r.new_room_id,assigned_at=now(),assigned_by=$2
          FROM reserved r WHERE a.id=r.allocation_id
          RETURNING r.student_id,r.old_room_id,r.new_room_id
        ), released AS (
          UPDATE rooms r SET occupied=r.occupied-1 FROM shifted s
          WHERE r.id=s.old_room_id AND r.occupied>0
          RETURNING s.student_id,s.old_room_id,s.new_room_id
        ), tracked AS (
          INSERT INTO allocation_transfers(student_id,from_room_id,to_room_id,handled_by,change_request_id)
          SELECT student_id,old_room_id,new_room_id,$2,$1 FROM released RETURNING student_id
        ), reviewed AS (
          UPDATE housing_changes c SET status='approved',review_note=$3,reviewed_by=$2,updated_at=now()
          FROM tracked t WHERE c.id=$1 AND c.student_id=t.student_id AND c.status='pending'
          RETURNING c.id,c.student_id,c.kind
        ) SELECT * FROM reviewed`,[id,user.id,note]);
      } else {
        rows=await query(`WITH eligible AS MATERIALIZED (
          SELECT c.id,c.student_id,a.id AS allocation_id,a.room_id,a.assigned_at
          FROM housing_changes c JOIN allocations a ON a.student_id=c.student_id
          WHERE c.id=$1 AND c.status='pending' AND c.kind='checkout' FOR UPDATE OF c,a
        ), removed AS (
          DELETE FROM allocations a USING eligible e WHERE a.id=e.allocation_id
          RETURNING e.student_id,e.room_id,e.assigned_at
        ), released AS (
          UPDATE rooms r SET occupied=r.occupied-1 FROM removed d
          WHERE r.id=d.room_id AND r.occupied>0
          RETURNING d.student_id,d.room_id,d.assigned_at
        ), history AS (
          INSERT INTO allocation_history(student_id,room_id,assigned_at,checked_out_by)
          SELECT student_id,room_id,assigned_at,$2 FROM released RETURNING student_id
        ), closed AS (
          UPDATE applications a SET status='closed',updated_at=now() FROM history h
          WHERE a.student_id=h.student_id AND a.status='approved' RETURNING a.student_id
        ), reviewed AS (
          UPDATE housing_changes c SET status='approved',review_note=$3,reviewed_by=$2,updated_at=now()
          FROM history h WHERE c.id=$1 AND c.student_id=h.student_id AND c.status='pending'
          RETURNING c.id,c.student_id,c.kind
        ) SELECT * FROM reviewed`,[id,user.id,note]);
      }
    }
    if (!rows?.length) fail(409,'Cannot process this request. Check current assignment and room availability.');
    await audit(user.id,decision==='approve'?'housing_change_approved':'housing_change_rejected',
      'housing_changes',id,`${rows[0].kind} ${decision}d`);
    await notify(rows[0].student_id,'Housing change reviewed',
      `Your ${rows[0].kind==='transfer'?'room transfer':'move-out'} request has been ${decision==='approve'?'approved':'declined'}.`,
      'housing_changes',id);
    res.json({ message:'Housing change reviewed.' });
  });
}
