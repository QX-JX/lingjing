import { useEffect, useState } from 'react';
import { AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 1000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // 等待动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 shadow-blue-100',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 shadow-amber-100',
    error: 'bg-red-50 border-red-200 text-red-800 shadow-red-100',
  };

  const iconStyles = {
    info: 'text-blue-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
  };

  const IconComponent = type === 'error' ? AlertCircle : type === 'warning' ? AlertTriangle : Info;

  return (
    <div
      className={`transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border-2 ${typeStyles[type]} min-w-[320px] max-w-md backdrop-blur-sm`}
      >
        <div className={`flex-shrink-0 ${iconStyles[type]}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <span className="flex-1 text-sm font-medium leading-relaxed">{message}</span>
        <button
          onClick={handleClose}
          className={`flex-shrink-0 p-1 rounded-md hover:bg-opacity-20 hover:bg-gray-500 transition-all duration-200 ${iconStyles[type]} opacity-70 hover:opacity-100`}
          aria-label="关闭提示"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex flex-col gap-3 items-center">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="pointer-events-auto"
            style={{
              transform: `translateY(${index * 70}px)`,
              transition: 'transform 0.3s ease-out',
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => onRemove(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
