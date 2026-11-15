import { ensureDatabase } from '../db/index.js';

try {
  await ensureDatabase();
  console.log('Neon schema ready. Initial staff/rooms created if configured and absent.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
