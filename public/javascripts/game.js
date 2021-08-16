import {
    socket
} from './socket.js';
var roomInfo = [1, "roomTitle", "host", "guest", 2];

class Player {
    constructor(id) {
        this.id = id;
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
    player1.character = setCharacter('magenta', 5);

    player2 = new Player(roomInfo[3]);
    player2.location = 8;
    player2.character = setCharacter('cyan', 8);

    canvas.add(player1.character, player2.character);
}

function setCharacter(color, location) {
    var _field = getFieldByNum(location);
    var _radius = fieldHeight / 6;
    return new fabric.Circle({
        objType: 'character',
        radius: _radius,
        left: _field.left + (fieldWidth / 2) - _radius,
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

canvas.on('mouse:down', (evt) => moveChar(evt, 12));

// Function to move character by click
function moveChar(evt, to) {
    try {
        if (evt.target.objType == 'character') {
            var toField = getFieldByNum(to);
            var dx = toField.left - evt.target.left - evt.target.radius + fieldWidth / 2;
            var dy = evt.target.top - toField.top + evt.target.radius - fieldHeight / 2;
            if (dx >= 0) {
                evt.target.animate('left', '+=' + dx, {
                    onChange: canvas.renderAll.bind(canvas)
                });
            } else {
                evt.target.animate('left', '-=' + Math.abs(dx), {
                    onChange: canvas.renderAll.bind(canvas)
                });
            }
            if (dy >= 0) {
                evt.target.animate('top', '-=' + dy, {
                    onChange: canvas.renderAll.bind(canvas)
                });
            } else {
                evt.target.animate('top', '+=' + Math.abs(dy), {
                    onChange: canvas.renderAll.bind(canvas)
                });
            }
        }
    } catch (error) {}
}