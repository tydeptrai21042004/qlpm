import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError, requiredText, safeId, optionalId, integer, oneOf,
  validEmail, validPassword, verifyPassword, tokenHash,
  parseCookies, sessionCookie, requireUser
} from '../backend/lib/validation.js';
import {
  roomCreateFields, roomUpdateFields, announcementFields,
  newTicketFields, ticketUpdateFields, housingChangeFields
} from '../backend/domain/policies.js';
import { passwordHash } from '../backend/lib/password.js';
import { createRequestContext } from '../backend/lib/context.js';

const rejects400 = fn => assert.throws(fn, error => error instanceof ApiError && error.status === 400);

test('IDs accept positive PostgreSQL integer primary keys only', () => {
  assert.equal(safeId('12'), 12);
  assert.equal(safeId(123), 123);
  for (const input of [0, '0', '-1', '1.2', 1.4, {}, false, '1 OR 1=1', '2147483648', '1e3']) rejects400(() => safeId(input));
  assert.equal(optionalId(''), null);
  assert.equal(optionalId(null), null);
  assert.equal(optionalId('9'), 9);
});

test('text validation trims and rejects blank, too short and oversized content', () => {
  assert.equal(requiredText('  Hello  ', 'Field', 2, 10), 'Hello');
  rejects400(() => requiredText('  ', 'Field'));
  rejects400(() => requiredText(null, 'Field'));
  rejects400(() => requiredText('x', 'Field', 2));
  rejects400(() => requiredText('x'.repeat(11), 'Field', 1, 10));
  assert.equal(requiredText('', 'Optional', 0, 100), '');
});

test('numeric fields reject misleading or non-decimal values', () => {
  for (const input of ['', ' ', '0x10', '1e2', '5.3', true, undefined, null, NaN, -1, 21]) {
    rejects400(() => integer(input, 'Beds', 0, 20));
  }
  assert.equal(integer('0', 'Floor', 0, 100), 0);
  assert.equal(integer(20, 'Beds', 1, 20), 20);
  assert.equal(oneOf('open', ['open', 'resolved'], 'state'), 'open');
  rejects400(() => oneOf('waiting', ['open', 'resolved'], 'state'));
});

test('email, password and password hashes enforce expected formats', () => {
  assert.equal(validEmail('student@example.edu'), true);
  assert.equal(validEmail('not-email'), false);
  assert.equal(validEmail('x'.repeat(161) + '@example.com'), false);
  assert.equal(validPassword('CorrectPass123'), true);
  assert.equal(validPassword('short1'), false);
  assert.equal(validPassword('NoDigitsHere'), false);
  assert.equal(validPassword('12345678'), false);
  const encoded = passwordHash('CorrectPass123');
  assert.match(encoded, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword('CorrectPass123', encoded), true);
  assert.equal(verifyPassword('WrongPass123', encoded), false);
  assert.equal(verifyPassword('CorrectPass123', 'bad:hash'), false);
});

test('cookies and role guards do not authorize missing users or mismatched roles', () => {
  const req = {get: key => key === 'cookie' ? 'x=1; session=abc123; y=2' : '', secure:false};
  assert.equal(parseCookies(req).session,'abc123');
  assert.match(tokenHash('abc123'),/^[0-9a-f]{64}$/);
  assert.match(sessionCookie('abc123',req),/HttpOnly; SameSite=Strict/);
  assert.doesNotMatch(sessionCookie('abc123',req),/; Secure$/);
  assert.match(sessionCookie('abc123',{...req,secure:true}),/; Secure$/);
  assert.equal(requireUser({user:{id:1,role:'student'}}, 'student').id,1);
  assert.throws(() => requireUser({user:null}), e => e.status===401);
  assert.throws(() => requireUser({user:{id:1,role:'student'}}, 'staff'), e => e.status===403);
});

test('room creation normalizes codes and validates capacity boundaries', () => {
  assert.deepEqual(roomCreateFields({code:' a101 ',building:' Main ',floor:'0',capacity:'20'}),
    {code:'A101',building:'Main',floor:0,capacity:20});
  rejects400(() => roomCreateFields({code:'A',building:'B',floor:1,capacity:0}));
  rejects400(() => roomCreateFields({code:'A',building:'B',floor:1,capacity:21}));
  rejects400(() => roomCreateFields({code:'A',building:'B',floor:101,capacity:4}));
  rejects400(() => roomCreateFields({code:' ',building:'B',floor:1,capacity:2}));
});

