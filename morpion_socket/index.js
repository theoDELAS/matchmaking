var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var rooms = 0;

app.use(express.static('.'));

io.on('connection', function(socket){
    console.log('Un utilisateur s\'est connecté'); // We'll replace this with our own events
    /**
     * Create a new game room and notify the creator of game. 
     */
    socket.on('createGame', function(data){
        socket.join('room-' + ++rooms);
        socket.emit('newGame', {name: data.name, room: 'room-'+rooms});
    });

    /**
     * Connect the Player 2 to the room he requested. Show error if room full.
     */
    socket.on('joinGame', function(data){
        var room = io.nsps['/'].adapter.rooms[data.room];
        if( room && room.length == 1){
            socket.join(data.room);
            socket.broadcast.to(data.room).emit('player1', {});
            socket.emit('player2', {name: data.name, room: data.room })
        }
        else {
            socket.emit('err', {message: 'Désolé, cette partie est pleine !'});
        }
    });

    /**
     * Handle the turn played by either player and notify the other. 
     */
    socket.on('playTurn', function(data){
        socket.broadcast.to(data.room).emit('turnPlayed', {
            tile: data.tile,
            room: data.room
        });
    });

    /**
     * Notify the players about the victor.
     */
    socket.on('gameEnded', function(data){
        socket.broadcast.to(data.room).emit('gameEnd', data);
    });
});

server.listen(5000);