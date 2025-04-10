// Simple Express server for Vercel deployment
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { UserModel } from './server/db/models/user.model.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default_secret_for_development',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true
  }
};

// Use MongoDB for sessions if available
if (process.env.MONGODB_URI) {
  try {
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions'
    });
    console.log('Using MongoDB for session storage');
  } catch (err) {
    console.error('Failed to create MongoDB session store:', err);
  }
}

app.use(session(sessionConfig));

// Setup Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
async function connectDB() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  } else {
    console.log('No MongoDB URI provided, running with in-memory storage');
  }
}

connectDB();

// Passport configuration
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await UserModel.findOne({ 
      $or: [{ username }, { email: username }] 
    });
    
    if (!user) {
      return done(null, false, { message: 'Invalid username or password' });
    }
    
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return done(null, false, { message: 'Invalid username or password' });
    }
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// API routes
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    const { _id, username, email } = req.user;
    return res.json({
      id: _id.toString(),
      username,
      email
    });
  }
  return res.status(401).json({ message: 'Not authenticated' });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// Handle all other routes - send to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;