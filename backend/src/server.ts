import app from './app';
import { connectDB, redisClient } from './config';
import { env } from './config/env';

const PORT = env.PORT || 3000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected');

    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Redis connected');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
🚀 Momentum12 API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server:     http://localhost:${PORT}
📍 API:        http://localhost:${PORT}/api/v1
📍 Health:     http://localhost:${PORT}/api/v1/health
📍 Environment: ${env.NODE_ENV}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 SIGTERM received. Shutting down gracefully...');
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  await redisClient.disconnect();
  process.exit(0);
});

startServer();

