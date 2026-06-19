/**
 * Bloxd.io Code Block Companion - Local Development Engine (Zero-Dependency)
 * Works perfectly locally across Windows, macOS, and Linux inside VS Code, VSCodium, or any terminal environment.
 * 
 * Functions:
 *  - node bloxd-helper.js init: Setup modular folder structure.
 *  - node bloxd-helper.js build: Merges and minifies code blocks to fit in Bloxd.io.
 *  - node bloxd-helper.js stats: Displays character counts and warnings alerts.
 */

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0] ? ARGS[0].toLowerCase() : 'help';

// Directories setup
const SRC_DIR = path.join(process.cwd(), 'src');
const DIST_DIR = path.join(process.cwd(), 'dist');
const CONFIG_FILE = path.join(process.cwd(), 'bloxd.config.json');

const DEFAULT_CONFIG = {
  projectName: "MyBloxdMod",
  version: "1.0.0",
  entryPoints: [
    "src/events/tick.js",
    "src/events/chat.js"
  ],
  outputFile: "dist/bloxd-code.js",
  stripComments: true,
  minifyWhitespace: true
};

const HELP_TEXT = `
============================================================
             Bloxd SDK Compiler Local CLI Tool
============================================================
Compatible with Windows, macOS, Linux, and ChromeOS

Usage:
  node bloxd-helper.js <command>

Commands:
  init           Initialize folder structures with template files.
  build          Merge modular JS files into one copy-pasteable script.
  stats          Analyze build files and check API script sizes.
  help           Show this guide.

Setup:
  1. Open your terminal/VS Code/VSCodium.
  2. Type: node bloxd-helper.js init
  3. Start writing code modularly in src/!
`;

// Start Execution
main();

function main() {
  switch (COMMAND) {
    case 'init':
      handleInit();
      break;
    case 'build':
      handleBuild();
      break;
    case 'stats':
      handleStats();
      break;
    case 'help':
      const topic = ARGS[1] ? ARGS[1].toLowerCase() : null;
      if (topic === 'init') {
        console.log(`\n=== BLOXD HELP: INIT ===\nCommand: node bloxd-helper.js init\n\nInitializes a new code base. It creates:
- src/events/tick.js
- src/events/chat.js
- bloxd.config.json
This will give you a full boilerplate layout ready to be compiled to your bloxd server.\n`);
      } else if (topic === 'build') {
        console.log(`\n=== BLOXD HELP: BUILD ===\nCommand: node bloxd-helper.js build\n\nReads your bloxd.config.json file, parses the "entryPoints", strips all comments and useless whitespace, and bundles them into dist/bloxd-code.js. Use this command every time you save your code to generate a new copy-paste string.\n`);
      } else if (topic === 'stats') {
        console.log(`\n=== BLOXD HELP: STATS ===\nCommand: node bloxd-helper.js stats\n\nShows detailed performance analysis of your built project file (dist/bloxd-code.js). It counts total characters and lines, and alerts if there are duplicate event loop bindings like 'tick' which can break your compilation.\n`);
      } else {
        console.log(HELP_TEXT);
      }
      break;
    default:
      console.log(HELP_TEXT);
      break;
  }
}

function handleInit() {
  console.log(`\n[BloxdCLI] Creating modular code-block project structure...`);

  // Create directories
  const subdirs = [
    '',
    'events',
    'commands',
    'utils',
    'mobs'
  ];

  subdirs.forEach(dir => {
    const p = path.join(SRC_DIR, dir);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      console.log(` Created folder: ${path.relative(process.cwd(), p)}`);
    }
  });

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(` Created folder: dist`);
  }

  // Create default configuration
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    console.log(` Created config: bloxd.config.json`);
  }

  // Create templates
  const tickTemplate = `// src/events/tick.js
// Custom tick event. Runs every server tick (approx 20 times per second)
let totalTickCount = 0;

tick = (ms) => {
    totalTickCount++;
    if (totalTickCount % 1200 === 0) {
        // Runs approximately every 60 seconds (1200 ticks)
        console.log("Bloxd Server Running. Total ticks: " + totalTickCount);
    }
};
`;

  const chatTemplate = `// src/events/chat.js
// Listening to players typing messages/commands in real-time

onPlayerChat = (playerId, chatMessage, channelName) => {
    if (chatMessage.startsWith("/heal")) {
        // Fully heal the player (max 100 health)
        api.setHealth(playerId, 100, null, true);
        // Send a private response message
        api.sendMessage(playerId, "❤️ You have been fully healed by your custom mod script!", { color: "#10b981" });
        return true; // Return true to mute command or prevent message from reaching global game chat
    }
    return false; // Show standard chat otherwise
};
`;

  const readmeTemplate = `# Bloxd.io Custom Code Mod project
Develop your own Bloxd.io code scripts modularly. This project compiles and bundles your files cleanly.

### Getting Started:
1. Run \`node bloxd-helper.js build\` in your VSCodium terminal.
2. Open \`dist/bloxd-code.js\`.
3. Copy the entire file content and paste it inside your Bloxd.io Code Block.
`;

  const filesToBuild = [
    { p: path.join(SRC_DIR, 'events', 'tick.js'), content: tickTemplate },
    { p: path.join(SRC_DIR, 'events', 'chat.js'), content: chatTemplate },
    { p: path.join(process.cwd(), 'README.md'), content: readmeTemplate }
  ];

  filesToBuild.forEach(f => {
    if (!fs.existsSync(f.p)) {
      fs.writeFileSync(f.p, f.content, 'utf8');
      console.log(` Created file:   ${path.relative(process.cwd(), f.p)}`);
    }
  });

  console.log(`\n🎉 Success! Your Bloxd SDK project has been initialized.`);
  console.log(` Run 'node bloxd-helper.js build' to compile your first mod!`);
}

