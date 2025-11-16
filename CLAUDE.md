# Gemini Project: DSP Portfolio

This project is a portfolio of interactive digital signal processing (DSP) web applications. Each sub-directory is a standalone Vite project.

## Goal

The goal is to create a unified build process that:

1.  Builds each individual DSP project.
2.  Assembles the built projects into a single `dist` directory at the root level.
3.  Creates a main `index.html` file that serves as a landing page, linking to each project.
4.  The final output in the `dist` directory will be suitable for deployment to static hosting services like GitHub Pages.

## Projects

*   `lissajous`: Visualizes Lissajous curves and their relationship to musical intervals.
*   `resonator`: An RLC resonator explorer for real-time audio synthesis and visualization.
*   `sound-synth`: An interactive harmonics explorer for understanding sound and timbre.

## Build Process

The build process will be managed by a root-level `package.json` and a build script. The script will automate the following steps:

1.  **Clean**: Remove the existing root `dist` directory.
2.  **Discover**: Identify all project sub-directories.
3.  **Build Projects**: For each project:
    *   Run `npm install`.
    *   Run `npm run build`.
4.  **Assemble**:
    *   Create a new root `dist` directory.
    *   Copy each project's `dist` folder into the root `dist` directory, renaming them to match the project name (e.g., `lissajous/dist` -> `dist/lissajous`).
    *   Generate a root `index.html` with links to the individual projects.
