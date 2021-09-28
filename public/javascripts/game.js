import {
    socket,
    id,
    clearRoomInfo
} from './socket.js';

var roomInfo;
var player1, player2;
var client;
var selectPhaseEn; // Energy that can be used for the selection phase
var logField;
var nextTurn = [];
var canvas = new fabric.Canvas('game_canvas', {
    backgroundColor: 'white'
});
// Initialize size of the canvas
const {
    width: initialWidth
} = getSize();
resizeCanvas();
var fieldWidth = canvas.width / 6;
var fieldHeight = canvas.height / 5;
var cardWidth = canvas.width / 12;
var cardHeight = canvas.height / 6;
var gaugeHeight = canvas.height / 24;
var gaugeWidth = canvas.width / 3;
fabric.Object.prototype.selectable = false;
canvas.selection = false;
window.addEventListener('resize', resizeCanvas, false);

class Player {
    constructor(_nickname, _location, _id) {
        this.nickname = _nickname;
        this.location = _location;
        this.id = _id;
        this.hp = 100;
        this.en = 100;
    }

    async action(card, val) {
        if (val == undefined) {
            val = 0;
        }
        editLog(String(this.nickname + ' used ' + card.name));
        this.en -= card.energy;
        this.updateGauge('en', this.en);
        if (card.type == "move") {
            var fromField = getFieldByNum(this.location);
            // Get toField
            var toField;
            if (card.up > 0) {
                if ((this.location - 1) - card.up * 4 > 0) {
                    toField = this.location - card.up * 4;
                } else {
                    toField = ((this.location - 1) % 4) + 1;
                }
            } else if (card.down > 0) {
                if (this.location + card.down * 4 <= 12) {
                    toField = this.location + card.down * 4;
                } else {
                    if (this.location % 4 == 0) {
                        toField = 12;
                    } else {
                        toField = this.location % 4 + 8;
                    }
                }
            } else if (card.left > 0) {
                if ((this.location - 1) % 4 >= card.left) {
                    toField = this.location - card.left;
                } else {
                    toField = Math.floor((this.location - 1) / 4) * 4 + 1;
                }
            } else if (card.right > 0) {
                if (this.location + card.right <= (Math.floor((this.location - 1) / 4) + 1) * 4) {
                    toField = this.location + card.right;
                } else {
                    toField = (Math.floor((this.location - 1) / 4) + 1) * 4;
                }
            } else {
                console.error("[ERROR] Something went wrong : Wrong params in move card.");
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
            return 0;
        } else if (card.type == "attack") {
            var attackRange = [];
            card.range.forEach((_field) => {
                var chkPos = checkRange(this.location, _field);
                if (chkPos != -1) {
                    attackRange.push(chkPos);
                }
            });
            markAttackRange('Red', attackRange);
            attackRange.forEach((_field) => {
                if (this.id == 'p1') {
                    if (_field == player2.location) {
                        if (card.damage >= val) {
                            player2.hp -= (card.damage - val);
                            if (player2.hp < 0) { // Prevent hp from becoming negative
                                player2.hp = 0;
                            }
                            player2.updateGauge('hp', player2.hp);
                        }
                    }
                } else if (this.id == 'p2') {
                    if (_field == player1.location) {
                        if (card.damage >= val) {
                            player1.hp -= (card.damage - val);
                            if (player1.hp < 0) { // Prevent hp from becoming negative
                                player1.hp = 0;
                            }
                            player1.updateGauge('hp', player1.hp);
                        }
                    }
                }
            });
            await sleep(500);
            markAttackRange('White', attackRange);
            if (this.id == 'p1') {
                return player2.hp;
            } else if (this.id == 'p2') {
                return player1.hp;
            } else {
                console.error("[ERROR] Something went wrong : Wrong player id.");
            }
        } else if (card.type == "guard") {
            return card.guard;
        } else if (card.type == "restore") {
            this.restoreEn(card.restore);
            return 0;
        }
    }

    updateGauge(type, num) {
        if (type == 'hp') {
            this.hpGauge._objects[1].set({
                width: gaugeWidth * num / 100
            });
            this.hpGauge._objects[2].set({
                text: String(num)
            });
        } else if (type = 'en') {
            this.enGauge._objects[1].set({
                width: gaugeWidth * num / 100
            });
            this.enGauge._objects[2].set({
                text: String(num)
            });
        } else {
            console.error("[ERROR] Something went wrong : Wrong input in updateGauge().");
        }
        canvas.renderAll();
    }

    restoreEn(num) {
        if (this.en + num <= 100) {
            this.en += num;
        } else {
            this.en = 100;
        }
        this.updateGauge('en', this.en);
    }
}

socket.on('startGame', (room) => {
    $('#roomModal').fadeOut();
    roomInfo = room;
    resizeCanvas();
    socket.emit('getPlayer');
    initField(fieldWidth, fieldHeight);
    initPlayer();
    initGauge(gaugeWidth, gaugeHeight);
    initPlayerInfo(gaugeWidth);
    initLogField();
    enterSelectPhase();
});

socket.on('battle', (turn_host, turn_guest) => {
    enterBattlePhase();
    var host_turn_card = [];
    var guest_turn_card = [];
    async function battle() {
        var result;
        for (var i = 0; i < 3; i++) {
            showTurnCard(i);
            result = await calcTurnResult(turn_host[i], turn_guest[i]);
            await sleep(1000);
            if (result == -1) { // Continue game
                player1.updateGauge('en', player1.en);
                player2.updateGauge('en', player2.en);
                fillCardGrey(host_turn_card[i]);
                fillCardGrey(guest_turn_card[i]);
            } else {
                return result;
            }
        }
        return result;

        // Nested function
        function showTurnCard(num) {
            host_turn_card.push(makeCard(turn_host[num]).set({
                top: fieldHeight * (num + 1),
                left: gaugeWidth / 16
            }));
            guest_turn_card.push(makeCard(turn_guest[num]).set({
                top: fieldHeight * (num + 1),
                left: gaugeWidth * 43 / 16
            }));
            canvas.add(host_turn_card[num], guest_turn_card[num]);
        }
        // Nested function
        function fillCardGrey(card) {
            try {
                card._objects[0].set({
                    fill: 'Grey'
                })
            } catch (e) {}
        }
    }
    battle().then((result) => {
        if (result == -1) {
            showContinueBtn();
        } else {
            showExitBtn();
        }
    });
});

socket.on('select', () => {
    canvas.getObjects().forEach((obj) => {
        try {
            if (obj._objects[0].objType == 'button') {
                canvas.remove(obj);
            }
        } catch (e) {}
    })
    enterSelectPhase();
});

socket.on('win', (player) => {
    if (player == 'p1') {
        editLog(player1.nickname + " Win!");
    } else if (player == 'p2') {
        editLog(player2.nickname + " Win!");
    } else {
        console.error("[ERROR] Something went wrong in socket.on('win') : Wrong id.");
    }
});

socket.on('draw', () => {
    editLog("Draw!");
});

socket.on('getPlayer', (host, guest) => {
    if (id == host) {
        client = player1;
    } else if (id == guest) {
        client = player2;
    } else {
        console.error("[ERROR] Something went wrong in socket.on('getPlayer') : Wrong id.");
    }
});

function sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

function getPriority(card) {
    if (card.type == "attack") {
        return 0;
    } else {
        return 1;
    }
}

// Function return
// (-1: continue / 0: draw / 1: 1p win / 2: 2p win)
async function calcTurnResult(p1Action, p2Action) {
    var p1Priority = getPriority(p1Action);
    var p2Priority = getPriority(p2Action);
    var p1Val, p2Val;
    if (p1Priority > p2Priority) { // Player1 action first (Player2 attack)
        p1Val = await player1.action(p1Action);
        await sleep(1000);
        p2Val = await player2.action(p2Action, p1Val);
        await sleep(1000);
        if (p2Val <= 0) {
            socket.emit('win', 'p2');
            return 2;
        } else {
            return -1;
        }
    } else if (p1Priority == p2Priority) {
        p1Val = await player1.action(p1Action);
        await sleep(1000);
        p2Val = await player2.action(p2Action);
        await sleep(1000);
        if (p1Priority + p2Priority == 0) { // Both players attack
            if ((p1Val <= 0) && (p2Val > 0)) {
                socket.emit('win', 'p1');
                return 2;
            } else if ((p1Val > 0) && (p2Val <= 0)) {
                socket.emit('win', 'p2');
                return 1;
            } else if ((p1Val <= 0) && (p2Val <= 0)) {
                socket.emit('draw');
                return 0;
            } else {
                return -1;
            }
        } else { // Both players do not attack
            return -1;
        }
    } else { // Player2 action first (Player1 attack)
        p2Val = await player2.action(p2Action);
        await sleep(1000);
        p1Val = await player1.action(p1Action, p2Val);
        await sleep(1000);
        if (p1Val <= 0) {
            socket.emit('win', 'p1');
            return 1;
        } else {
            return -1;
        }
    }
}

/**
 * @typedef {Object} Size
 * @property {number} width
 * @property {number} height
 */

/**
 * 화면에 알맞은 16:9 width, height를 반환해주는 함수
 * @returns {Size} 
 */
function getSize() {
    const {
        innerWidth,
        innerHeight
    } = window;
    const height = innerWidth * 9 / 16;

    if (innerHeight < height) {
        return {
            width: innerHeight * 16 / 9,
            height: innerHeight
        };
    } else {
        return {
            width: innerWidth,
            height
        };
    }
}

function resizeCanvas() {
    const {
        width,
        height
    } = getSize();
    const zoom = width / initialWidth
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.setZoom(zoom)
    // console.info("canvas resized to w : ", width, ", h : ", height, ", zoom : " , zoom);
}

// Draw invincible field
function initField(width, height) {
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
                stroke: '',
                fieldNum: (i - 1) * 4 + j
            }));
        }
    }
}

