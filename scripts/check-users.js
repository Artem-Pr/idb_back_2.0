/* eslint-disable @typescript-eslint/no-var-requires */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function checkUsers() {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const possibleDbNames = ['idb_back_2', 'IDBase', 'idb_back_2.0'];

  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(mongoUrl);
    await client.connect();

    for (const dbName of possibleDbNames) {
      console.log(`\n🔍 Checking database: ${dbName}`);
      console.log('=====================================');

      const db = client.db(dbName);
      const usersCollection = db.collection('users');

      // Find all users
      const users = await usersCollection.find({}).toArray();

      console.log(`Found ${users.length} users in database '${dbName}':`);

      for (const user of users) {
        console.log(`ID: ${user._id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Password Hash: ${user.password.substring(0, 20)}...`);
        console.log(`Created: ${user.createdAt}`);
        console.log('-------------------------------------');

        // Test password verification
        const testPassword = 'password123';
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`Password '${testPassword}' matches: ${isValid}`);
      }
    }

    await client.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  }
}

checkUsers();
