import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

// Projects to build: { sourceDir, outputSlug }
// If just a string, sourceDir and outputSlug are the same
const projects = [
  'fractured-jukebox',
  'lissajous',
  'sound-synth',
  'resonator',
  'karplus-strong',
  'intervals',
];

// Base path for deployment (set via environment variable or default to /)
const basePath = process.env.BASE_PATH || '';

async function buildProjects() {
  console.log('Building sub-projects...');

  for (const entry of projects) {
    // Handle both string and object formats
    const sourceDir = typeof entry === 'string' ? entry : entry.sourceDir;
    const outputSlug = typeof entry === 'string' ? entry : entry.outputSlug;

    const projectDir = path.join(rootDir, sourceDir);

    // Skip if project directory doesn't exist
    if (!await fs.pathExists(projectDir)) {
      console.log(`Skipping ${sourceDir} (directory not found)`);
      continue;
    }

    console.log(`\n=== Building ${sourceDir} -> ${outputSlug} ===`);

    // Install dependencies
    console.log(`Installing dependencies for ${sourceDir}...`);
    execSync('npm install', { cwd: projectDir, stdio: 'inherit' });

    // Build the project with correct base path (all apps under /apps/)
    console.log(`Building ${sourceDir}...`);
    execSync(`npx vite build --base=${basePath}/apps/${outputSlug}/`, {
      cwd: projectDir,
      stdio: 'inherit'
    });

    // Copy built project to public/apps/
    const projectDist = path.join(projectDir, 'dist');
    const appsDir = path.join(publicDir, 'apps');
    const destDir = path.join(appsDir, outputSlug);

    console.log(`Copying ${sourceDir} to public/apps/${outputSlug}/...`);
    await fs.ensureDir(appsDir);
    await fs.emptyDir(destDir);
    await fs.copy(projectDist, destDir);
  }

  console.log('\nAll projects built successfully!');
}

buildProjects().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
