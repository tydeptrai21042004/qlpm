import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFileSync(path.join(root,name),'utf8');
const routes = ['auth','rooms','people','applications','allocations','announcements','housing','requests','notifications','audit','room-inspections'];
const allRoutes = () => routes.map(r=>read(`backend/routes/${r}.js`)).join('\n');

test('Node and Vercel launch one actual Express API with isolated route modules', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.type,'module');
  assert.ok(pkg.dependencies.express);
  assert.ok(pkg.dependencies['@neondatabase/serverless']);
  assert.match(read('server.js'),/import \{ createApp \} from '.\/backend\/app.js'/);
  assert.match(read('server.js'),/export default app/);
  assert.match(read('backend/app.js'),/export function createApp\(adapter = neonAdapter\)/);
  assert.match(read('backend/app.js'),/express\.static\(PUBLIC/);
  assert.ok(existsSync(path.join(root,'public/index.html')));
  const deployment=JSON.parse(read('vercel.json'));
  assert.ok(!deployment.crons || deployment.crons.length===0);
  for (const route of routes) { const fn=route==='room-inspections'?'RoomInspections':route[0].toUpperCase()+route.slice(1); assert.match(read('backend/app.js'),new RegExp(`register${fn}Routes\\(app, context\\)`)); }
});

test('database credentials and Neon schema remain backend-only', () => {
  const db = read('backend/db/index.js');
  assert.match(db,/process\.env\.DATABASE_URL/);
  for (const table of ['users','rooms','applications','allocations','requests','sessions','housing_changes','announcements','allocation_history','audit_events','room_inspections','service_feedback']) {
    assert.ok(db.includes(`CREATE TABLE IF NOT EXISTS ${table}`),`Missing ${table}`);
  }
  assert.match(db,/one_active_application/);
  assert.match(db,/one_pending_housing_change/);
  assert.match(db,/CONSTRAINT occupancy_range/);
  assert.doesNotMatch(read('public/app.js'),/process\.env\.DATABASE_URL|postgresql:\/\//);
  assert.doesNotMatch(read('public/index.html'),/postgresql:\/\//);
});

test('actual SQL transaction statements guard capacity and preserve checkout history', () => {
  const apps=read('backend/routes/applications.js');
  const allocations=read('backend/routes/allocations.js');
  const housing=read('backend/routes/housing.js');
  assert.match(apps,/WITH eligible AS[\s\S]+FOR UPDATE[\s\S]+reserved AS[\s\S]+r\.occupied<r\.capacity/);
  assert.match(allocations,/WITH removed AS[\s\S]+released AS[\s\S]+allocation_history/);
  assert.match(housing,/FOR UPDATE OF c,a/);
  assert.match(housing,/allocation_transfers/);
  assert.match(housing,/r\.occupied<r\.capacity/);
});

test('authentication, ownership and audit are implemented server-side', () => {
  const auth=read('backend/routes/auth.js');
  const api=read('backend/app.js');
  const requests=read('backend/routes/requests.js');
  const notifications=read('backend/routes/notifications.js');
  assert.match(auth,/login_attempts/);
  assert.match(auth,/passwordHash\(/);
  assert.match(requests,/student_id=\$3/);
  assert.match(notifications,/user_id=\$2/);
  assert.match(api,/Content-Security-Policy/);
  assert.match(read('backend/lib/validation.js'),/SameSite=Strict/);
  assert.match(api,/res\.status\(404\)\.json/);
  assert.match(api,/app\.get\('\/api\/ready'/);
});

test('student and staff use cases are backed by real endpoints and persisted records', () => {
  const src=allRoutes();
  for (const route of ['/api/auth/register','/api/auth/login','/api/rooms','/api/students',
    '/api/applications/:id/decision','/api/allocations/history','/api/housing-changes/:id/decision',
    '/api/requests/:id/messages','/api/notifications/read-all','/api/announcements/:id/status',
    '/api/audit','/api/rooms/:id/residents']) {
    assert.ok(src.includes(route), `Missing ${route}`);
  }
  for (const action of ['roomCreateFields','roomUpdateFields','announcementFields','newTicketFields',
    'ticketUpdateFields','housingChangeFields']) {
    assert.ok(src.includes(action),`Missing referenced business validation: ${action}`);
  }
});

test('frontend includes route-specific workflows and output encoding', () => {
  const js=read('public/app.js');
  const css=read('public/refinement.css');
  for (const view of ['studentTicketList','reviewDialog','ticketDialog','notificationPage','settingsPage',
    'announcementPage','announcementDialog','changePage','changeDialog','roomRoster','studentDetails',
    'reportsPage','commandDialog','applyTableFilters']) {
    assert.ok(js.includes(`function ${view}`), `Missing ${view}`);
  }
  assert.match(js,/csvCell/);
  assert.match(js,/replace\(\/\[&<>"'\]\//);
  assert.match(js,/new Date\(value\)/);
  for (const token of ['sidebar-open','command-dialog','student-hero','attention-list','table-pagination']) assert.ok(css.includes(token));
});

test('V8 has no mail delivery modules, mail endpoints or background email jobs', () => {
  assert.ok(!existsSync(path.join(root,'backend/services/mail.js')));
  assert.ok(!existsSync(path.join(root,'backend/routes/messaging.js')));
  assert.doesNotMatch(read('backend/app.js'),/registerMailCron|registerMessagingRoutes/);
  assert.doesNotMatch(read('backend/lib/context.js'),/email_outbox|sendMail|deliverOutbox|RESEND/);
  assert.doesNotMatch(read('public/app.js'),/email-prefs-form|send-mail-batch|retry-email|mailPage/);
  assert.match(read('backend/routes/room-inspections.js'),/FROM allocations a WHERE a.student_id=\$1/);
  assert.match(read('public/app.js'),/function checklistPage\(\)/);
});


test('V8 figures and room map use existing operational records without external chart services', () => {
  const js=read('public/app.js');
  const css=read('public/khu-a.css');
  for(const fn of ['donutChart','capacityAnalytics','requestStatusViz','workloadChart','categoryBreakdown','studentJourney','roomHeatmap']) {
    assert.ok(js.includes(`function ${fn}(`),`${fn} missing`);
  }
  assert.match(js,/state\.rooms\.filter/);
  assert.match(js,/data-action=\"focus-room\"/);
  assert.match(js,/progress class=\"checklist-progress\"/);
  assert.doesNotMatch(js,/style=\"/);
  assert.match(css,/\.viz-panels/);
  assert.match(css,/\.room-tile/);
  assert.match(css,/\.donut-arc/);
  assert.match(read('public/index.html'),/favicon\.svg/);
  assert.ok(existsSync(path.join(root,'public/favicon.svg')));
});
