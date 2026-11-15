import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { tokenHash } from '../backend/lib/validation.js';
import { passwordHash } from '../backend/lib/password.js';

const require = createRequire(import.meta.url);
let dependencyInstalled = true;
for (const name of ['express', '@neondatabase/serverless']) {
  try { require.resolve(name); } catch { dependencyInstalled = false; }
}

// Real HTTP requests to the actual Express routes, but with a deterministic SQL adapter.
// Does not prove that PostgreSQL transactions execute correctly (Neon tests do that).
test('HTTP API contract: auth, validation, role enforcement and service requests',
  { skip: dependencyInstalled ? false : 'Run npm install to execute HTTP tests against Express' },
  async t => {
    const { createApp } = await import('../backend/app.js');
    const users = [
      { id: 1, name: 'Office Manager', email: 'staff@example.test', role: 'staff', password_hash: passwordHash('StaffPassword123') },
      { id: 2, name: 'Resident One', email: 'resident@example.test', role: 'student', password_hash: passwordHash('StudentPassword123') },
      { id: 3, name: 'Resident Two', email: 'other@example.test', role: 'student', password_hash: passwordHash('StudentPassword123') }
    ];
    const staffToken = 'a'.repeat(96), residentToken = 'b'.repeat(96), otherToken = 'c'.repeat(96);
    const sessions = new Map([[tokenHash(staffToken), 1], [tokenHash(residentToken),2], [tokenHash(otherToken),3]]);
    const rooms = [];
    const requests = [];
    const messages = [];
    const announcements = [];
    const notifications = [];
    const attempts = new Map();
    let executed = 0;
    async function query(sql, params = []) {
      executed++;
      const s = sql.replace(/\s+/g,' ').trim();
      if (s === 'SELECT 1 AS ready') return [{ready:1}];
      if (s.includes('FROM sessions s JOIN users u')) {
        const user=users.find(u=>u.id===sessions.get(params[0]));
        return user?[{id:user.id,name:user.name,email:user.email,role:user.role}]:[];
      }
      if (s.startsWith('SELECT locked_until FROM login_attempts')) return attempts.get(params[0])?.locked ? [{locked_until:new Date()}] : [];
      if (s.startsWith('SELECT * FROM users WHERE email=')) return users.filter(u=>u.email===params[0]);
      if (s.startsWith('INSERT INTO login_attempts')) {attempts.set(params[0],{locked:false});return [];}
      if (s.startsWith('DELETE FROM login_attempts')) { attempts.delete(params[0]);return []; }
      if (s.startsWith('INSERT INTO sessions(')) {sessions.set(params[0],params[1]);return [];}
      if (s.startsWith('DELETE FROM sessions WHERE token_hash=')) {sessions.delete(params[0]);return [];}
      if (s.startsWith('INSERT INTO users(')) {
        if (users.some(u=>u.email===params[1])) return [];
        const id=users.length+1;
        users.push({id,name:params[0],email:params[1],password_hash:params[2],role:'student'});
        return [{id}];
      }
      if (s.startsWith('SELECT id,code,building,floor,capacity,active,occupied, capacity-occupied AS available FROM rooms')) {
        return rooms.map(r=>({...r,available:r.capacity-r.occupied}));
      }
      if (s.startsWith('INSERT INTO rooms(')) {
        if(rooms.some(r=>r.code===params[0]))return [];
        const id=rooms.length+1;
        rooms.push({id,code:params[0],building:params[1],floor:params[2],capacity:params[3],active:true,occupied:0});
        return [{id}];
      }
      if (s.startsWith('UPDATE rooms SET capacity=')) {
        const r=rooms.find(x=>x.id===params[2]);
        if(!r||r.occupied>params[0]||(!params[1]&&r.occupied>0))return [];
        r.capacity=params[0];r.active=params[1];r.building=params[3]??r.building;r.floor=params[4]??r.floor;
        return [{id:r.id,code:r.code}];
      }
      if (s.startsWith('SELECT id FROM rooms WHERE id=')) return rooms.filter(r=>r.id===params[0]).map(r=>({id:r.id}));
      if (s.startsWith('SELECT u.id,u.name,u.email,u.created_at,r.code AS room_code')) return users.filter(u=>u.role==='student')
        .map(u=>({id:u.id,name:u.name,email:u.email,room_code:null,allocation_id:null}));
      if (s.startsWith('SELECT id,name FROM users WHERE role=')) return users.filter(u=>u.role==='staff').map(u=>({id:u.id,name:u.name}));
      if (s.startsWith('SELECT id FROM users WHERE id=$1 AND role=')) return users.filter(u=>u.role==='staff'&&u.id===params[0]).map(u=>({id:u.id}));
      if (s.startsWith('INSERT INTO requests(')) {
        const id=requests.length+1;
        requests.push({id,student_id:params[0],category:params[1],priority:params[2],title:params[3],description:params[4],status:'open',assigned_to:null,resolution_note:''});
        return [{id}];
      }
      if (s.startsWith('SELECT r.id,r.student_id,u.name AS student_name')) return requests
        .filter(r=>params[0]==='staff'||r.student_id===params[1])
        .map(r=>({...r,student_name:users.find(u=>u.id===r.student_id)?.name}));
      if (s.startsWith('UPDATE requests SET status=')) {
        const r=requests.find(x=>x.id===params[5]);
        if (!r) return [];
        Object.assign(r,{status:params[0],priority:params[1],assigned_to:params[2],resolution_note:params[3]});
        return [{id:r.id,student_id:r.student_id}];
      }
      if (s.startsWith('SELECT id FROM requests WHERE id=')) return requests.filter(r=>r.id===params[0]&&(params[1]==='staff'||r.student_id===params[2])).map(r=>({id:r.id}));
      if (s.startsWith('SELECT student_id,status FROM requests')) return requests.filter(r=>r.id===params[0]&&(params[1]==='staff'||r.student_id===params[2]));
      if (s.startsWith('INSERT INTO request_messages(')) {
        const id=messages.length+1;
        messages.push({id,request_id:params[0],author_id:params[1],message:params[2]});
        return [{id}];
      }
      if (s.startsWith('UPDATE requests SET updated_at='))return [];
      if (s.startsWith('SELECT m.id,m.message,m.created_at,u.name AS author_name'))
        return messages.filter(m=>m.request_id===params[0]).map(m=>({...m,author_name:users.find(u=>u.id===m.author_id)?.name}));
      if (s.startsWith('INSERT INTO announcements(')) {
        const id=announcements.length+1;
        announcements.push({id,title:params[0],body:params[1],audience:params[2],building:params[3],pinned:params[4],status:'published'});
        return [{id}];
      }
      if (s.startsWith('SELECT n.id,n.title,n.body,n.audience'))return announcements.filter(a=>params[0]==='staff'||(a.status==='published'&&a.audience==='all'));
      if (s.startsWith('INSERT INTO audit_events('))return [];
      if (s.startsWith('INSERT INTO notifications(')) {notifications.push({id:notifications.length+1,user_id:params[0],title:params[1],body:params[2],read_at:null});return [];}
      if (s.startsWith('SELECT id,title,body,target_type'))return notifications.filter(n=>n.user_id===params[0]);
      throw new Error(`Fixture does not implement SQL: ${s.slice(0,125)}`);
    }
    const app=createApp({ensureDatabase:async()=>{},query,passwordHash});
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}`;
    async function request(url, method='GET', body, token, headers={}) {
      const response=await fetch(base+url,{
        method,
        headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(token?{cookie:`session=${token}`}:{}) ,...headers},
        body:body===undefined?undefined:(typeof body==='string'?body:JSON.stringify(body))
      });
      const payload=await response.json().catch(()=>null);
      return {status:response.status,payload,headers:response.headers};
    }
    try {
      await t.test('liveness, readiness and HTTP security headers',async()=>{
        const live=await request('/api/health');assert.equal(live.status,200);assert.equal(live.payload.ok,true);
        const ready=await request('/api/ready');assert.equal(ready.status,200);assert.equal(ready.payload.database,'ready');
        assert.equal(live.headers.get('x-frame-options'),'DENY');
        assert.equal(live.headers.get('x-content-type-options'),'nosniff');
      });
      await t.test('unauthenticated access and session identity',async()=>{
        assert.equal((await request('/api/me')).payload.user,null);
        assert.equal((await request('/api/rooms')).status,401);
        assert.equal((await request('/api/me','GET',undefined,residentToken)).payload.user.role,'student');
        assert.equal((await request('/api/me','GET',undefined,staffToken)).payload.user.role,'staff');
      });
      await t.test('registration validation, duplicate and persistence',async()=>{
        assert.equal((await request('/api/auth/register','POST',{name:'A',email:'bad',password:'no'})).status,400);
        assert.equal((await request('/api/auth/register','POST',{name:'Another Resident',email:'extra@example.test',password:'Short'})).status,400);
        assert.equal((await request('/api/auth/register','POST',{name:'Another Resident',email:'extra@example.test',password:'StrongPass123'})).status,201);
        assert.equal((await request('/api/auth/register','POST',{name:'Another Resident',email:'extra@example.test',password:'StrongPass123'})).status,409);
      });
      await t.test('login returns a secure cookie; invalid password denied',async()=>{
        assert.equal((await request('/api/auth/login','POST',{email:'resident@example.test',password:'WrongPass123'})).status,401);
        const login=await request('/api/auth/login','POST',{email:'resident@example.test',password:'StudentPassword123'});
        assert.equal(login.status,200);
        assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
        assert.equal(login.payload.user.role,'student');
      });
      await t.test('student cannot create rooms or access staff roster',async()=>{
        assert.equal((await request('/api/rooms','POST',{code:'A101',building:'A',floor:1,capacity:2},residentToken)).status,403);
        assert.equal((await request('/api/students','GET',undefined,residentToken)).status,403);
        assert.equal((await request('/api/students','GET',undefined,staffToken)).status,200);
      });
      await t.test('staff room creation and duplicate validation',async()=>{
        assert.equal((await request('/api/rooms','POST',{code:'A101',building:'A',floor:1,capacity:0},staffToken)).status,400);
        const created=await request('/api/rooms','POST',{code:' a101 ',building:'Wing A',floor:1,capacity:2},staffToken);
        assert.equal(created.status,201);
        assert.equal((await request('/api/rooms','POST',{code:'A101',building:'Wing A',floor:1,capacity:2},staffToken)).status,409);
        const roomList=await request('/api/rooms','GET',undefined,residentToken);
        assert.equal(roomList.payload.rooms[0].code,'A101');
      });
      await t.test('room updates cannot accept invalid boolean values',async()=>{
        assert.equal((await request('/api/rooms/1','PUT',{capacity:2,active:'false'},staffToken)).status,400);
        assert.equal((await request('/api/rooms/1','PUT',{capacity:3,active:true},staffToken)).status,200);
        assert.equal((await request('/api/rooms/999','PUT',{capacity:2,active:true},staffToken)).status,404);
      });
      await t.test('service ticket ownership and staff resolution policy',async()=>{
        assert.equal((await request('/api/requests','POST',{category:'billing',title:'Broken door',description:'Door is jammed'},residentToken)).status,400);
        const created=await request('/api/requests','POST',{category:'maintenance',title:'Broken door',description:'Door is jammed'},residentToken);
        assert.equal(created.status,201);
        assert.equal((await request('/api/requests','GET',undefined,otherToken)).payload.requests.length,0);
        assert.equal((await request(`/api/requests/${created.payload.id}`,'PATCH',{status:'resolved'},residentToken)).status,403);
        assert.equal((await request(`/api/requests/${created.payload.id}`,'PATCH',{status:'resolved',priority:'high'},staffToken)).status,400);
        assert.equal((await request(`/api/requests/${created.payload.id}`,'PATCH',{
          status:'resolved',priority:'high',assigned_to:1,resolution_note:'Door hinge replaced'
        },staffToken)).status,200);
      });
      await t.test('service message visibility belongs to owner and staff',async()=>{
        assert.equal((await request('/api/requests/1/messages','GET',undefined,otherToken)).status,404);
        assert.equal((await request('/api/requests/1/messages','POST',{message:'Please help'},otherToken)).status,404);
        assert.equal((await request('/api/requests/1/messages','POST',{message:'Follow-up message'},residentToken)).status,201);
        assert.equal((await request('/api/requests/1/messages','GET',undefined,residentToken)).payload.messages.length,1);
      });
      await t.test('announcement publishing is staff-only',async()=>{
        const notice={title:'Quiet hours notice',body:'Quiet hours begin at 22:00 every day.',audience:'all',pinned:false};
        assert.equal((await request('/api/announcements','POST',notice,residentToken)).status,403);
        assert.equal((await request('/api/announcements','POST',notice,staffToken)).status,201);
        assert.equal((await request('/api/announcements','GET',undefined,residentToken)).payload.announcements.length,1);
      });
      await t.test('cross-origin write requests and malformed JSON are rejected',async()=>{
        assert.equal((await request('/api/auth/register','POST',{name:'Someone',email:'s@example.test',password:'Password123'},undefined,{origin:'https://evil.example'})).status,403);
        assert.equal((await request('/api/auth/register','POST','{badjson',undefined)).status,400);
        assert.equal((await request('/api/auth/register','POST',{name:'Someone'},undefined,{'content-type':'text/plain'})).status,415);
      });
      await t.test('unknown endpoints, injection IDs and oversized bodies fail',async()=>{
        assert.equal((await request('/api/unmapped','GET',undefined,staffToken)).status,404);
        assert.equal((await request('/api/rooms/1%20OR%201=1','PUT',{capacity:3,active:true},staffToken)).status,400);
        const tooLarge={name:'a'.repeat(70000)};
        assert.equal((await request('/api/auth/register','POST',tooLarge)).status,413);
      });
      await t.test('sign-out invalidates the supplied session cookie',async()=>{
        assert.equal((await request('/api/auth/logout','POST',undefined,otherToken)).status,200);
        assert.equal((await request('/api/me','GET',undefined,otherToken)).payload.user,null);
      });
      assert.ok(executed>15);
    } finally {
      await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    }
  });
