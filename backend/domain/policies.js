import { fail, requiredText, safeId, optionalId, integer, oneOf, has,
  MAX_NOTES, CATEGORIES, PRIORITIES, REQUEST_STATES } from '../lib/validation.js';

// Data validation for real API routes. These functions are also unit-testable
// without opening a network connection or supplying a Neon database.
export function roomCreateFields(body) {
  return {
    code: requiredText(body.code, 'Room code', 1, 20).toUpperCase(),
    building: requiredText(body.building, 'Building', 1, 40),
    floor: integer(body.floor, 'Floor', 0, 100),
    capacity: integer(body.capacity, 'Capacity', 1, 20)
  };
}

export function roomUpdateFields(body) {
  const capacity = integer(body.capacity, 'Capacity', 1, 20);
  if (typeof body.active !== 'boolean') fail(400, 'Active must be true or false.');
  return {
    capacity,
    active: body.active,
    building: has(body, 'building') ? requiredText(body.building, 'Building', 1, 40) : null,
    floor: has(body, 'floor') ? integer(body.floor, 'Floor', 0, 100) : null
  };
}

export function announcementFields(body, now = Date.now()) {
  const title = requiredText(body.title, 'Title', 4, 120);
  const text = requiredText(body.body, 'Body', 10, 3000);
  const audience = oneOf(body.audience, ['all', 'building'], 'audience');
  const building = audience === 'building' ? requiredText(body.building, 'Building', 1, 40) : null;
  if (body.pinned !== undefined && typeof body.pinned !== 'boolean') fail(400, 'Pinned must be a boolean.');
  const pinned = body.pinned === true;
  const expiry = body.expires_at ? new Date(body.expires_at) : null;
  if (expiry && (Number.isNaN(expiry.getTime()) || expiry.getTime() <= now)) {
    fail(400, 'Expiry must be a valid future date.');
  }
  return [title, text, audience, building, pinned, expiry?.toISOString() || null];
}

export function newTicketFields(body) {
  return {
    category: oneOf(body.category, CATEGORIES, 'category'),
    priority: oneOf(body.priority || 'normal', PRIORITIES, 'priority'),
    title: requiredText(body.title, 'Title', 3, 120),
    description: requiredText(body.description, 'Description', 5, MAX_NOTES)
  };
}

export function ticketUpdateFields(body) {
  const status = oneOf(body.status, REQUEST_STATES, 'request status');
  const priority = oneOf(body.priority || 'normal', PRIORITIES, 'priority');
  const assignedTo = optionalId(body.assigned_to);
  const resolutionNote = body.resolution_note === undefined ? '' :
    requiredText(body.resolution_note, 'Resolution note', 0, MAX_NOTES);
  if (status === 'resolved' && resolutionNote.length < 5) {
    fail(400, 'Add a resolution note (at least 5 characters).');
  }
  return { status, priority, assignedTo, resolutionNote };
}

export function housingChangeFields(body) {
  const kind = oneOf(body.kind, ['transfer', 'checkout'], 'change type');
  const reason = requiredText(body.reason, 'Reason', 8, 1000);
  const target = kind === 'transfer' ? safeId(body.target_room_id) : null;
  return { kind, reason, target };
}
