/**
 * Build examples manifest from the examples/ directory
 *
 * Each subdirectory becomes a project.
 * Directory names are preserved as-is (no formatting).
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, '../..');
const examplesDir = resolve(rootDir, 'examples');
const outDir = resolve(__dirname, '../src/data');
const outFile = resolve(outDir, 'examples.json');

/**
 * Parse frontmatter from an MDZ file
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: null, description: null };

  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim() : null,
  };
}

/**
 * Recursively find all .mdz files in a directory
 */
function findMdzFiles(dir, basePath = '') {
  const files = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    
    const fullPath = resolve(dir, entry);
    const relativePath = basePath ? `${basePath}/${entry}` : entry;
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findMdzFiles(fullPath, relativePath));
    } else if (entry.endsWith('.mdz')) {
      files.push({ path: relativePath, fullPath });
    }
  }

  return files;
}

function build() {
  console.log('Building examples manifest...');

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const entries = readdirSync(examplesDir);
  const projects = {};
  const examples = [];

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    
    const fullPath = resolve(examplesDir, entry);
    const stat = statSync(fullPath);

    if (!stat.isDirectory()) continue;

    // Each directory is a project
    const files = findMdzFiles(fullPath);
    const projectFiles = {};
    let mainDescription = '';
    
    for (const file of files) {
      const content = readFileSync(file.fullPath, 'utf-8');
      projectFiles[file.path] = content;
      
      // Use file matching directory name as main, or first file
      const baseName = file.path.replace('.mdz', '');
      if (baseName === entry || !mainDescription) {
        const { description } = parseFrontmatter(content);
        if (description) mainDescription = description;
      }
    }

    // Use directory name as-is
    const project = {
      id: entry,
      name: entry,
      description: mainDescription,
      files: projectFiles,
      fileCount: Object.keys(projectFiles).length,
    };
    
    examples.push(project);
    projects[entry] = {
      name: entry,
      description: mainDescription,
      files: projectFiles,
    };
  }

  // Sort alphabetically
  examples.sort((a, b) => a.name.localeCompare(b.name));

  const manifest = {
    generated: new Date().toISOString(),
    projects,
    examples,
  };

  writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`✓ Manifest written to src/data/examples.json`);
  console.log(`  Projects: ${examples.length}`);
  for (const ex of examples) {
    console.log(`    - ${ex.name}: ${ex.fileCount} files`);
  }
  console.log('Done!');
}

build();
