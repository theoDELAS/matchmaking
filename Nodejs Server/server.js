const http = require('http').createServer()
const io = require('socket.io')(http)
const port = 3000


http.listen(port, ()=> console.log(`server listening on port: ${port}`))

io.on('connection', (Socket) => {
	console.log('connected')
	Socket.on('message', (evt) => {
		console.log(evt)
		Socket.broadcast.emit('message', evt)
	})
})

io.on('disconnect', (evt) => {
	console.log('somme people left')
})