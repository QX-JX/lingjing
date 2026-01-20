import { createContext, useContext, useState, ReactNode } from 'react';

interface DialogOptions {
    title?: string;
    message: string;
    defaultValue?: string;
    type: 'alert' | 'confirm' | 'prompt';
}

interface DialogContextType {
    showAlert: (message: string, title?: string) => Promise<void>;
    showConfirm: (message: string, title?: string) => Promise<boolean>;
    showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within DialogProvider');
    }
    return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [resolveCallback, setResolveCallback] = useState<((value: any) => void) | null>(null);

    const showAlert = (message: string, title?: string): Promise<void> => {
        return new Promise((resolve) => {
            setDialogOptions({ type: 'alert', message, title: title || '提示' });
            setIsOpen(true);
            setResolveCallback(() => () => {
                setIsOpen(false);
                resolve();
            });
        });
    };

    const showConfirm = (message: string, title?: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogOptions({ type: 'confirm', message, title: title || '确认' });
            setIsOpen(true);
            setResolveCallback(() => (result: boolean) => {
                setIsOpen(false);
                resolve(result);
            });
        });
    };

    const showPrompt = (message: string, defaultValue = '', title?: string): Promise<string | null> => {
        return new Promise((resolve) => {
            setDialogOptions({ type: 'prompt', message, defaultValue, title: title || '输入' });
            setInputValue(defaultValue);
            setIsOpen(true);
            setResolveCallback(() => (result: string | null) => {
                setIsOpen(false);
                resolve(result);
            });
        });
    };

    const handleConfirm = () => {
        if (!resolveCallback) return;

        if (dialogOptions?.type === 'alert') {
            resolveCallback();
        } else if (dialogOptions?.type === 'confirm') {
            resolveCallback(true);
        } else if (dialogOptions?.type === 'prompt') {
            resolveCallback(inputValue);
        }
    };

    const handleCancel = () => {
        if (!resolveCallback) return;

        if (dialogOptions?.type === 'confirm') {
            resolveCallback(false);
        } else if (dialogOptions?.type === 'prompt') {
            resolveCallback(null);
        }
        setIsOpen(false);
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}

            {/* Dialog Modal */}
            {isOpen && dialogOptions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 min-w-[400px] max-w-[500px]">
                        <h3 className="text-lg font-semibold mb-4">{dialogOptions.title}</h3>
                        <p className="text-gray-700 mb-6 whitespace-pre-line">{dialogOptions.message}</p>

                        {dialogOptions.type === 'prompt' && (
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirm();
                                    if (e.key === 'Escape') handleCancel();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        )}

                        <div className="flex justify-end gap-2">
                            {(dialogOptions.type === 'confirm' || dialogOptions.type === 'prompt') && (
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    取消
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                autoFocus={dialogOptions.type !== 'prompt'}
                            >
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
}
