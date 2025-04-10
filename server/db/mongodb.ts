import mongoose from 'mongoose';
import { log } from '../vite';

// Connection cache
let cachedConnection: mongoose.Connection | null = null;
let connectionPromise: Promise<mongoose.Connection> | null = null;

/**
 * Connect to MongoDB Atlas
 */
export async function connectToDatabase(): Promise<mongoose.Connection> {
  try {
    if (cachedConnection?.readyState === 1) {
      console.log('[mongodb] Using cached database connection');
      return cachedConnection;
    }

    if (!process.env.MONGODB_URI) {
      console.warn('[mongodb] MongoDB URI not provided');
      throw new Error('MongoDB URI not provided');
    }
    
    // Close any existing connection if not in the right state
    if (mongoose.connection.readyState !== 0 && mongoose.connection.readyState !== 1) {
      console.log('[mongodb] Closing existing connection in incorrect state');
      await mongoose.connection.close();
    }

    const connectOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,        // Limiting connections for serverless
      minPoolSize: 1,         // Keep at least one connection open
      maxIdleTimeMS: 30000,   // Close idle connections after 30 seconds
      family: 4               // Force IPv4
    };

    console.log('[mongodb] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, connectOptions);
    console.log('[mongodb] Connected to MongoDB successfully');

    cachedConnection = mongoose.connection;

    mongoose.connection.on('error', (err) => {
      console.error('[mongodb] Connection error:', err);
      cachedConnection = null; // Reset cache on error
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[mongodb] Disconnected');
      cachedConnection = null;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[mongodb] Reconnected successfully');
      cachedConnection = mongoose.connection;
    });

    return cachedConnection;
  } catch (error) {
    console.error('[mongodb] Connection error:', error);
    cachedConnection = null;
    throw error;
  }
}

/**
 * Get the MongoDB client for performing operations
 */
export async function getMongoClient(): Promise<mongoose.Connection> {
  if (cachedConnection) {
    return cachedConnection;
  }

  return await connectToDatabase();
}

/**
 * Disconnect from MongoDB (useful for tests and cleanup)
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    cachedConnection = null;
    log('Disconnected from MongoDB', 'mongodb');
  }
}

/**
 * Connect function optimized for serverless environments
 * This reuses connections when possible to avoid connection limits
 */
export async function connectForServerless(): Promise<mongoose.Connection> {
  // If we have an existing connection, reuse it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('[mongodb] Reusing existing connection for serverless function');
    return cachedConnection;
  }
  
  // If we're already in the process of connecting, wait for that to finish
  if (connectionPromise) {
    console.log('[mongodb] Connection in progress, waiting...');
    try {
      return await connectionPromise;
    } catch (error) {
      console.error('[mongodb] Error in existing connection promise:', error);
      connectionPromise = null; // Clear the failed promise
      // Continue with a new connection attempt
    }
  }
  
  // Otherwise initiate a new connection
  try {
    console.log('[mongodb] Initiating new serverless connection');
    
    // Store the promise to avoid multiple connection attempts
    connectionPromise = connectToDatabase();
    const connection = await connectionPromise;
    
    // For serverless environments, set a timer to close the connection 
    // after some idle time to prevent connection hanging
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        if (mongoose.connection.readyState === 1) {
          console.log('[mongodb] Closing idle serverless connection');
          mongoose.connection.close()
            .catch(err => console.error('[mongodb] Error closing connection:', err));
        }
      }, 60000); // Close after 1 minute of inactivity
    }
    
    return connection;
  } catch (error) {
    console.error('[mongodb] Serverless connection error:', error);
    // If MongoDB URI is not provided, don't treat it as a fatal error in production
    if (error.message === 'MongoDB URI not provided' && process.env.NODE_ENV === 'production') {
      console.warn('[mongodb] Running without MongoDB in production');
      return null;
    }
    throw error;
  } finally {
    // Clear the promise reference once done (success or failure)
    connectionPromise = null;
  }
}