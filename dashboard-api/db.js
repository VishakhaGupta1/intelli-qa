const { MongoClient } = require('mongodb');
const logger = require('./logger');
let db;
let client;

function buildMongoUri() {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const database = process.env.MONGO_DB_NAME || 'qa_platform';
  const username = process.env.MONGO_USERNAME;
  const password = process.env.MONGO_PASSWORD;
  const authSource = process.env.MONGO_AUTH_SOURCE || database;
  const credentials = username && password
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : '';
  const authQuery = username && password
    ? `?authSource=${encodeURIComponent(authSource)}`
    : '';

  return `mongodb://${credentials}${host}:${port}/${database}${authQuery}`;
}

async function connectDb() {
  try {
    client = new MongoClient(buildMongoUri(), {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 5000)
    });
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || 'qa_platform');
    logger.info('MongoDB connected');
  } catch (e) {
    logger.error('MongoDB connection failed', { error: e.message });
  }
}
async function closeDb() {
  if (client) {
    await client.close();
  }
}
function getDb() { return db; }
module.exports = { connectDb, closeDb, getDb };