function showField() {
    canvas.getObjects('rect').forEach((obj) => {
        if (obj.objType == 'field') {
            obj.set({
                stroke: 'Grey'
            })
        }
    })
}

function initLogField() {
    logField = new fabric.Text('', {
        fontFamily: 'Papyrus',
        fontSize: fieldWidth / 3,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        left: canvas.width / 2,
        top: canvas.height * 9 / 10,
    });
}

function editLog(text) {
    logField.set('text', text);
    canvas.renderAll();
}

function initPlayer() {
    player1 = new Player(roomInfo[2], 5, 'p1');
    player1.character = setCharacter('magenta', 5, 'player1');

    player2 = new Player(roomInfo[3], 8, 'p2');
    player2.character = setCharacter('cyan', 8, 'player2');
}

function setCharacter(color, location, playerNum) {
    var fieldDiv;
    var _field = getFieldByNum(location);
    var _radius = fieldHeight / 6;
    if (playerNum === 'player1') {
        fieldDiv = 1;
    } else if (playerNum === 'player2') {
        fieldDiv = 3;
    } else {
        console.error("[ERROR] Something went wrong : Wrong playerNum.");
    }
    return new fabric.Circle({
        objType: 'character',
        radius: _radius,
        left: _field.left + (fieldWidth / 4) * fieldDiv - _radius,
        top: _field.top + (fieldHeight / 2) - _radius,
        fill: color,
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

function checkRange(location, target) {
    var ret = -1;
    switch (target) {
        // Top Left
        case 1:
            if ((location <= 4) || (location % 4 == 1)) {
                ret = -1;
            } else {
                ret = location - 5;
            }
            break;
            // Top
        case 2:
            if (location <= 4) {
                ret = -1;
            } else {
                ret = location - 4;
            }
            break;
            // Top Right
        case 3:
            if ((location <= 4) || (location % 4 == 0)) {
                ret = -1;
            } else {
                ret = location - 3;
            }
            break;
            // Left
        case 4:
            if (location % 4 == 1) {
                ret = -1;
            } else {
                ret = location - 1;
            }
            break;
            // Center
        case 5:
            ret = location;
            break;
            // Right
        case 6:
            if (location % 4 == 0) {
                ret = -1;
            } else {
                ret = location + 1;
            }
            break;
            // Bottom Left
        case 7:
            if ((location >= 9) || (location % 4 == 1)) {
                ret = -1;
            } else {
                ret = location + 3;
            }
            break;
            // Bottom
        case 8:
            if (location >= 9) {
                ret = -1;
            } else {
                ret = location + 4;
            }
            break;
            // Bottom Right
        case 9:
            if ((location >= 9) || (location % 4 == 0)) {
                ret = -1;
            } else {
                ret = location + 5;
            }
            break;
        default:
            console.error("[ERROR] Something went wrong : Wrong input in checkRange().");
    }
    return ret;
}

function initClient() {
    return new Promise((resolve, reject) => {
        socket.emit('getPlayer');
        socket.on('getPlayer', (host, guest) => {
            if (id == host) {
                resolve(player1);
            } else if (id == guest) {
                resolve(player2);
            } else {
                console.error("[ERROR] Something went wrong in socket.on('getPlayer') : Wrong id.");
            }
        })
    })
}

async function enterSelectPhase() {
    canvas.remove(logField);

    player1.restoreEn(20);
    player2.restoreEn(20);
    client = await initClient();
    selectPhaseEn = client.en;

    canvas.getObjects().forEach((obj) => {
        try {
            if (obj.objType == 'field') {
                obj.set({
                    stroke: ''
                });
            } else if ((obj.objType == 'character') || (obj._objects[0].objType == 'card')) {
                canvas.remove(obj);
            }
        } catch (e) {}
    })

    nextTurn.forEach((obj) => {
        obj.selected = 0;
    })
    nextTurn = [];

    var continue_btn = new fabric.Group([new fabric.Rect({
            objType: 'button',
            width: gaugeWidth / 4,
            height: gaugeWidth / 12,
            fill: 'DarkRed',
            stroke: 'Black',
            strokeWidth: 1,
            rx: 10,
            originX: 'center',
            originY: 'center'
        }),
        new fabric.Text('CONTINUE', {
            fontFamily: 'Papyrus',
            fontSize: gaugeWidth / 32,
            fill: 'White',
            textAlign: 'center',
            originX: 'center',
            originY: 'center'
        })
    ]).set({
        originX: 'center',
        originY: 'center',
        left: gaugeWidth * 3 / 2,
        top: gaugeHeight * 13 / 4,
    });
    continue_btn.on('mousedown', (e) => {
        if (nextTurn.length == 3) {
            continue_btn._objects[0].set({
                fill: 'Grey'
            });
            socket.emit('enterBattlePhase', nextTurn, id);
        }
    })

    canvas.add(player1.hpGauge, player2.hpGauge, player1.enGauge, player2.enGauge, player1.info, player2.info, continue_btn);
    player1.hpGauge.bringToFront();
    player2.hpGauge.bringToFront();

    showAllCards();
    showTurnList();
    showMinimap();
}

function enterBattlePhase() {
    canvas.getObjects().forEach((obj) => {
        try {
            if (obj.objType == 'field') {} else if ((obj._objects[0].objType == 'card') || (obj._objects[0].objType == 'turnList') || (obj._objects[0].objType == 'button') || (obj._objects[0].objType == 'minimap')) {
                canvas.remove(obj);
            }
        } catch (e) {}
    })
    showField();
    canvas.add(logField, player1.character, player2.character);
}

function initGauge(gaugeWidth, gaugeHeight) {
    player1.hpGauge = new fabric.Group([new fabric.Rect({
            objType: 'gauge',
            left: gaugeWidth / 2,
            top: 0,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'White',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }), new fabric.Rect({
            left: gaugeWidth / 2,
            top: 0,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'IndianRed',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }),
        new fabric.Text(String(player1.hp), {
            fontFamily: 'Papyrus',
            fontSize: gaugeHeight,
            textAlign: 'center',
            left: gaugeWidth * 3 / 2 - gaugeHeight * 3,
            top: 0,
        })
    ]);
    player2.hpGauge = new fabric.Group([new fabric.Rect({
            objType: 'gauge',
            left: gaugeWidth * 3 / 2,
            top: 0,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'White',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }), new fabric.Rect({
            left: gaugeWidth * 3 / 2,
            top: 0,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'IndianRed',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }),
        new fabric.Text(String(player2.hp), {
            fontFamily: 'Papyrus',
            fontSize: gaugeHeight,
            textAlign: 'center',
            left: gaugeWidth * 3 / 2 + gaugeHeight,
            top: 0,
        })
    ]);
    player1.enGauge = new fabric.Group([new fabric.Rect({
            objType: 'gauge',
            left: gaugeWidth / 2,
            top: gaugeHeight,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'White',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }), new fabric.Rect({
            left: gaugeWidth / 2,
            top: gaugeHeight,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'LemonChiffon',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }),
        new fabric.Text(String(player1.en), {
            fontFamily: 'Papyrus',
            fontSize: gaugeHeight,
            textAlign: 'center',
            left: gaugeWidth * 3 / 2 - gaugeHeight * 3,
            top: gaugeHeight,
        })
    ]);
    player2.enGauge = new fabric.Group([new fabric.Rect({
            objType: 'gauge',
            left: gaugeWidth * 3 / 2,
            top: gaugeHeight,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'White',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }), new fabric.Rect({
            objType: 'gauge',
            left: gaugeWidth * 3 / 2,
            top: gaugeHeight,
            width: gaugeWidth,
            height: gaugeHeight,
            fill: 'LemonChiffon',
            stroke: 'CornflowerBlue',
            strokeWidth: 4,
            rx: 10,
        }),
        new fabric.Text(String(player2.en), {
            fontFamily: 'Papyrus',
            fontSize: gaugeHeight,
            textAlign: 'center',
            left: gaugeWidth * 3 / 2 + gaugeHeight,
            top: gaugeHeight,
        })
    ]);
}

function initPlayerInfo(_width) {
    var player1_color = 'magenta';
    var player2_color = 'cyan';
    player1.info = new fabric.Group([
        new fabric.Rect({
            objType: 'info',
            left: _width / 16,
            top: 0,
            width: _width / 4,
            height: _width / 4,
            fill: 'AliceBlue',
            stroke: 'LightSkyBlue',
            strokeWidth: 4,
            rx: 10,
        }),
        new fabric.Text(player1.nickname, {
            fontFamily: 'Papyrus',
            fontSize: _width / 16,
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: _width / 16 * 3,
            top: _width / 16,
        }),
        new fabric.Circle({
            originX: 'center',
            originY: 'center',
            radius: _width / 32,
            top: _width / 16 * 3,
            left: _width / 16 * 3,
            fill: player1_color
        })
    ]);
    player2.info = new fabric.Group([
        new fabric.Rect({
            objType: 'info',
            left: _width / 16 * 43,
            top: 0,
            width: _width / 4,
            height: _width / 4,
            fill: 'AliceBlue',
            stroke: 'LightSkyBlue',
            strokeWidth: 4,
            rx: 10,
        }),
        new fabric.Text(player2.nickname, {
            fontFamily: 'Papyrus',
            fontSize: _width / 16,
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: _width / 16 * 45,
            top: _width / 16,
        }),
        new fabric.Circle({
            originX: 'center',
            originY: 'center',
            radius: _width / 32,
            top: _width / 16 * 3,
            left: _width / 16 * 45,
            fill: player2_color
        })
    ]);
}

function makeCard(card) {
    return new fabric.Group([
        new fabric.Rect({
            objType: 'card',
            width: cardWidth,
            height: cardHeight,
            fill: 'PaleGreen',
            stroke: 'Black',
            strokeWidth: 2,
            rx: 10,
            originX: 'center',
            selected: 0
        }),
        new fabric.Text(card.name, {
            fontSize: cardWidth / 7,
            originX: 'center',
            fontFamily: 'Lucida Console'
        }),
        new fabric.Text(String('[DM]' + card.damage + ' [EN]' + card.energy), {
            fontSize: cardWidth / 9,
            top: cardWidth / 4,
            fontFamily: 'Lucida Console',
            originX: 'center'
        }),
        renderRange(card).set({
            originX: 'center',
            top: cardWidth / 2,
        })
    ]).set({
        selected: 0,
        damage: card.damage,
        energy: card.energy,
        guard: card.guard,
        restore: card.restore
    });
}

function renderRange(card) {
    var _width = cardWidth / 8;
    var _height = cardHeight / 8;
    var _arr = [];
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            _arr.push(new fabric.Rect({
                left: j * _width,
                top: i * _height,
                width: _width,
                height: _height,
                fill: 'White',
                strokeWidth: 1,
                stroke: 'Black'
            }));
        }
    }
    if ((card.type == 'guard') || (card.type == 'restore')) {
        _arr[4].set('fill', 'blue');
    } else if (card.type == 'move') {
        if (card.up > 0) {
            markRange(1, card.up);
        } else if (card.down > 0) {
            markRange(7, card.down);
        } else if (card.left > 0) {
            markRange(3, card.left);
        } else if (card.right > 0) {
            markRange(5, card.right);
        }
    } else {
        card.range.forEach((r) => {
            _arr[r - 1].set('fill', 'red');
        });
    }

    // Nested function
    function markRange(num, moveVal) {
        _arr[num].set('fill', 'lightgreen');
        _arr[num] = new fabric.Group([
            _arr[num],
            new fabric.Text(String(moveVal), {
                fontSize: _width,
                originX: 'center',
                originY: 'center',
                left: _arr[num].left + _width / 2,
                top: _arr[num].top + _height / 2
            })
        ]);
    }
    return new fabric.Group(_arr);
}

function showMinimap() {
    var _width = cardWidth * 5 / 8;
    var _height = cardHeight * 1 / 2;
    var _arr = [];

    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 4; j++) {
            _arr.push(new fabric.Rect({
                objType: 'minimap',
                left: j * _width,
                top: i * _height,
                width: _width,
                height: _height,
                fill: 'White',
                strokeWidth: 3,
                stroke: 'SlateGrey'
            }));
        }
    }
    // Color the players' locations.
    if (player1.location == player2.location) {
        _arr[player1.location - 1].set('fill', new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'percentage',
            coords: {
                x1: 0,
                y1: 0,
                x2: 1,
                y2: 0
            },
            colorStops: [{
                    offset: 0,
                    color: 'magenta'
                },
                {
                    offset: 1,
                    color: 'cyan'
                }
            ]
        }));
    } else {
        _arr[player1.location - 1].set('fill', 'magenta');
        _arr[player2.location - 1].set('fill', 'cyan');
    }

    var miniField = new fabric.Group(_arr);
    miniField.set({
        top: cardHeight * 4,
        left: cardWidth * 9
    })
    canvas.add(miniField);
}

