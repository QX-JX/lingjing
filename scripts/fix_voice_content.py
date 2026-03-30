import re

filepath = r'd:\ai-voice-new\tauri-app\src\utils\textRenderer.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace voice-content span to add contenteditable="true"
pattern = r'(\<span class="voice-content relative px-2 py-0.5 text-gray-800")(\>)'
replacement = r'\1 contenteditable="true"\2'
content = re.sub(pattern, replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {filepath}")
