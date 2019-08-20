<?php
session_start();

include_once('functions.php');

if (isset($_POST['username']) && isset($_POST['runame']) && isset($_POST['scope']) ){
    oAuthSignIn($_POST['username'], $_POST['runame'], $_POST['scope']);
}

if (isset($_GET['code'])){
    getUserAccessToken($_GET['code']);
    header('Location: index.php');
    die();
}
?>
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title>Ebay oAuth Sign in</title>
    <style>
        :focus{
            outline: none;
            border: solid 1px #38a6ff;
        }
        html, body{
            width: 100%;
            height: 100%;
        }
        body{
            background-color: #ddd;
        }
        form{
            background-color: white;
            border-radius: 15px;
            box-shadow: 0 0 5px 1px #aaa;
            padding: 20px;
            width: 50%;
            transform: translate(50%, 50%);
        }
        form div{
            margin: 10px 0;
        }
        form input{
            border: solid 1px gray;
            border-radius: 5px;
            display: block;
            margin: 10px 0;
            padding: 10px 20px;
            transition: all 0.5s;
            width: calc(100% - 40px);
        }
        form button{
            padding: 10px 20px;
            border: solid 1px transparent;
            border-radius: 5px;
            background-color: #0080ff;
            color: white;
            -webkit-box-shadow: 0 0 5px 3px #ddd;
            -moz-box-shadow: 0 0 5px 3px #ddd;
            box-shadow: 0 0 5px 3px #ddd;
        }
    </style>
</head>
<body>
    <form method="post" action="">
        <div>
            <label for="username">Client ID</label>
            <input type="text" id="username" name="username" placeholder="Client ID"/>
        </div>
        <div>
            <label for="runame">Ru Name</label>
            <input type="text" id="runame" name="runame" placeholder="RU Name"/>
        </div>
        <div>
            <label for="scope">OAuth Scope</label>
            <input type="text" id="scope" name="scope" placeholder="OAuth Scope" value="https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.order.readonly https://api.ebay.com/oauth/api_scope/buy.guest.order https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly https://api.ebay.com/oauth/api_scope/buy.shopping.cart"/>
        </div>
        <div>
            <button type="submit">Confirm</button>
        </div>
    </form>
</body>
</html>