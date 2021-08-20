import {
    socket
} from './socket.js';
var roomInfo = [1, "roomTitle", "host", "guest", 2];

class Player {
    constructor(id) {
        this.id = id;
    }
    // Function to move character
    moveChar(testCard) {
        var fromField = getFieldByNum(this.location);
        // Get toField
        var toField;
        if (testCard.up > 0) {
            if ((this.location - 1) - testCard.up * 4 > 0) {
                toField = this.location - testCard.up * 4;
            } else {
                toField = ((this.location - 1) % 4) + 1;
            }
        } else if (testCard.down > 0) {
            if (this.location + testCard.down * 4 <= 12) {
                toField = this.location + testCard.down * 4;
            } else {
                if (this.location % 4 == 0) {
                    toField = 12;
                } else {
                    toField = this.location % 4 + 8;
                }
            }
        } else if (testCard.left > 0) {
            if ((this.location - 1) % 4 >= testCard.left) {
                toField = this.location - testCard.left;
            } else {
                toField = Math.floor((this.location - 1) / 4) * 4 + 1;
            }
        } else if (testCard.right > 0) {
            if (this.location + testCard.right <= (Math.floor((this.location - 1) / 4) + 1) * 4) {
                toField = this.location + testCard.right;
            } else {
                toField = (Math.floor((this.location - 1) / 4) + 1) * 4;
            }
        } else {
            console.error("[ERROR] Something went wrong : Not a move card.");
        }
        this.location = toField;

        toField = getFieldByNum(toField);
        var dx = toField.left - fromField.left;
        var dy = fromField.top - toField.top;
        if (dx >= 0) {
            this.character.animate('left', '+=' + dx, {
                onChange: canvas.renderAll.bind(canvas)
            });
        } else {
            this.character.animate('left', '-=' + Math.abs(dx), {
                onChange: canvas.renderAll.bind(canvas)
            });
        }
        if (dy >= 0) {
            this.character.animate('top', '-=' + dy, {
                onChange: canvas.renderAll.bind(canvas)
            });
        } else {
            this.character.animate('top', '+=' + Math.abs(dy), {
                onChange: canvas.renderAll.bind(canvas)
            });
        }
    }
}
var player1, player2;

socket.on('startGame', (room) => {
    $('#roomModal').fadeOut();
    roomInfo = room;
    initPlayer();
});

const canvas = new fabric.Canvas('game_canvas');
window.addEventListener('resize', resizeCanvas, false);

function resizeCanvas() {
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
    console.info("canvas resized to w : ", canvas.width, ", h : ", canvas.height);
}

// initialize size of the canvas
resizeCanvas();

// Make field
var fieldWidth = canvas.width / 6;
var fieldHeight = canvas.height / 5;

function drawField(width, height) {
    for (var i = 1; i <= 3; i++) {
        for (var j = 1; j <= 4; j++) {
            canvas.add(new fabric.Rect({
                objType: 'field',
                left: j * width,
                top: i * height,
                width: width,
                height: height,
                fill: '',
                strokeWidth: 8,
                stroke: 'grey',
                selectable: false,
                fieldNum: (i - 1) * 4 + j
            }));
        }
    }
}
drawField(fieldWidth, fieldHeight);

function initPlayer() {
    player1 = new Player(roomInfo[2]);
    player1.location = 5;
    player1.character = setCharacter('magenta', 5, 'player1');

    player2 = new Player(roomInfo[3]);
    player2.location = 8;
    player2.character = setCharacter('cyan', 8, 'player2');

    canvas.add(player1.character, player2.character);
}

function setCharacter(color, location, playerNum) {
    var fieldDiv;
    if (playerNum === 'player1') {
        fieldDiv = 1;
    } else if (playerNum === 'player2') {
        fieldDiv = 3;
    } else {
        console.error("[ERROR] Something went wrong : Wrong playerNum.");
    }
    var _field = getFieldByNum(location);
    var _radius = fieldHeight / 6;
    return new fabric.Circle({
        objType: 'character',
        radius: _radius,
        left: _field.left + (fieldWidth / 4) * fieldDiv - _radius,
        top: _field.top + (fieldHeight / 2) - _radius,
        fill: color,
        selectable: false
    });
}

function getFieldByNum(fieldNum) {
    var ret = null;
    canvas.getObjects('rect').forEach((obj) => {
        if (obj.fieldNum == fieldNum) {
            ret = obj;
            return ret;
        }
    })
    return ret;
}

initPlayer();

canvas.on('mouse:down', (evt) => player2.moveChar(testCard));
var testCard = {
    "type": "move",
    "up": 0,
    "down": 0,
    "left": 0,
    "right": 0
}