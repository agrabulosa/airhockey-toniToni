/**
 * @type {import("../../typings/phaser")}
 */


var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 1000,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            gravity: {
                y: 0
            }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload() {
    //CARREGUEM ELS ASSETS:
    this.load.image('ship', 'assets/spaceShips_001.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');

    //Goals
    this.load.image('goalLeft', 'assets/blueGoal.png');
    this.load.image('goalRight', 'assets/redGoal.png');
    
    //Player
    this.load.image('paddle', 'assets/paddle.png');

    //Puck
    this.load.image('puck', 'assets/puck.png')
}

function create() {

    var self = this;

    //Coloquem les porteries i els hi donem una posició depenent de la mida del nostre joc.
    this.goalLeft = this.add.sprite(0, this.cameras.main.centerY, 'goalLeft');
    this.goalLeft.left = true;
    this.goalRight = this.add.sprite(this.cameras.main.width - 6, this.cameras.main.centerY, 'goalRight');
    this.goalRight.left = false;

    //Coloquem la pilota/disc a l'escena:
    this.puck = this.physics.add.sprite(this.cameras.main.centerX, this.cameras.main.centerY, 'puck');
    
    //Creem colisions.
    this.physics.world.enableBody(this.puck);
    this.puck.setCircle(21);
    this.puck.setBounce(0.8, 0.8);
    this.puck.setCollideWorldBounds(true);



    this.otherPlayers = this.physics.add.group();


    this.socket = io();

    
    this.socket.on('currentPlayers', function (players) 
    {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });
    
    
    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    //captura de moviment
    this.cursors = this.input.keyboard.createCursorKeys();

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });


    this.socket.on('puckMoved', function(puckInfo) {
        puckMovementUpdate(self, puckInfo);
    });

}

function update() {

    if (this.paddle) {
        if (this.cursors.left.isDown) {
            this.paddle.setVelocityX(-150);
        } else if (this.cursors.right.isDown) {
            this.paddle.setVelocityX(150);
        } else {
            this.paddle.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.paddle.setVelocityY(-150);
        } else if (this.cursors.down.isDown) {
            this.paddle.setVelocityY(150);
        } else {
            this.paddle.setVelocityY(0);
        }

        //fa que el player surti de pantalla i torni a entrar...
        this.physics.world.wrap(this.paddle, 5);

        // emit player movement
        var x = this.paddle.x;
        var y = this.paddle.y;
        if (this.paddle.oldPosition && (x !== this.paddle.oldPosition.x || y !== this.paddle.oldPosition.y)) {
            this.socket.emit('playerMovement', {
                x: this.paddle.x,
                y: this.paddle.y,
            });
        }

        // save old position data
        this.paddle.oldPosition = {
            x: this.paddle.x,
            y: this.paddle.y,
        };
    }

    // emit puck movement
    var puckX = this.puck.x;
    var puckY = this.puck.y;
    if (this.puck.oldPosition && (puckX !== this.puck.oldPosition.x  || puckY !== this.puck.oldPosition.y)) {
        this.socket.emit('puckMovement', {
            x: this.puck.x,
            y: this.puck.y
        })
    }

    // save old puck position data
    this.puck.oldPosition = {
        x: this.puck.x,
        y: this.puck.y
    };

}

function addPlayer(self, playerInfo) {
    self.paddle = self.physics.add.image(playerInfo.x, playerInfo.y, 'paddle').setOrigin(0.5, 0.5).setDisplaySize(60, 60);
    if (playerInfo.team === 'blue') {
        self.paddle.setTint(0x0000FF);
    } else {
        self.paddle.setTint(0xFF0000);
    }

    //self.paddle.setDrag(100);
    //self.paddle.setAngularDrag(100);
    //self.paddle.setMaxVelocity(400);

    //Colisions entre el player i puck
    self.physics.world.enableBody(self.paddle);
    self.paddle.setCollideWorldBounds(true);
    self.physics.add.collider(self.paddle, self.puck);

    //Afegim overlap entre paddle i puck i cridem la funció setPuckMaster per definir qui envía informació d'ubicació de la pilota.
    self.physics.add.overlap(self.paddle, self.puck, setPuckMaster, null, self);
    
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'paddle').setOrigin(0.5, 0.5).setDisplaySize(60, 60);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000FF);
    } else {
        otherPlayer.setTint(0xFF0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

//Actualitza la posició de la Puck en el joc
function puckMovementUpdate(self, puckInfo) {    
    self.puck.x = puckInfo.x;
    self.puck.y = puckInfo.y;
}

//Enviem el valor true, per què el servidor estableixi quí es el puckMaster.
function setPuckMaster(game) {
    game.scene.socket.emit('setPuckMaster', {master: true});
}

