#!/usr/bin/env node
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const http = require('http');

const isWin = process.platform === 'win32';
const rootDir = path.resolve(__dirname, '..');

const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}${GREEN}====================================================================${RESET}`);
console.log(`${BOLD}${GREEN}TrustSphere — Marketplace Trust Intelligence Platform${RESET}`);
console.log(`${BOLD}Full-Stack Development Runner (ML: 8000 | Backend: 5000 | Frontend: 3000)${RESET}`);
console.log(`${BOLD}${GREEN}====================================================================${RESET}\n`);

const children = [];
let isShuttingDown = false;

function resolvePythonBinary() {
  const customPython = 'C:\\Development\\Python\\datascience\\Scripts\\python.exe';
  if (fs.existsSync(customPython)) {
    return customPython;
  }
  const venvPython = isWin
    ? path.join(rootDir, '.venv', 'Scripts', 'python.exe')
    : path.join(rootDir, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python';
}

function freePort(port) {
  if (isWin) {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const localAddr = parts[1];
          if (localAddr.endsWith(`:${port}`) || localAddr === `[::]:${port}` || localAddr === `0.0.0.0:${port}`) {
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== String(process.pid)) {
              try {
                execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
              } catch {}
            }
          }
        }
      }
    } catch {}
  }
}

function killChild(child) {
  if (!child || child.killed) return;
  try {
    if (isWin && child.pid) {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else if (child.pid) {
      process.kill(-child.pid, 'SIGINT');
    }
  } catch {
    try {
      child.kill('SIGINT');
    } catch {}
  }
}

function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${BOLD}Shutting down TrustSphere development services...${RESET}`);
  for (const child of children) {
    killChild(child);
  }
  freePort(8000);
  freePort(5000);
  freePort(3000);
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function spawnService(name, color, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  children.push(child);

  const prefix = `${color}[${name}]${RESET} `;

  const pipeStream = (stream, out) => {
    const rl = readline.createInterface({ input: stream });
    rl.on('line', (line) => {
      out.write(`${prefix}${line}\n`);
    });
  };

  pipeStream(child.stdout, process.stdout);
  pipeStream(child.stderr, process.stderr);

  child.on('error', (err) => {
    console.error(`${prefix}Failed to start: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      if (code !== null && code !== 0) {
        console.error(`${prefix}Exited with code ${code}`);
      } else if (signal) {
        console.log(`${prefix}Terminated with signal ${signal}`);
      }
    }
  });

  return child;
}

function checkUrl(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url) {
  if (isWin) {
    try {
      execSync(`start "" "${url}"`, { stdio: 'ignore' });
    } catch {}
  } else if (process.platform === 'darwin') {
    try {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } catch {}
  } else {
    try {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    } catch {}
  }
}

async function start() {
  const npmCmd = isWin ? 'npm.cmd' : 'npm';
  const pythonBin = resolvePythonBinary();

  // Step 1: Ensure ports 8000, 5000, and 3000 are clean
  console.log('[runner] Checking port availability (8000, 5000, 3000)...');
  freePort(8000);
  freePort(5000);
  freePort(3000);

  // Step 2: Launch Python ML Service on Port 8000
  console.log(`${BLUE}[python-ml]${RESET} Launching Python ML Inference Service on port 8000 using ${pythonBin}...`);
  spawnService(
    'python-ml',
    BLUE,
    `"${pythonBin}"`,
    ['src/api/service.py'],
    rootDir
  );

  // Step 3: Wait for Python ML Service to become responsive
  console.log(`${BLUE}[python-ml]${RESET} Waiting for ML Service to report healthy...`);
  let isMlReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 600));
    if (await checkUrl('http://127.0.0.1:8000/health')) {
      isMlReady = true;
      break;
    }
  }

  if (isMlReady) {
    console.log(`${GREEN}[python-ml] Python ML Service verified healthy on http://127.0.0.1:8000.${RESET}`);
  } else {
    console.warn(`${YELLOW}[python-ml] Warning: Python ML Service took longer than expected to report healthy.${RESET}`);
  }

  // Step 4: Launch Express Backend on Port 5000
  console.log(`${CYAN}[backend]${RESET} Launching Express backend service on port 5000...`);
  spawnService(
    'backend',
    CYAN,
    npmCmd,
    ['run', 'dev'],
    path.join(rootDir, 'backend')
  );

  // Step 5: Wait for Backend to be Healthy and Database-connected
  console.log(`${CYAN}[backend]${RESET} Waiting for backend to become operational...`);
  let isBackendReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 600));
    if (await checkUrl('http://127.0.0.1:5000/health')) {
      isBackendReady = true;
      break;
    }
  }

  if (isBackendReady) {
    console.log(`${GREEN}[backend] Backend verified healthy on http://127.0.0.1:5000.${RESET}`);
  } else {
    console.warn(`${YELLOW}[backend] Warning: Backend took longer than expected to report healthy.${RESET}`);
  }

  // Step 6: Launch Frontend on Port 3000
  console.log(`${MAGENTA}[frontend]${RESET} Launching Vite frontend on port 3000...`);
  spawnService(
    'frontend',
    MAGENTA,
    npmCmd,
    ['run', 'dev'],
    path.join(rootDir, 'frontend')
  );

  // Step 7: Wait for Frontend to respond
  console.log(`${MAGENTA}[frontend]${RESET} Waiting for frontend to become responsive...`);
  let isFrontendReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 600));
    if (await checkUrl('http://localhost:3000')) {
      isFrontendReady = true;
      break;
    }
  }

  if (isFrontendReady) {
    console.log(`${GREEN}[frontend] Frontend responsive at http://localhost:3000. Launching browser...${RESET}`);
    openBrowser('http://localhost:3000');
  }

  console.log(`\n${BOLD}${GREEN}====================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}TrustSphere Platform is Operational!${RESET}`);
  console.log(`  ${BOLD}Frontend Application :${RESET} http://localhost:3000`);
  console.log(`  ${BOLD}Backend API Gateway  :${RESET} http://127.0.0.1:5000`);
  console.log(`  ${BOLD}Python ML Service    :${RESET} http://127.0.0.1:8000`);
  console.log(`  ${BOLD}Database Connectivity:${RESET} MySQL 8.4.9 (marketplace_trust_intelligence)`);
  console.log(`  ${BOLD}Press Ctrl+C at any time to gracefully terminate all services.${RESET}`);
  console.log(`${BOLD}${GREEN}====================================================================${RESET}\n`);

  // Step 8: Keep process alive indefinitely
  setInterval(() => {}, 1000 * 60 * 60);
  if (process.stdin.isTTY) {
    process.stdin.resume();
  }
}

start().catch((err) => {
  console.error('[runner] Startup failed:', err);
  cleanup();
});
