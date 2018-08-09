// #region Document Templates Dialog

Cognito.ready("open-manage-templates-dialog", "Cognito.Forms", function ($) {
	var saveErrorDialog;
	var manageTemplatesDialog;

	// Opens the Manage Templates dialog to allow users to add/edit/delete document templates.
	Cognito.Forms.manageDocumentTemplates = function (options) {

		var path = Cognito.config.mode === "anonymous"
			? "forms/anonymous/view/documenttemplates"
			: "forms/admin/view" + (options.usePersistedData ? "/" + Cognito.Forms.model.currentForm.get_InternalName() : "") + "/documenttemplates";

		var queryString = "";

		if (options.hasOwnProperty("isMultiPageForm")) {
			queryString += "?isMultiPageForm=" + options.isMultiPageForm.toString();
		}

		if (options.hasOwnProperty("isPaymentForm")) {
			queryString += (queryString ? "&" : "?") + "isPaymentForm=" + options.isPaymentForm.toString();
		}

		manageTemplatesDialog = $.fn.dialog({
			title: "Manage Document Templates",
			contentSelector: "#manage-templates-dialog",
			name: "documentTemplates",
			url: Cognito.config.baseUrl + path + queryString,
			width: options.width || 800,
			height: options.height || "650px",
			buttons: [
				{
					label: options.cancelText || "Cancel",
					isCancel: true,
					click: function (event) {
						// Stop propogation in order to prevent the menu
						// that opened the dialog from being closed.
						event.stopPropagation();
					}
				},
				{
					label: options.confirmText || "Save",
					isCancel: false,
					autoClose: false,
					click: function (event) {
						// Stop propogation in order to prevent the menu
						// that opened the dialog from being closed.
						event.stopPropagation();

						if (options.autoSave) 
							Cognito.Forms.controller.documentTemplates.save();
						else{
							Cognito.Forms.controller.documentTemplates.update();
                            setTimeout(function () {
                                manageTemplatesDialog.close();
                            });
						}
					}
				}
			]
		});

		manageTemplatesDialog.open();
	}

	// Because documentTemplates.save just postes a message and our message proxy does not support callback, we need a way to close the dialog 
	// when the templates update has completed 
	Cognito.Forms.closeTemplatesDialog = function () {
		if (manageTemplatesDialog)
			manageTemplatesDialog.close();
	}
});

// #endregion
