import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Vercel build process...');

// Create necessary directories
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(distDir, 'public');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('Created dist directory');
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created public directory');
}

// Create a .env file for the build if one doesn't exist
const envFilePath = path.join(__dirname, '.env');
if (!fs.existsSync(envFilePath)) {
  console.log('Creating .env file for build...');
  const envContent = `NODE_ENV=production\n`;
  fs.writeFileSync(envFilePath, envContent);
  console.log('.env file created');
}

// Run the build command
try {
  // List directory contents before build
  console.log('Current directory structure:');
  execSync('find . -maxdepth 2 -type d | sort', { stdio: 'inherit' });
  
  // Build client
  console.log('Running Vite build for client...');
  execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  console.log('Vite build completed successfully');
  
  // Check the output directory for the client build
  console.log('Checking client build output:');
  execSync('ls -la dist/public', { stdio: 'inherit' });
  
  // Build server
  console.log('Building server with esbuild...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  console.log('Server build completed successfully');
  
  // Copy API routes to dist
  console.log('Copying API routes...');
  if (fs.existsSync('api')) {
    const apiDir = path.join(distDir, 'api');
    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }
    
    // Copy api/index.js
    fs.copyFileSync(
      path.join(__dirname, 'api', 'index.js'), 
      path.join(apiDir, 'index.js')
    );
    console.log('API routes copied successfully');
  }
  
  // Ensure index.html is properly placed
  if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    console.log('Client build index.html found in correct location');
  } else {
    console.error('WARNING: index.html not found in public directory!');
    // Check if it's in the parent dist directory instead
    if (fs.existsSync(path.join(distDir, 'index.html'))) {
      console.log('Found index.html in dist directory, copying to public dir');
      fs.copyFileSync(
        path.join(distDir, 'index.html'),
        path.join(publicDir, 'index.html')
      );
    } else {
      console.error('ERROR: index.html not found in any build directory!');
    }
  }
  
  // Create a vercel-info.json file to aid debugging
  const vercelInfo = {
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    distStructure: fs.readdirSync(distDir),
    publicStructure: fs.existsSync(publicDir) ? fs.readdirSync(publicDir) : 'directory not found',
  };
  fs.writeFileSync(
    path.join(distDir, 'vercel-info.json'),
    JSON.stringify(vercelInfo, null, 2)
  );
  
  console.log('Build process completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  console.error('Error details:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
}