function handleBuild() {
  console.log(`\n[BloxdCLI] Building Bloxd.io script bundles...`);
  
  let config = DEFAULT_CONFIG;
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      console.error(`❌ Error parsing bloxd.config.json. Defaulting config context.`, e);
    }
  }

  let bundledContent = `/**\n * Compiled with BloxdUtility Local SDK\n * Bundle Name: ${config.projectName}\n * Version: ${config.version}\n */\n\n`;

  // Process and merge files
  let loadedCount = 0;
  for (const relativePath of config.entryPoints) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    if (fs.existsSync(absolutePath)) {
      let content = fs.readFileSync(absolutePath, 'utf8');
      bundledContent += `// --- START FILE: ${relativePath} ---\n`;
      bundledContent += content;
      bundledContent += `\n// --- END FILE: ${relativePath} ---\n\n`;
      loadedCount++;
    } else {
      console.warn(`⚠️ Warning: Entry file not found: ${relativePath}`);
    }
  }

  if (loadedCount === 0) {
    console.error(`❌ Build aborting: No structural entry files were loaded successfully.`);
    return;
  }

  // Pre-minify transformations
  if (config.stripComments) {
    // Strip block comments (/* comments */) and single line comments (// comments) safely
    bundledContent = bundledContent.replace(/\/\*[\s\S]*?\*\//g, '');
    bundledContent = bundledContent.split('\n').map(line => {
      // Keep URL strings unharmed
      const idx = line.indexOf('//');
      if (idx !== -1 && !line.includes('http://') && !line.includes('https://')) {
        return line.substring(0, idx);
      }
      return line;
    }).join('\n');
  }

  if (config.minifyWhitespace) {
    // Keep space characters clean, join empty lines to save characters inside the bloxd interpreter
    bundledContent = bundledContent.replace(/\n\s*\n/g, '\n');
    bundledContent = bundledContent.trim();
  }

  // Ensure output directory exists
  const parentOutputDir = path.dirname(path.resolve(process.cwd(), config.outputFile));
  if (!fs.existsSync(parentOutputDir)) {
    fs.mkdirSync(parentOutputDir, { recursive: true });
  }

  fs.writeFileSync(path.resolve(process.cwd(), config.outputFile), bundledContent, 'utf8');
  console.log(` Bundled ${loadedCount} files into ${config.outputFile}`);

  // Analyze characters size
  const charLength = bundledContent.length;
  console.log(` Total script size: ${charLength} characters.`);
  
  if (charLength > 50000) {
    console.warn(`⚠️ WARNING: Script is ${charLength} characters. Bloxd.io performs best when and if the file size is under 50,000 characters!`);
  } else {
    console.log(`💚 SUCCESS: Code is safe and optimized for pasting.`);
  }
}

function handleStats() {
  console.log(`\n[BloxdCLI] Performance and Script Analysis:`);
  let config = DEFAULT_CONFIG;
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {}
  }

  const outPath = path.resolve(process.cwd(), config.outputFile);
  if (!fs.existsSync(outPath)) {
    console.log(`❌ No compiled script found at ${config.outputFile}. Please run "build" command beforehand.`);
    return;
  }

  const content = fs.readFileSync(outPath, 'utf8');
  const sizeKb = (content.length / 1024).toFixed(2);

  console.log(` Output File:      ${config.outputFile}`);
  console.log(` File Size:       ${sizeKb} KB`);
  console.log(` Character Count: ${content.length} characters`);
  console.log(` Total Lines:     ${content.split('\n').length} lines`);

  // Check specific API calls limit placeholders (e.g. Tick events, HUD hooks)
  const tickCount = (content.match(/\btick\s*=/g) || []).length + (content.match(/\bfunction\s+tick\b/g) || []).length;
  const chatCount = (content.match(/\bonPlayerChat\s*=/g) || []).length + (content.match(/\bfunction\s+onPlayerChat\b/g) || []).length;

  console.log(` Registered tick handlers:  ${tickCount}`);
  console.log(` Registered chat handlers:  ${chatCount}`);

  if (tickCount > 1) {
    console.warn(`⚠️ PERFORMANCE WARNING: Multiple 'tick' declarations detected (${tickCount}). We suggest merging them into a single 'tick(ms)' function for peak server FPS loop!`);
  }
}
