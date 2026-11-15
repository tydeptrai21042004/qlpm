import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

export function registerPeopleRoutes(app, { query, audit, notify }) {
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
}
