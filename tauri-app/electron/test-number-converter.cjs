/**
 * 数字转换功能测试
 */

const { numberToDigits, numberToCardinal, numberToTelephone, convertNumber } = require('./numberConverter.cjs');

console.log('=== 数字转换功能测试 ===\n');

// 测试用例
const testCases = [
    // 逐位读法测试
    { mode: 'digits', input: '123', expected: '一二三', desc: '基础逐位读法' },
    { mode: 'digits', input: '456789', expected: '四五六七八九', desc: '长数字逐位读法' },
    { mode: 'digits', input: '1010', expected: '一零一零', desc: '包含零的逐位读法' },

    // 基数读法测试
    { mode: 'cardinal', input: '0', expected: '零', desc: '零' },
    { mode: 'cardinal', input: '5', expected: '五', desc: '个位数' },
    { mode: 'cardinal', input: '10', expected: '十', desc: '十（不读"一十"）' },
    { mode: 'cardinal', input: '11', expected: '十一', desc: '十一' },
    { mode: 'cardinal', input: '20', expected: '二十', desc: '整十' },
    { mode: 'cardinal', input: '99', expected: '九十九', desc: '两位数' },
    { mode: 'cardinal', input: '100', expected: '一百', desc: '整百' },
    { mode: 'cardinal', input: '101', expected: '一百零一', desc: '百零几' },
    { mode: 'cardinal', input: '110', expected: '一百一十', desc: '百一十' },
    { mode: 'cardinal', input: '123', expected: '一百二十三', desc: '三位数' },
    { mode: 'cardinal', input: '1000', expected: '一千', desc: '整千' },
    { mode: 'cardinal', input: '1001', expected: '一千零一', desc: '千零几' },
    { mode: 'cardinal', input: '1234', expected: '一千二百三十四', desc: '四位数' },
    { mode: 'cardinal', input: '10000', expected: '一万', desc: '一万' },
    { mode: 'cardinal', input: '10086', expected: '一万零八十六', desc: '万零几十' },
    { mode: 'cardinal', input: '12345', expected: '一万二千三百四十五', desc: '五位数' },
    { mode: 'cardinal', input: '100000', expected: '十万', desc: '十万' },
    { mode: 'cardinal', input: '123456', expected: '十二万三千四百五十六', desc: '六位数' },
    { mode: 'cardinal', input: '1000000', expected: '一百万', desc: '一百万' },
    { mode: 'cardinal', input: '12345678', expected: '一千二百三十四万五千六百七十八', desc: '八位数' },
    { mode: 'cardinal', input: '100000000', expected: '一亿', desc: '一亿' },
    { mode: 'cardinal', input: '123456789', expected: '一亿二千三百四十五万六千七百八十九', desc: '九位数' },

    // 小数测试
    { mode: 'cardinal', input: '3.14', expected: '三点一四', desc: '小数' },
    { mode: 'cardinal', input: '0.5', expected: '零点五', desc: '零点几' },

    // 负数测试
    { mode: 'cardinal', input: '-5', expected: '负五', desc: '负数' },
    { mode: 'cardinal', input: '-123', expected: '负一百二十三', desc: '负数' },

    // 电话号码读法测试
    { mode: 'telephone', input: '110', expected: '幺幺零', desc: '电话号码（1读作"幺"）' },
    { mode: 'telephone', input: '13800138000', expected: '幺三八零零幺三八零零零', desc: '手机号码' },
    { mode: 'telephone', input: '10086', expected: '幺零零八六', desc: '客服号码' },
];

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
    const result = convertNumber(testCase.input, testCase.mode);
    const passed = result === testCase.expected;

    if (passed) {
        passCount++;
        console.log(`✅ 测试 ${index + 1}: ${testCase.desc}`);
    } else {
        failCount++;
        console.log(`❌ 测试 ${index + 1}: ${testCase.desc}`);
        console.log(`   输入: ${testCase.input} (${testCase.mode})`);
        console.log(`   期望: ${testCase.expected}`);
        console.log(`   实际: ${result}`);
    }
});

console.log(`\n=== 测试结果 ===`);
console.log(`总计: ${testCases.length} 个测试`);
console.log(`通过: ${passCount} 个 ✅`);
console.log(`失败: ${failCount} 个 ❌`);

if (failCount === 0) {
    console.log('\n🎉 所有测试通过！');
} else {
    console.log(`\n⚠️  有 ${failCount} 个测试失败，请检查实现。`);
}

// 集成测试：完整的SSML文本预处理
console.log('\n=== 集成测试 ===');
console.log('测试完整的文本预处理流程：\n');

const integrationTests = [
    {
        input: '我的电话是<number mode="telephone">13800138000</number>',
        expected: '我的电话是幺三八零零幺三八零零零'
    },
    {
        input: '今年是<number mode="cardinal">2024</number>年',
        expected: '今年是二千零二十四年'
    },
    {
        input: '验证码是<number mode="digits">8964</number>',
        expected: '验证码是八九六四'
    },
    {
        input: '价格是<number mode="cardinal">3.14</number>元',
        expected: '价格是三点一四元'
    }
];

integrationTests.forEach((test, index) => {
    // 模拟 preprocessSSMLTags 中的数字处理
    const result = test.input.replace(/<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g, (match, mode, numStr) => {
        return convertNumber(numStr.trim(), mode);
    });

    const passed = result === test.expected;
    console.log(`${passed ? '✅' : '❌'} 集成测试 ${index + 1}:`);
    console.log(`   输入: ${test.input}`);
    console.log(`   输出: ${result}`);
    if (!passed) {
        console.log(`   期望: ${test.expected}`);
    }
});

console.log('\n提示：请在应用中实际测试数字读法功能');
console.log('1. 选中文本中的数字（如 "123"）');
console.log('2. 点击"数字读法"按钮，选择读法模式');
console.log('3. 点击"试听"，听TTS朗读效果');
