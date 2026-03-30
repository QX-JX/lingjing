/**
 * 开发/预览环境下提供与《鲲穹 Web 登录实现说明》一致的同源 /api/auth/* 代理，
 * 生产环境静态部署若无反代，前端会回退到直连 api-web.kunqiongai.com。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

const KQ_URL = 'https://api-web.kunqiongai.com';
const SECRET_KEY = process.env.VITE_KQ_AUTH_SECRET ?? '7530bfb1ad6c41627b0f0620078fa5ed';
const require = createRequire(import.meta.url);
const { handleTtsExportRequest } = require('../api/tts-export-service.cjs') as {
  handleTtsExportRequest: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 备用实现：当 crypto.randomUUID 不可用时
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function postKq(
  path: string,
  body: Record<string, string>,
  headers: Record<string, string> = {}
): Promise<unknown> {
  const url = `${KQ_URL}${path}`;
  const fd = new URLSearchParams(body);
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers
    },
    body: fd.toString()
  });
  return r.json();
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createKunqiongAuthMiddleware() {
  return async function kunqiongAuthMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    const url = req.url ?? '';
    if (url === '/api/tts/export') {
      await handleTtsExportRequest(req, res);
      return;
    }

    if (!url.startsWith('/api/auth')) {
      next();
      return;
    }

    try {
      const qIndex = url.indexOf('?');
      const pathname = qIndex >= 0 ? url.slice(0, qIndex) : url;
      const queryStr = qIndex >= 0 ? url.slice(qIndex + 1) : '';

      if (pathname === '/api/auth/signed-nonce' && req.method === 'GET') {
        const nonce = generateUUID().replace(/-/g, '');
        const timestamp = Math.floor(Date.now() / 1000);
        const message = `${nonce}|${timestamp}`;
        const sigBuf = crypto.createHmac('sha256', SECRET_KEY).update(message).digest();
        const signature = sigBuf.toString('base64');
        const signedNonce = { nonce, timestamp, signature };
        const encodedNonce = base64UrlEncode(JSON.stringify(signedNonce));
        sendJson(res, { code: 1, data: { encodedNonce } });
        return;
      }

      if (pathname === '/api/auth/login-url' && req.method === 'GET') {
        const j = (await postKq('/soft_desktop/get_web_login_url', {})) as {
          code?: number;
          data?: { login_url?: string };
          msg?: string;
        };
        if (j.code === 1 && j.data?.login_url) {
          sendJson(res, { success: true, url: j.data.login_url });
        } else {
          sendJson(res, { success: false, msg: j.msg ?? 'get_web_login_url failed' });
        }
        return;
      }

      if (pathname === '/api/auth/token' && req.method === 'GET') {
        const params = new URLSearchParams(queryStr);
        const encodedNonce = params.get('encodedNonce') ?? '';
        const j = await postKq('/user/desktop_get_token', {
          client_type: 'desktop',
          client_nonce: encodedNonce
        });
        sendJson(res, j);
        return;
      }

      if (pathname === '/api/auth/user-info' && req.method === 'GET') {
        const params = new URLSearchParams(queryStr);
        const token = params.get('token') ?? '';
        const j = await postKq('/soft_desktop/get_user_info', {}, { token });
        sendJson(res, j);
        return;
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const body = await readBody(req);
        let token = '';
        try {
          const parsed = JSON.parse(body) as { token?: string };
          token = parsed.token ?? '';
        } catch {
          /* ignore */
        }
        const j = await postKq('/logout', {}, { token });
        sendJson(res, j);
        return;
      }

      sendJson(res, { code: 0, msg: 'Not found' }, 404);
    } catch (e) {
      sendJson(res, { code: 0, msg: e instanceof Error ? e.message : String(e) }, 500);
    }
  };
}

export function kunqiongAuthApiPlugin(): Plugin {
  return {
    name: 'kunqiong-auth-api',
    configureServer(server) {
      server.middlewares.use(createKunqiongAuthMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createKunqiongAuthMiddleware());
    }
  };
}
