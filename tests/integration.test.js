import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Run only against an isolated/disposable Neon test database branch.
// Never set TEST_DATABASE_URL to the production database.
test('Neon end-to-end student/staff workflow, permissions and occupancy',
  {skip: !process.env.TEST_DATABASE_URL ? 'Set TEST_DATABASE_URL to a disposable Neon branch to enable integration testing' : false},
  async () => {
    const suffix = randomBytes(5).toString('hex');
    const staffEmail = `staff-${suffix}@example.test`;
    const student1Email = `student-a-${suffix}@example.test`;
    const student2Email = `student-b-${suffix}@example.test`;
    const staffPassword = 'StrongStaffTestPassword123!';
    const studentPassword = 'StudentTest1234';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.ADMIN_EMAIL = staffEmail;
    process.env.ADMIN_PASSWORD = staffPassword;
    process.env.ADMIN_NAME = 'Test Staff';
    process.env.SEED_SAMPLE_ROOMS = 'false';
    process.env.VERCEL = '1'; // prevent automatic listener

    const {default:app} = await import('../server.js');
    const server = await new Promise(resolve => {
      const s=app.listen(0,'127.0.0.1',()=>resolve(s));
    });
    const base=`http://127.0.0.1:${server.address().port}`;
    async function call(route, method='GET', body, cookie='') {
      const res=await fetch(base+route, {
        method,
        headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{'Cookie':cookie}:{})},
        body:body===undefined?undefined:JSON.stringify(body)
      });
      const payload=await res.json().catch(()=>({}));
      return {status:res.status, payload, cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
    }
    const login=email=>call('/api/auth/login','POST',
      {email,password: email===staffEmail?staffPassword:studentPassword});
    try {
      assert.equal((await call('/api/health')).status,200);
      const page=await fetch(base+'/');
      assert.equal(page.status,200);
      assert.match(await page.text(),/Campus Housing/);
      assert.equal((await call('/api/students')).status,401);

      for (const [email,name] of [[student1Email,'Student A'],[student2Email,'Student B']]) {
        assert.equal((await call('/api/auth/register','POST',{
          name,email,password:studentPassword
        })).status,201);
      }
      const staff=await login(staffEmail), student1=await login(student1Email), student2=await login(student2Email);
      assert.equal(staff.status,200);
      assert.equal(staff.payload.user.role,'staff');
      assert.equal(student1.status,200);
      const adminCookie=staff.cookie, a=student1.cookie, b=student2.cookie;

      assert.equal((await call('/api/students','GET',undefined,a)).status,403);
      assert.equal((await call('/api/audit','GET',undefined,a)).status,403);
      assert.equal((await call('/api/allocations/history','GET',undefined,a)).status,403);
      assert.equal((await call('/api/rooms','POST',{
        code:`X${suffix}`, building:'Test', floor:2, capacity:1
      },a)).status,403);
      const newRoom=await call('/api/rooms','POST',{
        code:`X${suffix}`, building:'Test', floor:2, capacity:1
      },adminCookie);
      assert.equal(newRoom.status,201);
      const roomId=newRoom.payload.id;
      const appA=await call('/api/applications','POST',{note:'Application A',preferred_room_id:roomId},a);
      assert.equal(appA.status,201);
      assert.equal((await call('/api/applications','POST',{note:'Duplicate'},a)).status,409);
      const firstB=await call('/api/applications','POST',{note:'Original application'},b);
      assert.equal(firstB.status,201);
      assert.equal((await call(`/api/applications/${firstB.payload.id}/cancel`,'POST',{},a)).status,409);
      assert.equal((await call(`/api/applications/${firstB.payload.id}/cancel`,'POST',{},b)).status,200);
      const appB=await call('/api/applications','POST',{note:'Application B'},b);
      assert.equal(appB.status,201);
      const ownApplications=await call('/api/applications','GET',undefined,a);
      assert.equal(ownApplications.payload.applications.length,1);
      assert.equal(ownApplications.payload.applications[0].preferred_room_id,roomId);
      assert.equal((await call(`/api/applications/${appA.payload.id}/decision`,'POST',{
        decision:'approve',room_id:roomId
      },a)).status,403);
      assert.equal((await call(`/api/applications/${appA.payload.id}/decision`,'POST',{
        decision:'approve',room_id:roomId
      },adminCookie)).status,200);
      assert.equal((await call(`/api/applications/${appB.payload.id}/decision`,'POST',{
        decision:'approve',room_id:roomId
      },adminCookie)).status,409);
      const rooms=await call('/api/rooms','GET',undefined,adminCookie);
      assert.equal(rooms.payload.rooms.find(r=>r.id===roomId).occupied,1);
      assert.equal((await call(`/api/rooms/${roomId}`,'PUT',{
        capacity:1,active:false
      },adminCookie)).status,409);
      const requests=await call('/api/requests','POST',{
        category:'maintenance',title:'Broken desk',description:'Please fix the desk.'
      },a);
      assert.equal(requests.status,201);
      assert.equal((await call(`/api/requests/${requests.payload.id}`,'PATCH',{
        status:'resolved',priority:'high',resolution_note:'Repaired the desk.'
      },a)).status,403);
      assert.equal((await call(`/api/requests/${requests.payload.id}`,'PATCH',{
        status:'resolved',priority:'high'
      },adminCookie)).status,400);
      assert.equal((await call(`/api/requests/${requests.payload.id}/messages`,'POST',{
        message:'The desk is still loose.'
      },a)).status,201);
      assert.equal((await call(`/api/requests/${requests.payload.id}/messages`,'POST',{
        message:'We will inspect it.'
      },adminCookie)).status,201);
      const conversation=await call(`/api/requests/${requests.payload.id}/messages`,'GET',undefined,a);
      assert.equal(conversation.payload.messages.length,2);
      assert.equal((await call(`/api/requests/${requests.payload.id}/messages`,'GET',undefined,b)).status,404);
      assert.equal((await call(`/api/requests/${requests.payload.id}`,'PATCH',{
        status:'resolved',priority:'high',assigned_to:staff.payload.user.id,
        resolution_note:'Repaired the desk.'
      },adminCookie)).status,200);
      const studentNotifications=await call('/api/notifications','GET',undefined,a);
      assert.ok(studentNotifications.payload.notifications.length>=2);
      const firstNotification=studentNotifications.payload.notifications[0];
      assert.equal((await call(`/api/notifications/${firstNotification.id}/read`,'POST',{},b)).status,404);
      assert.equal((await call(`/api/notifications/${firstNotification.id}/read`,'POST',{},a)).status,200);
      assert.equal((await call('/api/notifications/read-all','POST',{},a)).status,200);
      assert.equal((await call('/api/requests','GET',undefined,b)).payload.requests.length,0);
      const allocations=await call('/api/allocations','GET',undefined,adminCookie);
      const allocation=allocations.payload.allocations.find(x=>x.room_id===roomId);
      assert.ok(allocation);
      assert.equal((await call(`/api/allocations/${allocation.id}`,'DELETE',undefined,a)).status,403);
      assert.equal((await call(`/api/allocations/${allocation.id}`,'DELETE',undefined,adminCookie)).status,200);
      assert.equal((await call('/api/rooms','GET',undefined,adminCookie)).payload.rooms.find(r=>r.id===roomId).available,1);
      const checkoutHistory=await call('/api/allocations/history','GET',undefined,adminCookie);
      assert.ok(checkoutHistory.payload.history.some(x=>x.room_code===`X${suffix}`));
      const auditLog=await call('/api/audit','GET',undefined,adminCookie);
      assert.ok(auditLog.payload.events.some(x=>x.action==='student_checked_out'));
      assert.equal((await call(`/api/applications/${appB.payload.id}/decision`,'POST',{
        decision:'approve',room_id:roomId
      },adminCookie)).status,200);
      // New end-to-end cases: room roster, publishing, room transfer, checkout
      assert.equal((await call(`/api/rooms/${roomId}/residents`,'GET',undefined,a)).status,403);
      const roster=await call(`/api/rooms/${roomId}/residents`,'GET',undefined,adminCookie);
      assert.equal(roster.status,200);
      assert.ok(roster.payload.residents.some(x=>x.student_id===student2.payload.user.id));
      const notice=await call('/api/announcements','POST',{
        title:'Residence office notice',body:'Please keep shared corridors clear during inspection.',
        audience:'all',pinned:true
      },adminCookie);
      assert.equal(notice.status,201);
      assert.equal((await call('/api/announcements','POST',{
        title:'Unauthorized notice',body:'A student must not post office notices.',audience:'all'
      },b)).status,403);
      const ownNotices=await call('/api/announcements','GET',undefined,b);
      assert.ok(ownNotices.payload.announcements.some(x=>x.id===notice.payload.id));
      const roomTwo=await call('/api/rooms','POST',{
        code:`Y${suffix}`,building:'Wing C',floor:3,capacity:2
      },adminCookie);
      assert.equal(roomTwo.status,201);
      const change=await call('/api/housing-changes','POST',{
        kind:'transfer',target_room_id:roomTwo.payload.id,reason:'I would like to move nearer the study lounge.'
      },b);
      assert.equal(change.status,201);
      assert.equal((await call('/api/housing-changes','POST',{
        kind:'checkout',reason:'I am leaving the dormitory this semester.'
      },b)).status,409);
      assert.equal((await call(`/api/housing-changes/${change.payload.id}/cancel`,'POST',{},a)).status,409);
      assert.equal((await call(`/api/housing-changes/${change.payload.id}/decision`,'POST',{
        decision:'approve'
      },b)).status,403);
      assert.equal((await call(`/api/housing-changes/${change.payload.id}/decision`,'POST',{
        decision:'approve',review_note:'Approved, please collect your room key.'
      },adminCookie)).status,200);
      const postTransfer=await call('/api/rooms','GET',undefined,adminCookie);
      assert.equal(postTransfer.payload.rooms.find(r=>r.id===roomId).occupied,0);
      assert.equal(postTransfer.payload.rooms.find(r=>r.id===roomTwo.payload.id).occupied,1);
      const transferred=await call('/api/allocations','GET',undefined,b);
      assert.equal(transferred.payload.allocations[0].room_id,roomTwo.payload.id);
      const scopedNotice=await call('/api/announcements','POST',{
        title:'Wing C reading room',body:'The reading room closes at 22:00 on weekdays.',
        audience:'building',building:'Wing C',pinned:false
      },adminCookie);
      assert.equal(scopedNotice.status,201);
      assert.ok((await call('/api/announcements','GET',undefined,b)).payload.announcements.some(x=>x.id===scopedNotice.payload.id));
      assert.ok(!(await call('/api/announcements','GET',undefined,a)).payload.announcements.some(x=>x.id===scopedNotice.payload.id));
      const checkout=await call('/api/housing-changes','POST',{
        kind:'checkout',reason:'My exchange semester has finished.'
      },b);
      assert.equal(checkout.status,201);
      assert.equal((await call(`/api/housing-changes/${checkout.payload.id}/decision`,'POST',{
        decision:'approve',review_note:'Key return confirmed.'
      },adminCookie)).status,200);
      assert.equal((await call('/api/allocations','GET',undefined,b)).payload.allocations.length,0);
      assert.equal((await call('/api/rooms','GET',undefined,adminCookie)).payload.rooms.find(r=>r.id===roomTwo.payload.id).occupied,0);
      assert.equal((await call(`/api/announcements/${notice.payload.id}/status`,'POST',{
        status:'archived'
      },adminCookie)).status,200);
      assert.ok(!(await call('/api/announcements','GET',undefined,b)).payload.announcements.some(x=>x.id===notice.payload.id));
      assert.equal((await call('/api/me','PATCH',{name:'Student B Updated'},b)).status,200);
      assert.equal((await call('/api/me/password','POST',{
        current_password:studentPassword,new_password:'StudentChangedPass123'
      },b)).status,200);
      assert.equal((await call('/api/auth/logout','POST',undefined,b)).status,200);
      assert.equal((await call('/api/me','GET',undefined,b)).payload.user,null);
      // Concurrency regression: two students racing for the final bed must not overbook.
      const raceRoom = await call('/api/rooms', 'POST', {
        code:`R${suffix}`,building:'Race testing',floor:1,capacity:1
      },adminCookie);
      assert.equal(raceRoom.status,201);
      const competitors=[];
      for (const name of ['race-a','race-b']) {
        const email=`${name}-${suffix}@example.test`;
        assert.equal((await call('/api/auth/register','POST',{
          name,email,password:studentPassword
        })).status,201);
        const signedIn=await login(email);
        assert.equal(signedIn.status,200);
        const created=await call('/api/applications','POST',{
          preferred_room_id:raceRoom.payload.id,note:'Concurrency regression test'
        },signedIn.cookie);
        assert.equal(created.status,201);
        competitors.push({id:created.payload.id,cookie:signedIn.cookie});
      }
      const approvals=await Promise.all(competitors.map(c=>call(`/api/applications/${c.id}/decision`,'POST',{
        decision:'approve',room_id:raceRoom.payload.id
      },adminCookie)));
      assert.deepEqual(approvals.map(r=>r.status).sort((x,y)=>x-y),[200,409]);
      const afterRace=await call('/api/rooms','GET',undefined,adminCookie);
      const resolvedRoom=afterRace.payload.rooms.find(r=>r.id===raceRoom.payload.id);
      assert.equal(resolvedRoom.occupied,1);
      assert.equal(resolvedRoom.available,0);
      const allocationsAfterRace=await call('/api/allocations','GET',undefined,adminCookie);
      assert.equal(allocationsAfterRace.payload.allocations.filter(a=>a.room_id===raceRoom.payload.id).length,1);
      assert.equal((await call('/api/rooms','POST',{
        code:'INVALID',building:'A',floor:1,capacity:21
      },adminCookie)).status,400);
    } finally {
      await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    }
  }
);
