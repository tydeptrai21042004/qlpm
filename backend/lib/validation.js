import { createHash, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_SECONDS = 8 * 60 * 60;
export const MAX_NOTES = 1000;
export const CATEGORIES = ['maintenance', 'cleaning', 'other'];
export const PRIORITIES = ['low', 'normal', 'high'];
export const REQUEST_STATES = ['open', 'in_progress', 'resolved'];
export const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function fail(status, message) { throw new ApiError(status, message); }
export function requiredText(value, label, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    fail(400, `${label} must contain ${min}-${max} characters.`);
  }
  return value.trim();
}
export function safeId(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) fail(400, 'Invalid ID.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) fail(400, 'Invalid ID.');
  return number;
}
export function optionalId(value) { return value == null || value === '' ? null : safeId(value); }
export function integer(value, label, min, max) {
  if (typeof value === 'string' && !/^-?\d+$/.test(value)) fail(400, `${label} must be an integer from ${min} to ${max}.`);
  const number = Number(value);
  if (typeof value === 'boolean' || value === '' || value === null || value === undefined || !Number.isInteger(number) || number < min || number > max) {
    fail(400, `${label} must be an integer from ${min} to ${max}.`);
  }
  return number;
}
export function oneOf(value, options, label) {
  if (!options.includes(value)) fail(400, `Invalid ${label}.`);
  return value;
}
export function validEmail(value) {
  return typeof value === 'string' && value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validPassword(password, min = 8) {
  return typeof password === 'string' && password.length >= min && password.length <= 128 && /[a-z]/i.test(password) && /\d/.test(password);
}
export function verifyPassword(candidate, stored) {
  try {
    const [method, salt, digest] = stored.split(':');
    if (method !== 'scrypt') return false;
    const expected = Buffer.from(digest, 'hex');
    const actual = scryptSync(candidate, salt, 64);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
export function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
export function parseCookies(req) {
  const parsed = Object.create(null);
  for (const item of (req.get('cookie') || '').split(';')) {
    const separator = item.indexOf('=');
    if (separator >= 0) parsed[item.slice(0, separator).trim()] = item.slice(separator + 1).trim();
  }
  return parsed;
}
export function sessionCookie(value, req, maxAge = SESSION_SECONDS) {
  const secure = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production' || req.secure;
  return `session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
export function requireUser(req, role) {
  if (!req.user) fail(401, 'Please sign in.');
  if (role && req.user.role !== role) fail(403, 'Not permitted for your role.');
  return req.user;
}
