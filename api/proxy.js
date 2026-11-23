// Vercel Serverless Function Proxy
// Proxies all /api/* requests to the Render backend service while standardizing
// Origin and Host headers to eliminate cross-origin preflight drops and CORS blocks on preview deployments.

import https from 'https';

export const config = {
  api: {
    bodyParser: false, // Stream request body directly to upstream backend
  },
};

export default function handler(req, res) {
  const backendHost = 'ai-marketplace-backend-9c29.onrender.com';

  // Extract path parameter forwarded by Vercel rewrite: /api/(.*) -> /api/proxy?path=$1
  let subPath = req.query.path || '';
  if (Array.isArray(subPath)) {
    subPath = subPath.join('/');
  }

  // Preserve any remaining query parameters
  const urlObj = new URL(req.url, 'http://localhost');
  urlObj.searchParams.delete('path');
  const qs = urlObj.searchParams.toString();
  const targetPath = `/api/${subPath}${qs ? '?' + qs : ''}`;

  // Forward client headers, ensuring Origin is whitelisted by production Render
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.host;
  delete forwardHeaders.connection;
  delete forwardHeaders['content-length'];

  // Override origin to the verified production domain so Render's CORS policy always permits the request
  forwardHeaders.origin = 'https://ai-marketplace-analyzer.vercel.app';
  forwardHeaders.host = backendHost;

  const options = {
    hostname: backendHost,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: forwardHeaders,
    timeout: 75000, // 75-second timeout for Render free tier cold starts
  };

  const proxyReq = https.request(options, (proxyRes) => {
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
    if (!res.headersSent) {
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

  // Pipe client request body to Render
  req.pipe(proxyReq);
}
