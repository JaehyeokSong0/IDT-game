import {
    socket,
    id
} from './socket.js';

var roomInfo;
var player1, player2;
var logField;
var nextTurn = [];
var canvas = new fabric.Canvas('game_canvas', {
    backgroundColor: 'white'
});
// Initialize size of the canvas
resizeCanvas();
var fieldWidth = canvas.width / 6;
var fieldHeight = canvas.height / 5;
var cardWidth = canvas.width / 12;
var cardHeight = canvas.height / 6;
var gaugeHeight = canvas.height / 24;
var gaugeWidth = canvas.width / 3;
fabric.Object.prototype.selectable = false;
window.addEventListener('resize', resizeCanvas, false);

class Player {
    constructor(_nickname, _location, _id) {
        this.nickname = _nickname;
        this.location = _location;
        this.id = _id;
        this.hp = 100;
        this.en = 100;
    }

    action(card, val) {
        editLog(String(this.nickname + ' used ' + card.name));
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
            attackRange.forEach((_field) => {
                if (this.id == 'p1') {
                    if (_field == player2.location) {
                        if (card.damage >= val * (-1)) {
                            player2.hp -= (card.damage + val);
                            player2.updateGauge('hp', player2.hp);
                        }
                        return player2.hp;
                    }
                } else if (this.id == 'p2') {
                    if (_field == player1.location) {
                        if (card.damage >= val * (-1)) {
                            player1.hp -= (card.damage + val);
                            player1.updateGauge('hp', player1.hp);
                        }
                        return player1.hp;
                    }
                } else {
                    console.error("[ERROR] Something went wrong : Wrong player id.");
                }
            });
        } else if (card.type == "guard") {
            return card.damage;
        } else if (card.type == "restore") {
            if (this.en + card.energy <= 100) {
                this.en += card.energy;
            } else {
                this.en = 100;
            }
            this.updateGauge('en', this.en);
            return 0;
        }
    }

    updateGauge(type, num) {
        console.log('updateGauge', type, num);
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
}

socket.on('startGame', (room) => {
    $('#roomModal').fadeOut();
    roomInfo = room;
    resizeCanvas();
    initField(fieldWidth, fieldHeight);
    initPlayer();
    initLogField();
    enterSelectPhase();
});

socket.on('battle', (turn_host, turn_guest) => {
    enterBattlePhase();
    async function battle() {
        var result;
        for (var i = 0; i < 3; i++) {
            result = await calcTurnResult(turn_host[i], turn_guest[i]);
            console.log('in battle, ', i, result);
            await sleep(1000);
            if (result != -1) {
                console.log('res: ', result);
                break;
            }
        }
    }
    battle();
});

socket.on('win', (player) => {
    editLog(player + "Win!");
});

socket.on('draw', () => {
    editLog("Draw!");
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

async function calcTurnResult(p1Action, p2Action) {
    console.log('in calcTurnResult, ', p1Action, p2Action);
    var p1Priority = getPriority(p1Action);
    var p2Priority = getPriority(p2Action);
    var p1Val, p2Val;
    if (p1Priority > p2Priority) { // Player1 action first (Player2 attack)
        console.log('CASE 1');
        p1Val = player1.action(p1Action);
        await sleep(1000);
        p2Val = player2.action(p2Action, p1Val);
        await sleep(1000);
        if (p2Val <= 0) {
            socket.emit('win', 'p2');
            return 2;
        } else {
            return -1;
        }
    } else if (p1Priority == p2Priority) {
        console.log('CASE 2');
        p1Val = player1.action(p1Action);
        await sleep(1000);
        p2Val = player2.action(p2Action);
        await sleep(1000);
        if ((p1Val <= 0) && (p2Val > 0)) {
            console.log('CASE 3');
            socket.emit('win', 'p2');
            return 2;
        } else if ((p1Val > 0) && (p2Val <= 0)) {
            socket.emit('win', 'p1');
            return 1;
        } else if ((p1Val < 0) && (p2Val < 0)) {
            socket.emit('draw');
            return 0;
        } else {
            console.log('CASE 4');
            return -1;
        } // need draw when attack
    } else {
        console.log('CASE 5');
        p2Val = player2.action(p2Action);
        await sleep(1000);
        p1Val = player1.action(p1Action, p2Val);
        await sleep(1000);
        if (p1Val <= 0) {
            socket.emit('win', 'p1');
            return 1;
        } else {
            return -1;
        }
    }
}

function resizeCanvas() {
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
    console.info("canvas resized to w : ", canvas.width, ", h : ", canvas.height);
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

function enterSelectPhase() {
    initGauge(gaugeWidth, gaugeHeight);
    initPlayerInfo(gaugeWidth);

    canvas.getObjects().forEach((obj) => {
        try {
            if (obj.objType == 'character') {
                canvas.remove(obj);
            } else if (obj.objType == 'field') {
                obj.set({
                    stroke: ''
                });
            }
        } catch (e) {
            console.error("[ERROR] Something went wrong : Failed to enter select phase.");
        }
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
}

function enterBattlePhase() {
    canvas.getObjects().forEach((obj) => {
        try {
            if (obj.objType == 'field') {} else if ((obj._objects[0].objType == 'card') || (obj._objects[0].objType == 'turnList') || (obj._objects[0].objType == 'button')) {
                canvas.remove(obj);
            }
        } catch (e) {
            console.error("[ERROR] Something went wrong : Failed to enter battle phase.");
        }
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
            top: _width / 8,
        }),
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
            top: _width / 8,
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
        selected: 0
    })
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
    } else if (nextTurn.length < 3) {
        e.target.selected = 1
        nextTurn.push(e.target);
        refreshTurnCards(nextTurn);
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