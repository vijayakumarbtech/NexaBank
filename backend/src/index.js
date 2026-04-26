require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./services/socketService');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { seedAdmin } = require('./utils/seed');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to database and start server
const start = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected successfully');

    await seedAdmin();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
