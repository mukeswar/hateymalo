const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    // If MONGODB_URI is specified in environment, try connecting to it first
    if (uri) {
      try {
        console.log(`Connecting to MongoDB Atlas at: ${uri.split('@')[1] || uri}`);
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 8000,
        });
        console.log(`====================================================`);
        console.log(`  MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
        console.log(`====================================================`);
        
        // Auto-seed if Atlas database is newly connected and empty
        const seed = require('../seed');
        if (typeof seed.autoSeedIfEmpty === 'function') {
          await seed.autoSeedIfEmpty();
        }

        return conn;
      } catch (err) {
        console.log(`Specified MongoDB Atlas connection failed (${err.message}). Falling back to embedded In-Memory MongoDB...`);
      }
    }

    // Try local default mongod instance or launch MongoMemoryServer
    try {
      console.log('Connecting to local MongoDB at mongodb://127.0.0.1:27017/haatemalo...');
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/haatemalo', {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`Local MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.log('Local MongoDB not running. Starting embedded MongoMemoryServer...');
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
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
