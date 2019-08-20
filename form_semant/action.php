<?php

$action = $_POST['action'];

switch ($action){
    case 'add-vendor':
        addVendor();
        break;
    case 'add-influencer':
        addInfluencer();
        break;
    default:
        break;
}

function addVendor(){
    $data = $_POST['data'];
    $myFile = fopen("./data/vendors.json", "r") or die("Unable to open file!");
    if ($myFile) {
        $content = fread($myFile, filesize("./data/vendors.json"));
        fclose($myFile);
        $vendors = json_decode($content);
        array_push($vendors, $data);
        $myFile = fopen("./data/vendors.json", "wr") or die("Unable to open file!");
        fwrite($myFile, json_encode($vendors));
        fclose($myFile);
        echo "success";
    } else {
        echo "fail";
    }

}

function addInfluencer(){
    $data = $_POST['data'];
    $myFile = fopen("./data/influencers.json", "r") or die("Unable to open file!");
    if ($myFile) {
        $content = fread($myFile, filesize("./data/influencers.json"));
        fclose($myFile);
        $people = json_decode($content);
        array_push($people, $data);
        $myFile = fopen("./data/influencers.json", "wr") or die("Unable to open file!");
        fwrite($myFile, json_encode($people));
        fclose($myFile);
        echo "success";
    } else {
        echo "fail";
    }

}