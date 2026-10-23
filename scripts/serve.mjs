import http from 'node:http';
import { createReadStream } from 'node:fs';
import { lstat, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = path.resolve(projectRoot, 'dist');
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT 必须是 1 到 65535 之间的整数。');
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
};

function isInsideRoot(filename) {
  const relative = path.relative(publicRoot, filename);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function hasLinkedComponent(filename) {
  let current = publicRoot;
  if ((await lstat(current)).isSymbolicLink()) return true;
  for (const part of path.relative(publicRoot, filename).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) return true;
  }
  return false;
}

function sendText(response, status, message, headOnly = false) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': Buffer.byteLength(message),
  });
  response.end(headOnly ? undefined : message);
}

const server = http.createServer(async (request, response) => {
  const headOnly = request.method === 'HEAD';
  if (request.method !== 'GET' && !headOnly) {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(response, 405, 'Method not allowed.\n');
    return;
  }

  let pathname;
  try {
    const requestPath = (request.url ?? '/').split('?')[0];
    if (!requestPath.startsWith('/')) throw new URIError('Invalid request target');
    pathname = decodeURIComponent(requestPath);
    if (pathname.includes('\0')) throw new URIError('Invalid path');
  } catch {
    sendText(response, 400, 'Malformed request path.\n', headOnly);
    return;
  }

  // Check both separators before resolving a path, including on Windows.
  if (pathname.split(/[\\/]/).includes('..') || pathname.includes('\\') || pathname.includes(':')) {
    sendText(response, 403, 'Forbidden.\n', headOnly);
    return;
  }

  let filename = path.resolve(publicRoot, `.${pathname}`);
  if (!isInsideRoot(filename)) {
    sendText(response, 403, 'Forbidden.\n', headOnly);
    return;
  }

  try {
    if (await hasLinkedComponent(filename)) {
      sendText(response, 403, 'Forbidden.\n', headOnly);
      return;
    }
    let info = await stat(filename);
    if (info.isDirectory()) {
      filename = path.join(filename, 'index.html');
      info = await stat(filename);
    }
    if (await hasLinkedComponent(filename)) {
      sendText(response, 403, 'Forbidden.\n', headOnly);
      return;
    }
    if (!info.isFile()) {
      sendText(response, 404, 'File not found.\n', headOnly);
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filename).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (headOnly) {
      response.end();
      return;
    }
    await pipeline(createReadStream(filename), response);
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    const notFound = ['ENOENT', 'ENOTDIR', 'EACCES', 'EINVAL'].includes(error.code);
    sendText(response, notFound ? 404 : 500, notFound ? 'File not found.\n' : 'Unable to read this file.\n', headOnly);
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请设置其他 PORT。` : `预览服务启动失败：${error.message}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`个人网站预览：http://127.0.0.1:${port}`);
  console.log('按 Ctrl+C 结束预览。');
});

let closing = false;
function closeServer() {
  if (closing) return;
  closing = true;
  server.close(() => process.exit(0));
  server.closeIdleConnections?.();
  const forceClose = setTimeout(() => server.closeAllConnections?.(), 1000);
  forceClose.unref();
}
process.once('SIGINT', closeServer);
process.once('SIGTERM', closeServer);
