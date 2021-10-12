export const socket = io();
export var id;

var roomFormNum = 5; // Number of room forms created

socket.on('checkId', (isValidId) => {
    if (isValidId) {
        $('#game_index').hide();
        $('#game_title').fadeOut();
        $('#game_lobby').show();
        socket.emit('refreshRoom');
    } else {
        $('#submitID_err_msg').html("The ID already exists! Please try with a different ID.");
    }
});

socket.on('createRoom', (rooms) => {
    refreshRoom(rooms);
});

socket.on('createdRoom', (roomInfo) => {
    refreshRoomInfo(roomInfo);
});

socket.on('joinRoom', (roomNum, clientsNum) => {
    $('#lobby_table .roomNum').each((index, item) => {
        if ($(item).html() == roomNum) {
            $(item).siblings('.roomPlayers').html(clientsNum + '/2');
            return false; // Break function in each statement
        }
    });
});

socket.on('joinedRoom', (roomInfo) => {
    refreshRoomInfo(roomInfo);
});

socket.on('refreshRoom', (rooms) => {
    refreshRoom(rooms);
});

socket.on('getReady', () => {
    $('#waitingRoom_host button').attr('disabled', false);
});

socket.on('guestExit', (roomInfo) => {
    $('#waitingRoom_host button').attr('disabled', true);
    refreshRoomInfo(roomInfo);
});

socket.on('changeHost', (roomInfo) => {
    $('#waitingRoom_guest').hide();
    $('#waitingRoom_host').show();
    $('#waitingRoom_host button').attr('disabled', true);
    refreshRoomInfo(roomInfo);
});

socket.on('selectChar', (host, guest) => {
    $('#roomModal').hide();
    if (id == host) {
        $('#char_view').css('background-color', 'White');
    } else if (id == guest) {
        $('#char_view').css('background-color', 'DarkGrey');
    }
    $('#selectCharModal').show();
})

$('#nickname').keyup((event) => {
    if (event.keyCode == 13) {
        id = $('#nickname').val();
        socket.emit('createId', id);
    }
});

$('#submitID_btn').click(() => {
    id = $('#nickname').val();
    socket.emit('createId', id);
});

$('#createRoom_btn').click(() => {
    $('#game_lobby').hide();
    $('#roomModal').fadeIn();
    $('#createRoomInfo').show();
});

$('#createRoomInfo button').click(() => {
    var roomTitle = $('#createRoomInfo input').val();
    if (verifyTitle(roomTitle)) {
        socket.emit('createRoom', id, roomTitle);
        $('#createRoomInfo').hide();
        $('#waitingRoom_host').show();
    }
});

$('#waitingRoom_host button').click(() => {
    socket.emit('selectChar');
});

$('#waitingRoom_guest button').click(() => {
    $('#waitingRoom_guest button').css('background', 'grey');
    $('#waitingRoom_guest button').css('color', 'white');
    socket.emit('getReady');
});

$('#exit_btn').click(() => {
    $('#waitingRoom_host button').attr('disabled', true);
    $('#waitingRoom_host').hide();
    $('#waitingRoom_guest').hide();
    $('#waitingRoom_guest button').css('background', 'white');
    $('#waitingRoom_guest button').css('color', 'grey');
    $('#roomModal').hide();
    $('#game_lobby').show();
    socket.emit('leaveRoom', id);
    clearRoomInfo();
});

$('#lobby_table button').click((e) => {
    var roomNum = Number($(e.target).parent().siblings('.roomNum').text());
    var playersCnt = $(e.target).parent().siblings('.roomPlayers').text().split('/')[0];
    var roomStatus = $(e.target).parent().siblings('.roomStatus').text();
    if (playersCnt == '1') {
        socket.emit('joinRoom', id, roomNum);
        $('#roomModal').fadeIn();
        $('#createRoomInfo').hide();
        $('#waitingRoom_guest').show();
        $('#game_lobby').hide();
    } else if (playersCnt == '2') {
        if (roomStatus == 'Gaming') {
            alert("This room is already playing a game.");
        } else {
            alert("The room already has been full!!");
        }
    }
});

