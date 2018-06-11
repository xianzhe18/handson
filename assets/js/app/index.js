var $targetButton;
var fileUpload = true;

window.addEventListener("message", parentMessageHandler, false);

$(document).ready(function(){
    $.ajax({
        url: "process.php",
        type: "POST",
        data: {
            "action": "get-all-apps"
        },
        success: function(res){
            var files = $.parseJSON(res);
            for (var i = 0; i < files.length; i ++){
                addAppButton(files[i]);
            }
        }
    });

    $.ajax({
        url: "process.php",
        type: "POST",
        data: {
            "action": "get-all-tags"
        },
        success: function(res){
            var files = $.parseJSON(res);
            for (var i = 0; i < files.length; i ++){
                addTagButton(files[i]);
            }
        }
    });

    $('.dropzone').dropper({
        action: "process.php"
    }).on({
        "start.dropper": function(e, files){

        },
        "fileComplete.dropper": function(e, file, response){
            var $objs = $(e.target).find(".upload-check");
            $(e.target).append($("<div></div>", {
                class: "upload-check",
                html: "&#10004;"
            }).css({
                left: $objs.length * 30
            }));
            showConfirmation("The file '" + file.name + "' received and still accept more files.", "accept-more-files");
        }
    }).find(".button").on("click", function(){
        $(this).parent().find(".dropper-dropzone").click();
    });

    window.addEventListener("dragover",function(e){
        e = e || event;
        e.preventDefault();
    },false);
    window.addEventListener("drop",function(e){
        e = e || event;
        e.preventDefault();
    },false);

    $("#plus-button").on("click", function(){
        loadIframe("app");
    });

    $("#plus-tag-button").on("click", function(){
        loadIframe("tag");
    });

    $("#confirm").on("click", function(){
        var action = $("#confirm-action").val();
        switch (action){
            case "accept-more-files":
                $("#confirmation").fadeOut();
                break;
        }
    });

    $(".dialog-close").on("click", function(){
        $($(this).attr('dismiss')).fadeOut();
        $("body").css("overflow", "auto");
    });

    $("#save-confirm").on("click", function(){
        var newName = $("#save-file-name").val().trim();
        var oldName;

        if (!/^[a-zA-Z]+$/.test(newName)){
            $(".dialog-message").show();
            return;
        }

        if ($targetButton.data("renamed")){
            oldName = $targetButton.text() + "--" + $targetButton.data("time");
        } else {
            oldName = "--" + $targetButton.data("time");
        }

        $.ajax({
            url: "process.php",
            type: "POST",
            data: {
                action: "rename-app",
                oldName: oldName,
                newName: newName + "--" + $targetButton.data("time"),
                type: $targetButton.data("type")
            },
            success: function(){
                $targetButton.text(newName).data("renamed", true);
                $("#change-name").fadeOut();
                $("#save-file-name").val("");
            }
        });
    });

    $("#save-file-name").on("keyup", function(){
        if (!/^[a-zA-Z]+$/.test($(this).val())){
            $(".dialog-message").show();
        } else {
            $(".dialog-message").hide();
        }
    });

    $("#alert").on("click", function(){
        setTimeout(hideAlert, 300);
    });

    $("#show-json-frame").on("click", function(){
        var $obj = $("#json-frame");
        $obj.find("iframe").attr("src", window.location.href + "/jsonviewer");
        $obj.show();
    });

    $("#json-save-btn").on("click", function(){
        var data = $("#json-frame").find("iframe")[0].contentWindow.myData;
        if (data == "") return;
        $.ajax({
            url: "process.php",
            type: "POST",
            data: {
                action: "save-json",
                data: data
            },
            success: function(){
                var $obj = $("#json-frame");
                $obj.find("iframe").attr("src", "");
                $obj.hide();
                showAlert("JSON file saved successfully.");
            }
        });
    });

    $("#json-close-btn").on("click", function(){
        var $obj = $("#json-frame");
        $obj.find("iframe").attr("src", "");
        $obj.hide();
    });

    $(document).contextmenu({
        menu: [
            {title: "Rename", cmd: "rename", uiIcon: "ui-icon-copy"}
            //{title: "----"},
            //{title: "More", children: [
            //    {title: "Sub 1", cmd: "sub1"},
            //    {title: "Sub 2", cmd: "sub1"}
            //]}
        ],
        beforeOpen: function(event, ui){
            if ($(ui.target).hasClass("app-btn") || $(ui.target).hasClass("tag-btn")){
                $targetButton = $(ui.target);
            } else {
                return false;
            }
        },
        select: function(event, ui) {
            //alert("select " + ui.cmd + " on " + ui.target.text());
            switch (ui.cmd){
                case "rename":
                    $("#change-name").fadeIn();
                    $("body").css("overflow", "hidden");
                    break;
            }
        }
    });
});

