const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

const projects = ['lissajous', 'resonator', 'sound-synth'];

// Base path for GitHub Pages deployment (set via environment variable or default to root)
const basePath = process.env.BASE_PATH || '';

async function build() {
  console.log('Starting build process...');

  // 1. Clean the root dist directory
  console.log('Cleaning root dist directory...');
  await fs.emptyDir(distDir);

  // 2. Install dependencies for all projects
  for (const project of projects) {
    const projectDir = path.join(rootDir, project);
    console.log(`Installing dependencies for project: ${project}...`);
    execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
  }

  // 3. Build each project
  for (const project of projects) {
    const projectDir = path.join(rootDir, project);
    console.log(`Building project: ${project}...`);

    // Build the project with correct base path for GitHub Pages
    execSync(`npx vite build --base=${basePath}/${project}/`, { cwd: projectDir, stdio: 'inherit' });

    // 4. Copy built project to root dist
    const projectDist = path.join(projectDir, 'dist');
    const destDir = path.join(distDir, project);
    console.log(`Copying ${projectDist} to ${destDir}...`);
    await fs.copy(projectDist, destDir);
  }

  // 5. Create root index.html
  console.log('Creating root index.html...');
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Signal Processing</title>
  <style>
    body { font-family: sans-serif; background-color: #f0f0f0; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { text-align: center; }
    ul { list-style: none; padding: 0; }
    li { margin: 1rem 0; }
    a { text-decoration: none; color: #007bff; font-size: 1.2rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Digital Signal Processing</h1>
    <p>
	A collection of projects to help me internalize DSP concepts
    </p>
    <ul>
      ${projects.map(p => `<li><a href="${p}/index.html">${p}</a></li>`).join('')}
    </ul>
  </div>
</body>
</html>
  `;
  await fs.writeFile(path.join(distDir, 'index.html'), indexHtml);

  // 6. Copy documentation files (if they exist)
  console.log('Copying documentation files...');
  const docFiles = ['README.md', 'CLAUDE.md'];
  for (const docFile of docFiles) {
    const srcPath = path.join(rootDir, docFile);
    if (await fs.pathExists(srcPath)) {
      await fs.copy(srcPath, path.join(distDir, docFile));
      console.log(`Copied ${docFile}`);
    }
  }

  console.log('Build process completed successfully!');
}

build().catch(err => {
  console.error('Build process failed:', err);
  process.exit(1);
});
