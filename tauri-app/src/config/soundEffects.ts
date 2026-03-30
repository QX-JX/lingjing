/**
 * 音效配置文件
 * 定义所有可用的音效及其元数据
 */

export interface SoundEffect {
    id: string;
    name: string;
    fileName: string;
    category: '人声' | '环境' | '提示' | '动作';
    duration: number; // 毫秒
    icon: string; // emoji
    description?: string;
}

/**
 * 预定义的音效列表
 */
export const SOUND_EFFECTS: SoundEffect[] = [
    // 人声类
    {
        id: 'applause',
        name: '掌声',
        fileName: 'applause.mp3',
        category: '人声',
        duration: 2000,
        icon: '👏',
        description: '观众鼓掌'
    },
    {
        id: 'laugh',
        name: '笑声',
        fileName: 'laugh.mp3',
        category: '人声',
        duration: 1500,
        icon: '😄',
        description: '欢快的笑声'
    },
    {
        id: 'gasp',
        name: '惊讶',
        fileName: 'gasp.mp3',
        category: '人声',
        duration: 500,
        icon: '😮',
        description: '倒吸一口气'
    },

    // 环境类
    {
        id: 'doorbell',
        name: '门铃',
        fileName: 'doorbell.mp3',
        category: '环境',
        duration: 1000,
        icon: '🔔',
        description: '门铃声'
    },
    {
        id: 'phone-ring',
        name: '电话铃声',
        fileName: 'phone-ring.mp3',
        category: '环境',
        duration: 2000,
        icon: '📞',
        description: '电话铃声'
    },
    {
        id: 'knock',
        name: '敲门',
        fileName: 'knock.mp3',
        category: '环境',
        duration: 1000,
        icon: '🚪',
        description: '敲门声'
    },

    // 提示类
    {
        id: 'notification',
        name: '通知',
        fileName: 'notification.mp3',
        category: '提示',
        duration: 500,
        icon: '🔔',
        description: '消息通知音'
    },
    {
        id: 'success',
        name: '成功',
        fileName: 'success.mp3',
        category: '提示',
        duration: 1000,
        icon: '✅',
        description: '操作成功提示音'
    },
    {
        id: 'warning',
        name: '警告',
        fileName: 'warning.mp3',
        category: '提示',
        duration: 1000,
        icon: '⚠️',
        description: '警告提示音'
    }
];

/**
 * 根据ID获取音效
 */
export function getSoundEffectById(id: string): SoundEffect | undefined {
    return SOUND_EFFECTS.find(effect => effect.id === id);
}

/**
 * 根据分类获取音效列表
 */
export function getSoundEffectsByCategory(category: SoundEffect['category']): SoundEffect[] {
    return SOUND_EFFECTS.filter(effect => effect.category === category);
}

/**
 * 检查是否在 Electron 环境中运行
 */
function isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * 获取音效文件的完整路径
 * 支持预置音效和自定义音效
 * 在 Electron 环境中使用 app:// 协议访问打包后的资源
 */
export function getSoundEffectPath(effectId: string): string {
    // 检查是否是自定义音效
    if (effectId.startsWith('custom_')) {
        // 自定义音效路径格式: sounds/custom/{fileName}
        // 注意：不要以 / 开头，因为 app:// 协议处理会去掉开头的 /
        const fileName = effectId.replace('custom_', '');
        const resourcePath = `sounds/custom/${fileName}`;
        
        // 在 Electron 环境中使用 app:// 协议
        if (isElectronEnvironment()) {
            return `app:///${resourcePath}`;
        }
        return `/${resourcePath}`;
    }

    // 预置音效
    const effect = getSoundEffectById(effectId);
    if (!effect) {
        throw new Error(`Sound effect with id "${effectId}" not found`);
    }
    
    // 注意：不要以 / 开头，因为 app:// 协议处理会去掉开头的 /
    const resourcePath = `sounds/effects/${effect.fileName}`;
    
    // 在 Electron 环境中使用 app:// 协议
    if (isElectronEnvironment()) {
        return `app:///${resourcePath}`;
    }
    return `/${resourcePath}`;
}

/**
 * 检查音效是否为自定义音效
 */
export function isCustomSound(effectId: string): boolean {
    return effectId.startsWith('custom_');
}

/**
 * 所有分类
 */
export const SOUND_CATEGORIES: Array<SoundEffect['category']> = ['人声', '环境', '提示'];
