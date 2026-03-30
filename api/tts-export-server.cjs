const http = require('http');
const { handleTtsExportRequest } = require('./tts-export-service.cjs');

const port = Number(process.env.TTS_EXPORT_PORT || 3002);

const server = http.createServer((req, res) => {
  const url = req.url || '';

  if (url === '/api/tts/export') {
    void handleTtsExportRequest(req, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ code: 0, msg: 'Not found' }));
});

server.listen(port, () => {
  console.log(`[tts-export] listening on http://127.0.0.1:${port}/api/tts/export`);
});
