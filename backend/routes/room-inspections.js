import { requireUser, fail, requiredText } from '../lib/validation.js';

export const INSPECTION_FIELDS = Object.freeze([
  'door_state', 'lighting_state', 'fan_state', 'furniture_state', 'bathroom_state'
]);
const CONDITIONS = new Set(['ok', 'issue', 'unchecked']);

export function validateInspection(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid inspection form.');
  const conditions = INSPECTION_FIELDS.map(field => {
    const value = body[field];
    if (!CONDITIONS.has(value)) fail(400, `Invalid condition for ${field}.`);
    return value;
  });
  const note = requiredText(body.note ?? '', 'Inspection note', 0, 1000);
  return { conditions, note };
}

export function registerRoomInspectionsRoutes(app, { query, audit }) {
  app.get('/api/room-inspections', async (req, res) => {
    const user = requireUser(req);
    const entries = await query(`SELECT c.id,c.student_id,u.name AS student_name,
      c.room_id,r.code AS room_code,r.building,c.door_state,c.lighting_state,
      c.fan_state,c.furniture_state,c.bathroom_state,c.note,c.created_at
      FROM room_inspections c JOIN users u ON u.id=c.student_id
      JOIN rooms r ON r.id=c.room_id
      WHERE ($1::varchar='staff' OR c.student_id=$2)
      ORDER BY c.id DESC LIMIT 200`, [user.role,user.id]);
    res.json({ inspections:entries });
  });
  app.post('/api/room-inspections', async (req, res) => {
    const user = requireUser(req,'student');
    const { conditions, note } = validateInspection(req.body);
    // Room is resolved on the server from the active allocation. Never trust room_id
    // supplied by the browser; a student cannot file a report for another room.
    const result = await query(`INSERT INTO room_inspections
      (student_id,room_id,door_state,lighting_state,fan_state,furniture_state,bathroom_state,note)
      SELECT a.student_id,a.room_id,$2,$3,$4,$5,$6,$7
      FROM allocations a WHERE a.student_id=$1 RETURNING id`,
    [user.id,...conditions,note]);
    if (!result.length) fail(409, 'You need an assigned room before inspecting it.');
    await audit(user.id,'room_inspection_recorded','room_inspections',result[0].id,
      `Resident inspection; ${conditions.filter(x=>x==='issue').length} areas need attention`);
    res.status(201).json({id:result[0].id});
  });
}
