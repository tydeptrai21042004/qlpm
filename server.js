// Thin Node/Vercel entry point. See backend/ for the complete API implementation.
import { createApp } from './backend/app.js';

const app = createApp();

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => console.log(`Campus Housing API on http://localhost:${port}`));
}

export default app;
