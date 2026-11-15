import { roomCreateFields, roomUpdateFields } from '../domain/policies.js';
import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerRoomsRoutes(app, { query, audit, notify }) {
  app.get('/api/rooms', async (req, res) => {
    requireUser(req);
    const rooms = await query(`SELECT id,code,building,floor,capacity,active,occupied,
      capacity-occupied AS available FROM rooms ORDER BY building,floor,code`);
    res.json({ rooms });
  });
  app.post('/api/rooms', async (req, res) => {
    const user = requireUser(req, 'staff');
    const { code, building, floor, capacity } = roomCreateFields(req.body);
    const rows = await query(`INSERT INTO rooms(code,building,floor,capacity)
      VALUES($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING RETURNING id`, [code,building,floor,capacity]);
    if (!rows.length) fail(409, 'Room code already exists.');
    await audit(user.id, 'room_created', 'rooms', rows[0].id, `Added room ${code} with ${capacity} beds`);
    res.status(201).json({ id:rows[0].id });
  });
  app.put('/api/rooms/:id', async (req, res) => {
    const user = requireUser(req, 'staff');
    const id = safeId(req.params.id);
    const { capacity, active, building, floor } = roomUpdateFields(req.body);
    const rows = await query(`UPDATE rooms SET capacity=$1,active=$2,building=COALESCE($4,building),floor=COALESCE($5,floor)
      WHERE id=$3 AND occupied<=$1 AND ($2::boolean OR occupied=0) RETURNING id,code`,
    [capacity,active,id,building,floor]);
    if (!rows.length) {
      const exists = await query('SELECT id FROM rooms WHERE id=$1', [id]);
      if (!exists.length) fail(404, 'Room not found.');
      fail(409, 'Capacity cannot fall below occupancy; occupied rooms cannot be deactivated.');
    }
    await audit(user.id, 'room_updated', 'rooms', id, `Updated room ${rows[0].code}`);
    res.json({ message: 'Room updated.' });
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
}
