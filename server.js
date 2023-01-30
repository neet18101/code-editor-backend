const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTION = require('./Actions');
const server = http.createServer(app);

const io = new Server(server);
app.use(express.static('dist'));
app.use((req,res,next)=>{
    res.sendFile(path.join(__dirname,'dist','index.html'))

})
const userSocketMap = {}

function getAllConnectedClients(roomId, username) {
    // Mapp
    return Array.from(io.sockets.adapter.rooms.get(roomId, username) || []).map((socketId) => {
        console.log(socketId, 'hello')

        return {

            socketId,
            username: userSocketMap[socketId]
        }
    });
}


io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    socket.on(ACTION.JOIN, ({ roomId, username }) => {
        console.log(roomId, username);
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const clients = getAllConnectedClients(roomId, username);
        console.log(clients, 'client');
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTION.JOINED, {
                clients,
                username,
                socketId: socket.id
            })

        });

        socket.on(ACTION.CODE_CHANGE, ({
            roomId, code
        }) => {
            socket.in(roomId).emit(ACTION.CODE_CHANGE, { code });
        });

        socket.on(ACTION.SYNC_CODE, ({
            socketId, code
        }) => {
            io.to(socketId).emit(ACTION.CODE_CHANGE, { code });
        });



        socket.on('disconnecting', () => {
            const rooms = [...socket.rooms];
            rooms.forEach((roomId) => {
                socket.in(roomId).emit(ACTION.DISCONNECTED, {
                    socketId: socket.id,
                    username: userSocketMap[socket.id]
                });


            });

            delete userSocketMap[socket.id];
            socket.leave();

        })




    })
});
console.log(userSocketMap);


// server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`listening on port${PORT}`));
