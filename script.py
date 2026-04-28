import re
import sys

def process(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Simple mappings from my recent hardcoded dark mode to light mode inclusive
    
    # Text colors
    content = content.replace('text-zinc-200', 'text-zinc-800 dark:text-zinc-200')
    content = content.replace('text-zinc-300', 'text-zinc-700 dark:text-zinc-300')
    content = content.replace('text-zinc-400', 'text-zinc-600 dark:text-zinc-400')
    content = content.replace('text-white', 'text-black dark:text-white')
    content = content.replace('text-black dark:text-white', 'text-zinc-900 dark:text-white') # Deduplicate
    
    # Backgrounds
    content = content.replace('bg-black/90', 'bg-white/90 dark:bg-black/90')
    content = content.replace('bg-black/60', 'bg-white/60 dark:bg-black/60')
    content = content.replace('bg-black/40', 'bg-white/40 dark:bg-black/40')
    content = content.replace('bg-black', 'bg-zinc-50 dark:bg-black')
    content = content.replace('bg-zinc-50 dark:bg-white/90 dark:bg-black/90', 'bg-white/90 dark:bg-black/90') # Fix overlap
    
    content = content.replace('bg-zinc-950/80', 'bg-zinc-50/80 dark:bg-zinc-950/80')
    content = content.replace('bg-zinc-900/90', 'bg-white/90 dark:bg-zinc-900/90')
    content = content.replace('bg-white/5', 'bg-black/5 dark:bg-white/5')
    content = content.replace('bg-white/10', 'bg-black/10 dark:bg-white/10')
    
    # Borders
    content = content.replace('border-white/5', 'border-black/5 dark:border-white/5')
    content = content.replace('border-white/10', 'border-black/10 dark:border-white/10')
    
    with open(file_path, 'w') as f:
        f.write(content)
        
process('src/components/Chat.tsx')
process('src/components/SettingsModal.tsx')
process('src/components/AdvancedSendButton.tsx')
process('src/components/ToolboxPanel.tsx')
