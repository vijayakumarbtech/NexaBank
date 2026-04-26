const User = require('../models/User');
const logger = require('./logger');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bankplatform.com';
    const existing = await User.findOne({ email: adminEmail });

    if (!existing) {
      await User.create({
        firstName: 'System',
        lastName: 'Admin',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        role: 'admin',
        isVerified: true,
        isActive: true,
        balance: 0
      });
      logger.info(`Admin user created: ${adminEmail}`);
    }

    // Seed a manager
    const managerEmail = 'manager@bankplatform.com';
    const existingManager = await User.findOne({ email: managerEmail });
    if (!existingManager) {
      await User.create({
        firstName: 'Risk',
        lastName: 'Manager',
        email: managerEmail,
        password: 'Manager@123456',
        role: 'manager',
        isVerified: true,
        isActive: true,
        balance: 0
      });
      logger.info(`Manager user created: ${managerEmail}`);
    }
  } catch (error) {
    logger.error('Seed error:', error);
  }
};

module.exports = { seedAdmin };
