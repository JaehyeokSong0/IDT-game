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
    $(".modal button").click(() => {
        $(".modal").fadeOut();
    });
});

$('#createRoom button').click(()=> {
    var roomTitle = $('#createRoom input').val();
    socket.emit('createRoom', id,roomTitle);
});

socket.on('createRoom', (id, roomNum,roomTitle) => {
    console.log(id, 'created ', roomNum);
    //TEST CODE
    $('#lobby_table td:eq(0)').html(roomNum);
    $('#lobby_table td:eq(1)').html(roomTitle);
});