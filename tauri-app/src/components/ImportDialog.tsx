import { useState, useRef, useCallback } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { importTextFile, showOpenDialog } from '../services/ttsService';
import { getTextCharCount, truncateText } from '../utils/textProcessor';
import { useToastContext } from '../contexts/ToastContext';
import { t } from '../locales';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const { text, setText, maxLength } = useAppStore();
  const { showToast } = useToastContext();
  const [activeTab, setActiveTab] = useState<'upload'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 清理导入的文本（移除多余的空白字符，但保留必要的换行）
  const cleanImportedText = (text: string): string => {
    if (!text) return '';

    // 1. 移除所有 SSML 标记（如果存在）
    let cleaned = text.replace(/<[^>]+>/g, '');

    // 2. 移除所有不可见字符和控制字符（保留换行符和空格）
    // 移除零宽字符、控制字符等
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

    // 3. 将多个连续空白字符（包括空格、制表符）替换为单个空格
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // 4. 将多个连续换行符替换为单个换行符（最多保留两个换行符）
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 5. 移除行首行尾的空白字符
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

    // 6. 移除文本首尾的空白字符和换行符
    cleaned = cleaned.trim();

    return cleaned;
  };

  // 处理导入的内容
  const handleImportContent = useCallback(async (content: string) => {
    if (!content || !content.trim()) {
      showToast(t('import.fileEmpty'), 'warning');
      return;
    }

    // 调试：记录原始内容长度
    const originalLength = content.length;
    console.log('[ImportDialog] 原始文本长度:', originalLength);
    console.log('[ImportDialog] 原始文本前100字符:', content.substring(0, 100));

    // 清理导入的文本（移除多余的空白字符）
    const cleanedContent = cleanImportedText(content);

    if (!cleanedContent || !cleanedContent.trim()) {
      showToast(t('import.fileEmptyAfterClean'), 'warning');
      return;
    }

    // 调试：记录清理后内容长度
    const cleanedLength = cleanedContent.length;
    console.log('[ImportDialog] 清理后文本长度:', cleanedLength);
    console.log('[ImportDialog] 清理后文本前100字符:', cleanedContent.substring(0, 100));

    // 使用 getTextCharCount 计算字符数，排除空白字符以获得更准确的计数
    // 这样可以避免 Word 文档中的多余空白字符被计算在内
    const visibleCharCount = getTextCharCount(cleanedContent, true);
    const totalCharCount = getTextCharCount(cleanedContent, false);

    console.log('[ImportDialog] 可见字符数（排除空白）:', visibleCharCount);
    console.log('[ImportDialog] 总字符数（含空白）:', totalCharCount);

    // 如果可见字符数超过限制，自动截断
    let finalContent = cleanedContent;
    let wasTruncated = false;
    let originalCharCount = visibleCharCount;

    if (visibleCharCount > maxLength) {
      const truncateResult = truncateText(cleanedContent, maxLength);
      finalContent = truncateResult.text;
      wasTruncated = truncateResult.wasTruncated;
      originalCharCount = truncateResult.originalCharCount;
      
      if (wasTruncated) {
        const finalCharCount = getTextCharCount(finalContent);
        showToast(t('import.truncated', { original: originalCharCount.toString(), final: finalCharCount.toString(), max: maxLength.toString() }), 'info');
      }
    }

    // 确认是否覆盖当前文本
    if (text.length > 0) {
      const shouldAppend = confirm(t('import.appendOrOverwrite', { count: getTextCharCount(finalContent).toString(), max: maxLength.toString() }));
      if (shouldAppend) {
        setText(text + '\n' + finalContent);
      } else {
        setText(finalContent);
      }
    } else {
      setText(finalContent);
    }

    onClose();
  }, [text, maxLength, setText, onClose, showToast]);

  // 处理文件选择（拖拽上传）
  const handleFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;

    // 检查文件大小（2MB = 2 * 1024 * 1024 bytes）
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(t('import.fileTooLarge'), 'warning');
      return;
    }

    // 检查文件类型
    const validExtensions = ['.txt', '.doc', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidFile) {
      showToast(t('import.invalidFormat'), 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      // 对于 txt 文件，直接读取
      if (fileName.endsWith('.txt')) {
        const content = await file.text();
        await handleImportContent(content);
      } else {
        // 对于 doc/docx 文件，需要通过 Electron API 处理
        // 提示用户使用文件对话框选择（因为需要文件路径）
        showToast(t('import.uploadDocxHint'), 'info');
      }
    } catch (error) {
      console.error('导入失败:', error);
      showToast(t('import.importFailed', { error: error.toString() }), 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [handleImportContent, showToast]);

  // 点击上传区域 - 直接打开文件对话框（支持所有格式）
  const handleUploadAreaClick = async () => {
    try {
      const { canceled, filePaths } = await showOpenDialog({
        title: t('import.selectDocument'),
        filters: [
          { name: '文档文件', extensions: ['txt', 'doc', 'docx'] },
          { name: '文本文件', extensions: ['txt'] },
          { name: 'Word 文档', extensions: ['doc', 'docx'] },
        ],
        properties: ['openFile'],
      });

      if (!canceled && filePaths.length > 0) {
        setIsProcessing(true);
        try {
          const content = await importTextFile(filePaths[0]);
          await handleImportContent(content);
        } catch (error) {
          console.error('导入失败:', error);
          showToast(t('import.importFailed', { error: error.toString() }), 'error');
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('打开文件对话框失败:', error);
      showToast(t('import.openDialogFailed'), 'error');
    }
  };

  // 文件输入变化（用于拖拽上传 txt 文件）
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // 重置 input，允许重复选择同一文件
    e.target.value = '';
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t('import.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
              }`}
            onClick={() => setActiveTab('upload')}
          >
            {t('import.uploadDocument')}
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* 上传区域 */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadAreaClick}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <div className="text-gray-600">{t('import.processing')}</div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <div className="text-lg font-medium text-gray-700 mb-2">
                      {t('import.clickToUpload')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('import.supportFormat')}
                    </div>
                  </>
                )}
              </div>

              {/* 隐藏的文件输入（仅用于拖拽上传 txt 文件） */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
