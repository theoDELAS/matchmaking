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

    // tableau permettant de vérifier si un joueur gagne
    static get wins() {
      return [7, 56, 448, 73, 146, 292, 273, 84];
    }

    // Définir le bit du coup joué par le joueur
    updatePlaysArr(tileValue) {
      this.playsArr += tileValue;
    }

    getPlaysArr() {
      return this.playsArr;
    }

    // Modifier le "tour du joueur" et mettre a jour le message affiché a l'utilisateur
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

  // roomId est l'id de la salle dans laquelle la partie est jouée sur le serveur
  class Game {
    constructor(roomId) {
      this.roomId = roomId;
      this.board = [];
      this.moves = 0;
    }

    // Créez le plateau de jeu en attachant les eventListenners aux boutons.
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

        // Mise à jour du plateau de jeu après chaque tour
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
    // Supprimez le menu du DOM, affichez le plateau de jeu et afficher le message au joueur.
    displayBoard(message) {
      $('.menu').css('display', 'none');
      $('.gameBoard').css('display', 'block');
      $('#userHello').html(message);
      
      // query qui récupère la roomId de la game créée
      const $board = "SELECT * FROM board WHERE roomId = '" + this.roomId + "'";
      // envoi de la query a la bdd
      connection.query($board, (err, row) => {
        // query pour ajouter le board a la bdd
        const $insertBoard = "INSERT INTO board(board, roomId) VALUES ('" + JSON.stringify(this.board) + "', '" + this.roomId + "')";
        if (!row[0]) {
          // ajout du board dans la bdd a l'initialisation de la game
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
     * Mise à jour du board
     *
     * @param {string} type Type du player(X ou O)
     * @param {int} row Row in which move was played
     * @param {int} col Col in which move was played
     * @param {string} tile Id of the the that was clicked
     */
    updateBoard(type, row, col, tile) {
      $(`#${tile}`).text(type).prop('disabled', true);
      this.board[row][col] = type;
      this.moves++;

      // query qui récupère la roomId de la game créée
      const $board = "SELECT * FROM board WHERE roomId = '" + this.roomId + "'";
      // envoi de la query a la bdd
      connection.query($board, (err, row) => {       
        if (JSON.stringify(JSON.parse(row[row.length-1].board)) !== JSON.stringify(this.board)) {
          const $insertBoard = "INSERT INTO board(board, roomId) VALUES ('" + JSON.stringify(this.board) + "', '" + this.roomId + "')";
          // ajout du board dans la bdd pour chaque coup joués
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

    // Mise à jour du board de l'adversaire pour montrer le coup joué par le joueur
    playTurn(tile) {
      const clickedTile = $(tile).attr('id');

      // Notifier l'adversaire qu'un coup a été joué
      socket.emit('playTurn', {
        tile: clickedTile,
        room: this.getRoomId(),
      });
    }
    /**
    *

    * Pour déterminer une condition de victoire, chaque carré est "étiqueté" de gauche
    * à droite, de haut en bas, avec des puissances successives de 2. Chaque cellule
    * représente donc un bit individuel dans une chaîne de 9 bits, et
    * les cases des joueurs à un moment donné peuvent être représentées par des
    * valeurs unique de 9 bits. Un gagnant peut ainsi être facilement déterminé en
    * vérifiant l'addition de chaque lignes/colonnes/diagonales
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
    * Ces nombres son dans le tableau de Player.wins
    * Pour les coups deja joués actuellement, ces information sont stockées dans playsArr
    */
    checkWinner() {
      const currentPlayerPositions = player.getPlaysArr();

      // pour chaque coups joué, on vérifie qu'une ligne est complète
      Player.wins.forEach((winningPosition) => {
        if ((winningPosition & currentPlayerPositions) === winningPosition) {
          // si c'est le cas, on déclare le vainqueur
          game.announceWinner();
        }
      });

      // si le tableau est rempli sans gagnant, on déclare un match nul
      const tieMessage = 'Match nul :(';
      if (this.checkTie()) {
        // fin du jeu
        socket.emit('gameEnded', {
          room: this.getRoomId(),
          message: tieMessage,
        });
        alert(tieMessage);
        // retour à la page d'accueil
        location.reload();
      }
    }

    checkTie() {
      return this.moves >= 9;
    }

    // Déclare un vainqueur
    // Met au courant l'adversaire de la victoire
    announceWinner() {
      const message = `${player.getPlayerName()} wins!`;
      socket.emit('gameEnded', {
        room: this.getRoomId(),
        message,
      });
      alert(message);
      // retour à la page d'accueil
      location.reload();

      // query selectionnant le le nom du player
      const $winner = "SELECT * FROM player WHERE pseudo = '" + player.getPlayerName() + "'";
      connection.query($winner, (err, row) => {
        const $update = "UPDATE player SET partiesGagnees = " + (row[0].partiesGagnees += 1) + " WHERE player.id = " + row[0].id;
        // query a la bdd qui incrémente son nombre de victoires
        connection.query($update, (err) => {
          if(err) {
              return console.log("Une erreur est survenue lors de l'update", err);
          }
        });
      });
    }

    // Fin de la partie
    endGame(message) {
      alert(message);
      location.reload();
    }
  }

  // Création d'une nouvelle partie
  $('#new').on('click', () => {
    const name = $('#nameNew').val();
    // si le champs pseudo n'est pas remplie
    if (!name) {
      alert('Veuillez renseigner votre pseudo');
      return;
    }
    socket.emit('createGame', { name });
    // créer le player1
    player = new Player(name, P1);
    const $pseudoExist = "SELECT * FROM player WHERE pseudo = '" + player.getPlayerName() + "'";
    connection.query($pseudoExist, (err, row) => {
      // si le pseudo saisie existe, on incrémente son nombre de parties jouées
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

  // Rejoindre une partie en indiquant la room-id
  $('#join').on('click', () => {
    const name = $('#nameJoin').val();
    const roomID = $('#room').val();
    // si aucun champs saisie ou l'un des deux vide
    if (!name || !roomID) {
      alert('Veuillez renseigner votre pseudo ainsi que la game ID');
      return;
    }
    socket.emit('joinGame', { name, room: roomID });
    // création du player2
    player = new Player(name, P2);
    const $pseudoExist = "SELECT * FROM player WHERE pseudo = '" + player.getPlayerName() + "'";
    connection.query($pseudoExist, (err, row) => {
      // si le pseudo saisie existe, on incrémente son nombre de parties jouées
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

  // Si reçoit l'evenement 'newGame' : créer une nouvelle partie
  socket.on('newGame', (data) => {
    const message =
      `Bonjour, ${data.name}</span> <br> Game ID : ${data.room}. <br>
      En attente d'un autre joueur ...`;

    // Création du board pour le player1
    game = new Game(data.room);
    game.displayBoard(message);
  });

  /**
     * Le joueur ayant créé la partie sera le player1 et aura les X
     * Evenement reçus lorsqu'un adversaire rejoint la partie
     */
  socket.on('player1', (data) => {
    const message = `Bonjour, ${player.getPlayerName()}`;
    $('#userHello').html(message);
    player.setCurrentTurn(true);
  });

  /**
     * Le joueur ayant rejoint la partie sera le player2 et aura les O
     * Evenement reçu lorsque le joueur a rejoint la room avec succès
     */
  socket.on('player2', (data) => {
    const message = `Bonjour, ${data.name}`;

    // Création du board pour le player2
    game = new Game(data.room);
    game.displayBoard(message);
    player.setCurrentTurn(false);
  });

  /**
     * L'adversaire a jouer son tour, mettre a jour l'interface
     * Indiquer au joueur que c'eest son tour
     */
  socket.on('turnPlayed', (data) => {
    const row = data.tile.split('_')[1][0];
    const col = data.tile.split('_')[1][1];
    const opponentType = player.getPlayerType() === P1 ? P2 : P1;

    game.updateBoard(opponentType, row, col, data.tile);
    player.setCurrentTurn(true);
  });

  // Evenement reçus a la fin d'une partie : l'indiquer au joueurs
  socket.on('gameEnd', (data) => {
    game.endGame(data.message);
    console.log(message);
    
    socket.leave(data.room);
  });

  /**
     * Met fin a la partie si une erreur survient
     */
  socket.on('err', (data) => {
    game.endGame(data.message);
  });
}());