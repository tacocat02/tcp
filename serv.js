const net= require('net');

const clients = [];

const server = net.createServer(socket =>{
    socket.write('Welcome to the TCP chat\n');

    clients.push(socket);

    socket.on('data',data=>{
        const message=data.toString().trim();
        console.log('Received:',message);


        clients.forEach(client =>{
            if(client!==socket){
                client.write(message +'\n');
            }
        });
    });
    socket.on('end',()=>{
        console.log('client disconnected');
        clients.splice(clients.indexOf(socket),1);
    });

    socket.on('error',err=>{
        console.error('Socket error:',err.message);
    });
});

server.listen(3000,()=>{
    console.log('TCP CHAT SERVER RUNNING ON PORT 3000');
});