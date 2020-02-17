var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

//CAL OMPLENAR AQUESTA DADA A MÀ:
var ip_local = '192.168.173.198';

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

server.listen(8081, ip_local, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Listening on http://' + host + ':' + port);
});


var players = {};

var puck = {};
server.lastPlayer = 0;

io.on('connection', function (socket) {
  server.lastPlayer++;
  console.log('a user connected ' + server.lastPlayer);
  // create a new player and add it to our players object
  players[socket.id] = {
    x: 100,
    y: 100,
    playerId: socket.id,
    puckMaster: null,
    team: (server.lastPlayer % 2 == 0) ? 'red' : 'blue'
  };
  // send the players object to the new player
  socket.emit('currentPlayers', players);
  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // when a player disconnects, remove them from our players object
  socket.on('disconnect', function () {
    console.log('user disconnected');
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
  });

  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  //Estableix qui es el puckMaster.
  socket.on('setPuckMaster', function(data) {
    Object.keys(players).forEach(function(id) {      
      if(players[id].playerId === socket.id) {
        players[id].puckMaster = data.master;
      } else {
        players[id].puckMaster = false;
      }
    });
    socket.broadcast.emit('puckMaster');
  });
  //Enviem dades de moviment de Puck.
  socket.on('puckMovement', function(movementData) {
    puck.x = movementData.x;
    puck.y = movementData.y;
    // console.log(movementData);
    socket.broadcast.emit('puckMoved', puck);
  });

  //Sistema de gols i puntuació.
  socket.on("goalLeft", function(){
    console.log("goal left");
    socket.emit("goalLeft");
  });

  socket.on("goalRight", function(){
    console.log("goal right");
    
  });

});