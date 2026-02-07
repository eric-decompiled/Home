const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

const projects = {
  'lissajous': 'Visualize Lissajous curves and their relationship to musical intervals',
  'resonator': 'Real-time RLC resonator explorer for audio synthesis and visualization',
  'sound-synth': 'Interactive harmonics explorer for understanding sound and timbre',
  'karplus-strong': 'Explore the Karplus-Strong algorithm to synth plucked string sounds',
  'fractals': 'Music visualization with fractals, physics, and procedural graphics driven by MIDI',
  'intervals': 'Ear training for musical intervals with adaptive difficulty and Lissajous visualization',
};

// Custom display titles (overrides auto-generated title from directory name)
const titles = {
  'fractals': 'The Fractured Jukebox',
};

// Base path for GitHub Pages deployment (set via environment variable or default to root)
const basePath = process.env.BASE_PATH || '';

async function build() {
  console.log('Starting build process...');

  // 1. Clean the root dist directory
  console.log('Cleaning root dist directory...');
  await fs.emptyDir(distDir);

  // 2. Install dependencies for all projects
  for (const project of Object.keys(projects)) {
    const projectDir = path.join(rootDir, project);
    console.log(`Installing dependencies for project: ${project}...`);
    execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
  }

  // 3. Build each project
  for (const project of Object.keys(projects)) {
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

  // Read the template HTML file
  const templatePath = path.join(rootDir, 'index.html');
  let indexHtml = await fs.readFile(templatePath, 'utf-8');

  // Generate project links
  const projectLinks = Object.entries(projects)
    .map(([name, description]) => {
      const title = titles[name] || name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      return `
        <a href="${name}/index.html" class="project-link">
          <h3>${title}</h3>
          <p>${description}</p>
        </a>`;
    })
    .join('\n');

  // Inject the links into the special div using regex
  const targetRegex = /<div id="project-links">[\s\S]*?<\/div>/;

  if (!targetRegex.test(indexHtml)) {
    throw new Error('Could not find <div id="project-links"> in index.html template');
  }

  indexHtml = indexHtml.replace(
    targetRegex,
    `<div id="project-links">${projectLinks}\n    </div>`
  );

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
