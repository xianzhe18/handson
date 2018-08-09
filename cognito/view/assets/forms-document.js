// #region Model Type Definitions

$extend(["Cognito.Notification", "Cognito.Forms.FormDocumentTemplate"], function (notification) {

	notification.meta.addProperty({ name: "documentSource", type: Cognito.Forms.Form })
		.calculated({
			calculate: function () {
				return Cognito.Forms.model.currentForm;
			}
		});

	notification.meta.addProperty({ name: "includedDocuments", type: Cognito.Forms.FormDocumentTemplate, isList: true, format: "[nameHtml]" })
		.calculated({
			calculate: function () {
				var source = this.get_documentSource();
				if (!source) {
					return [];
				}

				var docs = [];

				if (this.get_IncludeDocumentAttachments()) {
					this.get_IncludedDocuments().forEach(function (number) {
						var doc = source.get_DocumentTemplates().first(function (d) {
							return d.get_Number() === number;
						});
						if (doc) {
							docs.push(doc);
						}
					});
				}

				return docs;
			},
			onChangeOf: ["documentSource.DocumentTemplates", "IncludeDocumentAttachments", "IncludedDocuments"]
		})
		// NOTE: Timing is very important here. Validation rules can cause the property to be
		// accessed, and if it is accessed before the view is initialized, then it will return
		// null. For this reason, the 'optionValues' rule is used, since it doesn't enforce
		// validation, and also does not run in response to events such as 'init'.
		.optionValues("documentSource.DocumentTemplates")
		.addChanged(function (sender) {
			var ids = sender.get_IncludedDocuments();

			ids.beginUpdate();
			ids.clear();
			ids.addRange(sender.get_includedDocuments().map(function (t) { return t.get_Number(); }));
			ids.endUpdate();
		});

	notification.$IncludeDocumentAttachments.addChanged(function (sender, args) {
		if (args.newValue === false) {
			// When include documents is de-selected, clear out the included documents.
			sender.get_includedDocuments().clear();
		}
	});

});

