const net= require('net');
const readline = require('readline');

const client= net.createConnection({port:3000},()=>{
    console.log('Connected to chat server');
});

client.on('data',data=>{
    process.stdout.write(data.toString());
});

client.on('end',()=>{
    console.log('Disconnected from server');
});

client.on('error',err=>{
    console.error('Error:',err.message);
});

const rl= readline.createInterface({
    input:process.stdin,
    output: process.stdout
});

rl.on('line',line =>{
    client.write(line);
});
