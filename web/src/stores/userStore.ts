import { reactive, readonly } from "vue";
import * as authApi from "../api/auth";

function generateUUID(): string {
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

/** 与《鲲穹 Web 登录实现说明》一致的存储键 */
const STORAGE_TOKEN = "kq_token";
const STORAGE_USER = "kq_user";
const STORAGE_LOGIN_NONCE = "kq_login_nonce";
const STORAGE_RETURN_URL = "kq_login_return_url";
const STORAGE_AUTH_CALLBACK = "kq_auth_callback";
const LEGACY_TOKEN_KEY = "auth_token";

const POLL_MS = 2500;
const LOGIN_TIMEOUT_MS = 3 * 60 * 1000;

interface UserInfoShape {
  avatar: string;
  nickname: string;
}

interface UserState {
  isLoggedIn: boolean;
  token: string;
  userInfo: UserInfoShape | null;
  loading: boolean;
  loginError: string | null;
}

interface AuthState {
  isAuthorized: boolean;
  deviceId: string;
}

function migrateLegacyStorage() {
  const kq = localStorage.getItem(STORAGE_TOKEN);
  const old = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!kq && old) {
    localStorage.setItem(STORAGE_TOKEN, old);
  }
}

function loadStoredUser(): UserInfoShape | null {
  const raw = localStorage.getItem(STORAGE_USER);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as UserInfoShape;
    if (o && typeof o.nickname === "string") return o;
  } catch {
    /* ignore */
  }
  return null;
}

migrateLegacyStorage();

const initialToken = localStorage.getItem(STORAGE_TOKEN) || "";

const userState = reactive<UserState>({
  isLoggedIn: !!initialToken,
  token: initialToken,
  userInfo: loadStoredUser(),
  loading: false,
  loginError: null
});

const authState = reactive<AuthState>({
  isAuthorized: localStorage.getItem("auth_code") ? true : false,
  deviceId: ""
});

function loadAuthState() {
  const savedDeviceId = localStorage.getItem("auth_code_device");
  if (savedDeviceId) {
    authState.deviceId = savedDeviceId;
  }
  authState.isAuthorized = !!localStorage.getItem("auth_code");
}

loadAuthState();

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let loginCancelled = false;

function clearPollTimer() {
  if (pollTimer !== null) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function persistToken(token: string) {
  userState.token = token;
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function persistUserInfo(info: UserInfoShape | null) {
  userState.userInfo = info;
  if (info) {
    localStorage.setItem(STORAGE_USER, JSON.stringify(info));
  } else {
    localStorage.removeItem(STORAGE_USER);
  }
}

function notifyAuthSync() {
  try {
    localStorage.setItem(STORAGE_AUTH_CALLBACK, String(Date.now()));
  } catch {
    /* ignore */
  }
}

let syncListenersAttached = false;

function attachCrossTabSync() {
  if (syncListenersAttached || typeof window === "undefined") return;
  syncListenersAttached = true;

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_TOKEN) {
      if (e.newValue) {
        userState.token = e.newValue;
        userState.isLoggedIn = true;
        persistUserInfo(loadStoredUser());
      } else {
        performLogoutLocalOnly();
      }
    }
  });

  window.addEventListener("message", (ev: MessageEvent) => {
    if (ev.data?.type === "KQ_AUTH_CALLBACK" && typeof ev.data?.token === "string") {
      void finalizeLoginWithToken(ev.data.token as string);
    }
  });
}

async function fetchUserInfo() {
  if (!userState.token) return;
  try {
    const info = await authApi.getUserInfoUnified(userState.token);
    persistUserInfo(info);
  } catch (e) {
    console.error("Fetch user info failed", e);
  }
}

async function finalizeLoginWithToken(newToken: string) {
  clearPollTimer();
  loginCancelled = false;
  persistToken(newToken);
  userState.isLoggedIn = true;
  userState.loading = false;
  userState.loginError = null;
  localStorage.removeItem(STORAGE_LOGIN_NONCE);
  notifyAuthSync();
  await fetchUserInfo();
}

function performLogoutLocalOnly() {
  clearPollTimer();
  userState.token = "";
  userState.isLoggedIn = false;
  persistUserInfo(null);
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER);
}

