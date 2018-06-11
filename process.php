<?php

if (isset($_POST['action'])) {
    $action = $_POST['action'];
} else {
    $action = "none";
}

switch ($action){
    case "get-all-apps":
        getAllApps();
        break;
    case "get-all-tags":
        getAllTags();
        break;
    case "get-app":
        getApp();
        break;
    case "save-app":
        saveApp();
        break;
    case "rename-app":
        renameApp();
        break;
    case "save-json":
        saveJSON();
        break;
    default:
        break;
}

if (isset($_FILES["file"])){
    $f = $_FILES["file"];
    $file = $f["name"];

    $target_dir = "upload/";
    $target_file = $target_dir . basename($file) . "---" . time();
    $uploadOk = 1;
    $imageFileType = strtolower(pathinfo($target_file,PATHINFO_EXTENSION));

//    if(isset($_POST["submit"])) {
//        $check = getimagesize($_FILES["fileToUpload"]["tmp_name"]);
//        if($check !== false) {
//            echo "File is an image - " . $check["mime"] . ".";
//            $uploadOk = 1;
//        } else {
//            echo "File is not an image.";
//            $uploadOk = 0;
//        }
//    }
// Check if file already exists
    if (file_exists($target_file)) {
        echo "Sorry, file already exists.";
        $uploadOk = 0;
    }
// Check file size
//    if ($_FILES["fileToUpload"]["size"] > 500000) {
//        echo "Sorry, your file is too large.";
//        $uploadOk = 0;
//    }
// Allow certain file formats
//    if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg"
//        && $imageFileType != "gif" ) {
//        echo "Sorry, only JPG, JPEG, PNG & GIF files are allowed.";
//        $uploadOk = 0;
//    }
// Check if $uploadOk is set to 0 by an error
    if ($uploadOk == 0) {
        echo "Sorry, your file was not uploaded.";
// if everything is ok, try to upload file
    } else {
        if (move_uploaded_file($f["tmp_name"], $target_file)) {
            echo "The file ". basename( $f["name"]). " has been uploaded.";
        } else {
            echo "Sorry, there was an error uploading your file.";
        }
    }
}

function getAllApps(){
    $path = "./data/";
    $files = scandir($path);
    $res = [];
    foreach ($files as $f) {
        if ($f != "." && $f != ".." && $f != ".gitignore" && $f != "tag"){
            array_push($res, $f);
        }
    }

    sort($res);

    echo json_encode($res);
}

function getAllTags(){
    $path = "./data/tag/";
    $files = scandir($path);
    $res = [];
    foreach ($files as $f) {
        if ($f != "." && $f != ".." && $f != ".gitignore"){
            array_push($res, $f);
        }
    }

    sort($res);

    echo json_encode($res);
}

function getApp(){
    $name = $_POST['name'];
    $type = $_POST['type'];

    if ($type == "app"){
        $path = "./data/";
    } else {
        $path = "./data/tag/";
    }

    $myFile = fopen($path . $name, "r") or die("Unable to open file!");
    if ($myFile) {
        $content = fread($myFile, filesize($path . $name));
        fclose($myFile);
        echo $content;
    } else {
        echo "fail";
    }
}

function saveApp(){
    $data = $_POST['data'];
    $type = $_POST['type'];
    $time = time();

    if (isset($_POST['name'])){
        $fileName = $_POST['name'];
    } else {
        $fileName = "--" . $time;
    }

    if ($type == "app"){
        $path = "./data/" . $fileName;
    } else {
        $path = "./data/tag/" . $fileName;
    }

    $myFile = fopen($path, "wr") or die("fail");
    fwrite($myFile, $data);
    fclose($myFile);

    echo $time;

}

function renameApp(){
    $oldName = $_POST['oldName'];
    $newName = $_POST['newName'];
    $type = $_POST['type'];

    if ($type == "app"){
        $path = "./data/";
    } else {
        $path = "./data/tag/";
    }

    rename($path . $oldName, $path . $newName);
}

function saveJSON(){
    $data = $_POST['data'];
    $time = time();

    $myFile = fopen("./jsonviewer/data/" . $time, "wr") or die("fail");
    fwrite($myFile, $data);
    fclose($myFile);

    echo $time;
}