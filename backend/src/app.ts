import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { env, connectDatabase, connectRedis, disconnectDatabase, disconnectRedis } from './config/index.js';
import { errorHandler, notFoundHandler, globalRateLimiter } from './middleware/index.js';
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { planRoutes } from './routes/plan.routes.js';
import { habitRoutes } from './routes/habit.routes.js';
import { executionRoutes } from './routes/execution.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';

const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: env.isProduction 
      ? ['https://momentum12.app'] 
      : ['http://localhost:3000', 'http://localhost:8081', 'exp://'],
    credentials: true,
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // Logging
  if (env.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting
  app.use(globalRateLimiter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ 
      success: true, 
      message: 'Momentum12 API is running',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    });
  });

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/plans', planRoutes);
  app.use('/api/v1/habits', habitRoutes);
  app.use('/api/v1/executions', executionRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
};

const startServer = async (): Promise<void> => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    const app = createApp();

    const server = app.listen(env.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Momentum12 API Server                                ║
║                                                           ║
║   Environment: ${env.nodeEnv.padEnd(40)}║
║   Port: ${String(env.port).padEnd(47)}║
║   Health: http://localhost:${env.port}/health               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        await disconnectDatabase();
        await disconnectRedis();
        console.log('All connections closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { createApp };