function tryHandleCallbackFromCurrentUrl(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const token =
    params.get("token") || params.get("login_token") || params.get("kq_token");
  if (!token) return false;

  /** 避免与 resumePendingLoginIfNeeded 竞态：先同步清掉轮询用的 nonce */
  localStorage.removeItem(STORAGE_LOGIN_NONCE);

  let parsedInfo: UserInfoShape | null = null;
  const uinfo = params.get("user_info") || params.get("userInfo");
  if (uinfo) {
    try {
      parsedInfo = JSON.parse(decodeURIComponent(uinfo)) as UserInfoShape;
    } catch {
      try {
        parsedInfo = JSON.parse(uinfo) as UserInfoShape;
      } catch {
        /* ignore */
      }
    }
  }

  [
    "token",
    "login_token",
    "kq_token",
    "user_info",
    "userInfo",
    "client_nonce",
    "nonce"
  ].forEach((k) => params.delete(k));

  const newSearch = params.toString();
  const newUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ""}${url.hash}`;
  window.history.replaceState({}, "", newUrl);

  void (async () => {
    persistToken(token);
    userState.isLoggedIn = true;
    userState.loading = false;
    notifyAuthSync();
    if (parsedInfo?.nickname) {
      persistUserInfo(parsedInfo);
    } else {
      await fetchUserInfo();
    }
  })();

  return true;
}

function waitForToken(encodedNonce: string) {
  clearPollTimer();
  loginCancelled = false;
  const start = Date.now();

  const tick = async () => {
    if (loginCancelled || !userState.loading) return;
    if (Date.now() - start > LOGIN_TIMEOUT_MS) {
      userState.loading = false;
      userState.loginError = "loginTimeout";
      localStorage.removeItem(STORAGE_LOGIN_NONCE);
      return;
    }

    try {
      const res = (await authApi.pollTokenUnified(encodedNonce)) as {
        code?: number;
        data?: { token?: string };
      };
      if (res.code === 1 && res.data?.token) {
        await finalizeLoginWithToken(res.data.token);
        return;
      }
    } catch (e) {
      console.warn("poll token", e);
    }

    if (!loginCancelled && userState.loading) {
      pollTimer = window.setTimeout(tick, POLL_MS);
    }
  };

  void tick();
}

export const useUserStore = () => {
  attachCrossTabSync();

  async function checkLoginStatus() {
    if (!userState.token) return;
    try {
      const valid = await authApi.checkLogin(userState.token);
      if (valid) {
        userState.isLoggedIn = true;
        await fetchUserInfo();
      } else {
        performLogoutLocalOnly();
      }
    } catch (e) {
      console.error("Login check failed", e);
      performLogoutLocalOnly();
    }
  }

  async function startLoginFlow() {
    userState.loginError = null;
    userState.loading = true;
    loginCancelled = false;
    clearPollTimer();

    try {
      const encodedNonce = await authApi.getEncodedNonce();
      localStorage.setItem(STORAGE_LOGIN_NONCE, encodedNonce);
      localStorage.setItem(STORAGE_RETURN_URL, window.location.href);

      const loginUrlBase = await authApi.getLoginUrlResolved();
      const loginUrl = `${loginUrlBase}?client_type=desktop&client_nonce=${encodeURIComponent(encodedNonce)}`;

      window.open(loginUrl, "_blank", "noopener,noreferrer");

      waitForToken(encodedNonce);
    } catch (e) {
      console.error("Login flow failed", e);
      userState.loading = false;
      userState.loginError = "startFailed";
      localStorage.removeItem(STORAGE_LOGIN_NONCE);
      alert(
        (typeof e === "object" && e && "message" in e && String((e as Error).message)) ||
          "启动登录失败"
      );
    }
  }

  function resumePendingLoginIfNeeded() {
    const nonce = localStorage.getItem(STORAGE_LOGIN_NONCE);
    if (!nonce || userState.token) return;
    userState.loading = true;
    waitForToken(nonce);
  }

  function cancelLogin() {
    loginCancelled = true;
    clearPollTimer();
    userState.loading = false;
    localStorage.removeItem(STORAGE_LOGIN_NONCE);
  }

  async function logout() {
    if (userState.token) {
      try {
        await authApi.logoutUnified(userState.token);
      } catch (e) {
        console.warn("Logout api failed", e);
      }
    }
    performLogoutLocalOnly();
  }

  async function checkAuthRequired(): Promise<boolean> {
    try {
      let deviceId = localStorage.getItem("web_device_id");
      if (!deviceId) {
        deviceId = "web_" + generateUUID();
        localStorage.setItem("web_device_id", deviceId);
      }

      authState.deviceId = deviceId;

      const checkResult = await authApi.checkNeedAuthCode(deviceId);
      return checkResult.is_need_auth_code === 1;
    } catch (e) {
      console.error("Check auth required failed:", e);
      return false;
    }
  }

  function setAuthorized() {
    authState.isAuthorized = true;
  }

  function clearAuth() {
    authState.isAuthorized = false;
    localStorage.removeItem("auth_code");
    localStorage.removeItem("auth_code_device");
  }

  return {
    userState: readonly(userState),
    authState: readonly(authState),
    checkLoginStatus,
    startLoginFlow,
    cancelLogin,
    logout,
    checkAuthRequired,
    setAuthorized,
    clearAuth,
    tryHandleCallbackFromCurrentUrl,
    resumePendingLoginIfNeeded
  };
};
