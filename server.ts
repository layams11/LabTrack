import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './server/data/store.js';
import authRoutes from './server/routes/authRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import instrumentRoutes from './server/routes/instrumentRoutes.js';
import bookingRoutes from './server/routes/bookingRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';
import utilizationRoutes from './server/routes/utilizationRoutes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(cors());
  app.use(express.json());

  // Initialize DB connection
  await connectDB(process.env.MONGO_URI);

  // Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/instruments', instrumentRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/utilization', utilizationRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'online',
      project: 'Centralized Scientific Instrument Booking & Utilization Tracking System (2-Role Auth)',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Vite development server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: parseInt(process.env.HMR_PORT || '24680', 10) },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

  const startListening = (port: number) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`Centralized Scientific Instrument Booking server running!`);
      console.log(`Local URL: http://localhost:${port}`);
      console.log(`API Base:  http://localhost:${port}/api`);
      console.log(`====================================================`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Server] Port ${port} is in use, trying port ${port + 1}...`);
        startListening(port + 1);
      } else {
        console.error('[Server Error]', err);
      }
    });
  };

  startListening(DEFAULT_PORT);
}

startServer();
