var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var rooms = 0;

app.use(express.static('.'));

io.on('connection', function(socket){
    // message dans le CLI du serveur qu'un joueur s'est connecté
    console.log('Un utilisateur s\'est connecté');
    /**
     * Créez une nouvelle room de jeux et informez le créateur du jeu.
     */
    socket.on('createGame', function(data){
        socket.join('room-' + ++rooms);
        socket.emit('newGame', {name: data.name, room: 'room-'+rooms});
    });

    /**
     * Connectez le joueur 2 à la room qu'il a demandée. Afficher l'erreur si la room est pleine.
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
     * Gérez le tour joué par l'un des joueurs et informez l'autre. 
     */
    socket.on('playTurn', function(data){
        socket.broadcast.to(data.room).emit('turnPlayed', {
            tile: data.tile,
            room: data.room
        });
    });

    /**
     * Emettre une alerte sur la victoire d'un joueur
     */
    socket.on('gameEnded', function(data){
        socket.broadcast.to(data.room).emit('gameEnd', data);
    });
});

server.listen(5000);