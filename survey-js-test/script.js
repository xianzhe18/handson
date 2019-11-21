

var fileJSON = {
 "pages": [
  {
   "name": "page3",
   "elements": [
    {
     "type": "file",
     "title": "Select file",
     "name": "file_upload",
     "maxSize": 10240000,
     "isRequired": true
    },
    {
     "type": "text",
     "name": "coordinate1",
     "title": "Coordinate 1"
    },
    {
     "type": "text",
     "name": "coordinate2",
     "title": "Coordinate 2"
    }
   ]
  }
 ],
 "cookieName": "qj_fileupload",
 "completeText": "Done",
 "cancelText": "Cancel"

};

var survey_data = {file_upload: "", coordinate1: "", coordinate2: ""};
var red_box = {left: "", top: "", right: "", bottom: "", flag: 0 };
var back_file_name = "";

Survey.Survey.cssType = "bootstrap";

var fileSurvey = new Survey.Model(fileJSON );
fileSurvey.render("surveyContainer");


$(document).ready(function() {
  $("#surveyContainer").Survey({
    model: fileSurvey,
    onComplete: getBackgroundInfo
  });

  $("#back_btn").on("click", display_survey_modal );
  //$("body").on("click", change_red_box );

  $(document).on("click", "img", change_red_box );
});

function change_red_box(e){
  //if (e.target.className != "main_wrap" && e.target.className != "red_box" ) return;
  var offset = $("#surveyContainer img").offset();
  var page_x = e.pageX;
  var page_y = e.pageY;

  var pos_x = page_x - offset.left;
  var pos_y = page_y - offset.top;
  pos_x = parseInt(pos_x );
  pos_y = parseInt(pos_y );

  if (red_box.flag == 0 || red_box.flag == 2){  // for the first 
    red_box.left = pos_x;
    red_box.top = pos_y;
    red_box.right = "";
    red_box.bottom = "";
    red_box.flag = 1;

  }else if(red_box.flag == 1){  // for the second 
    var tmp_x = red_box.left;
    var tmp_y = red_box.top;

    red_box.left = red_box.left > pos_x ? pos_x : red_box.left;
    red_box.top = red_box.top > pos_y ? pos_y : red_box.top;
    red_box.right = tmp_x > pos_x ?  tmp_x : pos_x;
    red_box.bottom = tmp_y > pos_y ?  tmp_y : pos_y;

    red_box.flag = 2;
  }
  update_red_box();
}

function update_red_box(){
  var width = red_box.flag == 2 ? red_box.right - red_box.left : 0;
  var height = red_box.flag == 2 ? red_box.bottom - red_box.top : 0;

  var parent = $("#surveyContainer img" ).parent().parent();
  $(parent).css("position", "relative").css("display", "block");
  $(".modal_red_box").remove();

  var red_box_wrap = $("<div>")
          .attr("class", "modal_red_box")
          .attr("style", "position: absolute; display:block;background: rgba(255,0,0,0.4);")
          .appendTo($(parent ));

  $(red_box_wrap).css("left", red_box.left + "px" );
  $(red_box_wrap).css("top", red_box.top + "px" );
  $(red_box_wrap).css("width", width + "px" );
  $(red_box_wrap).css("height", height + "px" );

  $(red_box_wrap).css("display", red_box.flag == 2 ? "block" : "none" );

  red_box.flag = red_box.flag == 2 ? 0 : red_box.flag;

  survey_data.coordinate1 = !red_box.top || red_box.top == "" ? "" : red_box.left + "," + red_box.top;
  survey_data.coordinate2 = !red_box.bottom || red_box.bottom == ""? "" : red_box.right + "," + red_box.bottom;

  $("#sq_101i").val(survey_data.coordinate1 );
  $("#sq_102i").val(survey_data.coordinate2 );
}

function display_back_info(){
  survey_data.coordinate1 = !red_box.top || red_box.top == "" ? "" : red_box.left + "," + red_box.top;
  survey_data.coordinate2 = !red_box.bottom || red_box.bottom == ""? "" : red_box.right + "," + red_box.bottom;

  var coord1_str = '"coordinate 1": "' + survey_data.coordinate1 + '"';
  var coord2_str = '"coordinate 2": "' + survey_data.coordinate2 + '"';
  var back_info = '{"background": "' + back_file_name + '",';
  back_info += coord1_str + "," + coord2_str +"}";

  $("#img_name").val(back_info );
}

function display_survey_modal() {

  fileSurvey.clear();
  fileSurvey.data = survey_data;

  $(".sv_cancel_btn").remove();
  $("<input>").attr("type", "button")
    .attr("class", "btn sv_cancel_btn")
    .val("Cancel")
    .css("background", "#808080")
    .on("click", function(){
      $("#surveyModal").modal('hide'); 
    })
    .appendTo($("#surveyContainer .panel-footer"));

  update_red_box();
  $("#surveyModal").modal('show'); 
}

function getBackgroundInfo(surv) {
  survey_data = surv.data;
  survey_data.coordinate1 = !red_box.top || red_box.top == "" ? "" : red_box.left + "," + red_box.top;
  survey_data.coordinate2 = !red_box.bottom || red_box.bottom == ""? "" : red_box.right + "," + red_box.bottom;
    
  var file_data = surv.data.file_upload.length > 0 ? surv.data.file_upload[0] : "";

  back_file_name = file_data != "" ? file_data["name"] : "";
  var file_type = file_data != "" ? file_data["type"] : "";
  var file_content = file_data != "" ? file_data["content"] : "";

  var coord1 = surv.data.coordinate1 ? surv.data.coordinate1 : "";
  var coord2 = surv.data.coordinate2 ? surv.data.coordinate2 : "";

  coord1 = coord1.split(",");
  coord2 = coord2.split(",");

  red_box = { left: red_box.left ? red_box.left : coord1[0], 
              top: red_box.top ? red_box.top : coord1[1], 
              right: red_box.right ? red_box.right : coord2[0], 
              bottom: red_box.bottom ? red_box.bottom : coord2[1], 
              flag: 2 };

  //$("#img_file_obj").css("display", file_data != "" ? "block" : "hidden" );
  //$("#img_file_obj").prop("src", file_content );

  display_back_info();
  $("#surveyModal").modal('hide');
}