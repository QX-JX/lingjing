/**
 * 停顿功能测试脚本
 * 用于验证SSML标记预处理功能
 */

// 测试用例
const testCases = [
    {
        name: '基础停顿测试',
        input: '欢迎使用<pause ms="200"/>灵境配音<pause ms="500"/>这是测试<pause ms="1000"/>',
        expected: '短停顿转为逗号，中停顿转为句号，长停顿转为句号+空格'
    },
    {
        name: '数字读法标记',
        input: '今天是<number mode="cardinal">2024</number>年<number mode="digits">12</number>月',
        expected: '移除number标记，保留数字'
    },
    {
        name: '变速标记',
        input: '正常速度<speed rate="1.5">这里是快速<pause ms="300"/>朗读</speed>恢复正常',
        expected: '移除speed标记，保留内容和停顿'
    },
    {
        name: '混合标记',
        input: '开始<pause ms="100"/>数字<number mode="cardinal">123</number><pause ms="600"/>结束',
        expected: '所有标记都被正确处理'
    },
    {
        name: '重读和多音字',
        input: '重复<repeat times="2"/>发音中<polyphone pronunciation="zhong"/>测试',
        expected: '移除重读和多音字标记'
    }
];

console.log('=== 停顿功能测试 ===\n');

// 由于preprocessSSMLTags是内部函数，我们直接测试正则表达式逻辑
testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase.name}`);
    console.log(`输入: ${testCase.input}`);

    let result = testCase.input;

    // 复制preprocessSSMLTags的逻辑
    // 1. 处理停顿标记
    result = result.replace(/<pause\s+ms=["'](\d+)["']\s*\/>/g, (match, ms) => {
        const pauseMs = parseInt(ms, 10);
        if (pauseMs < 300) return '，';
        else if (pauseMs < 700) return '。';
        else if (pauseMs < 1500) return '。 ';
        else return '。  ';
    });

    // 2. 移除数字读法标记
    result = result.replace(/<number\s+mode=["'][^"']+["']>([^<]*)<\/number>/g, '$1');

    // 3. 移除速度标记
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
        const before = result;
        result = result.replace(/<speed\s+rate=["'][^"']+["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g, '$1');
        changed = (before !== result);
        iterations++;
    }

    // 4. 移除重读标记
    result = result.replace(/<repeat\s+times=["']\d+["']\s*\/>/g, '');

    // 5. 移除多音字标记
    result = result.replace(/<polyphone\s+pronunciation=["'][^"']+["']\s*\/>/g, '');

    console.log(`输出: ${result}`);
    console.log(`预期: ${testCase.expected}`);
    console.log('---\n');
});

console.log('✅ 测试完成！');
console.log('\n提示：请在应用中实际测试以下场景：');
console.log('1. 插入不同时长的停顿（0.1s, 0.5s, 1s, 2s）');
console.log('2. 点击"试听"按钮，检查音频是否有停顿效果');
console.log('3. 观察控制台日志，确认文本预处理正确');
