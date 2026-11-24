// Vercel Serverless Function Proxy — Security Hardened Network Boundary
// Enforces method whitelisting, SSRF/path-traversal protection, header sanitization,
// payload size limits (10MB), and origin standardization for TrustSphere backend communication.

import https from 'https';

export const config = {
  api: {
    bodyParser: false, // Stream request body directly to enforce custom size caps
  },
};

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 Megabytes max (supports image OCR uploads)
const BACKEND_HOST = process.env.BACKEND_HOST || 'ai-marketplace-backend-9c29.onrender.com';
const TIMEOUT_MS = 75000; // 75 seconds for Render free tier cold starts

export default function handler(req, res) {
  // 1. Method Validation
  if (!ALLOWED_METHODS.has(req.method)) {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Allow', Array.from(ALLOWED_METHODS).join(', '));
    return res.end(
      JSON.stringify({
        status: 'error',
        code: 'METHOD_NOT_ALLOWED',
        message: `HTTP method ${req.method} is not permitted.`,
      })
    );
  }

  // 2. Request Size Validation (Content-Length Header Check)
  const declaredLength = parseInt(req.headers['content-length'] || '0', 10);
  if (declaredLength > MAX_PAYLOAD_BYTES) {
    res.statusCode = 413;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        status: 'error',
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request payload (${declaredLength} bytes) exceeds maximum limit of ${MAX_PAYLOAD_BYTES} bytes (10MB).`,
      })
    );
  }

  // 3. Path Validation and Anti-SSRF / Anti-Traversal Guards
  let subPath = req.query.path || '';
  if (Array.isArray(subPath)) {
    subPath = subPath.join('/');
  }

  // Reject null bytes, backslashes, double slashes, and directory traversal
  if (
    subPath.includes('\0') ||
    subPath.includes('..') ||
    subPath.includes('\\') ||
    subPath.includes('//')
  ) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        status: 'error',
        code: 'INVALID_PATH',
        message: 'Path traversal or malformed URL path rejected.',
      })
    );
  }

  const cleanPath = subPath.replace(/^\/+/, '');

  // Whitelist permitted API route prefixes
  const isPermittedRoute =
    cleanPath.startsWith('v1/') ||
    cleanPath === 'v1' ||
    cleanPath === 'health' ||
    cleanPath.startsWith('health/') ||
    cleanPath === 'live';

  if (!isPermittedRoute) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        status: 'error',
        code: 'ROUTE_NOT_FOUND',
        message: `Route /api/${cleanPath} is not recognized by TrustSphere API.`,
      })
    );
  }

  // 4. Construct Upstream URL & Query Parameters
  const urlObj = new URL(req.url, 'http://localhost');
  urlObj.searchParams.delete('path'); // Remove Vercel rewrite parameter
  const qs = urlObj.searchParams.toString();

  let upstreamPath = `/api/${cleanPath}`;
  if (cleanPath === 'live') {
    upstreamPath = '/live';
  } else if (cleanPath === 'ready') {
    upstreamPath = '/ready';
  }
  const targetPath = `${upstreamPath}${qs ? '?' + qs : ''}`;

  // 5. Header Sanitization and Hop-by-Hop Filtering
  const hopByHopHeaders = new Set([
    'host',
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'content-length', // Node https.request calculates this for the pipe stream
  ]);

  const forwardHeaders = {};
  for (const [key, val] of Object.entries(req.headers)) {
    const lk = key.toLowerCase();
    if (hopByHopHeaders.has(lk) || lk.startsWith('x-vercel-')) {
      continue;
    }
    forwardHeaders[key] = val;
  }

  // Standardize Origin and Host to the verified production domain
  forwardHeaders.origin = 'https://ai-marketplace-analyzer.vercel.app';
  forwardHeaders.host = BACKEND_HOST;

  const requestOptions = {
    hostname: BACKEND_HOST,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: forwardHeaders,
    timeout: TIMEOUT_MS,
  };

  // 6. Upstream Proxy Execution with Active Streaming Byte Counter
  let totalBytesReceived = 0;
  let isAborted = false;

  const proxyReq = https.request(requestOptions, (proxyRes) => {
    res.statusCode = proxyRes.statusCode || 200;

    for (const [key, val] of Object.entries(proxyRes.headers)) {
      if (!val) continue;
      const lk = key.toLowerCase();
      // Forward all response headers except hop-by-hop or conflicting CORS headers
      if (!lk.startsWith('access-control-') && lk !== 'connection' && lk !== 'transfer-encoding') {
        res.setHeader(key, val);
      }
    }

    proxyRes.pipe(res);
  });

  proxyReq.on('timeout', () => {
    isAborted = true;
    proxyReq.destroy();
    if (!res.headersSent) {
      res.statusCode = 504;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'error',
          code: 'GATEWAY_TIMEOUT',
          message: 'The backend server took longer than 75s to respond (possible cold start). Please retry.',
        })
      );
    }
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent && !isAborted) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'error',
          code: 'BAD_GATEWAY',
          message: 'Unable to reach TrustSphere backend service: ' + err.message,
        })
      );
    }
  });

  // Track chunked body size during piping to prevent unbounded stream abuse
  req.on('data', (chunk) => {
    totalBytesReceived += chunk.length;
    if (totalBytesReceived > MAX_PAYLOAD_BYTES) {
      isAborted = true;
      req.destroy();
      proxyReq.destroy();
      if (!res.headersSent) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            status: 'error',
            code: 'PAYLOAD_TOO_LARGE',
            message: `Stream exceeded maximum payload size of ${MAX_PAYLOAD_BYTES} bytes (10MB).`,
          })
        );
      }
    }
  });

  req.pipe(proxyReq);
}
