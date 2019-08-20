;
window.Cognito = window.Cognito || {};
(function (window) {
	var _handlers = {};

	var Messaging = function () {
		var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
		var event = window.addEventListener ? "message" : "onmessage";
		var eventer = window[eventMethod];

		eventer(event, this._handle, false);
	}

	// Get the value at the specified property path
	function evalPath(obj, path) {
		function index(obj, i) { return obj[i] }
		return path.split('.').reduce(index, obj);
	}

	Messaging.prototype = {
		_handle: function (event) {
			try {
				var payload = JSON.parse(event.data);
			}
			catch (e)
			{ }

			if (payload && payload.event) {
				var handlerList = _handlers[payload.event];

				if (handlerList) {
                    handlerList.forEach(function (handler) {
                        handler.call(event, payload.data);
                    });
				}
			}
		},

		addHandler: function (name, handler) {
            _handlers[name] = _handlers[name] || [];
            _handlers[name].push(handler);
		},

		trigger: function (/* [event,] options */) {
			var event;
			var options;

			if (arguments.length === 2) {
				event = arguments[0];
				options = arguments[1];
			} else if (arguments.length === 1) {
				if (typeof (arguments[0]) === "string") {
					event = arguments[0];
				} else {
					options = arguments[0];
					event = options.event;
				}
			}

			var payload = {};
			payload["event"] = event;

			if (options && options.data) {
					payload["data"] = options.data;
			}

			var target = (options && options.target) || window.parent;
			var origin = (options && options.origin) || "*";

			target.postMessage(JSON.stringify(payload), origin);
		},

		// Creates a proxy for a set of functions that can be safely called across frame boundaries
		proxy: function (target, scope) {

			// Get the function set for the specified target and scope
			var fnSet = evalPath(target, scope);
			var proxy = {};

			// Define a closure to create a proxy wrapper function
			function createProxy(fn) {
				return function () {
					var args = [];
					for (var i = 0; i < arguments.length; i++) {
						arg = arguments[i];

						// Serialize Entity
						if (arg instanceof ExoWeb.Model.Entity) {
							var type = arg.meta.type.get_fullName();
							arg = Cognito.serialize(arg);
							arg.$type = arg.$type || type;
						}

						// Serialize Entity Array
						else if (arg instanceof Array && arg.length > 0 && arg[0] instanceof ExoWeb.Model.Entity) {
							for (var j = 0; j < arg.length; j++) {
								var type = arg[j].meta.type.get_fullName();
								arg[j] = Cognito.serialize(arg[j]);
								arg[j].$type = arg[j].$type || type;
							}
						}

						// Cleanse Arrays
						else if (arg instanceof Array) {
							if (arg.length > 0 && arg[0] instanceof Object) {
								for (var j = 0; j < arg.length; j++) {
									var obj = arg[j];
									var clean = {};
									for (var prop in obj) {
										var val = obj[prop];
										if (val instanceof ExoWeb.Model.Entity || (val instanceof Array && val.length > 0 && val[0] instanceof ExoWeb.Model.Entity))
											continue;
										clean[prop] = val;
									}
									arg[j] = clean;
								}
							}
						}

						// Cleanse Objects
						else if (arg instanceof Object) {
							var clean = {};
							for (var prop in arg) {
								var val = arg[prop];
								if (val instanceof ExoWeb.Model.Entity || (val instanceof Array && val.length > 0 && val[0] instanceof ExoWeb.Model.Entity))
									continue;
								clean[prop] = val;
							}
							arg = clean;
						}						

						args.push(arg);
					}
					Cognito.Messaging.trigger("proxy", { target: target, data: { scope: scope, fn: fn, args: args } });
				};
			}

			// Create proxy functions for each function in the set
			for (var fn in fnSet) {
				proxy[fn] = createProxy(fn);
			}

			return proxy;
		}
	};

	window.Cognito.Messaging = new Messaging();

	// Add a default event handler to generically support controller proxies
	Cognito.Messaging.addHandler("proxy", function (data) {
		for (var i = 0; i < data.args.length; i++) {
			arg = data.args[i];

			// Deserialize Entity
			if (arg && arg.$type) {
				var entity = null;
				if (arg.Id) {
					var type = context.model.meta.type(arg.$type).get_jstype();
					entity = type.meta.get(arg.Id.toString());
				}	
				data.args[i] = Cognito.deserialize(null, arg, entity);
			}

			// Deserialize Entity Array
			if (arg && arg instanceof Array && arg.length > 0 && arg[0].$type) {
				var type = context.model.meta.type(arg[0].$type).get_jstype();
				for (var j = 0; j < arg.length; j++) {
					var entity = null;
					if (arg[j].Id)
						entity = type.meta.get(arg.Id.toString());
					arg[j] = Cognito.deserialize(null, arg[j], entity);
				}
			}
		}
		evalPath(window, data.scope)[data.fn].apply(window, data.args);
	});
})(window);