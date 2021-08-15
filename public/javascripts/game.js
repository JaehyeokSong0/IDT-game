import {
    socket
} from './socket.js';

var roomInfo;
class Player {
    constructor(id) {
        this.id = id;
    }
}

socket.on('startGame', (room) => {
    $('#roomModal').fadeOut();
    roomInfo = room;
    initPlayer();
});

const canvas = document.getElementById('game_canvas');
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
const ctx = canvas.getContext("2d");

// Make field
const fieldWidth = canvas.width / 6;
const fieldHeight = canvas.height / 5;
const field = [];

function drawField(width, height) {
    ctx.strokeStyle = "grey";
    ctx.lineWidth = "5";
    for (var i = 1; i <= 3; i++) {
        for (var j = 1; j <= 4; j++) {
            ctx.strokeRect(j * width, i * height, width, height);
            field[((i - 1) * 4 + j) - 1] = {
                x: j * width,
                y: i * height,
                fieldNum: (i - 1) * 4 + j
            };
        }
    }
}
drawField(fieldWidth, fieldHeight);

canvas.onclick = function clickField(event) {
    const x = event.pageX;
    const y = event.pageY;
    const clickedXY = field.find((element) => {
        return ((element.x < x) && (x < element.x + fieldWidth)) && ((element.y < y) && (y < element.y + fieldHeight));
    });
    return clickedXY;
}

function getFieldCenter(XY) {
    try {
        var ret = [XY['x'] + fieldWidth / 2, XY['y'] + fieldHeight / 2];
    } catch (error) {
        ret = -1;
        console.error(error);
    }
    return ret;
}

function drawCharacter(color, x, y) {
    var circle = new Path2D();
    circle.arc(x, y, 25, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill(circle);
}

function initPlayer() {
    var player1 = new Player(roomInfo[2]);
    player1.location = 5;
    var p1StartLoc = getFieldCenter(getField(5));
    drawCharacter("magenta", p1StartLoc[0], p1StartLoc[1]);

    var player2 = new Player(roomInfo[3]);
    player2.location = 8;
    var p2StartLoc = getFieldCenter(getField(8));
    drawCharacter("cyan", p2StartLoc[0], p2StartLoc[1])
}

function getField(fieldNum) {
    //Get field info by fieldNum
    var XY = field.find((element) => {
        return element.fieldNum == fieldNum;
    });
    return XY;
}