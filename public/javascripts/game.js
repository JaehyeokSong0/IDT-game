import {socket} from './socket.js';

socket.on('startGame', (room) => {
    $('#roomModal').fadeOut();
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
        field[i - 1] = [];
        for (var j = 1; j <= 4; j++) {
            ctx.strokeRect(j * width, i * height, width, height);
            field[i - 1][j - 1] = {
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
    const clickedY = field.find((element) => {
        return (element[0].y < y) && (y < element[0].y + fieldHeight);
    });
    var clickedXY = null;
    if (clickedY != undefined) {
        clickedXY = clickedY.find((element) => {
            return (element.x < x) && (x < element.x + fieldWidth);
        });
    }
}