const socket = io();
var id = 'tmp'; // TEST CODE

$('#start_btn').click(() => {
    var id = $('#nickname').val();
    // #중복체크 필요
    $('#game_index').hide();
    $('body').css('backgroundColor', 'white');
    $('#game_lobby').show();
});

$('#createRoom_btn').click(() => {
    $(".modal").fadeIn();
});

$('#createRoomInfo button').click(() => {
    var roomTitle = $('#createRoomInfo input').val();
    socket.emit('createRoom', id, roomTitle);
    $("#test").hide();
});

var trNum = 1;
socket.on('createRoom', (id, roomNum, roomTitle, clientsNum) => {
    //TEST CODE
    $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(0)').html(roomNum);
    $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(1)').html(roomTitle);
    $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(2)').html(clientsNum);
    if (clientsNum == 1) {
        $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(3)').html('Waiting');
    }
    trNum += 1;
    if (trNum > 4) {
        trNum = 1;
    }
});