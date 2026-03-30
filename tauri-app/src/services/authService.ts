
const API_BASE_URL = 'https://api-web.kunqiongai.com';
const SOFT_NUMBER = '10033';

export interface AuthCheckResult {
  is_need_auth_code: number;
  auth_code_url: string;
}

export interface AuthValidationResult {
  auth_code_status: number;
}

class AuthService {
  private static instance: AuthService;
  private deviceId: string | null = null;
  private lastVerifiedDate: string | null = null;

  private constructor() {
    this.lastVerifiedDate = localStorage.getItem('lastVerifiedDate');
    console.log('[AuthService] Initialized, lastVerifiedDate:', this.lastVerifiedDate);
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;
    
    if (window.electronAPI && window.electronAPI.getDeviceId) {
      try {
        this.deviceId = await window.electronAPI.getDeviceId();
        console.log('[AuthService] Got deviceId from Electron:', this.deviceId);
        return this.deviceId;
      } catch (e) {
        console.error('[AuthService] Failed to get deviceId from Electron:', e);
      }
    }
    
    // Fallback for non-electron env (dev)
    console.warn('[AuthService] getDeviceId not available, using mock ID');
    return 'mock-device-id';
  }

  public async checkNeedAuth(): Promise<AuthCheckResult> {
    const deviceId = await this.getDeviceId();
    console.log('[AuthService] checkNeedAuth for deviceId:', deviceId);
    
    try {
      const params = new URLSearchParams();
      params.append('device_id', deviceId);
      params.append('soft_number', SOFT_NUMBER);

      const response = await fetch(`${API_BASE_URL}/soft_desktop/check_get_auth_code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AuthService] checkNeedAuth response:', data);

      if (data.code === 1) {
        const url =
          (data.data && data.data.auth_code_url) ||
          'https://auth-code.kunqiongai.com/web/auth/index';
        return {
          is_need_auth_code: 1,
          auth_code_url: url,
        };
      } else {
        throw new Error(data.msg);
      }
    } catch (error) {
      console.error('[AuthService] Failed to check auth need:', error);
      throw error;
    }
  }

  public async validateAuthCode(authCode: string): Promise<boolean> {
    const deviceId = await this.getDeviceId();
    try {
      const params = new URLSearchParams();
      params.append('device_id', deviceId);
      params.append('soft_number', SOFT_NUMBER);
      params.append('auth_code', authCode);

      const response = await fetch(`${API_BASE_URL}/soft_desktop/check_auth_code_valid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 1) {
        const isValid = data.data.auth_code_status === 1;
        if (isValid) {
          this.markAsVerified();
        }
        return isValid;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Failed to validate auth code:', error);
      return false;
    }
  }

  public isVerifiedToday(): boolean {
    // 每次调用都从 localStorage 读取，避免内存中缓存导致外部修改不生效
    this.lastVerifiedDate = localStorage.getItem('lastVerifiedDate');
    const today = new Date().toDateString();
    const isVerified = this.lastVerifiedDate === today;
    console.log(
      `[AuthService] isVerifiedToday: ${isVerified} (last: ${this.lastVerifiedDate}, today: ${today})`
    );
    return isVerified;
  }

  private markAsVerified() {
    const today = new Date().toDateString();
    this.lastVerifiedDate = today;
    localStorage.setItem('lastVerifiedDate', today);
    console.log('[AuthService] Marked as verified for:', today);
  }

  public clearVerification() {
    this.lastVerifiedDate = null;
    localStorage.removeItem('lastVerifiedDate');
    console.log('[AuthService] Cleared verification');
  }

  public getAuthUrlWithParams(baseUrl: string): string {
      if (!this.deviceId) return baseUrl;
      
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}device_id=${this.deviceId}&software_code=${SOFT_NUMBER}`;
  }

  // 1. 获取网页端登录地址
  public async getWebLoginUrl(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/soft_desktop/get_web_login_url`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.code === 1) {
        return data.data.login_url;
      }
      throw new Error(data.msg || '获取登录地址失败');
    } catch (error) {
      console.error('getWebLoginUrl failed:', error);
      throw error;
    }
  }

  // 2. 生成带签名的 nonce (这里需要在前端模拟生成，或者调用后端接口)
  // 由于密钥不能放在前端，这里假设有一个后端代理接口或者使用非安全方式(仅演示，实际应在主进程或后端)
  // 为了安全，签名过程应该在主进程或服务端进行。
  // 临时方案：如果必须在前端做，且没有后端支持，这是不安全的。
  // 建议：请求主进程生成签名（如果有对应 IPC）或请求后端接口获取签名参数。
  // 假设后端没有提供获取 nonce 的接口，我们需要在本地实现签名逻辑（极不推荐，因为会暴露 SECRET_KEY）
  // 更好的方案：
  // 请求后端一个接口获取签名后的 nonce（如果有）
  // 或者，将签名逻辑放在 Electron 主进程，并通过 IPC 调用，虽然主进程代码也可被反编译，但比前端稍好。
  // 这里暂时模拟一个，或者如果后端有接口更好。
  // 查看文档，没有直接获取签名 nonce 的接口。
  // 我们暂时在主进程实现签名，或者前端实现（风险自负）。
  // 这里为了跑通流程，先在前端实现，但请注意 SECRET_KEY 暴露风险。
  // 修正：文档中提到 "客户端与服务端约定的密钥"，如果是桌面端应用，密钥通常会打包在应用中。
  // 我们可以使用 crypto-js 库在前端生成 HMAC-SHA256。
  
  // 但为了兼容 Header.tsx 的调用，我们先添加空实现或基础实现。
  // 实际上 Header.tsx 依赖这些方法，必须实现。
  
  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // 备用实现：当 crypto.randomUUID 不可用时
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public async generateSignedNonce(): Promise<{ nonce: string; timestamp: number; signature: string }> {
      // 在 Electron 环境下，建议通过 IPC 请求主进程生成，以保护密钥（相对而言）
      // 或者如果密钥已经暴露在 Python 示例代码中，我们暂时硬编码。
      // Python 示例: SECRET_KEY = b"7530bfb1ad6c41627b0f0620078fa5ed"
      
      // 为了不引入 crypto-js 依赖，我们可以尝试使用 Web Crypto API
      const secretKey = "7530bfb1ad6c41627b0f0620078fa5ed";
      const nonce = this.generateUUID().replace(/-/g, '');
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `${nonce}|${timestamp}`;
      
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const msgData = encoder.encode(message);
      
      const key = await crypto.subtle.importKey(
          'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const signatureBuf = await crypto.subtle.sign('HMAC', key, msgData);
      // 转 base64
      const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuf)));
      
      return { nonce, timestamp, signature };
  }

  public encodeSignedNonce(signedNonce: { nonce: string; timestamp: number; signature: string }): string {
      const jsonStr = JSON.stringify(signedNonce);
      // base64 url safe
      const base64 = btoa(jsonStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return base64;
  }

  // 5. 轮询 Token
  public async pollToken(encodedNonce: string, signal?: AbortSignal): Promise<string> {
      const startTime = Date.now();
      const timeout = 300000; // 300s
      
      while (Date.now() - startTime < timeout) {
          if (signal?.aborted) {
              throw new Error('Login cancelled');
          }
          
          try {
              const params = new URLSearchParams();
              params.append('client_type', 'desktop');
              params.append('client_nonce', encodedNonce);
              
              const response = await fetch(`${API_BASE_URL}/user/desktop_get_token?${params.toString()}`, {
                  method: 'POST',
                  signal
              });
              
              if (response.ok) {
                  const data = await response.json();
                  if (data.code === 1 && data.data?.token) {
                      return data.data.token;
                  }
              }
          } catch (e) {
              // ignore error and retry
          }
          
          // wait 2s
          await new Promise(resolve => setTimeout(resolve, 2000));
      }
      throw new Error('Login timeout');
  }

  // 6. 获取用户信息
  public async getUserInfo(token: string): Promise<any> {
      const response = await fetch(`${API_BASE_URL}/soft_desktop/get_user_info`, {
          method: 'POST',
          headers: {
              'token': token
          }
      });
      const data = await response.json();
      if (data.code === 1) {
          return data.data.user_info;
      }
      throw new Error(data.msg || '获取用户信息失败');
  }

  // 退出登录
  public async logout(token: string): Promise<void> {
      await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
              'token': token
          }
      });
  }
}

export const authService = AuthService.getInstance();
