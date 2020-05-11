$(function() {
  // Get handle to the chat div
  var $chatWindow = $('#messages');

  // Our interface to the Chat service
  var chatClient;

  // A handle to the "general" chat channel - the one and only channel we
  // will have in this sample app
  var generalChannel;

  // The server will assign the client a random username - store that value
  // here
  var username;

  // Helper function to print info messages to the chat window
  function print(infoMessage, asHtml) {
    var $msg = $('<div class="info">');
    if (asHtml) {
      $msg.html(infoMessage);
    } else {
      $msg.text(infoMessage);
    }
    $chatWindow.append($msg);
  }

  // Helper function to print chat message to the chat window
  function printMessage(fromUser, message) {
    var $user = $('<span class="username">').text(fromUser + ':');
    if (fromUser === username) {
      $user.addClass('me');
    } else {
      new Notification('New message', {
        body: fromUser + ': ' + message
      });
    }
    var $message = $('<span class="message">').text(message);
    var $container = $('<div class="message-container">');
    $container.append($user).append($message);
    $chatWindow.append($container);
    $chatWindow.scrollTop($chatWindow[0].scrollHeight);
  }

  // Alert the user they have been assigned a random username
  print('Connexion ...');

  // Get an access token for the current user, passing a username (identity)
  // and a device ID - for browser-based apps, we'll always just use the
  // value "browser"
  $.getJSON('http://62271f2e.ngrok.io/token', {
    device: 'browser'
  }, function(data) {


    // Initialize the Chat client
    Twilio.Chat.Client.create(data.token).then(client => {
      console.log('Chat client créé');
      chatClient = client;
      chatClient.getSubscribedChannels().then(createOrJoinGeneralChannel);

    // Alert the user they have been assigned a random username
    username = data.identity;
    print('Un pseudo aléatoire vous a été assigné : '
    + '<span class="me">' + username + '</span>', true);

    }).catch(error => {
      console.error(error);
      print('Une erreur lors de la création du chat client est survenue :<br/>' + error, true);
      print('Vérifiez votre fichier .env', false);
    });
  });

  function createOrJoinGeneralChannel() {
    // Get the general chat channel, which is where all the messages are
    // sent in this simple application
    print('Tentative de connexion au cannal de discussion "général" ...');
    chatClient.getChannelByUniqueName('general')
    .then(function(channel) {
      generalChannel = channel;
      console.log('Cannal de discussion général trouvé :');
      console.log(generalChannel);
      setupChannel();
    }).catch(function() {
      // If it doesn't exist, let's create it
      console.log('Création du cannal de discussion général');
      chatClient.createChannel({
        uniqueName: 'general',
        friendlyName: 'General Chat Channel'
      }).then(function(channel) {
        console.log('Channal de discussion général créé :');
        console.log(channel);
        generalChannel = channel;
        setupChannel();
      }).catch(function(channel) {
        console.log('Le cannal de discussion n\'a pas pu être créé');
        console.log(channel);
      });
    });
  }

  // Set up channel after it has been found
  function setupChannel() {
    // Join the general channel
    generalChannel.join().then(function(channel) {
      print('Vous avez rejoins le channel de discussion avec comme pseudo  '
      + '<span class="me">' + username + '</span>.', true);
    });

    // Listen for new messages sent to the channel
    generalChannel.on('messageAdded', function(message) {
      printMessage(message.author, message.body);
    });
  }

  // Send a new message to the general channel
  var $input = $('#chat-input');
  $input.on('keydown', function(e) {

    if (e.keyCode == 13) {
      if (generalChannel === undefined) {
        print('Le service de Chat n\'est pas configuré. Veuillez vérifier votre fichier .env', false);
        return;
      }
      generalChannel.sendMessage($input.val())
      $input.val('');
    }
  });
});
