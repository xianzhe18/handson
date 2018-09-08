<?php
/**
 * This function checks session
 * @return bool
 */
function checkSession(){
    return isset($_SESSION['auth']) && $_SESSION['auth'];
}

/******************************************\
*                                          *
\******************************************/


/**
 * This function signs user in by using oAuth
 * @param $clientID
 * @param $clientSecret
 * @return bool
 */
function oAuthSignIn($clientID, $clientSecret, $scope){
    $_SESSION['client-id'] = $clientID;
    $_SESSION['client-secret'] = $clientSecret;
    $authUrl = "https://signin.sandbox.ebay.com/authorize?client_id=$clientID&redirect_uri=$clientSecret&response_type=code&scope=$scope";

    header("Location: $authUrl");
    die();
}

function getUserAccessToken($code){
    $clientID = $_SESSION['client-id'];
    $clientSecret = $_SESSION['client-secret'];
    $authorization = 'Authorization = Basic ' . base64_encode("$clientID:$clientSecret");

    $header = 'Content-Type = application/x-www-form-urlencoded' . PHP_EOL . $authorization;

    $requestBody = array(
        "grant_type" => "authorization_code",
        "code" => $code,
        "redirect_uri" => "Xianzhe_Wang-XianzheW-Develo-xccjod"
    );
    $authUrl = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

    $ch = curl_init($authUrl);
    curl_setopt($ch, CURLOPT_HEADER, $header);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS,
        http_build_query($requestBody));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    $output = curl_exec($ch);
    $contents = json_decode($output);
    curl_close($ch);

    echo curl_error($ch);
    echo $contents;

    $_SESSION['auth'] = true;
    $_SESSION['access-token'] = $contents['access_token'];
    $_SESSION['expires-in'] = $contents['expires_in'];
    $_SESSION['expires-from'] = time();
    $_SESSION['refresh-token'] = $contents['refresh_token'];
    die();
}