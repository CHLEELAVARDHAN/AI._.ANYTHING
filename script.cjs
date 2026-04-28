const fs = require('fs');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Text colors
    content = content.replace(/text-zinc-200/g, 'text-zinc-800 dark:text-zinc-200');
    content = content.replace(/text-zinc-300/g, 'text-zinc-700 dark:text-zinc-300');
    content = content.replace(/text-zinc-400/g, 'text-zinc-600 dark:text-zinc-400');
    content = content.replace(/text-white/g, 'text-zinc-900 dark:text-white');
    content = content.replace(/text-zinc-900 dark:text-zinc-900 dark:text-white/g, 'text-zinc-900 dark:text-white'); // Deduplicate
    
    // Backgrounds
    content = content.replace(/bg-black\/90/g, 'bg-white/90 dark:bg-black/90');
    content = content.replace(/bg-black\/60/g, 'bg-white/60 dark:bg-black/60');
    content = content.replace(/bg-black\/40/g, 'bg-white/40 dark:bg-black/40');
    content = content.replace(/bg-black(?![\w/])/g, 'bg-zinc-50 dark:bg-black');
    content = content.replace(/bg-zinc-50 dark:bg-white\/90 dark:bg-black\/90/g, 'bg-white/90 dark:bg-black/90'); // Fix overlap
    
    content = content.replace(/bg-zinc-950\/80/g, 'bg-zinc-50/80 dark:bg-zinc-950/80');
    content = content.replace(/bg-zinc-900\/90/g, 'bg-white/90 dark:bg-zinc-900/90');
    content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');
    content = content.replace(/bg-white\/10/g, 'bg-black/10 dark:bg-white/10');
    
    // Borders
    content = content.replace(/border-white\/5/g, 'border-black/5 dark:border-white/5');
    content = content.replace(/border-white\/10/g, 'border-black/10 dark:border-white/10');

    // Shadow
    content = content.replace(/shadow-\[0_0_8px_rgba\(0,0,0,0\.8\)\]/g, 'shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:shadow-[0_0_8px_rgba(0,0,0,0.8)]');

    fs.writeFileSync(filePath, content);
}

processFile('src/components/Chat.tsx');
processFile('src/components/SettingsModal.tsx');
processFile('src/components/AdvancedSendButton.tsx');
processFile('src/components/ToolboxPanel.tsx');

console.log('done');
