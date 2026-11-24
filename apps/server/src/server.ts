import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { pool } from './config/db.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'gharsewa-api' });
});

app.use('/api/auth', authRoutes);

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Invalid request', details: error.flatten() });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};

app.use(errorHandler);

const port = Number(process.env.PORT ?? 5000);

async function start(): Promise<void> {
  await pool.query('SELECT 1');
  app.listen(port, () => {
    console.log(`GharSewa API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});