import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = name => readFileSync(path.join(root,name),'utf8');

test('one Vercel project: exported Express app and public frontend', () => {
  const pkg = JSON.parse(file('package.json'));
  assert.equal(pkg.type,'module');
  assert.ok(pkg.dependencies.express);
  assert.ok(pkg.dependencies['@neondatabase/serverless']);
  assert.ok(existsSync(path.join(root,'public','index.html')));
  assert.match(file('server.js'),/export default app/);
  assert.match(file('server.js'),/express\.static\(PUBLIC/);
  assert.ok(!existsSync(path.join(root,'vercel.json')));
});

test('Neon configuration: database secret is server side only', () => {
  const db = file('db/index.js');
  assert.match(db,/process\.env\.DATABASE_URL/);
  assert.match(db,/CREATE TABLE IF NOT EXISTS rooms/);
  assert.match(db,/one_active_application/);
  assert.match(db,/CONSTRAINT occupancy_range/);
  assert.match(db,/ON CONFLICT/);
  assert.doesNotMatch(file('public/app.js'),/process\.env\.DATABASE_URL|postgresql:\/\/|Demo123!/);
  assert.doesNotMatch(file('server.js'),/node:sqlite/);
  assert.doesNotMatch(db,/node:sqlite/);
});

test('API implements role based operations and atomic allocation statement', () => {
  const app = file('server.js');
  for (const route of ['/api/auth/register','/api/auth/login','/api/rooms','/api/students',
    '/api/applications','/api/allocations','/api/requests','/api/health']) {
    assert.ok(app.includes(route),`Missing ${route}`);
  }
  assert.match(app,/WITH eligible AS[\s\S]+FOR UPDATE[\s\S]+reserved AS[\s\S]+r\.occupied<r\.capacity/);
  assert.match(app,/WITH removed AS[\s\S]+released AS[\s\S]+closed AS/);
  assert.match(app,/SameSite=Strict/);
  assert.match(app,/requireUser\(req, 'staff'\)/);
});

test('frontend parses Neon UTC timestamps instead of adding another Z', () => {
  assert.match(file('public/app.js'),/new Date\(value\)/);
  assert.doesNotMatch(file('public/app.js'),/\.replace\(' ','T'\)\+'Z'/);
});

test('enhanced use cases have persisted schema and owner/role protected APIs', () => {
  const db=file('db/index.js');
  const server=file('server.js');
  const frontend=file('public/app.js');
  for (const name of ['request_messages','notifications','audit_events','allocation_history','login_attempts']) {
    assert.ok(db.includes(name),`Missing ${name} table`);
  }
  for (const column of ['preferred_room_id','withdrawn','priority','assigned_to','resolution_note']) {
    assert.ok(db.includes(column),`Missing ${column} migration`);
  }
  for (const route of ['/api/me/password','/api/applications/:id/cancel',
    '/api/requests/:id/messages','/api/notifications/:id/read',
    '/api/notifications/read-all','/api/allocations/history','/api/audit','/api/staff']) {
    assert.ok(server.includes(route),`Missing ${route}`);
  }
  assert.match(server,/student_id=\$3/);
  assert.match(server,/assigned_to/);
  assert.match(server,/Content-Security-Policy/);
  assert.match(server,/login_attempts/);
  assert.match(server,/resolutionNote.length < 5/);
  for (const view of ['studentTicketList','reviewDialog','ticketDialog','notificationPage','settingsPage']) {
    assert.ok(frontend.includes(`function ${view}`),`Missing ${view} UI`);
  }
  assert.match(frontend,/csvCell/);
  assert.match(frontend,/replace\(\/\[&<>"'\]\//);
  assert.doesNotMatch(frontend,/innerHTML\s*=\s*.*response\.data/);
});


test('residence changes, announcements and refined UI are integrated', () => {
  const db=file('db/index.js');
  const server=file('server.js');
  const frontend=file('public/app.js');
  const css=file('public/refinement.css');
  for (const name of ['housing_changes','allocation_transfers','announcements','one_pending_housing_change']) {
    assert.ok(db.includes(name),`Missing migration: ${name}`);
  }
  for (const endpoint of ['/api/housing-changes', '/api/housing-changes/:id/decision',
    '/api/housing-changes/:id/cancel','/api/announcements','/api/announcements/:id/status',
    '/api/rooms/:id/residents']) {
    assert.ok(server.includes(endpoint),`Missing API: ${endpoint}`);
  }
  assert.match(server,/FOR UPDATE OF c,a/);
  assert.match(server,/r.occupied<r.capacity/);
  for (const fn of ['announcementPage','announcementDialog','changePage','changeDialog',
    'roomRoster','studentDetails','reportsPage','commandDialog','applyTableFilters']) {
    assert.ok(frontend.includes(`function ${fn}`),`Missing interface: ${fn}`);
  }
  for (const feature of ['sidebar-open','command-dialog','student-hero','attention-list','table-pagination']) {
    assert.ok(css.includes(feature));
  }
});
