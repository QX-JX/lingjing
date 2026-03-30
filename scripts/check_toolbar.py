import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "r", encoding="utf8") as f:
    content = f.read()

# 在导入部分添加新的导入
import_pattern = r"(from '\.\./utils/textMarkers';)"
new_import = r"\1\nimport { applyMarkerWithDOM } from '../utils/markerHelper';"
newcontent = re.sub(import_pattern, new_import, content, count=1)

# 查找 handleReread 函数
reread_pattern = r"(  //?  ?重读功能.*?\n)(  const handleReread = async \(\) => \{[\s\S]*?\n  \};)"

match = re.search(reread_pattern, content)
if match:
    print("找到 handleReread 函数")
    print(f"起始位置: {match.start()}")
    print(f"结束位置: {match.end()}")
    print(f"匹配代码片段前100个字符:\n{match.group()[:200]}")
else:
    print("未找到 handleReread 函数，尝试查找注释")
    # 尝试仅查找注释
    comment_pattern = r"重读功能"
    matches = list(re.finditer(comment_pattern, content))
    print(f"找到 {len(matches)} 处'重读功能'")
    for i, m in enumerate(matches):
        start = max(0, m.start() - 50)
        end = min(len(content), m.end() + 200)
        print(f"\n匹配 {i+1}:")
        print(content[start:end])
