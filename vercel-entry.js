// Entry point for Vercel serverless functions
import app from './api/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory information for debugging
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log environment information
console.log('Vercel Serverless Entry Point Loaded');
console.log('Node Environment:', process.env.NODE_ENV);
console.log('MongoDB URI Configured:', !!process.env.MONGODB_URI);
console.log('Session Secret Configured:', !!process.env.SESSION_SECRET);

// Check for built files - for debugging purposes
try {
  const distPath = path.join(__dirname, 'dist');
  const publicPath = path.join(distPath, 'public');
  
  // Log what we've found
  console.log('Checking for built files:');
  
  if (fs.existsSync(distPath)) {
    console.log('- dist directory exists');
    const distContents = fs.readdirSync(distPath);
    console.log('- dist contents:', distContents);
    
    if (fs.existsSync(publicPath)) {
      console.log('- public directory exists');
      const publicContents = fs.readdirSync(publicPath);
      console.log('- public contents:', publicContents);
      
      const indexHtmlPath = path.join(publicPath, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        console.log('- index.html exists in public directory');
      } else {
        console.log('- index.html NOT found in public directory');
      }
    } else {
      console.log('- public directory NOT found');
    }
  } else {
    console.log('- dist directory NOT found');
  }
} catch (error) {
  console.error('Error checking for built files:', error);
}

// Export the Express app as the default handler for Vercel
export default app;