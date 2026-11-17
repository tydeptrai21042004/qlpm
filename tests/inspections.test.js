import test from 'node:test';
import assert from 'node:assert/strict';
import { registerRoomInspectionsRoutes, validateInspection, INSPECTION_FIELDS } from '../backend/routes/room-inspections.js';

const valid = () => ({door_state:'ok',lighting_state:'ok',fan_state:'issue',furniture_state:'unchecked',bathroom_state:'ok',note:'Quạt yếu'});
function harness(insertReturn=[{id:15}]) {
  const handlers = new Map(), calls = [], audits = [];
  const app={get:(path,fn)=>handlers.set(`GET ${path}`,fn),post:(path,fn)=>handlers.set(`POST ${path}`,fn)};
  const query=async(statement,params=[])=>{calls.push({statement,params});return statement.includes('INSERT INTO room_inspections')?insertReturn:[];};
  const audit=async(...args)=>{audits.push(args);};
  registerRoomInspectionsRoutes(app,{query,audit});
  async function run(method,req) {
    const response={statusCode:200,body:undefined,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
    try{await handlers.get(`${method} /api/room-inspections`)(req,response);}
    catch(error){response.statusCode=error.status||500;response.body={error:error.message};}
    return response;
  }
  return {run,calls,audits};
}

test('inspection schema rejects unexpected status, oversize text, and malformed bodies',()=>{
  assert.deepEqual(INSPECTION_FIELDS.length,5);
  assert.equal(validateInspection(valid()).conditions.filter(v=>v==='issue').length,1);
  for (const altered of [{...valid(),door_state:'broken'}, {...valid(),note:'a'.repeat(1001)},[],null]) {
    assert.throws(()=>validateInspection(altered),{status:400});
  }
});

test('inspection API requires a student and uses assigned room from database',async()=>{
  const h=harness();
  assert.equal((await h.run('POST',{user:null,body:valid()})).statusCode,401);
  assert.equal((await h.run('POST',{user:{id:1,role:'staff'},body:valid()})).statusCode,403);
  assert.equal((await h.run('POST',{user:{id:2,role:'student'},body:{...valid(),fan_state:'bad'}})).statusCode,400);
  const response=await h.run('POST',{user:{id:2,role:'student'},body:{...valid(),room_id:999}});
  assert.equal(response.statusCode,201);
  assert.deepEqual(response.body,{id:15});
  const write=h.calls.find(x=>x.statement.includes('INSERT INTO room_inspections'));
  assert.match(write.statement,/FROM allocations a WHERE a.student_id=\$1/);
  assert.equal(write.params[0],2);
  assert.ok(!write.params.includes(999),'client room_id must not be used');
  assert.deepEqual(h.audits[0].slice(0,4),[2,'room_inspection_recorded','room_inspections',15]);
});

test('inspection submit rejects student without an active room',async()=>{
  const h=harness([]);
  const response=await h.run('POST',{user:{id:2,role:'student'},body:valid()});
  assert.equal(response.statusCode,409);
  assert.equal(h.audits.length,0);
});

test('inspection listings enforce student ownership in SQL; staff can see all',async()=>{
  const h=harness();
  assert.equal((await h.run('GET',{user:null})).statusCode,401);
  assert.equal((await h.run('GET',{user:{id:2,role:'student'}})).statusCode,200);
  assert.deepEqual(h.calls[0].params,['student',2]);
  assert.match(h.calls[0].statement,/c.student_id=\$2/);
  assert.equal((await h.run('GET',{user:{id:1,role:'staff'}})).statusCode,200);
  assert.deepEqual(h.calls[1].params,['staff',1]);
});
