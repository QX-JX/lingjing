
import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';
import authLogo from '../assets/auth-logo.png';
import { t } from '../locales';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  authUrl: string;
}

export function AuthDialog({ isOpen, onClose, onSuccess, authUrl }: AuthDialogProps) {
  const [authCode, setAuthCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!authCode.trim()) {
      setError(t('auth.inputAuthCode'));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await authService.validateAuthCode(authCode.trim());
      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setError(t('auth.invalidAuthCode'));
      }
    } catch (err) {
      setError(t('auth.verifyFailed'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGetAuthCode = async () => {
    // Open URL in external browser
    const urlWithParams = authService.getAuthUrlWithParams(authUrl);
    if (window.electronAPI && window.electronAPI.openExternalUrl) {
      await window.electronAPI.openExternalUrl(urlWithParams);
    } else {
      window.open(urlWithParams, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-4 relative flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
              <img src={authLogo} alt="授权图标" className="w-7 h-7 object-contain" />
            </div>
            <h3 className="font-medium text-lg">{t('auth.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-gray-600 leading-relaxed">
            {t('auth.description')}
          </p>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={authCode}
                onChange={(e) => {
                  setAuthCode(e.target.value);
                  setError(null);
                }}
                placeholder={t('auth.placeholder')}
                className={`w-full px-4 py-3 rounded-lg border ${
                  error ? 'border-rose-500 focus:ring-rose-200' : 'border-gray-300 focus:ring-orange-200'
                } focus:outline-none focus:ring-2 transition-all text-gray-800 placeholder-gray-400`}
              />
            </div>
            {error && (
              <p className="text-sm text-rose-500 animate-pulse">{error}</p>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying || !authCode.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('auth.verifying')}</span>
              </>
            ) : (
              <span>{t('auth.verify')}</span>
            )}
          </button>

          <div className="text-center">
            <button
              onClick={handleGetAuthCode}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium hover:underline transition-all"
            >
              {t('auth.getAuthCode')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
