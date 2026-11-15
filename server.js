import express from 'express';
import { createApp } from './backend/app.js';

// Vercel detects Express from a direct import in this root entrypoint.
// Keep the API, security middleware, and Neon access in backend/app.js.
const app = express();
app.use(createApp());

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => console.log(`Campus Housing API on http://localhost:${port}`));
}

export default app;
