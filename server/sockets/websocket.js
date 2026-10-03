const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url;
    if (url.startsWith('/ws/rooms/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const docName = req.url.replace('/ws/rooms/', '');
    setupWSConnection(ws, req, { docName });
  });

  return wss;
}

module.exports = { initWebSocketServer };
