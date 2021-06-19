require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = {};

const socketToRoom = {};

io.on('connection', socket => {
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push({id: socket.id, pos: {x: 50, y: 50, dir: 90}});
        } else {
            users[roomID] = [{id: socket.id, pos: {x: 50, y: 50, dir: 90}}];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID]

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        const sender = users[socketToRoom[socket.id]].find(u => u.id === socket.id)
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID, pos: sender.pos });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on("move", payload => {
        const roomId = socketToRoom[socket.id]
        if (!users[roomId] || users[roomId].length == 0)
            return
        const user = users[roomId].find(user => user.id === socket.id)
        const prevPos = user.pos
        let newPos;
        switch(payload) {
            case "ArrowRight":
                newPos = {...prevPos, dir: (prevPos.dir + 10) % 360}
                break;
            case "ArrowLeft":
                newPos = {...prevPos, dir: (((prevPos.dir - 10) % 360) + 360) % 360}
                break;
            case "ArrowUp":
                newPos = {...prevPos, x: prevPos.x + 20 * Math.cos(prevPos.dir * Math.PI / 180), y: prevPos.y + 20 * Math.sin(prevPos.dir * Math.PI / 180)}
                break;
            case "ArrowDown":
                newPos = {...prevPos, x: prevPos.x - 20 * Math.cos(prevPos.dir * Math.PI / 180), y: prevPos.y - 20 * Math.sin(prevPos.dir * Math.PI / 180)}
                break;
            default:
                break;
        }
        user.pos = newPos;
        users[roomId].forEach((u) => {
            io.to(u.id).emit("player moved", {id: user.id, pos: user.pos})
        })
    })

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(user => user.id !== socket.id);
            users[roomID] = room;
        }
    });

});

server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));


