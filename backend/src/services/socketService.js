const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io;
const userSockets = new Map(); // userId -> socketId

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('register', (userId) => {
      if (userId) {
        userSockets.set(userId.toString(), socket.id);
        socket.userId = userId;
        logger.info(`User ${userId} registered with socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId.toString());
      }
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToUser = (userId, event, data) => {
  const socketId = userSockets.get(userId.toString());
  if (socketId && io) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const emitToAdmins = (event, data) => {
  if (io) {
    io.emit(`admin:${event}`, data);
  }
};

const emitFraudAlert = (userId, alertData) => {
  emitToUser(userId, 'fraud:alert', alertData);
  emitToAdmins('fraud:alert', { userId, ...alertData });
};

const emitPaymentUpdate = (userId, paymentData) => {
  emitToUser(userId, 'payment:update', paymentData);
};

const emitLoginAlert = (userId, loginData) => {
  emitToUser(userId, 'login:alert', loginData);
};

const emitTransactionUpdate = (userId, txData) => {
  emitToUser(userId, 'transaction:update', txData);
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToAll,
  emitToAdmins,
  emitFraudAlert,
  emitPaymentUpdate,
  emitLoginAlert,
  emitTransactionUpdate
};
