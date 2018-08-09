Cognito.ready("admin", "Cognito.Forms", function () {
	var $ = window.ExoJQuery;

	Cognito.Forms.tokenizeHtml = function (s, parentElement) {
		if (s) {
			var tokens = Cognito.Forms.generateTokens(parentElement).filter(function (t) { return !t.IsLink; });

			tokens.push({ Name: Cognito.resources["address-line1"], InternalName: "Line1", Path: Cognito.resources["address-line1"], FieldType: null });
			tokens.push({ Name: Cognito.resources["address-line2"], InternalName: "Line2", Path: Cognito.resources["address-line2"], FieldType: null });
			tokens.push({ Name: Cognito.resources["address-city"], InternalName: "City", Path: Cognito.resources["address-city"], FieldType: null });
			tokens.push({ Name: Cognito.resources["address-postalcode"], InternalName: "PostalCode", Path: Cognito.resources["address-postalcode"], FieldType: null });
			tokens.push({ Name: Cognito.resources["address-state-province-region"], InternalName: "State", Path: Cognito.resources["address-state-province-region"], FieldType: null });
			tokens.push({ Name: Cognito.resources["address-country"], InternalName: "Country", Path: Cognito.resources["address-country"], FieldType: null });
			tokens.push({ Name: Cognito.resources["address-zip-code"], InternalName: "PostalCode", Path: Cognito.resources["address-zip-code"], FieldType: null });
			tokens.push({ Name: Cognito.resources["address-state"], InternalName: "State", Path: Cognito.resources["address-state"], FieldType: null });

			return s.replace(/\[(([a-z0-9_.\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02b8\u02bb-\u02c1\u02d0-\u02d1\u02e0-\u02e4\u02ee\u0370-\u0373\u0376-\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0523\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0621-\u064a\u0660-\u0669\u066e-\u066f\u0671-\u06d3\u06d5\u06e5-\u06e6\u06ee-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07c0-\u07ea\u07f4-\u07f5\u07fa\u0904-\u0939\u093d\u0950\u0958-\u0961\u0966-\u096f\u0971-\u0972\u097b-\u097f\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc-\u09dd\u09df-\u09e1\u09e6-\u09f1\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a59-\u0a5c\u0a5e\u0a66-\u0a6f\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0-\u0ae1\u0ae6-\u0aef\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3d\u0b5c-\u0b5d\u0b5f-\u0b61\u0b66-\u0b6f\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0be6-\u0bef\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58-\u0c59\u0c60-\u0c61\u0c66-\u0c6f\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0-\u0ce1\u0ce6-\u0cef\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d28\u0d2a-\u0d39\u0d3d\u0d60-\u0d61\u0d66-\u0d6f\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32-\u0e33\u0e40-\u0e46\u0e50-\u0e59\u0e81-\u0e82\u0e84\u0e87-\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa-\u0eab\u0ead-\u0eb0\u0eb2-\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0ed0-\u0ed9\u0edc-\u0edd\u0f00\u0f20-\u0f29\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8b\u1000-\u102a\u103f-\u1049\u1050-\u1055\u105a-\u105d\u1061\u1065-\u1066\u106e-\u1070\u1075-\u1081\u108e\u1090-\u1099\u10a0-\u10c5\u10d0-\u10fa\u10fc\u1100-\u1159\u115f-\u11a2\u11a8-\u11f9\u1200-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u1676\u1681-\u169a\u16a0-\u16ea\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u17e0-\u17e9\u1810-\u1819\u1820-\u1877\u1880-\u18a8\u18aa\u1900-\u191c\u1946-\u196d\u1970-\u1974\u1980-\u19a9\u19c1-\u19c7\u19d0-\u19d9\u1a00-\u1a16\u1b05-\u1b33\u1b45-\u1b4b\u1b50-\u1b59\u1b83-\u1ba0\u1bae-\u1bb9\u1c00-\u1c23\u1c40-\u1c49\u1c4d-\u1c7d\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u2094\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2183-\u2184\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2c6f\u2c71-\u2c7d\u2c80-\u2ce4\u2d00-\u2d25\u2d30-\u2d65\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3006\u3031-\u3035\u303b-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31b7\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fc3\ua000-\ua48c\ua500-\ua60c\ua610-\ua62b\ua640-\ua65f\ua662-\ua66e\ua680-\ua697\ua722-\ua788\ua78b-\ua78c\ua7fb-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8d0-\ua8d9\ua900-\ua925\ua930-\ua946\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa50-\uaa59\uac00-\ud7a3\uf900-\ufa2d\ufa30-\ufa6a\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]+)(?:\:(.+?))?)\]/gi, function (p1, p2) {
				if (tokens.filter(function (t) { return t.InternalName === p2; }).length > 0)
					return "<span class='mceNonEditable'>" + p2 + "</span>";
				else
					return p1;
			});
		}

		return "";
	};

	Cognito.Forms.serializeModel = function Forms$serializeModel(names) {
		var modelNames = names.split(",").map(function (n) { return n.trim(); });

		var beforeSerializeModelEvent = jQuery.Event("beforeSerializeModel");
		beforeSerializeModelEvent.modelNames = modelNames;
		$(document.documentElement).trigger(beforeSerializeModelEvent);

		var modelData = {};

		for (var i = 0; i < modelNames.length; i++) {
			var name = modelNames[i];

			var modelName;
			var modelPath;

			var dotIndex = name.indexOf(".");
			if (dotIndex > 0) {
				modelName = name.substring(0, dotIndex);
				modelPath = name.substring(dotIndex + 1);
			} else {
				modelName = name;
				modelPath = null;
			}

			if (Cognito.Forms.model.hasOwnProperty(modelName)) {
				var modelValue = Cognito.Forms.model[modelName];
				if (modelValue === undefined) {
					continue;
				}

				try {
					// Evaluate a path off of a model property.
					if (modelPath) {
						modelValue = ExoWeb.getValue(modelValue, modelPath);
						if (modelValue === undefined) {
							continue;
						}
					}

					modelData[name] = Cognito.serialize(modelValue);
				} catch (e) {
					modelData[name] = null;
				}
			}
		}

		var afterSerializeModelEvent = jQuery.Event("afterSerializeModel");
		afterSerializeModelEvent.modelNames = modelNames;
		afterSerializeModelEvent.modelData = modelData;
		$(document.documentElement).trigger(afterSerializeModelEvent);

		return JSON.stringify(modelData);
	};

	// Gets a permanent link for the specified file id
	Cognito.Forms.getPermalink = function Forms$getPermalink(id, callback) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/permalink/" + id,
			method: "GET",
			success: function forms$getPermalink(data) {
				if (callback && callback instanceof Function) {
					callback(data);
				}
			}
		});
	}

	// Gets the form with the specified internal name
	Cognito.Forms.getForm = function Forms$getForm(internalName, callback) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/form",
			method: "GET",
			data: { internalName: internalName },
			success: function forms$getForm(data) {
				var form = Cognito.deserialize(Cognito.Forms.Form, data);

				if (callback && callback instanceof Function) {
					callback(form);
				}
			}
		});
	}

	// Gets all forms
	Cognito.Forms.getForms = function Forms$getForms(callback) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/forms",
			method: "GET",
			success: function forms$getForms(data) {
				var forms = Cognito.deserialize(Cognito.Forms.Form, data);
				if (callback && callback instanceof Function) {
					callback(forms);
				}
			}
		});
	}

	// Creates a new form with the specified name
	Cognito.Forms.createForm = function Forms$createForm(name, callback) {
		Cognito.Forms.serviceRequest({
			endpoint: "form",
			method: "POST",
			data: { name: name },
			success: function forms$createForm(data) {
				var form = Cognito.deserialize(Cognito.Forms.Form, data);

				if (callback && callback instanceof Function) {
					callback(form);
				}
			}
		});
	}

	// Saves a form definition
	Cognito.Forms.saveForm = function Forms$saveForm(form, folderId, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "form",
            method: "PUT",
            data: { FormJson: JSON.stringify(Cognito.serialize(form)), FolderId: folderId },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Previews a form definition
	Cognito.Forms.previewForm = function Forms$previewForm(form, callback) {
		Cognito.Forms.serviceRequest({
			dataType: "html",
			endpoint: "preview",
			method: "PUT",
			data: form,
			success: callback
		});
	}

	// Loads an entry form
	Cognito.Forms.loadEntryForm = function Forms$loadForm(internalName, canSubmit, callback) {
		Cognito.Forms.serviceRequest({
			dataType: "html",
			endpoint: "load",
			method: "PUT",
			data: { internalName: internalName, canSubmit: canSubmit },
			success: callback
		});
	}

	// Deletes the form with the specified id
	Cognito.Forms.deleteForm = function Forms$deleteForm(id, callback) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/form",
			method: "DELETE",
			data: { id: id },
			success: callback
		});
	}

	// Creates an entry view
	Cognito.Forms.createEntryView = function Forms$createEntryView(form, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: form + "/entryview",
			method: "GET",
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(Cognito.deserialize(Cognito.Forms.EntryView, data), status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Saves an entry view
	Cognito.Forms.saveEntryView = function Forms$saveEntryView(view, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "entryview",
			method: "PUT",
			data: view,
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Copies an entry view
	Cognito.Forms.copyEntryView = function Forms$copyEntryView(view, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "copyentryview",
			method: "POST",
			data: view,
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Defaults the entry view
	Cognito.Forms.defaultEntryView = function Forms$defaultEntryView(viewId, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "entryview/" + viewId + "/default",
			method: "PUT",
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Rename the entry view
	Cognito.Forms.renameEntryView = function Forms$renameEntryView(viewId, name, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "entryview/" + viewId + "/rename",
			method: "PUT",
			data: { name: name },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Deletes an entry view
	Cognito.Forms.deleteEntryView = function Forms$deleteEntryView(id, callback) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/entryView",
			method: "DELETE",
			data: { id: id },
			success: callback
		});
	}

	// Get the Javascript function for the specified filter
	Cognito.Forms.getEntryViewFilter = function Forms$getEntryViewFilter(formId, filter, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: formId + "/entryview/filter",
			method: "POST",
			contentType: 'application/json+cognito; charset=utf-8',
			data: Cognito.serialize(filter),
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Exports entries for a specific view
	Cognito.Forms.exportEntries = function exportEntries(view, viewSaved, allFields, entries, success, error) {
		entries = entries || [];
		var viewModel = { AllFields: allFields, Entries: entries }
		if (viewSaved)
			viewModel.ViewId = view.get_Id();
		else
			viewModel.View = JSON.stringify(Cognito.serialize(view));
		
		$.fileDownload(Cognito.config.baseUrl + "forms/admin/exportentries", {
			httpMethod: "POST",
			data: { viewModel: viewModel },
			successCallback: success,
			failCallback: error
		});
	}

	// Returns true if the the specified form has any entries, otherwise false 
	Cognito.Forms.hasEntries = function Forms$hasEntries(formId, callback) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/hasEntries",
			method: "POST",
			data: { formId: formId },
			success: function forms$getForm(data) {
				if (callback && callback instanceof Function) {
					callback(data);
				}
			}
		});
	}

	Cognito.Forms.saveEntry = function saveEntry(entry, orderAmount, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: 'entry',
			method: 'POST',
			contentType: 'application/json+cognito; charset=utf-8',
			data: {
				Entry: Cognito.serialize(entry),
				OrderAmount: orderAmount
			},
			success: function (data) {
				if (success && success instanceof Function)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	};

	Cognito.Forms.saveIncompleteEntry = function saveIncompleteEntry(entry, orderAmount, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: 'saveIncompleteEntry',
			method: 'POST',
			contentType: 'application/json+cognito; charset=utf-8',
			data: {
				Entry: Cognito.serialize(entry),
				OrderAmount: orderAmount
			},
			success: function (data) {
				if (success && success instanceof Function)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	};

	// Deletes the entry with the specified id
	Cognito.Forms.deleteEntries = function Forms$deleteEntries(batch, success, error) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/entry",
			method: "DELETE",
			data: { batch: batch },
			success: success,
			error: error
		});
	}

	// Generates a document for the entry with the specified id
	Cognito.Forms.generateDocument = function Forms$generateDocument(entry, order, documentTemplate, unsavedChanges, success, error) {

		var url = Cognito.config.baseUrl + "forms/admin/generatedocument";

		$.fileDownload(url, {
			httpMethod: "POST",
			successCallback: function (url) {
				console.log('You just got a file download dialog or ribbon for this URL :' + url);
			},
			failCallback: function (html, url) {
				console.log('Your file download just failed for this URL:' + url + '\r\n' +
					'Here was the resulting error HTML: \r\n' + html
				);
			},
			data: {
				Entry: JSON.stringify(Cognito.serialize(entry)),
				Order: order ? JSON.stringify(Cognito.serialize(order)) : null,
				DocumentTemplateNumber: documentTemplate.get_Number(),
				UnsavedChanges: unsavedChanges
			}
		});
	}

	Cognito.Forms.CreateSharedLink = function Forms$createSharedLink(entryId, sharedLinkType, daysToLinkExpiration, entryStatus, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "createSharedLink",
			method: "POST",
			contentType: 'application/json+cognito; charset=utf-8',
			data: { EntryId: entryId, SharedLinkType: sharedLinkType, DaysToLinkExpiration: daysToLinkExpiration, EntryStatus: entryStatus },
			success: function (data) {
				if (success)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.emailSharedLink = function Forms$emailSharedLink(entryId, sharedLinkType, daysToLinkExpiration, entryStatus, notification, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "emailsharedlink",
			method: "POST",
			contentType: 'application/json+cognito; charset=utf-8',
			data: {
				EntryId: entryId,
				SharedLinkType: sharedLinkType,
				DaysToLinkExpiration: daysToLinkExpiration,
				EntryStatus: entryStatus,
				Notification: Cognito.serialize(notification)
			},
			success: function (data) {
				if (success)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.sendEmailNotification = function Forms$sendEmailNotification(entryId, notification, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "SendEmailNotification",
			method: "POST",
			contentType: 'application/json+cognito; charset=utf-8',
			data: {
				EntryId: entryId,
				Notification: Cognito.serialize(notification)
			},
			success: function (data) {
				if (success)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Batch update entry statuses 
	Cognito.Forms.updateEntryStatus = function Forms$updateEntryStatus(batch, status, triggerEntryNotifications, allowIncomplete, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "Status",
			method: "POST",
			data: { batch: batch, status: status, triggerEntryNotifications: triggerEntryNotifications, allowIncomplete: allowIncomplete },
			success: function (data) {
				if (success && success instanceof Function)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {

				// Incomplete entries
				if (error && jqXHR.status == 428)
					error(JSON.parse(jqXHR.responseText));
			}
		});
	}

	// Updates a form's theme
	Cognito.Forms.updateTheme = function Forms$updateTheme(formId, theme, callback) {
		Cognito.Forms.serviceRequest({
			endpoint: formId + "/theme",
			method: "PUT",
			data: theme,
			success: function (data) {
				if (callback && callback instanceof Function)
					callback(data);
			}
		});
	}

	Cognito.Forms.getSharePointLists = function Forms$getSharePointLists(siteUrl, userName, password, success, error) {
		$(".c-sharepoint-validation").hide();

		Cognito.Forms.serviceRequest({
			endpoint: "GetSharePointLists",
			method: "POST",
			data: { siteUrl: siteUrl, userName: userName, password: password },
			success: function (data) {
				if (success && success instanceof Function)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.getSharePointListsByForm = function Forms$getSharePointListsByForm(form, success, error) {
		$(".c-sharepoint-validation").hide();

		Cognito.Forms.serviceRequest({
			endpoint: "GetSharePointListsByForm",
			method: "POST",
			data: { formId: form.get_Id() },
			success: function (data) {
				if (success && success instanceof Function)
					success(data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.getJsType = function (typeName) {
		var types = context.model.meta.types().filter(function (t) { return t.get_fullName().toLowerCase() === typeName.toLowerCase(); });
		return types.length > 0 ? types[0].get_jstype() : null;
	}

	// Refund Payment for the specified Entry
	Cognito.Forms.refundEntryOrder = function refundEntryOrder(entryId, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "entry/" + entryId + "/refundOrder",
			method: "POST",
			success: success,
			error: error
		});
	}

	// Submit Payment for the specified entry
	Cognito.Forms.makePayment = function makePayment(entryId, paymentToken, customerCard, orderAmount, success, error) {
		var token = paymentToken ? Cognito.serialize(paymentToken) : null;
		var card = customerCard ? Cognito.serialize(customerCard) : null;
	
		Cognito.Forms.serviceRequest({
			endpoint: "entry/" + entryId + "/makePayment",
			method: "POST",
			contentType: "application/json+cognito",
			data: { PaymentToken: token, CustomerCard: card, ClientOrderAmount: orderAmount },
			success: success,
			error: error
		});
	}

	// Reconcile order for the specified entry
	Cognito.Forms.reconcilePayment = function reconcilePayment(entry, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "entry/" + entry.get_Id() + "/reconcilePayment",
			method: "POST",
			success: success,
			error: error
		});
	}

	// Generates a Word template with the specified document template settings
	Cognito.Forms.generateWordTemplate = function Forms$generateWordTemplate(form, documentTemplate, allowCaching, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "generatewordtemplate",
			method: "POST",
			contentType: 'application/json+cognito; charset=utf-8',
			data: { Form: JSON.stringify(Cognito.serialize(form)), DocumentTemplateNumber: documentTemplate.get_Number(), AllowCaching: allowCaching },
			success: success,
			error: error
		});
	}

	// Annotates the Word template for the specified document template with compilation errors
	Cognito.Forms.annotateWordTemplate = function Forms$annotateWordTemplate(form, documentTemplate, success, error) {

		var url = Cognito.config.baseUrl + "forms/admin/annotatewordtemplate";

		$.fileDownload(url, {
			httpMethod: "POST",
			successCallback: success,
			failCallback: error,
			data: { Form: JSON.stringify(Cognito.serialize(form)), DocumentTemplateNumber: documentTemplate.get_Number() }
		});
	}

	// Validates the Word template for the specified document template
	Cognito.Forms.validateWordTemplate = function Forms$validateWordTemplate(form, file, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "validatewordtemplate",
			method: "POST",
			data: { form: JSON.stringify(Cognito.serialize(form)), file: file.get_Id() },
			success: success,
			error: error
		});
	}

	// Get all folders
	Cognito.Forms.getFolders = function Forms$getFolders(filterAccess, includeRoot, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "folder",
			method: "GET",
            data: { filterAccess: !!filterAccess, includeRoot: !!includeRoot },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(Cognito.deserialize(Cognito.Forms.Folder, data), status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Creates a new folder
	Cognito.Forms.createFolder = function Forms$createFolder(name, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "folder",
			method: "POST",
			data: { name: name },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(Cognito.deserialize(Cognito.Forms.FolderMeta, data), status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	// Rename a folder
	Cognito.Forms.renameFolder = function Forms$renameFolder(id, name, callback) {
		Cognito.Forms.serviceRequest({
			endpoint: "folder/" + id + "/rename",
			method: "PUT",
			data: { name: name },
			success: callback
		});
	}

	// Deletes a folder
	Cognito.Forms.deleteFolder = function Forms$deleteFolder(id, callback) {
		Cognito.serviceRequest({
			endpoint: "forms/admin/folder",
			method: "DELETE",
			data: { id: id },
			success: callback
		});
	}

	// Move forms to a folder
	Cognito.Forms.moveForms = function Forms$moveForm(batch, folderId, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "MoveForms",
			method: "PUT",
			data: { batch: batch, folderId: folderId },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.archiveForms = function Forms$archiveForms(batch, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "ArchiveForms",
			method: "PUT",
			data: { batch: batch },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.archiveFolder = function Forms$archiveFolder(id, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "ArchiveFolder",
			method: "PUT",
			data: { id: id },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.restoreForms = function Forms$restoreForms(batch, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "RestoreForms",
			method: "PUT",
			data: { batch: batch },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	Cognito.Forms.favoriteForm = function Forms$favoriteForm(id, favorite, success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "FavoriteForm",
			method: "PUT",
			data: { id: id, favorite: favorite },
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}


	// Get formMetas
	Cognito.Forms.getFormMetas = function Forms$getFormMetas(success, error) {
		Cognito.Forms.serviceRequest({
			endpoint: "FormMetas",
			method: "GET",
			success: function (data, status, jqXHR) {
				if (success && success instanceof Function)
					success(data, status, jqXHR);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (error && error instanceof Function)
					error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	var currentAnimationSignal = null;

	function doAnimation(animate) {
		if (currentAnimationSignal != null) {
			currentAnimationSignal.waitForAll(animate);
			return;
		}

		currentAnimationSignal = new ExoWeb.Signal();

		var animationComplete = currentAnimationSignal.pending();

		animate(function () {
			currentAnimationSignal = null;
			animationComplete();
		});
	}

	function doFadeIn(element, speed, callback) {
		doAnimation(function (signalComplete) {
			$(element).fadeIn(speed, function () {
				if (signalComplete) {
					signalComplete();
				}
				if (callback) {
					callback();
				}
			});
		});
	}

	function doSlideDown(element, speed, callback) {
		doAnimation(function(signalComplete) {
			$(element).slideDown(speed, function() {
				if (signalComplete) {
					signalComplete();
				}
				if (callback) {
					callback();
				}
			});
		});
	}

	function doFadeOut(element, speed, callback) {
		doAnimation(function (signalComplete) {
			$(element).fadeOut(speed, function () {
				if (signalComplete) {
					signalComplete();
				}
				if (callback) {
					callback();
				}
			});
		});
	}

	function doSlideUp(element, speed, callback) {
		doAnimation(function (signalComplete) {
			$(element).slideUp(speed, function () {
				if (signalComplete) {
					signalComplete();
				}
				if (callback) {
					callback();
				}
			});
		});
	}

	function doShow(element, options, callback) {
		if (options.animation === "fade") {
			doFadeIn(element, options.speed, callback);
		} else {
			doSlideDown(element, options.speed, callback);
		}
	}

	function doHide(element, options, callback) {
		if (options.animation === "fade") {
			doFadeOut(element, options.speed, callback);
		} else {
			doSlideUp(element, options.speed, callback);
		}
	}

	function parseOptions(element) {
		var options = {
			animation: "slide",
			speed: "normal",
			pause: "none"
		};

		// NOTE: dataset isn't fully supported until IE 11.

		var toggleAnimation = element.getAttribute("data-toggle-animation");
		if (toggleAnimation) {
			options.animation = toggleAnimation;
		}

		var toggleAnimationSpeed = element.getAttribute("data-toggle-animation-speed");
		if (toggleAnimationSpeed) {
			var toggleAnimationSpeedNum = parseInt(toggleAnimationSpeed, 10);
			if (!isNaN(toggleAnimationSpeedNum)) {
				options.speed = toggleAnimationSpeedNum;
			} else {
				options.speed = toggleAnimationSpeed;
			}
		}

		var toggleAnimationPause = element.getAttribute("data-toggle-animation-pause");
		if (toggleAnimationPause) {
			options.pause = toggleAnimationPause;
		}

		return options;
	}

	Cognito.Forms.showToggle = function (sender, args) {
		var element = sender.get_element();
		var options = parseOptions(element);
		var callback = args.pending();

		if (options.pause === "show" || options.pause === "both") {
			setTimeout(function() {
				doShow(element, options, callback);
			}, 1);
		} else {
			doShow(element, options, callback);
		}
	};

	Cognito.Forms.hideToggle = function (sender, args) {
		var element = sender.get_element();
		var options = parseOptions(element);
		var callback = args.pending();

		if (options.pause === "hide" || options.pause === "both") {
			setTimeout(function () {
				doHide(element, options, callback);
			}, 1);
		} else {
			doHide(element, options, callback);
		}
	};

	// #region Modal Menu

	$(document.documentElement)

		// Hide all modal menus when anything else is clicked.
		.click(function () {
			$(".c-forms-modal-menu").slideUp('fast');
		})

		// Hide/show modal menus when the trigger (faux textbox) is clicked.
		.on("click", ".c-forms-faux-textbox", function (event) {

			event.stopPropagation();

			var menu = $(this).next(".c-forms-modal-menu");
			if (menu.length > 0) {
				if (menu.is(":visible")) {
					menu.slideUp('fast');
				} else {
					menu.slideDown('fast');
				}
			}

		});

	// #endregion

});