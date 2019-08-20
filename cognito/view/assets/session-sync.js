/**
    Document Events:
        receieved-session-token: cognito-core uses this to notify the current window that a new session token was received
    Cognito.Messaging Events:
        received-session-token: a server request came back with an updated session token, bubble up as needed to inform master frame
        update-session-token: broadcasted from master frame to ensure all frames update with the proper token
        ensure-session-cookie: used for subscribers to guarantee the cookie they reference is the correct one for the selected Organization (Chrome.js)
**/
(function ($) {
    var _isMasterFrame = (window.name === "c-content");
    var _debug = false;
    // only the master frame caches the session cookie
    var _sessionCookie = "";
    var _cookieName = "cognito.services.a";

    // When the server returns a new session token, ensure all frames become aware of the new token.
    // This is accomplished by sending the new token up to the c-content frame, then recursively distributing
    // the token to all frames on the page.
    //
    // Do not use window.top to prevent reliance on whatever is hosting cognito (Chrome.cshtml)
    $(function () {
        function updateSessionToken(token) {
            _debug && console.log("updating session token on", window.location.href);

            Cognito.config.sessionToken = token;

            $("iframe").each(function () {
                Cognito.Messaging.trigger("update-session-token", { data: { token: token }, target: this.contentWindow });
            });
        }
		
        function receiveSessionToken(token) {
            _debug && console.log("received session token on", window.location.href);
            if (_isMasterFrame) {
                // notify Chrome.js about token update
                Cognito.Messaging.trigger("update-session-token", { data: { token: token }, target: window.parent });

                // if the sessionToken was updated, make sure to re-cache the cookie itself
                _sessionCookie = Cookies.get(_cookieName);

                updateSessionToken(token);
            }
            else {
                Cognito.Messaging.trigger("receieved-session-token", { data: { token: token }, target: window.parent });
            }
        }

        Cognito.Messaging.addHandler("received-session-token", function (data) {
            receiveSessionToken(data.token);
        });

        Cognito.Messaging.addHandler("update-session-token", function (data) {
            updateSessionToken(data.token);
        });

        $(document).on("received-session-token", function (e) {
            receiveSessionToken(e.token);
        });
    });

    // When the browser window regains focus, ensure the correct cookie is set based on the locally cached session cookie.
    $(function () {
        var _unsubscribe = false;

        function windowFocused(e) {
            if (_unsubscribe)
                return;

            if (!_isMasterFrame) {
                // If in a lower frame, send the message up
                Cognito.Messaging.trigger("window-focused", { target: window.parent });
                return;
            }

            var cookie = Cookies.get(_cookieName);

            if (_sessionCookie && _sessionCookie !== cookie) {
                var sessionArgs = _sessionCookie.split("|");
                var sessionExpiration = sessionArgs.length === 2 ? new Date(sessionArgs[1]) : (new Date()).addHours(1);

                _debug && console.log("restoring cached cookie", window.location.href);
                Cookies.set("cognito.services.a", _sessionCookie, { expires: sessionExpiration });
            }

            // tell Chrome.js the cookie was updated
            Cognito.Messaging.trigger("ensure-session-cookie", { target: window.parent, data: { cookie: _sessionCookie } });
        }

        Cognito.Messaging.addHandler("window-focused", windowFocused);
        Cognito.Messaging.addHandler("changeOrganization", function (data) {
            // When changing orgs and redirecting, do not respond to window focus events because the cookie will be incorrectly switched. Just let the redirect happen
            if (data.redirect)
                _unsubscribe = true;
        });

        // when the page loads, cache cookie and send to Chrome.js
        $(function () {
            if (_isMasterFrame) {
                _sessionCookie = Cookies.get(_cookieName);
                Cognito.Messaging.trigger("ensure-session-cookie", { target: window.parent, data: { cookie: _sessionCookie, action: "set" } });
            }

            window.addEventListener("focus", windowFocused);
        });
    });
})(window.ExoJQuery, jQuery);