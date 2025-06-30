/* eslint-disable @typescript-eslint/no-var-requires */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function createTestUser() {
  // Configuration - use the correct database name that NestJS app uses
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = 'IDBase'; // This is the database the NestJS app uses

  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
  };

  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(mongoUrl);
    await client.connect();

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      username: testUser.username,
    });

    if (existingUser) {
      console.log(
        `✅ Test user '${testUser.username}' already exists in ${dbName}!`,
      );
      console.log('Credentials:');
      console.log(`  Username: ${testUser.username}`);
      console.log(`  Password: ${testUser.password}`);
      console.log(`  Email: ${testUser.email}`);
      console.log(`  Role: ${testUser.role}`);
      console.log(`  Database: ${dbName}`);
      await client.close();
      return;
    }

    // Hash the password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(testUser.password, salt);

    // Create user document
    const userDoc = {
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword,
      role: testUser.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert user
    console.log(`Creating test user in database '${dbName}'...`);
    const result = await usersCollection.insertOne(userDoc);

    if (result.insertedId) {
      console.log('✅ Test user created successfully!');
      console.log('Credentials:');
      console.log(`  Username: ${testUser.username}`);
      console.log(`  Password: ${testUser.password}`);
      console.log(`  Email: ${testUser.email}`);
      console.log(`  Role: ${testUser.role}`);
      console.log(`  User ID: ${result.insertedId}`);
      console.log(`  Database: ${dbName}`);
      console.log('');
      console.log('🔗 Use these credentials to:');
      console.log('  1. Login via REST API: POST /auth/login');
      console.log('  2. Get JWT token from login response');
      console.log(
        '  3. Connect to WebSocket: ws://localhost:3001/?token=YOUR_JWT_TOKEN',
      );
    } else {
      console.log('❌ Failed to create user');
    }

    await client.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure MongoDB is running:');
      console.log('  - Check if MongoDB is started');
      console.log('  - Verify the connection URL in your .env file');
      console.log('  - Try: npm run mongo-dev');
    }

    if (error.message.includes('MongoServerError')) {
      console.log('\n💡 Database/Collection might not exist yet:');
      console.log(
        '  - Start your NestJS application first to create the database',
      );
      console.log('  - Then run this script again');
    }
  }
}

console.log('🚀 Test User Creation Script');
console.log('============================');
console.log(
  'This script creates a test user for WebSocket authentication testing',
);
console.log('');

// Run the script
createTestUser();
