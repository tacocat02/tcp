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

const rooms={};
const clients=new Map();

function timestamp(){
  const now=new Date();
  return now.toLocaleTimeString([],{hour: '2-digit', minute: '2-digit' });
}

// WebSocket server on same HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log(`[${timestamp()}] Client connected`);

  ws.on('message', (message) => {
    let msg;
    try{
      msg=JSON.parse(message.toString());   
    }
    catch (e){
      console.error('Invalid JSON',e);
      return;
    }

    msg.timestamp=timestamp();
    
    switch(msg.type){
      case 'create':{
        const{name, user,isPrivate}=msg;
        if(rooms[name]){
          ws.send(JSON.stringify({ type: 'error', text: 'Room already exists' }));
          return;
        }
        const code = isPrivate ? Math.random().toString(36).slice(2, 8) : null;

        rooms[name]={
          name,
          type: isPrivate ? 'private' : 'open',
          code,
          clients:new Set()
        };

        clients.set(ws,{user,room:name});
        rooms[name].clients.add(ws);

        console.log(`[${msg.timestamp}] (${user}) created ${isPrivate ? 'private' : 'open'} room: ${name}`);
        ws.send(JSON.stringify({ type: 'room_joined', room: name, code }));
        break;
      }

      case 'join':{
        const {user,room,code}=msg;
        const targetRoom=rooms[room] || Object.values(rooms).find(r=>r.code===code);

        if(!targetRoom){
          ws.send(JSON.stringify({ type: 'error', text: 'Room not found' }));
          return;
        }
  
        if (targetRoom.type === 'private' && targetRoom.code !== code) {
          ws.send(JSON.stringify({ type: 'error', text: 'Invalid room code' }));
          return;
        }
        targetRoom.clients.add(ws);
        clients.set(ws,{user,room:targetRoom.name});

        console.log(`[${msg.timestamp}] (${user}) joined room: ${targetRoom.name}`);
        ws.send(JSON.stringify({ type: 'room_joined', room: targetRoom.name }));
        break;
      }

      case 'list':{
        const openRooms=Object.values(rooms)
          .filter(r => r.type === 'open')
          .map(r => r.name);
      
        ws.send(JSON.stringify({ type: 'room_list', rooms: openRooms }));
      break;
      }

      case 'chat':{
        const client=clients.get(ws);
        if(!client) return;

        const room=rooms[client.room];
        if(!room) return;

        const outgoing={
          type:'chat',
          user:client.user,
          text:msg.text,
          timestamp:msg.timestamp
        };

        room.clients.forEach(clientWs=>{
          if(clientWs.readyState===WebSocket.OPEN){
            clientWs.send(JSON.stringify(outgoing));
          }
        });
        break;
      }

      default:
        console.warn('Unknown message type:',msg.type);
    }
  });  
 
  ws.on('close', () => {
  const client = clients.get(ws);
  if (!client) return;

  const room = rooms[client.room];
  if (room) {
    room.clients.delete(ws);
    if (room.clients.size === 0) {
      delete rooms[client.room];
      console.log(`[${timestamp()}] Room ${client.room} deleted (empty)`);
    }
  }

  clients.delete(ws);
  console.log(`[${timestamp()}] (${client.user}) disconnected`);
  });
});


// Listen on all interfaces (0.0.0.0) so phone can connect
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
