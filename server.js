const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// HTTP server to serve index.html
const server = http.createServer((req, res) => {
  // let filePath = '.' + req.url;
  // if (filePath === './') filePath = './index.html';

let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);


  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code == 'ENOENT'){
        res.writeHead(404);
        res.end('404 Not Found');
      }
      else {
        res.writeHead(500);
        res.end('Server error: '+error.code);
      }
    }
    else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// WebSocket server on same HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    let msg;
    try{
      msg=JSON.parse(message.toString());
      console.log(`Received from ${msg.user}:${msg.txt}`);
    }
    catch (e){
      console.error('Invalid JSON',e);
      return;
    }
    // Broadcast message to all other clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Listen on all interfaces (0.0.0.0) so phone can connect
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
