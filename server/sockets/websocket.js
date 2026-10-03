const WebSocket = require('ws');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
const db = require('../db');

// Map to manage active debounce timers per document
const debounceTimers = new Map();
const DEBOUNCE_DELAY_MS = 2000;

// Persistence handler for Yjs documents
setPersistence({
  // Called when a document is first opened/created on the server
  bindState: async (docName, ydoc) => {
    try {
      const result = await db.query(
        'SELECT code_content FROM rooms WHERE room_id = $1 OR name = $2',
        [docName, docName]
      );

      if (result.rows.length > 0 && result.rows[0].code_content) {
        const ytext = ydoc.getText('monaco');
        ytext.insert(0, result.rows[0].code_content);
      }
    } catch (err) {
      console.error(`Failed to load document content for room ${docName}:`, err);
    }

    // Listen to document updates and schedule a debounced flush to PostgreSQL
    ydoc.on('update', () => {
      if (debounceTimers.has(docName)) {
        clearTimeout(debounceTimers.get(docName));
      }

      const timer = setTimeout(async () => {
        try {
          const content = ydoc.getText('monaco').toString();
          await db.query(
            'UPDATE rooms SET code_content = $1 WHERE room_id = $2 OR name = $3',
            [content, docName, docName]
          );
        } catch (err) {
          console.error(`Failed to persist document content for room ${docName}:`, err);
        } finally {
          debounceTimers.delete(docName);
        }
      }, DEBOUNCE_DELAY_MS);

      debounceTimers.set(docName, timer);
    });
  },

  // Called when all clients disconnect from a document
  writeState: async (docName, ydoc) => {
    try {
      if (debounceTimers.has(docName)) {
        clearTimeout(debounceTimers.get(docName));
        debounceTimers.delete(docName);
      }

      const content = ydoc.getText('monaco').toString();
      await db.query(
        'UPDATE rooms SET code_content = $1 WHERE room_id = $2 OR name = $3',
        [content, docName, docName]
      );
    } catch (err) {
      console.error(`Failed to write state on close for room ${docName}:`, err);
    }
  },
});

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

