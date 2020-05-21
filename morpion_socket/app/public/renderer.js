(function init() {
  const P1 = 'X';
  const P2 = 'O';
  let player;
  let game;
  
  const $ = require('jquery');
  const io = require('socket.io-client/dist/socket.io');
  const socket = io.connect('http://a5559707.ngrok.io');

  // connexion bdd
  const mysql = require('mysql');
  const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: null,
    database: "electron"
  });

  connection.connect((err) => {
    if(err) {
      return console.log(err.stack);
    }

    console.log("Connexion réussi");
  });
  // fin connexion bdd

  class Player {
    constructor(name, type) {
      this.name = name;
      this.type = type;
      this.currentTurn = true;
      this.playsArr = 0;
    }

    static get wins() {
      return [7, 56, 448, 73, 146, 292, 273, 84];
    }

    // Set the bit of the move played by the player
    // tileValue - Bitmask used to set the recently played move.
    updatePlaysArr(tileValue) {
      this.playsArr += tileValue;
    }

    getPlaysArr() {
      return this.playsArr;
    }

    // Set the currentTurn for player to turn and update UI to reflect the same.
    setCurrentTurn(turn) {
      this.currentTurn = turn;
      const message = turn ? 'A vous de jouer !' : 'Au tour de votre adversaire !';
      $('#turn').text(message);
    }

    getPlayerName() {
      return this.name;
    }

    getPlayerType() {
      return this.type;
    }

    getCurrentTurn() {
      return this.currentTurn;
    }
  }

  // roomId Id of the room in which the game is running on the server.
  class Game {
    constructor(roomId) {
      this.roomId = roomId;
      this.board = [];
      this.moves = 0;
    }

    // Create the Game board by attaching event listeners to the buttons.
    createGameBoard() {
      function tileClickHandler() {
        const row = parseInt(this.id.split('_')[1][0], 10);
        const col = parseInt(this.id.split('_')[1][1], 10);
        if (!player.getCurrentTurn() || !game) {
          alert('Ce n\'est pas à vous de jouer');
          return;
        }

        if ($(this).prop('disabled')) {
          alert('Cette case à déjà été jouée !');
          return;
        }

        // Update board after your turn.
        game.playTurn(this);
        game.updateBoard(player.getPlayerType(), row, col, this.id);

        player.setCurrentTurn(false);
        player.updatePlaysArr(1 << ((row * 3) + col));

        game.checkWinner();
      }

      for (let i = 0; i < 3; i++) {
        this.board.push(['', '', '']);
        for (let j = 0; j < 3; j++) {
          $(`#button_${i}${j}`).on('click', tileClickHandler);
        }
      }
    }
    // Remove the menu from DOM, display the gameboard and greet the player.
    displayBoard(message) {
      $('.menu').css('display', 'none');
      $('.gameBoard').css('display', 'block');
      $('#userHello').html(message);
      
      const $board = "SELECT * FROM board WHERE roomId = '" + this.roomId + "'";
      connection.query($board, (err, row) => {
        const $insertBoard = "INSERT INTO board(board, roomId) VALUES ('" + JSON.stringify(this.board) + "', '" + this.roomId + "')";
        if (!row[0]) {
          connection.query($insertBoard, (err, row) => {
              if(err) {
                  return console.log("Error est survenue", err);
              }
          }); 
        }
      });

      this.createGameBoard();
    }
    /**
     * Update game board UI
     *
     * @param {string} type Type of player(X or O)
     * @param {int} row Row in which move was played
     * @param {int} col Col in which move was played
     * @param {string} tile Id of the the that was clicked
     */
    updateBoard(type, row, col, tile) {
      $(`#${tile}`).text(type).prop('disabled', true);
      this.board[row][col] = type;
      this.moves++;

      const $board = "SELECT * FROM board WHERE roomId = '" + this.roomId + "'";
      connection.query($board, (err, row) => {       
        if (JSON.stringify(JSON.parse(row[row.length-1].board)) !== JSON.stringify(this.board)) {
          const $insertBoard = "INSERT INTO board(board, roomId) VALUES ('" + JSON.stringify(this.board) + "', '" + this.roomId + "')";
          connection.query($insertBoard, (err) => {
            if(err) {
                return console.log("Une erreur est survenue lors de l'update", err);
            }
          });
        }
      });
    }

    getRoomId() {
      return this.roomId;
    }

    // Send an update to the opponent to update their UI's tile
    playTurn(tile) {
      const clickedTile = $(tile).attr('id');

      // Emit an event to update other player that you've played your turn.
      socket.emit('playTurn', {
        tile: clickedTile,
        room: this.getRoomId(),
      });
    }
    /**
     *
     * To determine a win condition, each square is "tagged" from left
     * to right, top to bottom, with successive powers of 2.  Each cell
     * thus represents an individual bit in a 9-bit string, and a
     * player's squares at any given time can be represented as a
     * unique 9-bit value. A winner can thus be easily determined by
     * checking whether the player's current 9 bits have covered any
     * of the eight "three-in-a-row" combinations.
     *
     *     273                 84
     *        \               /
     *          1 |   2 |   4  = 7
     *       -----+-----+-----
     *          8 |  16 |  32  = 56
     *       -----+-----+-----
     *         64 | 128 | 256  = 448
     *       =================
     *         73   146   292
     *
     *  We have these numbers in the Player.wins array and for the current
     *  player, we've stored this information in playsArr.
     */
    checkWinner() {
      const currentPlayerPositions = player.getPlaysArr();

      Player.wins.forEach((winningPosition) => {
        if ((winningPosition & currentPlayerPositions) === winningPosition) {
          game.announceWinner();
        }
      });

      const tieMessage = 'Match nul :(';
      if (this.checkTie()) {
        socket.emit('gameEnded', {
          room: this.getRoomId(),
          message: tieMessage,
        });
        alert(tieMessage);
        location.reload();
      }
    }

    checkTie() {
      return this.moves >= 9;
    }

    // Announce the winner if the current client has won. 
    // Broadcast this on the room to let the opponent know.
    announceWinner() {
      const message = `${player.getPlayerName()} wins!`;
      socket.emit('gameEnded', {
        room: this.getRoomId(),
        message,
      });
      alert(message);
      location.reload();

      const $winner = "SELECT * FROM player WHERE pseudo = '" + player.getPlayerName() + "'";
      connection.query($winner, (err, row) => {
        const $update = "UPDATE player SET partiesGagnees = " + (row[0].partiesGagnees += 1) + " WHERE player.id = " + row[0].id;
        connection.query($update, (err) => {
          if(err) {
              return console.log("Une erreur est survenue lors de l'update", err);
          }
        });
      });
    }

    // End the game if the other player won.
    endGame(message) {
      alert(message);
      location.reload();
    }
  }

  // Create a new game. Emit newGame event.
  $('#new').on('click', () => {
    const name = $('#nameNew').val();
    if (!name) {
      alert('Veuillez renseigner votre pseudo');
      return;
    }
    socket.emit('createGame', { name });
    player = new Player(name, P1);
    const $pseudoExist = "SELECT * FROM player WHERE pseudo = '" + player.getPlayerName() + "'";
    connection.query($pseudoExist, (err, row) => {
      // s'il existe, on incrémente son nombre de parties jouées
      if (row.length) {
        const $update = "UPDATE player SET partiesJouees = " + (row[0].partiesJouees += 1) + " WHERE player.id = " + row[0].id;
        connection.query($update, (err) => {
          if(err) {
              return console.log("Une erreur est survenue lors de l'update", err);
          }
        });
      // sinon on créer le joueur en bdd
      } else {
        const $queryString = "INSERT INTO player(pseudo, partiesGagnees, partiesPerdues, partiesJouees, matchNul) VALUES ('" + player.getPlayerName() + "', 0, 0, 1, 0)";
        connection.query($queryString, (err) => {
          if(err) {
              return console.log("Une erreur est survenue lors de la création du joueur", err);
          }
        });
      }
    });
  });

  // Join an existing game on the entered roomId. Emit the joinGame event.
  $('#join').on('click', () => {
    const name = $('#nameJoin').val();
    const roomID = $('#room').val();
    if (!name || !roomID) {
      alert('Veuillez renseigner votre pseudo ainsi que la game ID');
      return;
    }
    socket.emit('joinGame', { name, room: roomID });
    player = new Player(name, P2);
    const $pseudoExist = "SELECT * FROM player WHERE pseudo = '" + player.getPlayerName() + "'";
    connection.query($pseudoExist, (err, row) => {
      // s'il existe, on incrémente son nombre de parties jouées
      if (row.length) {
        const $update = "UPDATE player SET partiesJouees = " + (row[0].partiesJouees += 1) + " WHERE player.id = " + row[0].id;
        connection.query($update, (err) => {
          if(err) {
              return console.log("Une erreur est survenue lors de l'update", err);
          }
        });
      // sinon on créer le joueur en bdd
      } else {
        const $queryString = "INSERT INTO player(pseudo, partiesGagnees, partiesPerdues, partiesJouees, matchNul) VALUES ('" + player.getPlayerName() + "', 0, 0, 1, 0)";
        connection.query($queryString, (err) => {
          if(err) {
              return console.log("Une erreur est survenue lors de la création du joueur", err);
          }
        });
      }
    });
  });

  // New Game created by current client. Update the UI and create new Game var.
  socket.on('newGame', (data) => {
    const message =
      `Bonjour, ${data.name}</span> <br> Game ID : ${data.room}. <br>
      En attente d'un autre joueur ...`;

    // Create game for player 1
    game = new Game(data.room);
    game.displayBoard(message);
  });

  /**
     * If player creates the game, he'll be P1(X) and has the first turn.
     * This event is received when opponent connects to the room.
     */
  socket.on('player1', (data) => {
    const message = `Bonjour, ${player.getPlayerName()}`;
    $('#userHello').html(message);
    player.setCurrentTurn(true);
  });

  /**
     * Joined the game, so player is P2(O). 
     * This event is received when P2 successfully joins the game room. 
     */
  socket.on('player2', (data) => {
    const message = `Bonjour, ${data.name}`;

    // Create game for player 2
    game = new Game(data.room);
    game.displayBoard(message);
    player.setCurrentTurn(false);
  });

  /**
     * Opponent played his turn. Update UI.
     * Allow the current player to play now. 
     */
  socket.on('turnPlayed', (data) => {
    const row = data.tile.split('_')[1][0];
    const col = data.tile.split('_')[1][1];
    const opponentType = player.getPlayerType() === P1 ? P2 : P1;

    game.updateBoard(opponentType, row, col, data.tile);
    player.setCurrentTurn(true);
  });

  // If the other player wins, this event is received. Notify user game has ended.
  socket.on('gameEnd', (data) => {
    game.endGame(data.message);
    console.log(message);
    
    socket.leave(data.room);
  });

  /**
     * End the game on any err event. 
     */
  socket.on('err', (data) => {
    game.endGame(data.message);
  });
}());