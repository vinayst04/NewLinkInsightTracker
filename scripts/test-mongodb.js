import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Setup for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testMongoDBConnection() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set!');
    console.error('Please create a .env file with your MongoDB connection string');
    console.error('You can use .env.example as a template');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    console.log('Using connection string:', process.env.MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:***@'));
    
    // Connection options matching our application
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s
      family: 4, // Use IPv4, skip trying IPv6
    });
    
    console.log('Successfully connected to MongoDB!');
    
    // Get connection information
    const { host, port, name } = mongoose.connection;
    console.log(`Connected to database: ${name} at ${host}:${port}`);
    
    // Test with timeouts
    console.log('\nTesting connection stability...');
    const testCounts = {
      users: await mongoose.connection.db.collection('users').countDocuments(),
      links: await mongoose.connection.db.collection('links').countDocuments(),
      clicks: await mongoose.connection.db.collection('clicks').countDocuments(),
    };
    console.log('Collection counts:', testCounts);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    if (collections.length === 0) {
      console.log('No collections found (empty database)');
    } else {
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }
    
    console.log('\nConnection test successful!');
    console.log('Fallback mechanism is not needed - MongoDB connection is working properly.');
  } catch (error) {
    console.error('\nFailed to connect to MongoDB:', error.message);
    console.log('\nApplication will fallback to in-memory storage if this occurs.');
    console.log('Check your MongoDB connection string and network settings.');
    console.log('Common issues:');
    console.log('1. Incorrect username or password');
    console.log('2. IP address not whitelisted in MongoDB Atlas');
    console.log('3. Network firewall blocking MongoDB connections');
    console.log('4. SSL/TLS certificate issues');
    process.exit(1);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

testMongoDBConnection();