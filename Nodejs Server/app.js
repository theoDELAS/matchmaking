/* // index.js
// Require and create our server packages
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

// Send socket initialization scripts to the client
app.get('/', function(req, res){
    res.send(`
<script src="/socket.io/socket.io.js"></script>
<script>
    let socket = io();
    socket.on('text', (txt) => {
        let textp = document.createElement("h1");
        let t = document.createTextNode(txt);
        textp.appendChild(t);                                            
        document.body.appendChild(textp);
    });
</script>`);
});

// Respond to socket connections with a Hello World text
/* io.on('connection', (socket) => {
    console.log('User connected');
    io.emit('text', 'Hello, World!');
});
*/
// Run our socket-enabled server


/* io.on('connection', (socket) => {
    io.emit('this', { will: 'be received by everyone'});
  
    socket.on('private message', (from, msg) => {
      console.log('I received a private message by ', from, ' saying ', msg);
    });
  
    socket.on('disconnect', () => {
      io.emit('user disconnected');
    });
  });
http.listen(3000, function() {
    console.log('listening on *:3000');
}); 
 */ 


 
