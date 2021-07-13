const socket = io();

$('#start_btn').click(() => {
    var id = $('#nickname').val();
    // #중복체크 필요
    $('#game_index').hide();
    socket.emit('joinLobby', id);
});

socket.on('joinLobby',(id)=> {
    console.log(id, 'joined Lobby');
})