$('#char_shift_left').click(() => {
    shiftChar('left');
});

$('#char_shift_right').click(() => {
    shiftChar('right');
});

$('#char_choice').click(() => {
    socket.emit('startGame', id, $('#char_name').html());
    $('#char_choice').attr('disabled', true);
    $('#char_shift_left').attr('disabled', true);
    $('#char_shift_right').attr('disabled', true);
});

// Verify condition of roomTitle
function verifyTitle(roomTitle) {
    const regex = /^[a-z|A-Z|0-9]+$/;
    if (regex.test(roomTitle)) {
        if (roomTitle.length <= 10) {
            return true;
        } else {
            alert("Please create a title within 10 characters.");
        }
    } else {
        alert("Please create a room with only english and numbers. Blank and special characters cannot be used.");
    }
    return false;
}

function refreshRoom(rooms) {
    var roomsLen = rooms.length;
    if (roomsLen == 0) {
        $('#lobby_table tr:eq(1)> td:eq(0)').html('');
        $('#lobby_table tr:eq(1)> td:eq(1)').html('');
        $('#lobby_table tr:eq(1)> td:eq(2)').html('');
        $('#lobby_table tr:eq(1)> td:eq(3)').html('');
        $('#lobby_table tr:eq(1) button').attr('disabled', true);
    } else {
        var trNum = 0;
        for (trNum = 0; trNum < roomsLen; trNum++) {
            if (roomFormNum <= roomsLen) {
                $('#lobby_table table').append(`<tr>
        <td class = "roomNum"></td>
        <td class = "roomTitle"></td>
        <td class = "roomPlayers"></td>
        <td class = "roomStatus"></td>
        <td><button disabled>Join</button></td>
      </tr>`);
                roomFormNum += 1;
            }
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(0)').html(rooms[trNum][0]);
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(1)').html(rooms[trNum][1]);
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(2)').html(rooms[trNum][4] + '/2');
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(3)').html(rooms[trNum][5]);
            $('#lobby_table tr:eq(' + (trNum + 1) + ') button').attr('disabled', false);
        }
        if (roomFormNum > 5) {
            while (roomFormNum > roomsLen + 1) {
                $('#lobby_table table tr:last').remove();
                roomFormNum -= 1;
            }
        }
    }
    deleteRoomForm(roomsLen);
}

// Remove the lowermost room.
function deleteRoomForm(roomsLen) {
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(0)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(1)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(2)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(3)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ') button').attr('disabled', true);
}

export function clearRoomInfo() {
    $('#roomNumInfo').html('');
    $('#roomTitleInfo').html('');
    $('#hostInfo').html('');
    $('#guestInfo').html('');
    $('#createRoomInfo input').val('');
}

function refreshRoomInfo(roomInfo) {
    $('#roomNumInfo').html(roomInfo[0]);
    $('#roomTitleInfo').html(roomInfo[1]);
    $('#hostInfo').html(roomInfo[2]);
    $('#guestInfo').html(roomInfo[3]);
}

function shiftChar(dir) {
    const _char = ['LightCoral', 'Tan', 'SteelBlue', 'Plum'];
    var _idx = _char.indexOf($('#char_name').html());
    if (dir == 'left') {
        if (_idx == 0) {
            _idx = 3;
        } else {
            _idx--;
        }
        $('#char_view').css('border', '0.5rem solid ' + _char[_idx]);
        $('#char_name').html(_char[_idx]);
    } else if (dir == 'right') {
        if (_idx == 3) {
            _idx = 0;
        } else {
            _idx++;
        }
        $('#char_view').css('border', '0.5rem solid ' + _char[_idx]);
        $('#char_name').html(_char[_idx]);
    }
}