test('room edit requires an explicit boolean state', () => {
  assert.deepEqual(roomUpdateFields({capacity:3,active:true}),
    {capacity:3,active:true,building:null,floor:null});
  assert.deepEqual(roomUpdateFields({capacity:2,active:false,building:'A',floor:5}),
    {capacity:2,active:false,building:'A',floor:5});
  rejects400(() => roomUpdateFields({capacity:3,active:'false'}));
  rejects400(() => roomUpdateFields({capacity:3}));
});

test('announcements have audience, expiry and boolean validation', () => {
  const sample={title:'Inspection day',body:'The residence will be inspected.',audience:'all'};
  assert.deepEqual(announcementFields(sample,Date.parse('2026-11-15')),
    ['Inspection day','The residence will be inspected.','all',null,false,null]);
  const expiry='2026-12-01T00:00:00.000Z';
  assert.equal(announcementFields({...sample,expires_at:expiry},Date.parse('2026-11-15'))[5],expiry);
  rejects400(() => announcementFields({...sample,audience:'unknown'}));
  rejects400(() => announcementFields({...sample,audience:'building'}));
  rejects400(() => announcementFields({...sample,pinned:'yes'}));
  rejects400(() => announcementFields({...sample,expires_at:'invalid'}));
  rejects400(() => announcementFields({...sample,expires_at:'2020-01-01'}));
  assert.equal(announcementFields({...sample,audience:'building',building:'Block C'})[3],'Block C');
});

test('tickets validate fields and require a resolution note before closing', () => {
  const ticket=newTicketFields({category:'maintenance',title:'Broken lamp',description:'Lamp is broken'});
  assert.deepEqual(ticket,{category:'maintenance',priority:'normal',title:'Broken lamp',description:'Lamp is broken'});
  rejects400(() => newTicketFields({category:'billing',title:'Broken lamp',description:'Lamp is broken'}));
  rejects400(() => newTicketFields({category:'maintenance',title:'Hi',description:'Lamp is broken'}));
  rejects400(() => newTicketFields({category:'maintenance',title:'Broken lamp',description:'No'}));
  assert.deepEqual(ticketUpdateFields({status:'in_progress',priority:'high',assigned_to:'2'}),
    {status:'in_progress',priority:'high',assignedTo:2,resolutionNote:''});
  rejects400(() => ticketUpdateFields({status:'resolved',priority:'normal'}));
  rejects400(() => ticketUpdateFields({status:'resolved',resolution_note:'Done'}));
  assert.equal(ticketUpdateFields({status:'resolved',resolution_note:'Resolved successfully'}).status,'resolved');
});

test('move out and transfer inputs enforce correct destination semantics', () => {
  assert.deepEqual(housingChangeFields({kind:'checkout',reason:'End of the semester'}),
    {kind:'checkout',reason:'End of the semester',target:null});
  assert.deepEqual(housingChangeFields({kind:'transfer',reason:'Closer to my classes',target_room_id:'7'}),
    {kind:'transfer',reason:'Closer to my classes',target:7});
  rejects400(() => housingChangeFields({kind:'transfer',reason:'Closer to my classes'}));
  rejects400(() => housingChangeFields({kind:'checkout',reason:'Short'}));
  rejects400(() => housingChangeFields({kind:'unexpected',reason:'A very long reason'}));
});


test('session context loads only authenticated tokens through the SQL adapter', async () => {
  const token='e'.repeat(96), expected=tokenHash(token);
  const calls=[];
  const user={id:8,name:'Resident Test',email:'resident@test.edu',role:'student'};
  const ctx=createRequestContext({query:async(sql,params)=>{
    calls.push({sql,params});return params[0]===expected?[user]:[];
  }});
  const req=value=>({get:name=>name==='cookie'?`session=${value}`:''});
  assert.deepEqual(await ctx.loadUser(req(token)),user);
  assert.equal(calls.length,1);
  assert.equal(calls[0].params[0],expected);
  assert.equal(await ctx.loadUser(req('not-a-valid-session')),null);
  assert.equal(calls.length,1,'Invalid cookie must not trigger a database query');
});

test('audit and notification context writes are separate from primary operations',async()=>{
  const calls=[];
  const ctx=createRequestContext({query:async(sql,params)=>{calls.push({sql,params});return [];}});
  await ctx.audit(1,'room_created','rooms',19,'Added room');
  await ctx.notify(2,'Reviewed','Application approved','applications',7);
  assert.equal(calls.length,2);
  assert.match(calls[0].sql,/INSERT INTO audit_events/);
  assert.deepEqual(calls[0].params,[1,'room_created','rooms',19,'Added room']);
  assert.match(calls[1].sql,/INSERT INTO notifications/);
  assert.deepEqual(calls[1].params,[2,'Reviewed','Application approved','applications',7]);
});
