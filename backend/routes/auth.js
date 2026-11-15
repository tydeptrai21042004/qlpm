import { fail, requiredText, safeId, optionalId, integer, oneOf, validEmail, validPassword,
  verifyPassword, tokenHash, parseCookies, sessionCookie, requireUser, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';
import { randomBytes } from 'node:crypto';

export function registerAuthRoutes(app, { query, audit, notify, passwordHash }) {
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
}
