function showAlert(msg){
    $("#alert").html(msg).css("top", 0);
    setTimeout(hideAlert, 2000);
}

function hideAlert(){
    $("#alert").html("").css("top", "");
}

function showConfirmation(msg, action){
    var $obj = $("#confirmation");
    $("#confirm-action").val(action);
    $obj.find(".dialog-content").html(msg);
    $obj.fadeIn();
}

function selectText(containerid) {
    if (document.selection) { // IE
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
}