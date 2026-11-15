import { parseCookies, tokenHash } from './validation.js';

// The query adapter can be replaced by a deterministic in-memory adapter in HTTP tests.
// Production always supplies the Neon adapter.
export function createRequestContext({ query }) {
  async function loadUser(req) {
    const token = parseCookies(req).session;
    if (!token || !/^[0-9a-f]{96}$/.test(token)) return null;
    const rows = await query(`SELECT u.id,u.name,u.email,u.role FROM sessions s
      JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > now()`, [tokenHash(token)]);
    return rows[0] || null;
  }
  // Audit/notification writes are secondary to the core transaction. They must not
  // turn a successfully saved action into an apparent failure on the client.
  async function sideEffect(statement, params) {
    try { await query(statement, params); }
    catch (error) { console.error('Supplementary record failed:', error); }
  }
  function audit(actor, action, entity, entityId, summary) {
    return sideEffect(`INSERT INTO audit_events(actor_id,action,entity,entity_id,summary)
      VALUES($1,$2,$3,$4,$5)`, [actor, action, entity, entityId, summary]);
  }
  function notify(studentId, title, body, targetType, targetId) {
    return sideEffect(`INSERT INTO notifications(user_id,title,body,target_type,target_id)
      VALUES($1,$2,$3,$4,$5)`, [studentId,title,body,targetType,targetId]);
  }
  return { query, loadUser, audit, notify };
}
