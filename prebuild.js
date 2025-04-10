import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running prebuild script for Vercel deployment...');

// Create dist directories if they don't exist
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(distDir, 'public');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('Created dist directory');
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created dist/public directory');
}

// Create dummy index.html if it doesn't exist (will be replaced by build process)
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, '<html><body>Loading...</body></html>');
  console.log('Created placeholder index.html');
}

// Create .env file for Vercel if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  let envContent = 'NODE_ENV=production\n';
  
  // Check if we have Vercel environment variables
  if (process.env.MONGODB_URI) {
    envContent += `MONGODB_URI=${process.env.MONGODB_URI}\n`;
    console.log('Added MONGODB_URI from environment');
  }
  
  if (process.env.SESSION_SECRET) {
    envContent += `SESSION_SECRET=${process.env.SESSION_SECRET}\n`;
    console.log('Added SESSION_SECRET from environment');
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('Created .env file for Vercel deployment');
}

try {
  console.log('Current directory structure:');
  const result = execSync('ls -la');
  console.log(result.toString());
} catch (error) {
  console.error('Error executing ls command:', error);
}

console.log('Prebuild script completed successfully');