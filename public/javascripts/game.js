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

// const canvas = document.getElementById('game_canvas');
// canvas.width = canvas.offsetWidth;
// canvas.height = canvas.offsetHeight;
// const ctx = canvas.getContext("2d");

// canvas.onclick = function clickField(event) {
//     const x = event.pageX;
//     const y = event.pageY;
//     const clickedXY = field.find((element) => {
//         return ((element.x < x) && (x < element.x + fieldWidth)) && ((element.y < y) && (y < element.y + fieldHeight));
//     });
//     return clickedXY;
// }

// function getFieldCenter(XY) {
//     try {
//         var ret = [XY['x'] + fieldWidth / 2, XY['y'] + fieldHeight / 2];
//     } catch (error) {
//         ret = -1;
//         console.error(error);
//     }
//     return ret;
// }

// function getCharacter(color, _x, _y) {
//     var circle = {
//         x: 0,
//         y: 0,
//         vx: 1,
//         vy: 1,
//         draw: () => {
//             ctx.beginPath();
//             ctx.arc(_x, _y, 25, 0, 2 * Math.PI);
//             ctx.fillStyle = color;
//             ctx.fill();
//         }
//     };
//     circle.x = _x;
//     circle.y = _y;
//     return circle;
// }

// function drawCharacter(character) {
//     character.draw();
// }
// function initPlayer() {
//     player1 = new Player(roomInfo[2]);
//     player1.location = 5;
//     var p1StartLoc = getFieldCenter(getField(5));
//     player1.character = getCharacter("magenta",p1StartLoc[0], p1StartLoc[1]);
//     drawCharacter(player1.character);

//     player2 = new Player(roomInfo[3]);
//     player2.location = 8;
//     var p2StartLoc = getFieldCenter(getField(8));
//     player2.character = getCharacter("cyan", p2StartLoc[0], p2StartLoc[1]);
//     drawCharacter(player2.character);
// }

// function getField(fieldNum) {
//     //Get field info by fieldNum
//     var XY = field.find((element) => {
//         return element.fieldNum == fieldNum;
//     });
//     return XY;
// }

// initPlayer();

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

console.log("All Objects : ", canvas.getObjects());