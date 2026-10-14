const mongoose = require('mongoose');

let mongoMemoryServer = null;
let connectionPromise = null;

// Serverless (Vercel) has no local mongod and cannot run MongoMemoryServer,
// and must never process.exit() — so only the Atlas URI is used there.
const isServerless = !!process.env.VERCEL;

const connectAtlas = async (uri) => {
  console.log(`Connecting to MongoDB Atlas at: ${uri.split('@')[1] || uri}`);
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`====================================================`);
  console.log(`  MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
  console.log(`====================================================`);

  // Seed demo data only into a completely empty database. seedData() wipes
  // every collection, so it must never run against a live DB that has users.
  const seed = require('../seed');
  if (typeof seed.autoSeedIfEmpty === 'function') {
    await seed.autoSeedIfEmpty({ onlyIfNoUsers: true });
  }

  return conn;
};

const connectLocalFallback = async () => {
  try {
    console.log('Connecting to local MongoDB at mongodb://127.0.0.1:27017/haatemalo...');
    const conn = await mongoose.connect('mongodb://127.0.0.1:27017/haatemalo', {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`Local MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.log('Local MongoDB not running. Starting embedded MongoMemoryServer...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create({
      binary: {
        timeout: 60000,
      },
    });
    const memUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`Embedded In-Memory MongoDB Connected at: ${memUri}`);

    // Auto seed memory DB
    const seed = require('../seed');
    if (typeof seed.autoSeedIfEmpty === 'function') {
      await seed.autoSeedIfEmpty();
    }

    return conn;
  }
};

const connect = async () => {
  const uri = process.env.MONGODB_URI;

  if (isServerless) {
    if (!uri) throw new Error('MONGODB_URI is not set in the Vercel environment variables');
    return connectAtlas(uri);
  }

  // If MONGODB_URI is specified in environment, try connecting to it first
  if (uri) {
    try {
      return await connectAtlas(uri);
    } catch (err) {
      console.log(`Specified MongoDB Atlas connection failed (${err.message}). Falling back to embedded In-Memory MongoDB...`);
    }
  }

  return connectLocalFallback();
};

// Returns one shared connection promise, so warm serverless invocations reuse
// the existing connection and a failed attempt can be retried on the next request.
const connectDB = () => {
  if (!connectionPromise) {
    connectionPromise = connect().catch((error) => {
      console.error(`Database Connection Error: ${error.message}`);
      connectionPromise = null;
      if (!isServerless) process.exit(1);
      throw error;
    });
  }
  return connectionPromise;
};

module.exports = connectDB;
