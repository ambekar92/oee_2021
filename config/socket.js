var socket = require('socket.io');
var io;

var socketIO = function () {
}

socketIO.prototype.emit = (event, msg) => {
    io.emit(event, msg);
}

socketIO.prototype.connect = (server) => {

    io = socket(server);
    
    io.on('connection', (socket) => {
        console.log('a user connected');
        console.log("socket connection--"+socket.connected);
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });


}

module.exports = socketIO;