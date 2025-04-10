// Vercel serverless function entry point
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} - Incoming cookies:`, req.headers.cookie);
  next();
});

// Mock data storage (in-memory replacement for MongoDB)
const mockUsers = [
  { _id: '67f68a6066920d7ae1dc6a37', username: 'intern', email: 'intern@dacoid.com', password: '$2b$10$Fc3rlpRdRFGpQdS/l3PmPuyzPQHeBhWCBQBHdz4KN3dpjfh4PV9hu' }
];
const mockLinks = [];
const mockClicks = [];

// Configure session (minimal, stateless)
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'development_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    secure: process.env.NODE_ENV === 'production' ? true : false,
    sameSite: 'lax',
    httpOnly: true,
    path: '/'
  }
};

app.use(session(sessionConfig));

// Initialize Passport after session middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport setup
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      console.log('Passport LocalStrategy - Username:', username);
      console.log('Passport LocalStrategy - Password provided:', password);
      console.log('Current mockUsers array:', mockUsers.map(u => ({ username: u.username, password: u.password })));
      const user = mockUsers.find(u => (u.username === username || u.email === username));
      console.log('User found:', user ? user.username : 'None');
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      
      console.log('Stored password hash:', user.password);
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match:', isMatch);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      
      console.log('Authentication successful for user:', user.username);
      return done(null, user);
    } catch (err) {
      console.error('Passport LocalStrategy error:', err);
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.username);
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  console.log('Deserializing user ID:', id);
  const user = mockUsers.find(u => u._id === id);
  console.log('Deserialized user:', user ? user.username : 'Not found');
  done(null, user || null);
});

// Middleware to verify session cookie
app.use((req, res, next) => {
  const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('connect.sid='));
  if (sessionCookie) {
    const sid = sessionCookie.split('=')[1];
    try {
      const decoded = jwt.verify(sid, sessionConfig.secret);
      console.log('JWT decoded:', decoded);
      req.session.user = decoded;
      req.user = mockUsers.find(u => u._id === decoded.id);
    } catch (err) {
      console.log('Invalid session cookie:', err.message);
    }
  }
  next();
});

// API routes
app.get('/api/user', (req, res) => {
  console.log('GET /api/user - Session ID:', req.sessionID);
  console.log('Cookies received:', req.headers.cookie);
  console.log('Session data:', req.session);
  console.log('User in session:', req.user ? req.user.username : 'None');
  if (req.isAuthenticated() && req.user) {
    const { _id, username, email } = req.user;
    console.log('Authenticated user:', username);
    return res.json({
      id: _id,
      username,
      email
    });
  }
  console.log('Not authenticated');
  return res.status(401).json({ message: 'Not authenticated' });
});

app.post('/api/login', (req, res, next) => {
  console.log('Login attempt received at /api/login with body:', req.body);
  console.log('Incoming cookies:', req.headers.cookie);
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Passport authentication error:', err);
      return next(err);
    }
    if (!user) {
      console.log('Authentication failed:', info?.message || 'No user found');
      return res.status(401).json({ message: info?.message || 'Authentication failed' });
    }
    
    console.log('User authenticated:', user.username);
    req.login(user, { session: true }, (err) => {
      if (err) {
        console.error('req.login error:', err);
        return next(err);
      }
      // Encode user data into a signed token
      const token = jwt.sign(
        { id: user._id, username: user.username, email: user.email },
        sessionConfig.secret,
        { expiresIn: '24h' }
      );
      req.session.user = { id: user._id, username: user.username, email: user.email };
      console.log('Session set for user:', user.username, 'Session ID:', req.sessionID);
      console.log('Session data after login:', req.session);
      const cookieOptions = `connect.sid=${token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure' : ''}; Max-Age=${24 * 60 * 60}`;
      res.setHeader('Set-Cookie', cookieOptions);
      console.log('Set-Cookie header sent:', cookieOptions);
      return res.json({
        id: user._id,
        username: user.username,
        email: user.email,
        sessionId: token // For debugging
      });
    });
  })(req, res, next);
});

app.post('/api/auth/login', (req, res, next) => {
  console.log('Login attempt received at /api/auth/login');
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message || 'Authentication failed' });
    
    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({
        id: user._id,
        username: user.username,
        email: user.email
      });
    });
  })(req, res, next);
});

