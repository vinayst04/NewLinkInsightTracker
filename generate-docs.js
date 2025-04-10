import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const IGNORED_FOLDERS = ['node_modules'];
const IGNORED_FILES = [];

function dumpCodeToDocs(dir, outputArray, processedFiles = new Set()) {
  try {
    const files = fs.readdirSync(dir);
    console.log(`Found ${files.length} items in ${dir}`);
    
    for (const file of files) {
      const fullPath = path.join(dir, file).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const shouldIgnore = IGNORED_FOLDERS.some(ignoredFolder => {
          const normalizedIgnoredFolder = `/${ignoredFolder.toLowerCase()}/`;
          const normalizedPath = `/${fullPath.toLowerCase()}/`;
          return normalizedPath.includes(normalizedIgnoredFolder);
        });

        if (shouldIgnore) {
          console.log(`Skipping ignored directory: ${fullPath}`);
          continue;
        }

        console.log(`Entering directory: ${fullPath}`);
        dumpCodeToDocs(fullPath, outputArray, processedFiles);
      } else if (
        !IGNORED_FILES.includes(file) &&
        (file.endsWith('.js') ||
         file.endsWith('.ts') ||
         file.endsWith('.jsx') ||
         file.endsWith('.tsx') ||
         file.endsWith('.html') ||
         file.endsWith('.css') ||
         file.endsWith('.json') ||
         file.endsWith('.env'))
      ) {
        const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
        if (processedFiles.has(fullPath)) {
          console.warn(`Duplicate file found: ${relativePath}`);
          continue;
        }
        processedFiles.add(fullPath);

        console.log(`Processing file: ${relativePath}`);
        outputArray.push(`\n\n---\n### 📄 ${relativePath}\n\n`);
        const content = fs.readFileSync(fullPath, 'utf-8');
        outputArray.push('```' + getLang(file) + '\n' + content + '\n```');
      } else {
        console.log(`Skipping file: ${fullPath} (does not match criteria)`);
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err);
  }
}

function getLang(filename) {
  if (filename.endsWith('.js')) return 'javascript';
  if (filename.endsWith('.ts')) return 'typescript';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.env')) return 'bash';
  return '';
}

function generateDocs(targetDir = '.', outputDir = process.cwd()) {
  const outputArray = ['# 📚 Complete Code Documentation\n'];
  const processedFiles = new Set();

  const absolutePath = path.resolve(targetDir);
  const dirName = path.basename(absolutePath);
  outputArray.push(`## Directory: ${dirName} (${absolutePath})\n`);

  console.log(`Starting to process directory: ${absolutePath}`);
  dumpCodeToDocs(targetDir, outputArray, processedFiles);

  if (outputArray.length <= 2) {
    console.log('No files were found to process.');
    return;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  const header = outputArray.slice(0, 2);
  const contentChunks = outputArray.slice(2);

  const total = contentChunks.length;
  const chunkCount = 4; // ⬅️ Changed to 4 parts
  const chunkSize = Math.ceil(total / chunkCount);

  for (let i = 0; i < chunkCount; i++) {
    const part = contentChunks.slice(i * chunkSize, (i + 1) * chunkSize);
    const fileContent = [...header, ...part].join('\n');
    const outputFile = path.join(outputDir, `code-documentation-${dirName}-part${i + 1}.md`);
    fs.writeFileSync(outputFile, fileContent, 'utf-8');
    const percent = ((part.length / total) * 100).toFixed(1);
    console.log(`✅ Generated ${outputFile} (${percent}%)`);
  }
}

// Run with command line arguments
const targetDir = process.argv[2] || '.';
const outputDir = process.argv[3] || process.cwd();
generateDocs(targetDir, outputDir);
