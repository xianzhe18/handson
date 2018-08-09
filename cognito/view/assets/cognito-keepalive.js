window.Cognito = window.Cognito || {};

(function ($, cognito) {
    var _debug = false;
	function getDate() {
		if (Cognito.now) {
			return Cognito.now();
		}

		return new Date();
	}

    var _messagingEvent = "keepalive-event";
    var interval;

    var KeepAlive = function (options) {
		this._options = $.extend({}, KeepAlive.defaults, options);

		this._cookieRegex = new RegExp("(?:(?:^|.*;)\\s*" + this._options.sessionCookieName.replace(".", "\.") + "\\s*\\=\\s*([^;]*).*$)|^.*$");
		this._lastActive = getDate();
		this._lastKeepalive = getDate();

		this._warningVisible = false;

        $(document).on(this._options.keepaliveEvents, this.userActive.bind(this));
        $(document).on(this._options.keepaliveEvents, this.publishActivity.bind(this));
        Cognito.Messaging.addHandler(_messagingEvent, this.userActive.bind(this));

        // Wait for message to start
        _debug && console.log("constructing keepalive on", window.location.href);
        if (window.name === "c-content")
            this._start();
	};

	KeepAlive.defaults = {
		keepaliveEvents: "click",
		logoutUrl: "/logout",
		logoutFn: null,
		sessionCookieName: "",
		renewalThreshold: 15, // Renewal threshold in minutes
		heartbeat: 60000,
		keepaliveUrl: "",
		warningDiv: null,
		keepaliveMessage: "Your session is about to expire due to inactivity.  Click anywhere on this screen to restore."
	};

    var _sendingKeepalive = false;
	KeepAlive.prototype = {
        _start: function () {
            _debug && console.log("starting keepalive on", window.location.href);
            window.clearInterval(interval);
            interval = window.setInterval(this.heartbeat.bind(this), this._options.heartbeat);
        },
        _isRunning: function () {
            return !!interval;
        },
		_sendKeepalive: function () {
            if (this._options.keepaliveUrl !== "") {
                if (!_sendingKeepalive) {
                    var _this = this;
                    _sendingKeepalive = true;
                    Cognito.serviceRequest({
                        endpoint: this._options.keepaliveUrl,
                        success: function logout$success() {
                            _sendingKeepalive = false;
                        },
                        error: function () {
                            _this._logout();
                        }
                    });
                    this._lastKeepalive = getDate();
                }
			}
		},

		_logout: function() {
            $(window).off("beforeunload"); // Remove any possible existing handlers
            if (this._options.logoutFn && this._options.logoutFn instanceof Function) this._options.logoutFn();
            if (this._options.logoutUrl !== "") document.location.href = this._options.logoutUrl;
		},
		
		userActive: function() {
            _debug && console.log("user active:", window.location.href);
			this._lastActive = new Date();
		},

        publishActivity: function () {
            Cognito.Messaging.trigger(_messagingEvent);
        },

		heartbeat: function () {
            //console.log("heartbeat...");
			// Load session cookie and pull timeout
			var cookie = document.cookie.replace(this._cookieRegex, "$1");

			// If no cookie found, the session has expired
			if (!cookie) {
				this._logout();
				return;
			}

			var now = getDate();
			var sessionArgs = cookie.split("|");
			var sessionExpiration = sessionArgs.length === 2 ? new Date(sessionArgs[1]) : (getDate()).addHours(1);

			// Ensure that the session did not expire even if the cookie did not
			if (sessionExpiration <= now) {
				this._logout();
				return;
			}

			// Are we within the renewal threshold?
            var threshold = (sessionExpiration.getTime() - now.getTime()) / 1000 / 60;
            //console.log("current threshold:", threshold, "expires:", sessionExpiration, )
            //console.log("renewal threshold:", this._options.renewalThreshold);
            if (threshold <= this._options.renewalThreshold) {
                //console.log("last active:", this._lastActive, "last keepalive:", this._lastKeepalive);
				// Has the user been active?
				if (this._lastActive > this._lastKeepalive) {
					this._sendKeepalive();
				}
				// Otherwise, display the warning if it isn't already up
				else if (!this._warningVisible) {
					this.showWarning();
				}
			}
		},
		
		showWarning: function() {
			if (this._options.warningDiv === null) {
				this._options.warningDiv = $("<div class='c-session-timeout-overlay'></div><div class='c-session-timeout-modal'><div class='c-modal-title-bar'><div class='c-modal-title'>Timeout Warning</div></div><div class='c-modal-content-container'><div class='c-modal-content'><p>" + this._options.keepaliveMessage + "</p></div></div></div>").appendTo(document.body);
			}

			this._options.warningDiv.show();

			$(document)
				.off(this._options.keepaliveEvents, this.userActive)
				.on("click", this.hideWarning.bind(this));

			this._warningVisible = true;
		},
		
        hideWarning: function (e) {
            e && e.stopPropagation && e.stopPropagation();

			this._warningVisible = false;
			this._options.warningDiv.hide();
			this._lastActive = getDate();

			this._sendKeepalive();
			
			$(document).on(this._options.keepaliveEvents, this.userActive.bind(this));		
		},
		
		get_warningVisible: function() {
			return this._warningVisible;
		}
	};

	cognito.keepalive = function (options) {
		var data = arguments.callee._KeepAliveInstance;

		if (!data) data = arguments.callee._KeepAliveInstance = new KeepAlive(options);

		return data;
	};
})(jQuery || $ || window.ExoJQuery, window.Cognito);