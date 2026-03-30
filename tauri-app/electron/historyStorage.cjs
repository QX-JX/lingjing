/**
 * 历史记录存储服务
 * 负责保存、读取、删除历史记录
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class HistoryStorage {
    constructor() {
        // 历史记录存储路径
        this.storageDir = path.join(app.getPath('userData'), 'history');
        this.historyFile = path.join(this.storageDir, 'records.json');
        this.maxRecords = 100; // 最多保存 100 条记录
        
        this.init();
    }

    /**
     * 初始化存储目录
     */
    async init() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
            console.log('[HistoryStorage] 初始化成功:', this.storageDir);
        } catch (error) {
            console.error('[HistoryStorage] 初始化失败:', error);
        }
    }

    /**
     * 保存历史记录
     * @param {Object} record - 历史记录对象
     * @returns {Promise<Object>} 保存的记录（包含 id）
     */
    async saveRecord(record) {
        try {
            // 读取现有记录
            const records = await this.getAllRecords();

            // 生成唯一 ID
            const id = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 创建新记录
            const newRecord = {
                id,
                text: record.text || '',
                voiceConfig: record.voiceConfig || null,
                audioConfig: record.audioConfig || null,
                bgmConfig: record.bgmConfig || null,
                timestamp: Date.now(),
                title: record.title || this.generateTitle(record.text),
                characterCount: record.text ? record.text.length : 0,
            };

            // 添加到记录列表开头
            records.unshift(newRecord);

            // 限制记录数量
            if (records.length > this.maxRecords) {
                records.splice(this.maxRecords);
            }

            // 保存到文件
            await fs.writeFile(this.historyFile, JSON.stringify(records, null, 2), 'utf-8');

            console.log('[HistoryStorage] 保存成功:', id);
            return newRecord;
        } catch (error) {
            console.error('[HistoryStorage] 保存失败:', error);
            throw new Error(`保存历史记录失败: ${error.message}`);
        }
    }

    /**
     * 获取所有历史记录
     * @returns {Promise<Array>} 历史记录列表
     */
    async getAllRecords() {
        try {
            const data = await fs.readFile(this.historyFile, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            // 文件不存在或解析失败，返回空数组
            if (error.code === 'ENOENT') {
                return [];
            }
            console.error('[HistoryStorage] 读取失败:', error);
            return [];
        }
    }

    /**
     * 根据 ID 获取单条记录
     * @param {string} id - 记录 ID
     * @returns {Promise<Object|null>} 历史记录
     */
    async getRecordById(id) {
        try {
            const records = await this.getAllRecords();
            return records.find(r => r.id === id) || null;
        } catch (error) {
            console.error('[HistoryStorage] 获取记录失败:', error);
            return null;
        }
    }

    /**
     * 删除历史记录
     * @param {string} id - 记录 ID
     * @returns {Promise<boolean>} 是否删除成功
     */
    async deleteRecord(id) {
        try {
            let records = await this.getAllRecords();
            const originalLength = records.length;
            
            records = records.filter(r => r.id !== id);

            if (records.length === originalLength) {
                console.warn('[HistoryStorage] 记录不存在:', id);
                return false;
            }

            await fs.writeFile(this.historyFile, JSON.stringify(records, null, 2), 'utf-8');
            console.log('[HistoryStorage] 删除成功:', id);
            return true;
        } catch (error) {
            console.error('[HistoryStorage] 删除失败:', error);
            throw new Error(`删除历史记录失败: ${error.message}`);
        }
    }

    /**
     * 清空所有历史记录
     * @returns {Promise<boolean>} 是否清空成功
     */
    async clearAllRecords() {
        try {
            await fs.writeFile(this.historyFile, JSON.stringify([], null, 2), 'utf-8');
            console.log('[HistoryStorage] 清空所有记录成功');
            return true;
        } catch (error) {
            console.error('[HistoryStorage] 清空失败:', error);
            throw new Error(`清空历史记录失败: ${error.message}`);
        }
    }

    /**
     * 更新历史记录（修改标题等）
     * @param {string} id - 记录 ID
     * @param {Object} updates - 更新内容
     * @returns {Promise<Object|null>} 更新后的记录
     */
    async updateRecord(id, updates) {
        try {
            const records = await this.getAllRecords();
            const index = records.findIndex(r => r.id === id);

            if (index === -1) {
                console.warn('[HistoryStorage] 记录不存在:', id);
                return null;
            }

            // 更新记录
            records[index] = {
                ...records[index],
                ...updates,
                id, // 确保 ID 不被修改
                timestamp: records[index].timestamp, // 保留原始时间戳
            };

            await fs.writeFile(this.historyFile, JSON.stringify(records, null, 2), 'utf-8');
            console.log('[HistoryStorage] 更新成功:', id);
            return records[index];
        } catch (error) {
            console.error('[HistoryStorage] 更新失败:', error);
            throw new Error(`更新历史记录失败: ${error.message}`);
        }
    }

    /**
     * 生成记录标题（从文本前 20 个字符）
     * @param {string} text - 文本内容
     * @returns {string} 标题
     */
    generateTitle(text) {
        if (!text || text.trim().length === 0) {
            return '空白文档';
        }
        const cleaned = text.trim().replace(/\n/g, ' ');
        if (cleaned.length <= 20) {
            return cleaned;
        }
        return cleaned.substring(0, 20) + '...';
    }

    /**
     * 搜索历史记录
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array>} 匹配的记录列表
     */
    async searchRecords(keyword) {
        try {
            const records = await this.getAllRecords();
            if (!keyword || keyword.trim().length === 0) {
                return records;
            }

            const lowerKeyword = keyword.toLowerCase();
            return records.filter(r => 
                r.title.toLowerCase().includes(lowerKeyword) ||
                r.text.toLowerCase().includes(lowerKeyword)
            );
        } catch (error) {
            console.error('[HistoryStorage] 搜索失败:', error);
            return [];
        }
    }
}

// 导出单例
module.exports = new HistoryStorage();