app.post('/api/register', async (req, res, next) => {
  console.log('Registration attempt received at /api/register');
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Check if user already exists
    const existingUser = mockUsers.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('New user password hashed:', hashedPassword);

    // Create user
    const newUser = {
      _id: 'mock-' + Date.now(),
      username,
      password: hashedPassword,
      email,
      createdAt: new Date()
    };
    mockUsers.push(newUser);
    console.log('New user added to mockUsers:', newUser);

    // Remove password from response
    const userResponse = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt
    };

    req.login(newUser, { session: true }, (err) => {
      if (err) {
        console.error('req.login error during registration:', err);
        return next(err);
      }
      // Encode user data into a signed token
      const token = jwt.sign(
        { id: newUser._id, username: newUser.username, email: newUser.email },
        sessionConfig.secret,
        { expiresIn: '24h' }
      );
      req.session.user = { id: newUser._id, username: newUser.username, email: newUser.email };
      console.log('Session set for new user:', newUser.username, 'Session ID:', req.sessionID);
      console.log('Session data after registration:', req.session);
      const cookieOptions = `connect.sid=${token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure' : ''}; Max-Age=${24 * 60 * 60}`;
      res.setHeader('Set-Cookie', cookieOptions);
      console.log('Set-Cookie header sent for new user:', cookieOptions);
      res.status(201).json(userResponse);
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Error logging out' });
    res.setHeader('Set-Cookie', 'connect.sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return res.json({ message: 'Logged out successfully' });
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Error logging out' });
    res.setHeader('Set-Cookie', 'connect.sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return res.json({ message: 'Logged out successfully' });
  });
});

// Link management endpoints
app.post('/api/links', async (req, res) => {
  console.log('POST /api/links - Session ID:', req.sessionID);
  console.log('Cookies received:', req.headers.cookie);
  console.log('Session data:', req.session);
  console.log('User in session:', req.user ? req.user.username : 'None');
  try {
    if (!req.isAuthenticated() || !req.user) {
      console.log('Authentication check failed - Not authenticated');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    console.log('Authenticated user:', req.user.username);
    const { originalUrl, customAlias, expiresAt } = req.body;
    
    if (!originalUrl) {
      console.log('Missing originalUrl');
      return res.status(400).json({ message: 'Original URL is required' });
    }
    
    // Validate URL
    try {
      new URL(originalUrl);
    } catch (err) {
      console.log('Invalid URL format:', originalUrl);
      return res.status(400).json({ message: 'Invalid URL format' });
    }
    
    const userId = req.user._id;
    
    // Generate short code or use custom alias
    let shortCode;
    if (customAlias) {
      const existingLink = mockLinks.find(link => link.shortCode === customAlias);
      if (existingLink) {
        console.log('Custom alias already in use:', customAlias);
        return res.status(400).json({ message: 'Custom alias already in use' });
      }
      shortCode = customAlias;
    } else {
      const generateCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 7; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      let isUnique = false;
      while (!isUnique) {
        shortCode = generateCode();
        isUnique = !mockLinks.some(link => link.shortCode === shortCode);
      }
    }
    
    // Create new link
    const link = {
      _id: 'link-' + Date.now(),
      shortCode,
      originalUrl,
      userId,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      clickCount: 0,
      customAlias: customAlias || null,
      isActive: true
    };
    mockLinks.push(link);
    
    console.log('Link created successfully:', shortCode);
    
    res.status(201).json({
      id: link._id,
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      userId: link.userId,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      clickCount: link.clickCount,
      customAlias: link.customAlias
    });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ message: 'Failed to create shortened URL' });
  }
});

app.get('/api/links', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userId = req.user._id;
    const links = mockLinks.filter(link => link.userId === userId);
    
    res.json(links.map(link => ({
      id: link._id,
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      userId: link.userId,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      clickCount: link.clickCount,
      customAlias: link.customAlias
    })));
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ message: 'Failed to fetch links' });
  }
});

app.delete('/api/links/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const linkId = req.params.id;
    const userId = req.user._id;
    
    const linkIndex = mockLinks.findIndex(link => link._id === linkId && link.userId === userId);
    if (linkIndex === -1) {
      return res.status(404).json({ message: 'Link not found or not owned by user' });
    }
    
    mockLinks.splice(linkIndex, 1);
    mockClicks.filter(click => click.linkId !== linkId);
    
    res.status(200).json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ message: 'Failed to delete link' });
  }
});

// URL redirection endpoint
app.get('/r/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const link = mockLinks.find(link => link.shortCode === shortCode);
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    // Check if link has expired
    if (link.expiresAt && new Date() > link.expiresAt) {
      return res.status(410).json({ message: 'Link has expired' });
    }
    
    // Increment click count
    link.clickCount += 1;
    
    // Log click
    const userAgent = req.headers['user-agent'];
    const device = userAgent?.match(/Mobile|Android|iPhone|iPad|iPod/i)
      ? userAgent.match(/iPad/i) ? 'Tablet' : 'Mobile'
      : 'Desktop';
    
    const browser = userAgent?.match(/Chrome/i)
      ? 'Chrome'
      : userAgent?.match(/Firefox/i)
      ? 'Firefox'
      : userAgent?.match(/Safari/i)
      ? 'Safari'
      : userAgent?.match(/Edge/i)
      ? 'Edge'
      : userAgent?.match(/MSIE|Trident/i)
      ? 'Internet Explorer'
      : 'Unknown';
    
    const os = userAgent?.match(/Windows/i)
      ? 'Windows'
      : userAgent?.match(/Mac/i)
      ? 'Mac'
      : userAgent?.match(/Linux/i)
      ? 'Linux'
      : userAgent?.match(/Android/i)
      ? 'Android'
      : userAgent?.match(/iOS/i)
      ? 'iOS'
      : 'Unknown';
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipAddress = typeof ip === 'string' ? ip.split(',')[0].trim() : undefined;
    
    const click = {
      _id: 'click-' + Date.now(),
      linkId: link._id,
      timestamp: new Date(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      device,
      browser,
      os,
      referrer: req.headers.referer || null,
      country: null
    };
    mockClicks.push(click);
    
    // Redirect to original URL
    res.redirect(link.originalUrl);
  } catch (error) {
    console.error('Error processing redirect:', error);
    res.status(500).json({ message: 'Failed to process redirect' });
  }
});

