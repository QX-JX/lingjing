export interface BackgroundMusic {
    id: string;
    name: string;
    fileName: string;
    category: 'Relaxing' | 'Corporate' | 'Cinematic' | 'Happy';
    duration?: number; // Optional duration in seconds
}

export const BUILTIN_BACKGROUND_MUSIC: BackgroundMusic[] = [
    {
        id: 'bgm_upbeat',
        name: 'Upbeat',
        fileName: 'upbeat.mp3',
        category: 'Happy'
    },
    {
        id: 'bgm_smile',
        name: 'Smile',
        fileName: 'smile.mp3',
        category: 'Happy'
    },
    {
        id: 'bgm_finding_myself',
        name: 'Finding Myself',
        fileName: 'finding myself.mp3',
        category: 'Relaxing'
    },
    {
        id: 'bgm_forest_walk',
        name: 'Forest Walk',
        fileName: 'forest walk.mp3',
        category: 'Relaxing'
    },
    {
        id: 'bgm_valley_sunset',
        name: 'Valley Sunset',
        fileName: 'valley sunset.mp3',
        category: 'Relaxing'
    },
    {
        id: 'bgm_tears_of_joy',
        name: 'Tears of Joy',
        fileName: 'tears of joy.mp3',
        category: 'Cinematic'
    },
    {
        id: 'bgm_silent_descent',
        name: 'Silent Descent',
        fileName: 'silent-descent.mp3',
        category: 'Cinematic'
    }
];

export function getBuiltinBgmPath(fileName: string): string {
    // In production, these should be in the public folder
    // We'll assume they are in /sounds/bgm/
    return `sounds/bgm/${fileName}`;
}
