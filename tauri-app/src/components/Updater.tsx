import { useEffect, useRef } from 'react';
import { useDialog } from '../contexts/DialogContext';

export function Updater() {
    const { showConfirm, showAlert } = useDialog();
    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        const isWindowsDesktop = navigator.platform.toLowerCase().startsWith('win');
        if (!isWindowsDesktop) {
            console.log('Auto-update is only enabled for Windows desktop builds');
            return;
        }

        const checkUpdate = async () => {
            try {
                if (!window.electronAPI?.checkForUpdate) {
                    console.log('Current environment does not support auto-update');
                    return;
                }

                console.log('Checking for updates...');
                const result = await window.electronAPI.checkForUpdate();
                console.log('Update check result:', result);

                if (result.has_update && result.download_url) {
                    const message = `发现新版本 ${result.version}\n\n更新内容：\n${result.update_log || '修复已知问题并优化使用体验。'}\n\n是否立即更新？`;
                    const confirmed = await showConfirm(message, '发现新版本');

                    if (confirmed) {
                        try {
                            await window.electronAPI.startUpdate({
                                download_url: result.download_url,
                                package_hash: result.package_hash
                            });
                        } catch (e: any) {
                            console.error('Update failed:', e);
                            await showAlert(`启动更新失败: ${e.message}`, '错误');
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to check for updates:', error);
            }
        };

        const timer = setTimeout(checkUpdate, 2000);
        return () => clearTimeout(timer);
    }, [showConfirm, showAlert]);

    return null;
}
