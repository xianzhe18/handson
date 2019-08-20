(function($) {

	// Create an overlay to hide the underlying page when displaying modal content
	var overlay;
	var onOverlayClick;

	Cognito.ready("append-overlay", "ExoWeb.dom", function ($) {
		overlay = $("#c-modal-overlay");
		if (overlay.length === 0) {
			var cognitoDiv = $('.cognito:first');
			overlay = $("<div id='c-modal-overlay' />").appendTo(cognitoDiv.length == 0 ? document.body : cognitoDiv);
		}
		overlay.click(function () { if (onOverlayClick) onOverlayClick(); });
	});

	// Broadcast token if coming from the login page
	Cognito.ready("broadcast-token", "ExoWeb.dom", function ($) {
		if (document.location.search && (document.location.search.indexOf("login") > -1 || document.location.search.indexOf("signup") > -1)) {
			Cognito.Messaging.trigger("broadcastToken", { data: Cognito.config.sessionToken });
		}

		$(document).on("click", '.c-button-progress:not([class*="c-status-"])', function () {
			$(this).addClass("c-status-working").prop("disabled", true);
		})
		.on("progress-finished", ".c-button-progress", function(e, status) {
			var $button = $(this);
			$button.removeClass("c-status-working");
			$button.addClass("c-status-" + status);
			setTimeout(function(){
				$button.removeClass("c-status-" + status).prop("disabled", false);
			}, 2500);
		});

	});

	// Shows the modal overlay
	function showOverlay(onClick) {
		onOverlayClick = onClick;
		Cognito.Messaging.trigger("showOverlay");
		overlay.fadeIn();
	}
	Cognito.showOverlay = showOverlay;

	// Hides the modal overlay
	function hideOverlay() {
		onOverlayClick = null;
		Cognito.Messaging.trigger("hideOverlay");
		overlay.fadeOut();
	}
	Cognito.hideOverlay = hideOverlay;

	Cognito.Messaging.addHandler("overlayClicked", function () { if (onOverlayClick) onOverlayClick(); });
	Cognito.Messaging.addHandler("navigate", function (data) {
		var navigate = function () {
			if (data.target === "top") {
				window.parent.location = data.url;
			}
			else {
				document.location.href = data.url;
			}
		};
		if (onNavigateDialog) {
			onNavigateDialog.continue = navigate;
			if (!onNavigateDialog.open(data))
				navigate();
		}
		else
			navigate();
	});

	// Formats value as currency
	function formatCurrency(val) {
		var valString = "$" + Cognito.formatNumber(Math.abs(val).toFixed(2));
		return val >= 0 ? valString : "(" + valString + ")";
	}
	Cognito.formatCurrency = formatCurrency;

	// Format number with thousands separators
	function formatNumber(val) {
		return val.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
	}
	Cognito.formatNumber = formatNumber;

	Cognito.Messaging.addHandler("changeOrganization", function(data) {
		Cognito.changeOrganization(data.id, function () {
			if (data.redirect) {
				document.location.href = data.redirect;
			}
		});
	});

	// Enable views to suppress/participate in navigation
	var onNavigateDialog;
	var blockNavigation;
	var forceNavigation;
	function onNavigate(options) {
		if (!onNavigateDialog) {
			onNavigateDialog = $.fn.dialog(options);
			onNavigateDialog._dialog.css("z-index", 1060);
		}

		blockNavigation = options.open;
		if (onNavigateDialog.open) {
			$(window).on("beforeunload", function (event) {
				if (blockNavigation(event) && !forceNavigation) {
					return options.text;
				}
			});
		}
	}
	Cognito.onNavigate = onNavigate;

	// Performs the specified navigation action if allowed
	Cognito.navigate = function navigate(action, force) {
		if (force) {
			forceNavigation = true;
			if (action)
				action();
		}
		else {
			if (onNavigateDialog) {
				onNavigateDialog.continue = function () {
					onNavigateDialog.close();
					if (action) action();
				};
				if (!onNavigateDialog.open(action) && action)
					action();
			}
			else if (action)
				action();
		}
	};

	var module;

	// Get current module
	Cognito.modelReady(function () {
		module = Cognito.config.modules[0];
	});

	Cognito.resendVerification = function() {
		Cognito.serviceRequest({
			endpoint: "admin/resend-verification",
			method: "POST"
		});
	};

	Cognito.createCredentials = function(username, password, success, error) {
		module.serviceRequest({
			endpoint: "credentials",
			method: "POST",
			data: { username: username, password: password },
			success: function(data) {
				if (success && success instanceof Function)
					success(data);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	};

	Cognito.updateCredentials = function(id, username, password, success, error) {
		module.serviceRequest({
			endpoint: "credentials",
			method: "PUT",
			data: { id: id, username: username, password: password },
			success: function() {
				if (success && success instanceof Function)
					success();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	};

	Cognito.deleteCredentials = function(id, success, error) {
		module.serviceRequest({
			endpoint: "credentials",
			method: "DELETE",
			data: { id: id },
			success: function() {
				if (success && success instanceof Function)
					success();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	};

	Cognito.showAnnouncement = function (selector, parentSelector) {
		Cognito.serviceRequest({
			endpoint: "marketing/announcement?module=forms",
			dataType: "html",
			success: function (data) {
				if (data.length === 0) {
					$(parentSelector).hide();
				} else {
					$(parentSelector).show();
					$(selector).attr("data-name", data.substring(4, data.indexOf('-->')));
					$(selector).html(data);
				}
			}
		});
	}

	Cognito.dismissAnnouncment = function(selector, parentSelector) {
		Cognito.serviceRequest({
			endpoint: "marketing/dismissannouncement?name=" + $(selector).attr("data-name"),
			success: function () {
				Cognito.showAnnouncement(selector, parentSelector);
			}
		});
	}

	Cognito.changeOrganization = function(id, callback) {
		Cognito.serviceRequest({
			endpoint: "admin/organization",
			method: "PUT",
			data: { id: id },
			success: function(data) {
				if (callback instanceof Function) {
					callback(data);
				}
			}
		});
	};

	Cognito.dismissNotification = function(id, callback) {
		Cognito.serviceRequest({
			endpoint: "admin/deletenotification",
			method: "POST",
			data: { id: id },
			success: function(data) {
				if (callback instanceof Function) {
					callback(data);
				}
			}
		});
	};

	var resizeTimeout;
	$(window).resize(function () {
		if (resizeTimeout)
			window.clearTimeout(resizeTimeout);
	});

	$(function () {
		// Do not execute during UI Unit testing
		if (document.cookie.indexOf("TestId=") === -1 && !Cognito.config.whiteLabel) {
			if (window.top == window.self) {
				var url = document.location.pathname + document.location.search;

				if (url.indexOf("admin/") === 0)
					url = url.substr(7);

				url = url.replace("admin/view", "");
				document.location.href = Cognito.config.formsUrl + url;
			}
		}

		// Handy little eventing that allows forcing navigation outside of the frame
		$(document).on("click", "a", function (e) {
			var $this = $(this);
			if ($this.attr("data-target") === "top") {
				Cognito.Messaging.trigger("navigate", { data: { location: $this.attr("href") } });

				e.preventDefault();
				return false;
			}
		});
	});

})(ExoJQuery);