// Analytics endpoints
app.get('/api/links/:id/clicks', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const linkId = req.params.id;
    const userId = req.user._id;
    
    const link = mockLinks.find(link => link._id === linkId && link.userId === userId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found or not owned by user' });
    }
    
    const clicks = mockClicks.filter(click => click.linkId === linkId);
    
    res.json(clicks.map(click => ({
      id: click._id,
      linkId: click.linkId,
      timestamp: click.timestamp,
      ipAddress: click.ipAddress,
      userAgent: click.userAgent,
      device: click.device,
      browser: click.browser,
      os: click.os,
      referrer: click.referrer,
      country: click.country
    })));
  } catch (error) {
    console.error('Error fetching clicks:', error);
    res.status(500).json({ message: 'Failed to fetch click data' });
  }
});

app.get('/api/links/:id/stats/clicks', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const linkId = req.params.id;
    const userId = req.user._id;
    
    const link = mockLinks.find(link => link._id === linkId && link.userId === userId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found or not owned by user' });
    }
    
    const clicks = mockClicks.filter(click => click.linkId === linkId);
    const clickStats = {};
    clicks.forEach(click => {
      const date = click.timestamp.toISOString().split('T')[0];
      clickStats[date] = (clickStats[date] || 0) + 1;
    });
    
    const stats = Object.entries(clickStats).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching click stats:', error);
    res.status(500).json({ message: 'Failed to fetch click statistics' });
  }
});

app.get('/api/links/:id/stats/devices', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const linkId = req.params.id;
    const userId = req.user._id;
    
    const link = mockLinks.find(link => link._id === linkId && link.userId === userId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found or not owned by user' });
    }
    
    const clicks = mockClicks.filter(click => click.linkId === linkId);
    const deviceStats = {};
    clicks.forEach(click => {
      const device = click.device || 'Unknown';
      deviceStats[device] = (deviceStats[device] || 0) + 1;
    });
    
    const total = clicks.length;
    const stats = Object.entries(deviceStats).map(([device, count]) => ({
      device,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching device stats:', error);
    res.status(500).json({ message: 'Failed to fetch device statistics' });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userId = req.user._id;
    const links = mockLinks.filter(link => link.userId === userId);
    
    const now = new Date();
    const expirationThreshold = new Date();
    expirationThreshold.setDate(now.getDate() + 7);
    
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + (link.clickCount || 0), 0);
    const activeLinks = links.filter(link => 
      (!link.expiresAt || link.expiresAt > now)
    ).length;
    const expiringLinks = links.filter(link => 
      link.expiresAt && link.expiresAt > now && link.expiresAt < expirationThreshold
    ).length;
    
    res.json({
      totalLinks,
      totalClicks,
      activeLinks,
      expiringLinks
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    sessionStore: 'JWT Cookie'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  import('fs').then(fs => {
    const primaryDistPath = path.join(__dirname, '..', 'dist');
    const fallbackDistPath = path.join(__dirname, '..', 'dist', 'public');
    
    if (fs.existsSync(path.join(primaryDistPath, 'index.html'))) {
      console.log('Using primary dist path:', primaryDistPath);
      app.use(express.static(primaryDistPath));
    } else if (fs.existsSync(path.join(fallbackDistPath, 'index.html'))) {
      console.log('Using fallback dist path:', fallbackDistPath);
      app.use(express.static(fallbackDistPath));
    } else {
      console.log('No static files found in either location');
    }
    
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/r/')) {
        return res.status(404).json({ message: 'Endpoint not found' });
      }
      
      if (fs.existsSync(path.join(primaryDistPath, 'index.html'))) {
        return res.sendFile(path.join(primaryDistPath, 'index.html'));
      } else if (fs.existsSync(path.join(fallbackDistPath, 'index.html'))) {
        return res.sendFile(path.join(fallbackDistPath, 'index.html'));
      } else {
        return res.status(404).send('Frontend build not found');
      }
    });
  }).catch(err => {
    console.error('Error loading fs module for static files:', err);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err) {
    console.error(`Error type: ${err.name || 'Unknown'}`);
    console.error(`Message: ${err.message || 'No message'}`);
    if (err.code) console.error(`Error code: ${err.code}`);
    if (process.env.NODE_ENV !== 'production') console.error('Stack trace:', err.stack);
  }
  
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message || 'Unknown error',
  });
});

// Handle server startup when running directly
if (process.env.START_SERVER === 'true') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;