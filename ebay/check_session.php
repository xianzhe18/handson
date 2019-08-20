<?php
session_start();

include_once('functions.php');

if (!checkSession()){
    header('Location: login.php');
    die();
}