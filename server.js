import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { ensureDatabase, query, passwordHash } from './db/index.js';

const app = express();
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_NOTES = 1000;
const CATEGORIES = ['maintenance', 'cleaning', 'other'];
const PRIORITIES = ['low', 'normal', 'high'];
const REQUEST_STATES = ['open', 'in_progress', 'resolved'];
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

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

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function fail(status, message) { throw new ApiError(status, message); }
function requiredText(value, label, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    fail(400, `${label} must contain ${min}-${max} characters.`);
  }
  return value.trim();
}
function safeId(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) fail(400, 'Invalid ID.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) fail(400, 'Invalid ID.');
  return number;
}
function optionalId(value) { return value == null || value === '' ? null : safeId(value); }
function integer(value, label, min, max) {
  const number = Number(value);
  if (typeof value === 'boolean' || value === '' || value === null || !Number.isInteger(number) || number < min || number > max) {
    fail(400, `${label} must be an integer from ${min} to ${max}.`);
  }
  return number;
}
function oneOf(value, options, label) {
  if (!options.includes(value)) fail(400, `Invalid ${label}.`);
  return value;
}
function validEmail(value) {
  return typeof value === 'string' && value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validPassword(password, min = 8) {
  return typeof password === 'string' && password.length >= min && password.length <= 128 && /[a-z]/i.test(password) && /\d/.test(password);
}
function verifyPassword(candidate, stored) {
  try {
    const [method, salt, digest] = stored.split(':');
    if (method !== 'scrypt') return false;
    const expected = Buffer.from(digest, 'hex');
    const actual = scryptSync(candidate, salt, 64);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
function parseCookies(req) {
  const parsed = Object.create(null);
  for (const item of (req.get('cookie') || '').split(';')) {
    const separator = item.indexOf('=');
    if (separator >= 0) parsed[item.slice(0, separator).trim()] = item.slice(separator + 1).trim();
  }
  return parsed;
}
function sessionCookie(value, req, maxAge = SESSION_SECONDS) {
  const secure = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production' || req.secure;
  return `session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
function requireUser(req, role) {
  if (!req.user) fail(401, 'Please sign in.');
  if (role && req.user.role !== role) fail(403, 'Not permitted for your role.');
  return req.user;
}
async function loadUser(req) {
  const token = parseCookies(req).session;
  if (!token || !/^[0-9a-f]{96}$/.test(token)) return null;
  const rows = await query(`SELECT u.id,u.name,u.email,u.role FROM sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at > now()`, [tokenHash(token)]);
  return rows[0] || null;
}
// Audit/notification writes are secondary to the core transaction. They must not
// turn a successfully saved action into an apparent failure on the client.
async function sideEffect(statement, params) {
  try { await query(statement, params); }
  catch (error) { console.error('Supplementary record failed:', error); }
}
function audit(actor, action, entity, entityId, summary) {
  return sideEffect(`INSERT INTO audit_events(actor_id,action,entity,entity_id,summary)
    VALUES($1,$2,$3,$4,$5)`, [actor, action, entity, entityId, summary]);
}
function notify(studentId, title, body, targetType, targetId) {
  return sideEffect(`INSERT INTO notifications(user_id,title,body,target_type,target_id)
    VALUES($1,$2,$3,$4,$5)`, [studentId,title,body,targetType,targetId]);
}

app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.path !== '/auth/logout') {
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

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/me', (req, res) => res.json({ user: req.user }));

app.post('/api/auth/register', async (req, res) => {
  const name = requiredText(req.body.name, 'Name', 2, 80);
  const email = requiredText(req.body.email, 'Email', 5, 160).toLowerCase();
  if (!validEmail(email)) fail(400, 'Invalid email address.');
  if (!validPassword(req.body.password)) fail(400, 'Use 8-128 password characters, including letters and digits.');
  const rows = await query(`INSERT INTO users(name,email,password_hash,role)
    VALUES($1,$2,$3,'student') ON CONFLICT (email) DO NOTHING RETURNING id`,
  [name, email, passwordHash(req.body.password)]);
  if (!rows.length) fail(409, 'Email already registered.');
  res.status(201).json({ message: 'Account created. Sign in to continue.' });
});

app.post('/api/auth/login', async (req, res) => {
  const email = requiredText(req.body.email, 'Email', 3, 160).toLowerCase();
  const password = req.body.password;
  if (typeof password !== 'string' || !password.length || password.length > 200) fail(400, 'Password is required.');
  const locked = await query('SELECT locked_until FROM login_attempts WHERE email=$1 AND locked_until > now()', [email]);
  if (locked.length) fail(429, 'Too many failed attempts. Try again in 15 minutes.');
  const rows = await query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    await query(`INSERT INTO login_attempts(email,attempts,updated_at) VALUES($1,1,now())
      ON CONFLICT(email) DO UPDATE SET
        attempts=CASE WHEN login_attempts.updated_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
        locked_until=CASE WHEN login_attempts.updated_at >= now()-interval '15 minutes' AND login_attempts.attempts>=4
          THEN now()+interval '15 minutes' ELSE NULL END,
        updated_at=now()`, [email]);
    fail(401, 'Invalid email or password.');
  }
  await query('DELETE FROM login_attempts WHERE email=$1', [email]);
  const token = randomBytes(48).toString('hex');
  await query(`INSERT INTO sessions(token_hash,user_id,expires_at)
    VALUES($1,$2,now() + interval '8 hours')`, [tokenHash(token), user.id]);
  res.set('Set-Cookie', sessionCookie(token, req));
  res.json({ user: { id:user.id, name:user.name, email:user.email, role:user.role } });
});

app.post('/api/auth/logout', async (req, res) => {
  const token = parseCookies(req).session;
  if (token && /^[0-9a-f]{96}$/.test(token)) {
    await query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(token)]);
  }
  res.set('Set-Cookie', sessionCookie('', req, 0));
  res.json({ message: 'Signed out.' });
});

app.patch('/api/me', async (req, res) => {
  const user = requireUser(req);
  const name = requiredText(req.body.name, 'Name', 2, 80);
  await query('UPDATE users SET name=$1 WHERE id=$2', [name, user.id]);
  res.json({ user: { ...user, name } });
});

app.post('/api/me/password', async (req, res) => {
  const user = requireUser(req);
  const current = req.body.current_password;
  const next = req.body.new_password;
  if (typeof current !== 'string' || !validPassword(next, 10)) fail(400, 'New password must contain 10-128 characters with letters and digits.');
  if (current === next) fail(400, 'Choose a different password.');
  const rows = await query('SELECT password_hash FROM users WHERE id=$1', [user.id]);
  if (!verifyPassword(current, rows[0].password_hash)) fail(403, 'Current password is incorrect.');
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash(next), user.id]);
  const currentToken = parseCookies(req).session;
  await query('DELETE FROM sessions WHERE user_id=$1 AND token_hash <> $2', [user.id, tokenHash(currentToken)]);
  await audit(user.id, 'password_changed', 'users', user.id, 'Account password updated');
  res.json({ message: 'Password updated. Other sessions have been signed out.' });
});

app.get('/api/rooms', async (req, res) => {
  requireUser(req);
  const rooms = await query(`SELECT id,code,building,floor,capacity,active,occupied,
    capacity-occupied AS available FROM rooms ORDER BY building,floor,code`);
  res.json({ rooms });
});
app.post('/api/rooms', async (req, res) => {
  const user = requireUser(req, 'staff');
  const code = requiredText(req.body.code, 'Room code', 1, 20).toUpperCase();
  const building = requiredText(req.body.building, 'Building', 1, 40);
  const floor = integer(req.body.floor, 'Floor', 0, 100);
  const capacity = integer(req.body.capacity, 'Capacity', 1, 20);
  const rows = await query(`INSERT INTO rooms(code,building,floor,capacity)
    VALUES($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING RETURNING id`, [code,building,floor,capacity]);
  if (!rows.length) fail(409, 'Room code already exists.');
  await audit(user.id, 'room_created', 'rooms', rows[0].id, `Added room ${code} with ${capacity} beds`);
  res.status(201).json({ id:rows[0].id });
});
app.put('/api/rooms/:id', async (req, res) => {
  const user = requireUser(req, 'staff');
  const id = safeId(req.params.id);
  const capacity = integer(req.body.capacity, 'Capacity', 1, 20);
  if (typeof req.body.active !== 'boolean') fail(400, 'Active must be true or false.');
  const building = has(req.body, 'building') ? requiredText(req.body.building, 'Building', 1, 40) : null;
  const floor = has(req.body, 'floor') ? integer(req.body.floor, 'Floor', 0, 100) : null;
  const rows = await query(`UPDATE rooms SET capacity=$1,active=$2,building=COALESCE($4,building),floor=COALESCE($5,floor)
    WHERE id=$3 AND occupied<=$1 AND ($2::boolean OR occupied=0) RETURNING id,code`,
  [capacity,req.body.active,id,building,floor]);
  if (!rows.length) {
    const exists = await query('SELECT id FROM rooms WHERE id=$1', [id]);
    if (!exists.length) fail(404, 'Room not found.');
    fail(409, 'Capacity cannot fall below occupancy; occupied rooms cannot be deactivated.');
  }
  await audit(user.id, 'room_updated', 'rooms', id, `Updated room ${rows[0].code}`);
  res.json({ message: 'Room updated.' });
});

app.get('/api/students', async (req, res) => {
  requireUser(req, 'staff');
  const students = await query(`SELECT u.id,u.name,u.email,u.created_at,r.code AS room_code,
    a.id AS allocation_id FROM users u
    LEFT JOIN allocations a ON a.student_id=u.id
    LEFT JOIN rooms r ON r.id=a.room_id
    WHERE u.role='student' ORDER BY u.name,u.id`);
  res.json({ students });
});
app.get('/api/staff', async (req, res) => {
  requireUser(req, 'staff');
  const staff = await query(`SELECT id,name FROM users WHERE role='staff' ORDER BY name`);
  res.json({ staff });
});
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
function announcementFields(body) {
  const title = requiredText(body.title,'Title',4,120);
  const text = requiredText(body.body,'Body',10,3000);
  const audience = oneOf(body.audience,['all','building'],'audience');
  const building = audience==='building' ? requiredText(body.building,'Building',1,40) : null;
  const pinned = body.pinned === true;
  const expiry = body.expires_at ? new Date(body.expires_at) : null;
  if (expiry && (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now())) {
    fail(400,'Expiry must be a valid future date.');
  }
  return [title,text,audience,building,pinned,expiry?.toISOString()||null];
}
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

app.get('/api/rooms/:id/residents', async (req,res) => {
  requireUser(req,'staff');
  const id = safeId(req.params.id);
  const rooms = await query('SELECT id,code,building,floor,capacity,occupied,active FROM rooms WHERE id=$1',[id]);
  if (!rooms.length) fail(404,'Room not found.');
  const residents = await query(`SELECT a.id AS allocation_id,u.id AS student_id,u.name,u.email,a.assigned_at
    FROM allocations a JOIN users u ON u.id=a.student_id
    WHERE a.room_id=$1 ORDER BY u.name`,[id]);
  res.json({ room:rooms[0],residents });
});

// One pending accommodation change per resident. Final approval is an atomic
// database statement that updates both bed counters and the allocation.
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
  const kind=oneOf(req.body.kind,['transfer','checkout'],'change type');
  const reason=requiredText(req.body.reason,'Reason',8,1000);
  const target=kind==='transfer'?safeId(req.body.target_room_id):null;
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

app.get('/api/requests', async (req, res) => {
  const user = requireUser(req);
  const requests = await query(`SELECT r.id,r.student_id,u.name AS student_name,
    r.category,r.title,r.description,r.status,r.priority,r.assigned_to,
    s.name AS assignee_name,r.resolution_note,r.resolved_at,r.created_at,r.updated_at
    FROM requests r JOIN users u ON u.id=r.student_id
    LEFT JOIN users s ON s.id=r.assigned_to
    WHERE ($1::varchar='staff' OR r.student_id=$2) ORDER BY r.id DESC`, [user.role,user.id]);
  res.json({ requests });
});
app.post('/api/requests', async (req, res) => {
  const user = requireUser(req, 'student');
  const category = oneOf(req.body.category, CATEGORIES, 'category');
  const priority = oneOf(req.body.priority || 'normal', PRIORITIES, 'priority');
  const title = requiredText(req.body.title, 'Title', 3, 120);
  const description = requiredText(req.body.description, 'Description', 5, MAX_NOTES);
  const rows = await query(`INSERT INTO requests(student_id,category,priority,title,description)
    VALUES($1,$2,$3,$4,$5) RETURNING id`, [user.id,category,priority,title,description]);
  await audit(user.id, 'request_submitted', 'requests', rows[0].id, `Submitted ${category} request`);
  res.status(201).json({ id:rows[0].id });
});
app.patch('/api/requests/:id', async (req, res) => {
  const user = requireUser(req, 'staff');
  const id = safeId(req.params.id);
  const status = oneOf(req.body.status, REQUEST_STATES, 'request status');
  const priority = oneOf(req.body.priority || 'normal', PRIORITIES, 'priority');
  const assignee = optionalId(req.body.assigned_to);
  const resolutionNote = req.body.resolution_note === undefined ? '' : requiredText(req.body.resolution_note, 'Resolution note', 0, MAX_NOTES);
  if (status === 'resolved' && resolutionNote.length < 5) fail(400, 'Add a resolution note (at least 5 characters).');
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
app.get('/api/audit', async (req, res) => {
  requireUser(req, 'staff');
  const events = await query(`SELECT e.id,e.action,e.entity,e.entity_id,e.summary,e.created_at,
    COALESCE(u.name,'System') AS actor_name FROM audit_events e
    LEFT JOIN users u ON u.id=e.actor_id ORDER BY e.id DESC LIMIT 100`);
  res.json({ events });
});

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
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => console.log(`Dormitory Operations on http://localhost:${port}`));
}
export default app;
