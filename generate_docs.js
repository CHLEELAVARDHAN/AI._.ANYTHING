const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const packageJsonPath = path.join(__dirname, 'package.json');
const indexHtmlPath = path.join(__dirname, 'index.html');
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
const outputFile = path.join(__dirname, 'Project_Implementation_Documentation.md');

let output = `# Project Code Implementation Review\n\n`;
output += `This document provides the complete source code of the entire project, clearly separated by file name, file type, and purpose, with full unomitted code blocks.\n\n`;

const IGNORE = ['.DS_Store', 'node_modules', 'dist'];

function getPurpose(fileName) {
  if (fileName.includes('ai.ts')) return 'AI prompting, system instructions, model selection, tool integration, stream handling.';
  if (fileName.includes('db.ts')) return 'Database interactions, history persistence, Firebase Firestore config, error handling.';
  if (fileName.includes('firebase.ts')) return 'Authentication logic, Firebase initialization, Auth state handling.';
  if (fileName.includes('Chat.tsx')) return 'Primary User Interface for AI interactions, animations, state management for message history, tool selections.';
  if (fileName.includes('App.tsx')) return 'Main routing and application shell, authorization verification.';
  if (fileName.includes('index.css')) return 'Global Tailwind directives, CSS-in-JS fallbacks, UI/UX aesthetics.';
  if (fileName.includes('package.json')) return 'Dependency tracking, start scripts, environment scaffolding.';
  if (fileName.includes('main.tsx')) return 'React root entrypoint, DOM injection.';
  if (fileName.includes('Login.tsx')) return 'User login UI, Firebase auth component.';
  if (fileName.includes('MoodDetection.tsx')) return 'Camera streaming & sentiment logic integration.';
  if (fileName.includes('SettingsModal.tsx')) return 'Configuration management, user preferences UI.';
  if (fileName.includes('AdvancedSendButton.tsx')) return 'Micro-interaction rich submission component.';
  if (fileName.includes('DataVisualization.tsx')) return 'Data formatting, Chart.js/Recharts implementation.';
  if (fileName.includes('Hologram.tsx')) return 'Advanced 3D WebGL styling/visual integration component.';
  if (fileName.includes('HandwritingCanvas.tsx')) return 'Canvas API logic, paint processing, gesture management.';
  if (fileName.includes('Eyes.tsx')) return 'Agent character/personality styling rendering context.';
  if (fileName.includes('Tooltip.tsx')) return 'Contextual utility element.';
  if (fileName.includes('CursorFollower.tsx')) return 'Aesthetic layout overlay interactions.';
  if (fileName.includes('ScrollIndicator.tsx')) return 'Aesthetic user wayfinding interaction element.';
  if (fileName.includes('sfx.ts')) return 'Audio manipulation/alert tracking.';
  if (fileName.includes('blockchain.ts')) return 'Web3 wallet configurations, interaction logic.';
  if (fileName.includes('index.html')) return 'HTML DOM scaffolding.';
  if (fileName.includes('vite.config.ts')) return 'Build tool configuration.';
  return 'General Module / Component Functionality.';
}

function processFile(filePath) {
  const ext = path.extname(filePath).substring(1);
  const normalizedExt = ext === 'tsx' || ext === 'ts' ? 'typescript' : ext;
  const fileName = path.basename(filePath);
  const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  output += `## File: \`${relativePath}\`\n`;
  output += `**File Type:** ${ext.toUpperCase()}\n\n`;
  output += `**Purpose:** ${getPurpose(fileName)}\n\n`;
  output += `\`\`\`${normalizedExt}\n`;
  output += content;
  output += `\n\`\`\`\n\n`;
  output += `---\n\n`;
}

function walkDir(currentDirPath) {
  const items = fs.readdirSync(currentDirPath);
  
  for (let i = 0; i < items.length; i++) {
    const itemPath = path.join(currentDirPath, items[i]);
    const itemStat = fs.statSync(itemPath);
    
    if (IGNORE.includes(items[i])) continue;
    
    if (itemStat.isDirectory()) {
      walkDir(itemPath);
    } else if (itemStat.isFile() && (itemPath.endsWith('.ts') || itemPath.endsWith('.tsx') || itemPath.endsWith('.css'))) {
      processFile(itemPath);
    }
  }
}

processFile(packageJsonPath);
processFile(indexHtmlPath);
processFile(viteConfigPath);
walkDir(srcDir);

fs.writeFileSync(outputFile, output);
console.log('Documentation generated successfully at', outputFile);