function showAllCards() {
    $.getJSON('json/card.json', (data) => {
        var i = 1;
        var j = 1;
        while (i <= data.length) {
            var card = makeCard(data[i - 1]).set({
                top: cardHeight * 5 / 4 * j,
                left: cardWidth * 5 / 2 + cardWidth * ((i - 1) % 5) * 3 / 2,
                originTop: cardHeight * 5 / 4 * j,
                originLeft: cardWidth * 5 / 2 + cardWidth * ((i - 1) % 5) * 3 / 2,
            });
            card.on('mousedown', (e) => {
                clickCard(e);
            })
            canvas.add(card);
            if (i % 5 == 0) {
                j += 1;
            }
            i += 1;
        }
    });
}

// For cards already selected, deselect card
function clickCard(e) {
    if (e.target.selected == 1) {
        e.target.selected = 0;
        nextTurn.splice(nextTurn.indexOf(e.target), 1);
        e.target.set({
            top: e.target.originTop,
            left: e.target.originLeft
        });
        e.target.setCoords(); // Function after moving objects
        refreshTurnCards(nextTurn);
        // If deselect card, increase available energy
        if (selectPhaseEn + e.target.energy <= 100) {
            selectPhaseEn += e.target.energy;
        } else {
            selectPhaseEn = 100;
        }
    } else if (nextTurn.length < 3) {
        // If client has enough energy to select card
        if (selectPhaseEn >= e.target.energy) {
            e.target.selected = 1
            nextTurn.push(e.target);
            refreshTurnCards(nextTurn);
            if (e.target.restore != undefined) { // If card is restore card
                if (selectPhaseEn + e.target.restore <= 100) {
                    selectPhaseEn += e.target.restore;
                } else {
                    selectPhaseEn = 100;
                }
            } else {
                if (selectPhaseEn - e.target.energy >= 0) {
                    selectPhaseEn -= e.target.energy;
                } else {
                    selectPhaseEn = 0;
                }
            }
        } else {
            alert("Not enough energy!");
        }
    } else {
        console.error("[ERROR] Something went wrong in clickCard().");
    }
}