$extend(["Cognito.Forms.Form", "Cognito.Forms.FormDocumentTemplate"], function (formType, formDocumentTemplateType) {

	formDocumentTemplateType.meta.addProperty({ name: "form", type: Cognito.Forms.Form });

	// Initially set up reference to owner form.
	formType.meta.addRule({
		execute: function (sender) {
			sender.get_DocumentTemplates().forEach(function (t) {
				t.set_form(sender);
			});
		},
		onInit: true
	});

	// Keep reference to owner form up-to-date due to list changes.
	formType.$DocumentTemplates.addChanged(function (sender, args) {
		args.changes.forEach(function (c) {
			if (c.oldItems) {
				c.oldItems.forEach(function (i) {
					i.set_form(null);
				});
			}
			if (c.newItems) {
				c.newItems.forEach(function (i) {
					i.set_form(sender);
				});
			}
		});
	});

	// Generate a default document template name that is consistent with
	// the name that was previously used for built-in PDF generation.
	Cognito.Forms.getDefaultDocumentTemplateName = function (ownerForm) {
		return ownerForm.get_Name() + " - [Entry.Number]";
	};

	// Document Template Name
	formDocumentTemplateType.meta.addProperty({ name: "name", type: String })
		.calculated({
			calculate: function () {
				if (this.get_form() && (!this.get_Name() || this.get_Name().trim() === ""))
					return Cognito.Forms.getDefaultDocumentTemplateName(this.get_form());
				else
					return this.get_Name();
			},
			onChangeOf: ["form.Name", "Name"]
		});

	// Document Template Formatted Name
	formDocumentTemplateType.meta.addProperty({ name: "nameHtml", type: String })
		.calculated({
			calculate: function () {
				return Cognito.Forms.tokenizeHtml(this.get_name() || "");
			},
			onChangeOf: "name"
		});

	if (!Cognito.Forms.generateTokens) {
		Cognito.Forms.generateTokens = function () {
			// Rely on the parent window to provide tokens.
			return window.parent.window.Cognito.Forms.generateTokens.apply(this, arguments);
		};
	}

	formDocumentTemplateType.meta.addProperty({ name: "tokens", type: Object, isList: true }).calculated({
		calculate: function () {
			return Cognito.Forms.generateTokens();
		}
	});

	formDocumentTemplateType.meta.addProperty({ name: "protectedTokens", type: Object, isList: true }).calculated({
		calculate: function () {
			var protectedTokens = [];

			this.get_tokens().forEach(function (sender) {
				if (!sender.IsProtected) {
					protectedTokens.push(sender);
				}
			});

			return protectedTokens;
		},
		onChangeOf: ["tokens"]
	});

	function makeCommaDelimitedSentenceFragment(items, useOxfordComma, finalItemPrefix) {
		if (arguments.length < 3) {
			finalItemPrefix = "and";
		}

		if (items.length === 0) {
			return "";
		} else if (items.length === 1) {
			return items[0];
		} else if (items.length === 2) {
			return items[0] + " " + finalItemPrefix + " " + items[1];
		} else if (useOxfordComma && !finalItemPrefix) {
			return items.join(", ");
		} else {
			return items.slice(0, items.length - 1).join(", ") + (useOxfordComma ? ", " : " ") + (finalItemPrefix ? finalItemPrefix + " ": "") + items[items.length - 1];
		}
	}

	function getIsMultiPageForm(form) {
		if (Cognito.Forms.model.hasOwnProperty("isMultiPageForm"))
			return Cognito.Forms.model.isMultiPageForm;

		if (form && Cognito.Forms.getIsMultiPageForm)
			return Cognito.Forms.getIsMultiPageForm(form);

		return false;
	}

	function getIsPaymentForm(form) {
		if (Cognito.Forms.model.hasOwnProperty("isPaymentForm"))
			return Cognito.Forms.model.isPaymentForm;

		if (form && Cognito.Forms.getIsPaymentForm)
			return Cognito.Forms.getIsPaymentForm(form);

		return false;
	}

	function getEncryptEntries(form) {
		return form && form.get_EncryptEntries();
	}

	// Generate a default document template description.
	Cognito.Forms.getDefaultDocumentTemplateDescription = function(form, template) {
		var description = "";

		if (template.get_IncludeEntryDetails()) {
			var detailItems = [];

			if (template.get_IncludeBlankFields()) detailItems.push("blank");
			if (template.get_IncludeInternalFields()) detailItems.push("internal");
			if (template.get_IncludeHiddenFields()) detailItems.push("hidden");

			if (getEncryptEntries(form)) {
				if (template.get_IncludeProtectedFields()) detailItems.push("protected");
			}

			if (detailItems.length > 0) {
				if (template.get_DocumentMode().get_Name() === "Edit") {
					detailItems.splice(0, 0, "form controls");
				}
				description = "Details with " + makeCommaDelimitedSentenceFragment(detailItems, true, "&") + " fields.";
			}
			else if (template.get_DocumentMode().get_Name() === "Edit") {
				description = "Details with form controls.";
			} else {
				description = "Details.";
			}
		}

		var otherItems = [];

		if (template.get_IncludeLogo()) otherItems.push("logo");
		if (template.get_IncludeTitle()) otherItems.push("title");
		if (template.get_IncludePageNumbers()) otherItems.push("page numbers");

		if (getIsMultiPageForm(form)) {
			if (template.get_IncludePageBreaks()) otherItems.push("page breaks");
			if (template.get_IncludePageTitles()) otherItems.push("page titles");
		}

		if (getIsPaymentForm(form)) {
			if (template.get_IncludePaymentDetails()) otherItems.push("payment details");
		}

		if (otherItems.length > 0) {
			var listItems = [];
			listItems.push(otherItems[0][0].toUpperCase() + otherItems[0].substring(1));
			Array.prototype.push.apply(listItems, otherItems.slice(1));
			description += (description.length > 0 ? " " : "") + makeCommaDelimitedSentenceFragment(listItems, true, "&") + ".";
		}

		return description || "Blank document.";
	};

	// Document Template Description
	formDocumentTemplateType.meta.addProperty({ name: "description", type: String })
		.calculated({
			calculate: function () {
				if (!this.get_Description() || this.get_Description().trim() === "") {
					if (this.get_DocumentMode().get_Name() === "Custom") {
						return "Custom template.";
					}
					return Cognito.Forms.getDefaultDocumentTemplateDescription(this.get_form(), this);
				} else {
					return this.get_Description();
				}
			},
			onChangeOf: ["IncludeEntryDetails", "IncludeBlankFields", "IncludeInternalFields", "IncludeHiddenFields", "IncludeProtectedFields",
				"IncludeLogo", "IncludeTitle", "IncludePageNumbers", "IncludePageBreaks", "IncludePageTitles", "IncludePaymentDetails",
				"Description",
				"DocumentMode.Name",
				"form.Fields{IncludeOnInvoice,ChildType.Fields.IncludeOnInvoice}",
				"form.Views.Definition"]
		});

});

// #endregion

Cognito.ready('create-documents-menu', 'ExoWeb.dom', function ($) {
	var form = Cognito.Forms.model.currentForm;
	if (form) {
		form.get_DocumentTemplates().forEach(function (t) {
			t.set_form(form);
		});
	}
});
