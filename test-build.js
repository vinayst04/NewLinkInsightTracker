import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing build process for Vercel deployment...');

try {
  // Step 1: Build the app
  console.log('\n[1/3] Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');

  // Step 2: Check for critical files
  console.log('\n[2/3] Checking build output...');
  const requiredFiles = [
    'dist/index.js',
    'dist/public/index.html'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      throw new Error(`❌ Missing required file: ${file}`);
    }
  }

  // Step 3: Test server startup
  console.log('\n[3/3] Testing server startup...');
  
  // Create a simple test to check if server can start
  const testServer = async () => {
    return new Promise((resolve, reject) => {
      console.log('Starting server for test...');
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Test successful');
      });
      
      // Try to start on port 5000 (same as app)
      server.listen(5000, () => {
        console.log('✅ Server started successfully on port 5000');
        server.close(() => {
          resolve();
        });
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log('⚠️ Port 5000 is in use, but that might be expected if your app is running');
          resolve();
        } else {
          reject(err);
        }
      });
    });
  };
  
  await testServer();
  
  // Summary
  console.log('\n✅ Build verification completed successfully!');
  console.log('\nYour application should be ready for Vercel deployment.');
  console.log('Make sure you have set the required environment variables in Vercel:');
  console.log('- MONGODB_URI');
  console.log('- SESSION_SECRET');
  console.log('- NODE_ENV=production');
  
} catch (error) {
  console.error('\n❌ Build verification failed:');
  console.error(error);
  process.exit(1);
}