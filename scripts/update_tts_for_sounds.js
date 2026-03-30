const fs = require('fs');
const path = require('path');

// 读取文件
const filePath = path.join(__dirname, 'tauri-app', 'electron', 'ttsService.cjs');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 在 parseRereadSegments 函数之后添加 parseSoundEffectSegments 函数
const insertAfterMarker = `function parseRereadSegments(text, config) {`;
const insertPos = content.indexOf(insertAfterMarker);

if (insertPos === -1) {
    console.error('❌ 找不到插入点');
    process.exit(1);
}

// 找到 parseRereadSegments 函数的结束位置
let braceCount = 0;
let searchPos = insertPos;
let functionEnd = -1;

for (let i = insertPos; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            functionEnd = i + 1;
            break;
        }
    }
}

if (functionEnd === -1) {
    console.error('❌ 找不到函数结束位置');
    process.exit(1);
}

// 准备要插入的新函数
const newFunction = `

/**
 * 解析文本中的音效标记，返回分段数组
 * @param {string} text - 包含音效标记的文本
 * @returns {Array<{type: 'text'|'sound', text?: string, effectId?: string}>} 分段数组
 */
function parseSoundEffectSegments(text) {
    const segments = [];
    const soundRegex = /<sound\\s+effect=["']([^"']+)["']\\s*\\/>/g;

    let lastIndex = 0;
    let match;

    // 重置 regex 的 lastIndex
    soundRegex.lastIndex = 0;

    while ((match = soundRegex.exec(text)) !== null) {
        // 添加音效标记之前的普通文本
        if (match.index > lastIndex) {
            const normalText = text.slice(lastIndex, match.index);
            if (normalText.trim()) {
                segments.push({ type: 'text', text: normalText });
            }
        }

        // 添加音效标记
        const effectId = match[1];
        segments.push({ type: 'sound', effectId: effectId });

        lastIndex = match.index + match[0].length;
    }

    // 添加最后的普通文本
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex);
        if (remainingText.trim()) {
            segments.push({ type: 'text', text: remainingText });
        }
    }

    // 如果没有找到任何音效标记，返回整个文本作为一个片段
    if (segments.length === 0 && text.trim()) {
        segments.push({ type: 'text', text: text });
    }

    console.log('[TTS] 解析音效片段:', segments.map(s => s.type === 'sound' ? \`sound:\${s.effectId}\` : \`text:\${s.text.substring(0, 20)}\`));
    return segments;
}
`;

// 插入新函数
content = content.slice(0, functionEnd) + newFunction + content.slice(functionEnd);
console.log('✓ 添加 parseSoundEffectSegments 函数');

// 2. 修改 generateAudio 函数以处理音效标记
// 找到 hasRereadTags 检查的位置
const hasRereadCheck = `        // 检查文本中是否包含重读标记
        const hasRereadTags = /<reread>/.test(text);`;

const replacementCheck = `        // 检查文本中是否包含音效标记
        const hasSoundEffects = /<sound\\s+effect=["'][^"']+["']\\s*\\/>/.test(text);
        // 检查文本中是否包含重读标记
        const hasRereadTags = /<reread>/.test(text);`;

content = content.replace(hasRereadCheck, replacementCheck);
console.log('✓ 添加音效标记检测');

// 3. 在 generateAudio 函数中添加音效处理逻辑
// 首先在 hasRereadTags 之前处理音效
const hasRereadLogic = `        // 优先处理重读标记（重读和速度不能同时存在）
        if (hasRereadTags) {`;

const replacementLogic = `        // 最优先处理音效标记
        if (hasSoundEffects) {
            console.log('[TTS] 检测到音效标记，使用分段处理');

            // 解析音效片段
            const segments = parseSoundEffectSegments(text);

            if (segments.length === 0) {
                console.log('[TTS] 解析结果为空，回退到普通处理');
            } else {
                // 为每个片段生成音频
                const segmentPaths = [];
                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    
                    if (segment.type === 'sound') {
                        // 音效片段：复制音效文件
                        const soundEffectPath = path.join(__dirname, '..', 'public', 'sounds', 'effects', \`\${segment.effectId}.mp3\`);
                        
                        if (fs.existsSync(soundEffectPath)) {
                            const tempPath = \`\${outputBase}_sound\${i}.mp3\`;
                            fs.copyFileSync(soundEffectPath, tempPath);
                            segmentPaths.push(tempPath);
                            console.log(\`[TTS] 添加音效: \${segment.effectId}\`);
                        } else {
                            console.warn(\`[TTS] 音效文件不存在: \${soundEffectPath}\`);
                        }
                    } else {
                        // 文本片段：生成TTS音频
                        const segmentPath = \`\${outputBase}_seg\${i}.mp3\`;
                        await generateSegmentAudio(
                            { text: segment.text, speed: config.speed || 1.0 },
                            voiceName,
                            config,
                            segmentPath
                        );
                        segmentPaths.push(segmentPath);
                    }
                }

                // 拼接所有音频片段
                await concatenateAudioFiles(segmentPaths, finalPath);

                return finalPath;
            }
        } else if (hasRereadTags) {`;

content = content.replace(hasRereadLogic, replacementLogic);
console.log('✓ 添加音效处理逻辑');

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ ttsService.cjs 更新完成!');
console.log('音效文件应放置在: tauri-app/public/sounds/effects/\{effectId\}.mp3');
