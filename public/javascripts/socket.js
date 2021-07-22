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
    $('#roomModal').fadeIn();
});

$('#createRoomInfo button').click(() => {
    var roomTitle = $('#createRoomInfo input').val();
    socket.emit('createRoom', id, roomTitle);
    $('#createRoomInfo').hide();
    $('#waitingRoom').show();
});

$('#waitingRoom button').click(() => {
    $('#roomModal').fadeOut();
    $('#game_lobby').hide();
});

$('#lobby_table button').click((e) => {
    var roomNum = Number($(e.target).parent().siblings('.roomNum').text());
    var playersCnt = $(e.target).parent().siblings('.roomPlayers').text().split('/')[0];
    if (playersCnt == '1') {
        socket.emit('joinRoom', id, roomNum);
    } else if (playersCnt == '2') {
        alert("The room already has been full!!");
    }
});

var trNum = 1;
socket.on('createRoom', (host, roomNum, roomTitle, clientsNum) => {
    $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(0)').html(roomNum);
    $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(1)').html(roomTitle);
    $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(2)').html(clientsNum + '/2');
    $('#lobby_table tr:eq(' + trNum + ')>' + 'td:eq(3)').html('Waiting');
    trNum++;
    if (trNum > 5) {
        $('#lobby_table table').append(`<tr>
        <td class = "roomNum"></td>
        <td class = "roomTitle"></td>
        <td class = "roomPlayers"></td>
        <td class = "roomStatus"></td>
        <td><button>JoinRoom</button></td>
      </tr>`)
    }
});

socket.on('joinRoom', (roomNum, clientsNum) => {
    $('#lobby_table .roomNum').each((index, item) => {
        if ($(item).html() == roomNum) {
            $(item).siblings('.roomPlayers').html(clientsNum + '/2');
            return false; //each문 내에서 break의 기능 수행       
        }
    });
});