import CryptoJS from "crypto-js";

const SECRET_KEY = "7530bfb1ad6c41627b0f0620078fa5ed";
const SOFT_NUMBER = "10045";

/** 未设置 VITE_API_BASE_URL：开发用空串（Vite 代理）；生产默认直连鲲穹 API */
function resolveApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (v !== undefined) return v;
  if (import.meta.env.DEV) return "";
  return "https://api-web.kunqiongai.com";
}

const API_BASE_URL = resolveApiBaseUrl();
/** 构建时 VITE_API_BASE_URL= 空：走同源 + nginx 反代，避免跨域 */
const SAME_ORIGIN_API = import.meta.env.VITE_API_BASE_URL === "";

/** Web Crypto subtle 仅在安全上下文可用（HTTPS、localhost 等），纯 IP 的 HTTP 下需回退 */
function canUseSubtleCrypto(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.isSecureContext &&
      window.crypto?.subtle &&
      typeof window.crypto.subtle.importKey === "function"
  );
}

function generateUUID(): string {
  if (typeof window.crypto !== 'undefined' && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // 备用实现：当 crypto.randomUUID 不可用时
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function base64UrlEncode(str: string): string {
  return window.btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

async function signMessage(message: string, secret: string): Promise<string> {
  if (canUseSubtleCrypto()) {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const messageData = enc.encode(message);

    const key = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await window.crypto.subtle.sign("HMAC", key, messageData);
    return arrayBufferToBase64(signature);
  }

  // 与 Node crypto.createHmac('sha256', secret).update(message).digest('base64') 一致
  return CryptoJS.HmacSHA256(message, secret).toString(CryptoJS.enc.Base64);
}

export interface SignedNonce {
  nonce: string;
  timestamp: number;
  signature: string;
}

export async function generateSignedNonce(): Promise<string> {
  const nonce = generateUUID().replace(/-/g, "");
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${nonce}|${timestamp}`;
  const signature = await signMessage(message, SECRET_KEY);

  const signedNonce: SignedNonce = {
    nonce,
    timestamp,
    signature
  };

  return base64UrlEncode(JSON.stringify(signedNonce));
}

/** 同源 /api/auth/signed-nonce（推荐），失败时回退前端签名（见集成说明文档） */
export async function getEncodedNonce(): Promise<string> {
  if (SAME_ORIGIN_API) {
    return generateSignedNonce();
  }
  try {
    const r = await fetch("/api/auth/signed-nonce");
    if (r.ok) {
      const j = (await r.json()) as { code?: number; data?: { encodedNonce?: string } };
      if (j.code === 1 && j.data?.encodedNonce) {
        return j.data.encodedNonce;
      }
    }
  } catch {
    /* 走直连或旧逻辑 */
  }
  return generateSignedNonce();
}

/** 同源 /api/auth/login-url，失败时直连鲲穹 */
export async function getLoginUrlResolved(): Promise<string> {
  if (SAME_ORIGIN_API) {
    return getWebLoginUrl();
  }
  try {
    const r = await fetch("/api/auth/login-url");
    if (r.ok) {
      const j = (await r.json()) as { success?: boolean; url?: string; msg?: string };
      if (j.success && j.url) {
        return j.url;
      }
    }
  } catch {
    /* 回退 */
  }
  return getWebLoginUrl();
}

/** 轮询 token：优先同源 GET /api/auth/token */
export async function pollTokenUnified(encodedNonce: string): Promise<Record<string, unknown>> {
  if (SAME_ORIGIN_API) {
    return pollToken(encodedNonce) as Promise<Record<string, unknown>>;
  }
  try {
    const r = await fetch(
      `/api/auth/token?encodedNonce=${encodeURIComponent(encodedNonce)}`
    );
    if (r.ok) {
      return (await r.json()) as Record<string, unknown>;
    }
  } catch {
    /* 回退 */
  }
  return pollToken(encodedNonce) as Promise<Record<string, unknown>>;
}

/** 用户信息：优先同源 GET /api/auth/user-info */
export async function getUserInfoUnified(token: string) {
  if (SAME_ORIGIN_API) {
    return getUserInfo(token);
  }
  try {
    const r = await fetch(`/api/auth/user-info?token=${encodeURIComponent(token)}`);
    if (r.ok) {
      const j = (await r.json()) as { code?: number; data?: { user_info?: unknown } };
      if (j.code === 1 && j.data?.user_info) {
        return j.data.user_info as { avatar: string; nickname: string };
      }
    }
  } catch {
    /* 回退 */
  }
  return getUserInfo(token);
}

/** 登出：优先同源 POST /api/auth/logout */
export async function logoutUnified(token: string): Promise<boolean> {
  if (SAME_ORIGIN_API) {
    return logout(token);
  }
  try {
    const r = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (r.ok) {
      const j = (await r.json()) as { code?: number };
      if (j.code === 1) {
        return true;
      }
    }
  } catch {
    /* 回退 */
  }
  return logout(token);
}

async function post(url: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const formData = new URLSearchParams();

  for (const key in body) {
    const value = body[key];
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers
    },
    body: formData
  });

  return res.json();
}

export async function getWebLoginUrl() {
  const res = await post("/soft_desktop/get_web_login_url", {});
  if (res.code === 1) {
    return res.data.login_url;
  }
  throw new Error(res.msg || "获取登录地址失败");
}

export async function pollToken(clientNonce: string) {
  return post("/user/desktop_get_token", {
    client_type: "desktop",
    client_nonce: clientNonce
  });
}

export async function checkLogin(token: string) {
  const res = await post("/user/check_login", { token });
  return res.code === 1;
}

export async function getUserInfo(token: string) {
  const res = await post("/soft_desktop/get_user_info", {}, { token });
  if (res.code === 1) {
    return res.data.user_info;
  }
  throw new Error(res.msg || "获取用户信息失败");
}

export async function logout(token: string) {
  const res = await post("/logout", {}, { token });
  return res.code === 1;
}

export interface AdvInfo {
  soft_number: number;
  adv_position: string;
  adv_url: string;
  target_url: string;
  width: number;
  height: number;
}

export async function getAdv(softNumber: string, advPosition: string): Promise<AdvInfo[]> {
  const res = await post("/soft_desktop/get_adv", {
    soft_number: softNumber,
    adv_position: advPosition
  });
  return res.code === 1 ? res.data : [];
}

export async function getFeedbackUrl(softNumber: string): Promise<string> {
  const res = await post("/soft_desktop/get_feedback_url", {});
  if (res.code === 1) {
    let url = res.data.url;
    if (url.includes("soft_number=") && !url.match(/soft_number=\d+/)) {
      url += softNumber;
    }
    return url;
  }
  throw new Error(res.msg || "获取反馈地址失败");
}

export async function getCustomUrl(): Promise<string> {
  const res = await post("/soft_desktop/get_custom_url", {});
  if (res.code === 1 && res.data?.url) {
    return res.data.url;
  }
  throw new Error(res.msg || "获取自定义链接失败");
}

export interface AuthCodeCheckResult {
  is_need_auth_code: number;
  auth_code_url?: string;
}

export async function checkNeedAuthCode(deviceId: string): Promise<AuthCodeCheckResult> {
  const res = await post("/soft_desktop/check_get_auth_code", {
    device_id: deviceId,
    soft_number: SOFT_NUMBER
  });
  if (res.code === 1) {
    return res.data;
  }
  throw new Error(res.msg || "检查授权码失败");
}

export interface AuthCodeValidResult {
  auth_code_status: number;
}

export async function checkAuthCodeValid(deviceId: string, authCode: string): Promise<AuthCodeValidResult> {
  const res = await post("/soft_desktop/check_auth_code_valid", {
    device_id: deviceId,
    soft_number: SOFT_NUMBER,
    auth_code: authCode
  });
  if (res.code === 1) {
    return res.data;
  }
  throw new Error(res.msg || "验证授权码失败");
}

export function getSoftNumber(): string {
  return SOFT_NUMBER;
}
