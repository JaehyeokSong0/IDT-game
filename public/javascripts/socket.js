const socket = io();
var id;

$('#start_btn').click(() => {
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

// verify condition of roomTitle
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

$('#waitingRoom_host button').click(() => {
    $('#roomModal').fadeOut();
});

$('#waitingRoom_guest button').click(() => {
    socket.emit('getReady');
});

$('#exit_btn').click(() => {
    $('#waitingRoom_host').hide();
    $('#waitingRoom_guest').hide();
    $('#roomModal').hide();
    $('#game_lobby').show();
    socket.emit('leaveRoom', id);
    refreshRoomInfo();
});

$('#lobby_table button').click((e) => {
    var roomNum = Number($(e.target).parent().siblings('.roomNum').text());
    var playersCnt = $(e.target).parent().siblings('.roomPlayers').text().split('/')[0];
    if (playersCnt == '1') {
        socket.emit('joinRoom', id, roomNum);
        $('#roomModal').fadeIn();
        $('#createRoomInfo').hide();
        $('#waitingRoom_guest').show();
        $('#game_lobby').hide();
    } else if (playersCnt == '2') {
        alert("The room already has been full!!");
    }
});

socket.on('checkId', (isValidId) => {
    if (isValidId) {
        alert("Successfully created ID!");
        $('#game_index').hide();
        $('body').css('backgroundColor', 'white');
        $('#game_lobby').show();
        socket.emit('refreshRoom');
    } else {
        alert("The ID already exists! Please try with a different ID.");
    }
});

socket.on('createRoom', (rooms) => {
    refreshRoom(rooms);
});
socket.on('createdRoom', (roomInfo) => {
    $('#roomNumInfo').html(roomInfo[0]);
    $('#roomTitleInfo').html(roomInfo[1]);
    $('#hostInfo').html(roomInfo[2]);
    $('#guestInfo').html(roomInfo[3]);
})
socket.on('joinRoom', (roomNum, clientsNum) => {
    $('#lobby_table .roomNum').each((index, item) => {
        if ($(item).html() == roomNum) {
            $(item).siblings('.roomPlayers').html(clientsNum + '/2');
            return false; //each문 내에서 break의 기능 수행       
        }
    });
});
socket.on('joinedRoom', (roomInfo) => {
    $('#roomNumInfo').html(roomInfo[0]);
    $('#roomTitleInfo').html(roomInfo[1]);
    $('#hostInfo').html(roomInfo[2]);
    $('#guestInfo').html(roomInfo[3]);
})
socket.on('refreshRoom', (rooms) => {
    refreshRoom(rooms);
});

socket.on('getReady', () => {
    $('#waitingRoom_host button').attr('disabled', false);
});

socket.on('guestExit', () => {
    $('#waitingRoom_host button').attr('disabled', true);
})

socket.on('changeHost', () => {
    $('#waitingRoom_guest').hide();
    $('#waitingRoom_host').show();
    $('#waitingRoom_host button').attr('disabled', true);
})

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
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(0)').html(rooms[trNum][0]);
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(1)').html(rooms[trNum][1]);
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(2)').html(rooms[trNum][4] + '/2');
            $('#lobby_table tr:eq(' + (trNum + 1) + ')>' + 'td:eq(3)').html('Waiting');
            $('#lobby_table tr:eq(' + (trNum + 1) + ') button').attr('disabled', false);
        }
        if (trNum > 4) {
            $('#lobby_table table').append(`<tr>
        <td class = "roomNum"></td>
        <td class = "roomTitle"></td>
        <td class = "roomPlayers"></td>
        <td class = "roomStatus"></td>
        <td><button disabled>JoinRoom</button></td>
      </tr>`)
        }
    }
    //Remove the lowermost room.
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(0)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(1)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(2)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ')> td:eq(3)').html('');
    $('#lobby_table tr:eq(' + (roomsLen + 1) + ') button').attr('disabled', true);
}

function refreshRoomInfo() {
    $('#roomNumInfo').html('');
    $('#roomTitleInfo').html('');
    $('#hostInfo').html('');
    $('#guestInfo').html('');
    $('#createRoomInfo input').val('');
}