/**
 * 数字转换工具模块
 * 将阿拉伯数字转换为中文文字，支持多种读法模式
 */

// 基础数字映射
const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const PHONE_DIGITS = ['零', '幺', '二', '三', '四', '五', '六', '七', '八', '九'];

// 单位
const UNITS = ['', '十', '百', '千'];
const BIG_UNITS = ['', '万', '亿', '万亿'];

/**
 * 将数字逐位转换为中文
 * @param {string} numStr - 数字字符串
 * @returns {string} 中文数字（逐位）
 * @example numberToDigits('123') => '一二三'
 */
function numberToDigits(numStr) {
    return numStr.split('').map(char => {
        if (char >= '0' && char <= '9') {
            return DIGITS[parseInt(char)];
        }
        return char; // 保留非数字字符（如小数点）
    }).join('');
}

/**
 * 将数字转换为电话号码读法
 * @param {string} numStr - 数字字符串
 * @returns {string} 电话号码读法（1读作"幺"）
 * @example numberToTelephone('110') => '幺幺零'
 */
function numberToTelephone(numStr) {
    return numStr.split('').map(char => {
        if (char >= '0' && char <= '9') {
            return PHONE_DIGITS[parseInt(char)];
        }
        return char;
    }).join('');
}

/**
 * 将四位以内的数字转换为中文基数
 * @param {string} numStr - 四位以内的数字字符串
 * @returns {string} 中文基数
 * @example sectionToChinese('1234') => '一千二百三十四'
 */
function sectionToChinese(numStr) {
    const num = parseInt(numStr);
    if (num === 0) return '';
    if (num < 0) return '';

    let result = '';
    const digits = numStr.split('').map(d => parseInt(d));
    const len = digits.length;

    for (let i = 0; i < len; i++) {
        const digit = digits[i];
        const unitIndex = len - i - 1;

        if (digit === 0) {
            // 零的处理：只在必要时添加"零"
            // 如果前面已经有内容，且下一位不是零，则添加零
            if (result && i < len - 1 && digits[i + 1] !== 0) {
                result += '零';
            }
        } else {
            // 特殊处理：10-19 不读"一十"，直接读"十"
            if (digit === 1 && unitIndex === 1 && len === 2) {
                result += '十';
            } else {
                result += DIGITS[digit] + UNITS[unitIndex];
            }
        }
    }

    return result;
}

/**
 * 将整数转换为中文基数
 * @param {number} num - 整数
 * @returns {string} 中文基数
 * @example integerToChinese(12345) => '一万二千三百四十五'
 */
function integerToChinese(num) {
    if (num === 0) return '零';
    if (num < 0) return '负' + integerToChinese(-num);

    const numStr = num.toString();
    const len = numStr.length;

    // 按四位分组（从右往左）
    const sections = [];
    for (let i = len; i > 0; i -= 4) {
        const start = Math.max(0, i - 4);
        sections.unshift(numStr.slice(start, i));
    }

    let result = '';
    const sectionCount = sections.length;

    for (let i = 0; i < sectionCount; i++) {
        const section = sections[i];
        const sectionNum = parseInt(section);
        const unitIndex = sectionCount - i - 1;

        if (sectionNum === 0) {
            // 如果这一节是0，跳过
            continue;
        } else {
            const sectionText = sectionToChinese(section);

            // 检查是否需要在前面添加"零"
            // 条件：前面有内容 && 当前节的数字小于1000
            if (result && sectionNum < 1000) {
                result += '零';
            }

            result += sectionText + BIG_UNITS[unitIndex];
        }
    }

    // 清理多余的零
    result = result.replace(/零+/g, '零');
    result = result.replace(/零([万亿])/g, '$1');
    result = result.replace(/零+$/g, '');

    return result;
}

/**
 * 将数字转换为中文基数（支持小数）
 * @param {string} numStr - 数字字符串
 * @returns {string} 中文基数
 * @example numberToCardinal('123.45') => '一百二十三点四五'
 */
function numberToCardinal(numStr) {
    numStr = numStr.trim();

    // 处理负数
    let isNegative = false;
    if (numStr.startsWith('-')) {
        isNegative = true;
        numStr = numStr.slice(1);
    }

    // 分割整数和小数部分
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    let result = '';

    // 转换整数部分
    const integerNum = parseInt(integerPart || '0');
    result += integerToChinese(integerNum);

    // 转换小数部分
    if (decimalPart) {
        result += '点';
        result += numberToDigits(decimalPart);
    }

    // 添加负号
    if (isNegative) {
        result = '负' + result;
    }

    return result;
}

/**
 * 统一的数字转换接口
 * @param {string} numStr - 数字字符串
 * @param {string} mode - 转换模式：'digits' | 'cardinal' | 'telephone'
 * @returns {string} 转换后的中文文字
 */
function convertNumber(numStr, mode) {
    if (!numStr) return '';

    switch (mode) {
        case 'digits':
            return numberToDigits(numStr);
        case 'cardinal':
            return numberToCardinal(numStr);
        case 'telephone':
            return numberToTelephone(numStr);
        default:
            // 默认使用基数读法
            return numberToCardinal(numStr);
    }
}

module.exports = {
    numberToDigits,
    numberToCardinal,
    numberToTelephone,
    convertNumber,
};
