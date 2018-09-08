<?php
include_once('functions.php');

session_start();

if (!checkSession()){
    header('Location: login.php');
    die();
}