function refreshTurnCards(turn) {
    for (var i = 0; i < turn.length; i++) {
        turn[i].set({
            top: cardHeight * 9 / 2,
            left: cardWidth * 4 + cardWidth * i * 3 / 2
        });
        turn[i].setCoords(); // Function after moving objects
    }
}

function showTurnList() {
    for (var i = 1; i <= 3; i++) {
        var turn = new fabric.Group([
            new fabric.Rect({
                objType: 'turnList',
                width: cardWidth,
                height: cardHeight,
                fill: 'Silver',
                stroke: 'Black',
                strokeWidth: 4,
                rx: 10,
                originX: 'center',
            }),
            new fabric.Text(String('Action ' + i), {
                fontSize: cardWidth / 6,
                originX: 'center',
                fontFamily: 'Lucida Console',
                fill: 'SlateGrey',
                top: cardHeight / 3
            }),
        ]).set({
            top: cardHeight * 9 / 2,
            left: cardWidth * 4 + cardWidth * ((i - 1) % 5) * 3 / 2
        });
        canvas.add(turn);
    }
}

function markAttackRange(color, rangeArr) {
    rangeArr.forEach((field) => {
        canvas.getObjects('rect').forEach((obj) => {
            if ((obj.objType == 'field') && (obj.fieldNum == field)) {
                obj.set({
                    fill: color
                })
                canvas.renderAll();
            }
        })
    })
}

