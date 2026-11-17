import { newTicketFields, ticketUpdateFields } from '../domain/policies.js';
import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerRequestsRoutes(app, { query, audit, notify }) {
  app.get('/api/requests', async (req, res) => {
    const user = requireUser(req);
    const requests = await query(`SELECT r.id,r.student_id,u.name AS student_name,
      r.category,r.title,r.description,r.status,r.priority,r.assigned_to,
      s.name AS assignee_name,r.resolution_note,r.resolved_at,r.created_at,r.updated_at,f.rating AS feedback_rating,f.comment AS feedback_comment
      FROM requests r JOIN users u ON u.id=r.student_id
      LEFT JOIN users s ON s.id=r.assigned_to
      LEFT JOIN service_feedback f ON f.request_id=r.id
      WHERE ($1::varchar='staff' OR r.student_id=$2) ORDER BY r.id DESC`, [user.role,user.id]);
    res.json({ requests });
  });
  app.post('/api/requests', async (req, res) => {
    const user = requireUser(req, 'student');
    const { category, priority, title, description } = newTicketFields(req.body);
    const rows = await query(`INSERT INTO requests(student_id,category,priority,title,description)
      VALUES($1,$2,$3,$4,$5) RETURNING id`, [user.id,category,priority,title,description]);
    // Inform each on-duty residence officer in-app; only the originating
    // student can read their own ticket or personal messages.
    try {
      await query(`INSERT INTO notifications(user_id,title,body,target_type,target_id)
        SELECT id,'New resident request',$1,'requests',$2 FROM users WHERE role='staff'`,
        [`${title.slice(0,85)} · request #${rows[0].id}`,rows[0].id]);
    } catch(error) { console.error('Staff notification failed:',error); }
    await audit(user.id, 'request_submitted', 'requests', rows[0].id, `Submitted ${category} request`);
    res.status(201).json({ id:rows[0].id });
  });
  // Feedback mirrors the one-stop service's satisfaction flow: only the
  // owner of a resolved request can leave a single evaluation.
  app.post('/api/requests/:id/feedback', async (req,res) => {
    const user=requireUser(req,'student');
    const id=safeId(req.params.id);
    const rating=integer(req.body.rating,'Rating',1,5);
    const comment=req.body.comment===undefined?'':requiredText(req.body.comment,'Comment',0,500);
    const result=await query(`INSERT INTO service_feedback(request_id,student_id,rating,comment)
      SELECT r.id,$2,$3,$4 FROM requests r
      WHERE r.id=$1 AND r.student_id=$2 AND r.status='resolved'
      ON CONFLICT(request_id) DO NOTHING RETURNING id`,[id,user.id,rating,comment]);
    if(!result.length)fail(409,'Request must be resolved, owned by you and not already rated.');
    await audit(user.id,'service_rated','requests',id,`Feedback rating ${rating}/5`);
    res.status(201).json({message:'Thank you for your feedback.'});
  });
  app.patch('/api/requests/:id', async (req, res) => {
    const user = requireUser(req, 'staff');
    const id = safeId(req.params.id);
    const { status, priority, assignedTo: assignee, resolutionNote } = ticketUpdateFields(req.body);
    if (assignee !== null) {
      const assignees = await query(`SELECT id FROM users WHERE id=$1 AND role='staff'`, [assignee]);
      if (!assignees.length) fail(400, 'Assignee must be a staff member.');
    }
    const rows = await query(`UPDATE requests SET status=$1,priority=$2,assigned_to=$3,
      resolution_note=CASE WHEN $1='resolved' THEN $4 ELSE '' END,
      updated_by=$5,updated_at=now(),
      resolved_at=CASE WHEN $1='resolved' THEN COALESCE(resolved_at,now()) ELSE NULL END
      WHERE id=$6 RETURNING id,student_id`, [status,priority,assignee,resolutionNote,user.id,id]);
    if (!rows.length) fail(404, 'Request not found.');
    await audit(user.id, 'request_updated', 'requests', id, `Request status: ${status}; priority: ${priority}`);
    await notify(rows[0].student_id, 'Request updated', `Your service request #${id} is now ${status.replace('_',' ')}.`, 'requests', id);
    res.json({ message: 'Request updated.' });
  });
  app.get('/api/requests/:id/messages', async (req, res) => {
    const user = requireUser(req);
    const id = safeId(req.params.id);
    const allowed = await query(`SELECT id FROM requests WHERE id=$1 AND ($2='staff' OR student_id=$3)`,
      [id,user.role,user.id]);
    if (!allowed.length) fail(404, 'Request not found.');
    const messages = await query(`SELECT m.id,m.message,m.created_at,u.name AS author_name,u.role AS author_role
      FROM request_messages m JOIN users u ON u.id=m.author_id
      WHERE m.request_id=$1 ORDER BY m.id ASC LIMIT 200`, [id]);
    res.json({ messages });
  });
  app.post('/api/requests/:id/messages', async (req, res) => {
    const user = requireUser(req);
    const id = safeId(req.params.id);
    const message = requiredText(req.body.message, 'Message', 2, MAX_NOTES);
    const owner = await query(`SELECT student_id,status FROM requests
      WHERE id=$1 AND ($2='staff' OR student_id=$3)`, [id,user.role,user.id]);
    if (!owner.length) fail(404, 'Request not found.');
    const saved = await query(`INSERT INTO request_messages(request_id,author_id,message)
      VALUES($1,$2,$3) RETURNING id`, [id,user.id,message]);
    await query(`UPDATE requests SET updated_at=now() WHERE id=$1`, [id]);
    if (user.role === 'staff') {
      await notify(owner[0].student_id, 'New reply from residence office', `A staff member replied to request #${id}.`, 'requests', id);
    }
    res.status(201).json({ id:saved[0].id });
  });
}
