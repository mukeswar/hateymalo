const { MongoMemoryServer } = require('mongodb-memory-server');

async function test() {
  console.log('Testing MongoMemoryServer with 60s timeout...');
  try {
    const mongo = await MongoMemoryServer.create({
      binary: {
        timeout: 60000,
      },
    });
    console.log('Success! URI:', mongo.getUri());
    await mongo.stop();
  } catch (err) {
    console.error('Failed:', err.message);
  }
}

test();