function addAppButton(name){
    var text = name.split("--")[0].trim();

    $("<button></button>", {
        text: text==""?dateTimeConverter(name.split("--")[1]):text,
        class: "normal-btn app-btn"
    }).data({
        time: name.split("--")[1],
        renamed: text!="",
        type: "app"
    }).on({
        click: function(){
            var name;
            if ($(this).data("renamed")){
                name = $(this).text() + "--" + $(this).data("time");
            } else {
                name = "--" + $(this).data("time");
            }
            loadIframe("app", name, $(this).text());
        }
    }).appendTo("#app-buttons");
}

function addTagButton(name){
    var text = name.split("--")[0].trim();

    $("<button></button>", {
        text: text==""?"Tag " + timeConverter(name.split("--")[1]):text,
        class: "normal-btn tag-btn"
    }).data({
        time: name.split("--")[1],
        renamed: text!="",
        type: "tag"
    }).on({
        click: function(){
            var name;
            if ($(this).data("renamed")){
                name = $(this).text() + "--" + $(this).data("time");
            } else {
                name = "--" + $(this).data("time");
            }
            loadIframe("tag", name, $(this).text());
        }
    }).appendTo("#tag-buttons");
}

function loadIframe(type, name, text){
    if (name == undefined){
        name = "";
    }

    var iframeContainer = $("#iframe-container"), iframe = iframeContainer.find("iframe"), frameWin = iframe[0].contentWindow;
    iframe.attr("src", window.location.href + "/iframe/").off("load").on({
        load: function(){
            frameWin.postMessage({action: 'open', name: name, text: text, type: type}, '*');
        }
    });

    iframeContainer.fadeIn();
}

function parentMessageHandler(message){
    var action = message.data.action;
    var type = message.data.type;

    if (type == "app") {
        switch (action) {
            case "close-iframe":
                $("#iframe-container").fadeOut();
                if (!message.data.isChanged) {
                    break;
                }
                if (message.data.isNew) {
                    addAppButton("--" + message.data.time);
                }
                break;
        }
    } else if (type == "tag") {
        switch (action){
            case "close-iframe":
                $("#iframe-container").fadeOut();
                if (!message.data.isChanged) {
                    break;
                }
                if (message.data.isNew) {
                    addTagButton("--" + message.data.time);
                }
                break;
        }
    }
}

function dateTimeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);
    //var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = (a.getMonth() + 1).toString();
    month = month.length == 1? "0" + month: month;
    //var month = months[a.getMonth()];
    var date = a.getDate().toString();
    date = date.length == 1? "0" + date: date;
    var hour = a.getHours().toString();
    hour = hour.length == 1? "0" + hour: hour;
    var min = a.getMinutes().toString();
    min = min.length == 1? "0" + min: min;
    var sec = a.getSeconds().toString();
    sec = sec.length == 1? "0" + sec: sec;
    return year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec ;
}

function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);

    var hour = a.getHours().toString();
    hour = hour.length == 1? "0" + hour: hour;
    var min = a.getMinutes().toString();
    min = min.length == 1? "0" + min: min;
    var sec = a.getSeconds().toString();
    sec = sec.length == 1? "0" + sec: sec;
    return hour + min + sec ;
}