;
(function ($) {
	var _sessionCookie = "";
    var _servicesRoot = "";

    function get_servicesRoot() {
        if (_servicesRoot === "") {
            var parser = document.createElement("a");
            parser.href = $("#c-content").get(0).src;

            _servicesRoot = parser.protocol + "//" + parser.host + "/";
        }

        return _servicesRoot;
    }

    function navigate(nav) {
        if (nav.location) {
            document.location.href = nav.location;
            return;
        }

        // User
        if (nav.user) {
            $(".c-nav-user").text(nav.user.name);
            $(".c-nav-organization span").text(nav.user.organization || "");
            $(".c-nav-avatar").attr("src", nav.user.avatar);

            if (!nav.user.canCreateForm)
                $(".newForm.innerDrop").hide();

        	// Organizations
            var $orgList = $("#orgList");
            $orgList.children().not(":last-child").remove();

            if (nav.user.organizations) {
		        var orgListArray = [];
		        for (var i = 0; i < nav.user.organizations.length; i++) {
			        var organization = nav.user.organizations[i];
			        if (i == 0) {
				        orgListArray[i] = "<li><span>" + organization.name + "</span><a href='/admin/organization/' class='orgSettings'><i class='fa fa-cog'></i></a></li>";
			        } else {
				        orgListArray[i] = "<li><a href='" + organization.id + "' class='org'>" + organization.name + "</a><a href='" + organization.id + "' class='orgSettings'><i class='fa fa-cog'></i></a></li>";
			        }
		        }

		        $orgList.prepend(orgListArray.join(""));
            }
            $("#accountNav").show();
        }

        $("#c-nav-overlay").hide();
        $("#c-nav-buffer").show();

        // Update the url of the chrome when the underlying view changes
        var chromeUrl = document.location.href.toLowerCase();
        var index = chromeUrl.indexOf("/", 10);
        if (index > 0) {
            // Reduce chrome url to the form "/module/.."
            var chromeRoot = chromeUrl.substr(0, index);
            chromeUrl = chromeUrl.substr(index);

            // If the converted view url is different from the chrome url, push the url into the chrome history
            if (history.replaceState && nav.url != chromeUrl) {
                history.replaceState(null, null, chromeRoot + nav.url);
            }
        }
        var title = null;
        // Primary
        var $primary = $("#c-nav-primary");
        var $primarySelected = $("#c-nav-primary-dropdown");
        var $primaryMenu = $("#c-nav-primary-menu-items");

        if (!nav.primary || nav.primary.length === 0) {
            $("#c-subNav-container").hide();
            $("#c-content").addClass("noSub");
            $("#c-nav-overlay").addClass("noSub");
            $("#mobileLogo ").css("display", "block");
            $("#c-nav-org-dropdown ").css("display", "block");
        } else {
            $("#c-subNav-container").show();
            $("#c-content").removeClass("noSub");
            $("#c-nav-overlay").removeClass("noSub");
            $("#mobileLogo ").css("display", "none");
            $("#c-nav-org-dropdown ").css("display", "none");

            $primaryMenu.empty();
            var primaryNavArray = [];
            for (var i = 0; i < nav.primary.length; i++) {
                var page = nav.primary[i];

                if (page.selected) {
                    $primarySelected.children("span").text(page.title);
                	title = page.title;
					if (page.archived)
						$primarySelected.addClass("archived-form");
					else
						$primarySelected.removeClass("archived-form");
				}
				else {
                    primaryNavArray[i] = "<a href='" + page.url + "'  class='chrome-action'><span class='" + (page.favorite ? "favorite" : "") + "'><span class='visually-hidden'>Favorites</span></span>" + page.title + (page.container ? "<span class='folder-label'>" + page.container + "</span>" : "") + "</a>";
                }
            }
            $primaryMenu.append(primaryNavArray.join(""));
        }

        // Secondary
        var $secondary = $("#c-nav-secondary");

        $secondary.children("li:not(#c-nav-secondary-selected)").remove();
        var secondaryNavArray = [];
        for (var i = 0; nav.secondary && i < nav.secondary.length; i++) {
            var page = nav.secondary[i];

            secondaryNavArray[i] = "<li " + (page.selected ? "class='c-nav-selected'" : "") + "><a href='" + page.url + "' class='chrome-action'>" + page.title + "</a></li>";

            if (page.selected) {
                $("#c-nav-secondary-selected a span").text(page.title);
            	title += " - " + page.title;
            }
        }

        $secondary.append(secondaryNavArray.join(""));

    	// Reset the height of chrome elements
        maxNavHeight();

        title = title || "Cognito Forms";
        document.title = title;
    }

    function showOverlay() {
        $("#c-nav-overlay").fadeIn();
        $("#c-nav-buffer").fadeOut();
    }

    function hideOverlay() {
        $("#c-nav-overlay").fadeOut();
        $("#c-nav-buffer").fadeIn();
    }

    // If Cognito is being hosted in an iframe, send session token out
    function broadcastToken(token) {
        if (window != window.top) {
            window.top.postMessage("token: " + token, "*");
        }
	}

	// gets the updated plan information
	function getPlanInfo() {

		if (_sessionCookie) {

			var el = $("#c-nav-plan-msg");
			// clear the plan info element
			el.html("");

			$.getJSON(get_servicesRoot() + "admin/organization/planinfo", { token: _sessionCookie.split('|')[0] }, function (planInfo) {
				// clear the plan info element
				el.html("");

				if (!planInfo.PaidPlan || planInfo.TrialDaysRemaining) {

					var balance = parseFloat(planInfo.CurrentBalance);
					var content = "<a href='/admin/organization/selectplan?source=upgrade-now'>";					

					if (planInfo.TrialDaysRemaining > 0) {
						content += planInfo.TrialPlan + " Trial: " + planInfo.TrialDaysRemaining + " days left";
					}
					else if (balance < 0 ) {
						content += "Upgrade: " + formatBalance(balance) + " available"
					}
                    else {
                        content += "Upgrade Now"
                    }

					content += "</a>";

					el.append(content);
				}
			});
		}
	}

    // Supports navigation to a view
	function navigateToView(url, target) {
        // Ensure the target is a valid lowercase string
        target = target ? target.toLowerCase() : "";

        // If no target is specified, the navigation will occur within the chrome
        if (!target) {
        	// Grab querystring parameters
	        var querystring = "";
			if (url.indexOf("?") > -1) {
				querystring = url.indexOf("?") > -1 ? url.substr(url.indexOf("?"), url.length - url.indexOf("?")) : "";
				url = url.substr(0, url.indexOf("?"));
			}

            if (url.indexOf("/admin") === 0) {
            	url = get_servicesRoot() + url.substr(1) + querystring;
            } else {
                var index = url.indexOf("/", 1);
                if (index < 0)
                    url = get_servicesRoot() + url.substr(1) + "/admin/view/" + querystring;
                else
                    url = get_servicesRoot() + url.substr(1, index) + "admin/view/" + url.substr(index + 1) + querystring;
            }
        }

        // Attempt to navigate the view
        Cognito.Messaging.trigger("navigate", { target: $("#c-content").get(0).contentWindow, data: { url: url, target: target } });
    }

    var clicker = function (target, menu) {
        $(document).on("click", target, function (e) {
            $('.dropMenu:visible').not(menu).slideToggle('fast');
            $("#c-nav-secondary li:not(.c-nav-selected)").hide();

            if ($(target + ".active").length) {
                $(document).off("click.overlay");
                $(menu).slideToggle('fast');
                $('.newForm-actionList').hide();
                $('.dropTrigger').removeClass('active');
                $("#overlay").hide();
            }
            else {
                $('.dropTrigger').removeClass('active');
                $(target).addClass('active');
                $('.newForm-actionList').hide();
                $(menu).slideToggle('fast', maxNavHeight);
                $("#overlay").show();                

                $(document).one("click.overlay", "#overlay", function () {
                    $(menu).hide();
                    $('.newForm-actionList').hide();
                    $(target).removeClass('active');
                    $("#overlay").hide();
                    return false;
                });
            }
            
            e.stopPropagation();
            e.preventDefault();

            $("#c-nav-logo").one("click", function (e) {
                $('.dropTrigger').removeClass('active');
                $('.dropMenu').hide();
                $("#overlay").hide();
            });

            // Menu Link click
            $(document).on("click", menu + " a", function (e) {
                if (!$(this).hasClass("innerDrop")) {
                    $(menu).hide();
                    $(target).removeClass('active');
                    $("#overlay").hide();
                    e.stopPropagation();
                }
            });

        });
    };

    // Override navigation links
    $(function () {
        clicker("#c-nav-logo-hamburger", "#mainNav");
        clicker("#c-nav-primary-dropdown", "#c-nav-primary-menu");
        clicker(".c-nav-account", "#accountMenu");
        clicker("#c-nav-org-dropdown", "#orgList");

        Cognito.Messaging.addHandler("navigate", navigate);
        Cognito.Messaging.addHandler("showOverlay", showOverlay);
        Cognito.Messaging.addHandler("hideOverlay", hideOverlay);
        Cognito.Messaging.addHandler("broadcastToken", broadcastToken);
		Cognito.Messaging.addHandler("updatePlanInfo", getPlanInfo);
        Cognito.Messaging.addHandler("cancelNavigation", function () { cancelNavigation = true; });
		Cognito.Messaging.addHandler("ensure-session-cookie", function (data) {
	    	if (!_sessionCookie) {
			    _sessionCookie = data.cookie;
				getPlanInfo();
		    }

	    	if (_sessionCookie !== data.cookie && data.action === "set") {
			    _sessionCookie = data.cookie;
				getPlanInfo();
		    }
	    });

	    $(document)
		    .on("click", "#c-nav-container a:not(#orgList a:not(a.newOrg))", function (e) {
			    var url = $(this).attr("href");
			    var target = $(this).attr("target");

			    if (url !== "#" && target != "_blank") {
				    navigateToView(url, target);
				    e.preventDefault();
			    }
		    })
		    .on("click", "#c-nav-secondary-selected", function (e) {
		        $("#c-nav-secondary li:not(.c-nav-selected)").slideToggle('fast');
		        $(".dropMenu").hide();
			    $("#overlay").show();

			    e.stopPropagation();

		    	$(document).one("click", function () {
				    $("#c-nav-secondary li:not(.c-nav-selected)").hide();
				    $("#overlay").hide();
			    });
		    })
		    .on("click", "#orgList li a.org", function (e) {
			    Cognito.Messaging.trigger("changeOrganization", { target: $("#c-content").get(0).contentWindow, data: { id: $(this).attr("href"), redirect: "/forms/admin/view" } });

			    e.stopPropagation();
			    e.preventDefault();

			    return false;
		    })
			.on("click", ".orgSettings", function (e) {
				Cognito.Messaging.trigger("changeOrganization", { target: $("#c-content").get(0).contentWindow, data: { id: $(this).attr("href"), redirect: "/admin/organization/" } });

				e.stopPropagation();
				e.preventDefault();

			    return false;
		    })
    	;

        window.addEventListener("focus", function () {
            // Notify c-content if Chrome regains focus
	    	Cognito.Messaging.trigger("window-focused", { target: $("#c-content").get(0).contentWindow });
	    });

		$(window).on("click", function () {
            // Notify c-content if the user clicks
            Cognito.Messaging.trigger("keepalive-event", { target: $("#c-content").get(0).contentWindow });
	    });

        Cognito.Messaging.addHandler("popstate", function (s) {
            var chromeUrl = document.location.href.toLowerCase();
            var index = chromeUrl.indexOf("/", 10);
            if (index > 0) {

                // Reduce chrome url to the form "/module/.."
                chromeUrl = chromeUrl.substr(index);
                navigateToView(chromeUrl);
            }
        });

        // Notify the view that the overlay on the chrome was clicked
        $("#c-nav-overlay").click(function () {
            Cognito.Messaging.trigger("overlayClicked", { target: $("#c-content").get(0).contentWindow });
        });

        var resizeTimeout;
        $(window).resize(function () {
            if (resizeTimeout)
                window.clearTimeout(resizeTimeout);
            resizeTimeout = window.setTimeout(maxNavHeight, 100);
        });

        $(".newForm").click(function () {
            $(".newForm-actionList").slideToggle('fast');
        });
    });
    
    function maxNavHeight() {

    	var orgsHeight = $("#c-nav-container").height();
	    var orgListItemHeight = $("#orgList li:first").height();
	    var orgListHeight = $("#orgList li").length * orgListItemHeight + orgListItemHeight;

    	$("#orgList").css("overflow-y", (orgListHeight > (window.innerHeight - orgsHeight)) ? "scroll" : "initial");
	    $("#orgList").css("max-height", (window.innerHeight - orgsHeight - 5) + "px");

        var formsHeight = $("#chrome").height();
	    $("#c-nav-primary-menu").css("max-height", (window.innerHeight - formsHeight - 5) + "px");
    }
	
	// Formats value as currency
	function formatBalance(val) {
		var valString = "$" + formatNumber(Math.abs(val).toFixed(2));
		return valString;
	}

	// Format number with thousands separators
	function formatNumber(val) {
		return val.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
	}

})(jQuery);