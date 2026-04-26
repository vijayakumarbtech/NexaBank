const crypto = require('crypto');
const { BlockchainLog } = require('../models');
const logger = require('../utils/logger');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const calculateHash = (index, timestamp, data, previousHash, nonce = 0) => {
  const content = `${index}${timestamp}${JSON.stringify(data)}${previousHash}${nonce}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

const getLastBlock = async () => {
  return BlockchainLog.findOne().sort({ index: -1 });
};

const addBlock = async (data) => {
  try {
    const lastBlock = await getLastBlock();

    let index = 0;
    let previousHash = GENESIS_HASH;

    if (lastBlock) {
      index = lastBlock.index + 1;
      previousHash = lastBlock.hash;
    }

    const timestamp = new Date();
    const hash = calculateHash(index, timestamp.toISOString(), data, previousHash);

    const block = await BlockchainLog.create({
      index,
      timestamp,
      data,
      previousHash,
      hash
    });

    logger.info(`Block #${index} added to blockchain: ${hash.substring(0, 16)}...`);
    return block;
  } catch (error) {
    logger.error('Error adding block to blockchain:', error);
    throw error;
  }
};

const validateChain = async () => {
  try {
    const blocks = await BlockchainLog.find().sort({ index: 1 });

    if (blocks.length === 0) return { valid: true, message: 'Empty chain' };

    for (let i = 1; i < blocks.length; i++) {
      const current = blocks[i];
      const previous = blocks[i - 1];

      // Verify hash integrity
      const recalculated = calculateHash(
        current.index,
        current.timestamp.toISOString(),
        current.data,
        current.previousHash,
        current.nonce
      );

      if (current.hash !== recalculated) {
        return {
          valid: false,
          message: `Block #${current.index} hash is invalid`,
          compromisedBlock: current.index
        };
      }

      // Verify chain linkage
      if (current.previousHash !== previous.hash) {
        return {
          valid: false,
          message: `Block #${current.index} previous hash mismatch`,
          compromisedBlock: current.index
        };
      }
    }

    return { valid: true, message: `Chain valid (${blocks.length} blocks)`, blockCount: blocks.length };
  } catch (error) {
    logger.error('Chain validation error:', error);
    throw error;
  }
};

const getChain = async (limit = 50, skip = 0) => {
  return BlockchainLog.find()
    .sort({ index: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = { addBlock, validateChain, getChain, calculateHash };