function exitGame() {
    canvas.getObjects().forEach((obj) => {
        canvas.remove(obj);
    })
    $('#game_lobby').show();
    clearRoomInfo();
    $('#waitingRoom_guest').hide();
    $('#waitingRoom_host').hide();
    $('#waitingRoom_host button').attr('disabled', true);
    $('#waitingRoom_guest button').css('background', 'white');
    $('#waitingRoom_guest button').css('color', 'grey');
}

function showContinueBtn() {
    var continue_btn = new fabric.Group([new fabric.Rect({
            objType: 'button',
            width: gaugeWidth / 4,
            height: gaugeWidth / 12,
            fill: 'DarkRed',
            stroke: 'Black',
            strokeWidth: 1,
            rx: 10,
            originX: 'center',
            originY: 'center'
        }),
        new fabric.Text('CONTINUE', {
            fontFamily: 'Papyrus',
            fontSize: gaugeWidth / 32,
            fill: 'White',
            textAlign: 'center',
            originX: 'center',
            originY: 'center'
        })
    ]).set({
        originX: 'center',
        originY: 'center',
        left: gaugeWidth * 3 / 2,
        top: gaugeHeight * 13 / 4,
    });
    continue_btn.on('mousedown', (e) => {
        socket.emit('enterSelectPhase');
    });
    canvas.add(continue_btn);
}

function showExitBtn() {
    var exit_btn = new fabric.Group([new fabric.Rect({
            objType: 'button',
            width: gaugeWidth / 4,
            height: gaugeWidth / 12,
            fill: 'DarkRed',
            stroke: 'Black',
            strokeWidth: 1,
            rx: 10,
            originX: 'center',
            originY: 'center'
        }),
        new fabric.Text('EXIT', {
            fontFamily: 'Papyrus',
            fontSize: gaugeWidth / 32,
            fill: 'White',
            textAlign: 'center',
            originX: 'center',
            originY: 'center'
        })
    ]).set({
        originX: 'center',
        originY: 'center',
        left: gaugeWidth * 3 / 2,
        top: gaugeHeight * 13 / 4,
    });
    exit_btn.on('mousedown', (e) => {
        exitGame();
    })
    canvas.add(exit_btn);
}