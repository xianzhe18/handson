Cognito.ready("build", ["Cognito.Forms", "ExoWeb.dom"], function ($) {
	//#region Global Variables
	var Grid = {
		full: 24,
		half: 12,
		minResize: 2,
		getDefaultPlaceholderWidth: function (maxCols) {
			//return Math.ceil(maxCols / 2);
			return Math.min(Grid.half, maxCols);
		}
	};

	Cognito.Grid = Grid;

	// Global variables for the form builder
	var viewColumnWidth = Grid.full;
	var currentElement = null;
	var settingsElement = null;
	var cutCopyElement = null;
	var isCut;
	var currentDropTarget;
	var dragging = false;
	var dragElementType = null;
	var initialSettingsTop;
	var actionBarHeight;

	// Prevent collision with intrinsic Entry properties and .NET types
	var reservedWords = ["id", "form", "parentsection", "itemnumber", "entry", "order", "datetime", "math", "decimal", "string", "object", "boolean", "char", "sbyte", "byte", "int16", "uint16", "int32", "uint32", "int64", "uint64", "single", "double", "timespan", "guid", "math", "convert", "if", "iif", "new"];

	var animations = new ExoWeb.Signal();
	var uuidCounter = 0;
	var rename = {
		serializedOldRootType: "",
		newFieldPath: "",
		oldFieldPath: ""
	};

	var sharePointCredentialsToDelete;
	var sharePointConditionType = new ExoWeb.Model.ConditionType.Error("SharePointCondition");
	var sharePointTimeZoneHoursOffset;

	var paymentConditionType = new ExoWeb.Model.ConditionType.Error("PaymentCondition");

	var formExpressionConditionTypes = {
		RequirePayment: new ExoWeb.Model.ConditionType.Error("requirePaymentExpressionError"),
		BillingNameField: new ExoWeb.Model.ConditionType.Error("billingNameFieldError"),
		BillingAddressField: new ExoWeb.Model.ConditionType.Error("billingAddressFieldError"),
		BillingPhoneField: new ExoWeb.Model.ConditionType.Error("billingNamePhoneError"),
		BillingEmailField: new ExoWeb.Model.ConditionType.Error("billingEmailFieldError"),
	};

	var calculatingVisiblePreview;

	//#endregion

	//#region Controller

	// The controller enables communication between the builder and the document templates page.
	var controller = {

		// Initialize Document Templates Dialog
		initDocumentTemplates: function initDocumentTemplates(documentTemplatesController) {
			// Creates a messaging proxy that enables communication with the document templates page
			controller.documentTemplates = Cognito.Messaging.proxy($("iframe[name=documentTemplates]")[0].contentWindow, documentTemplatesController);
			controller.documentTemplates.initForm(Cognito.Forms.model.currentForm);
		},

		// Document Templates Updated
		templatesUpdated: function templatesUpdated(templates, lastTemplateNumber) {
			// Update the form's document templates with the data from the dialog.
			ExoWeb.updateArray(Cognito.Forms.model.currentForm.get_DocumentTemplates(), templates);

			// Refresh the view in case documents are included in the confirmation and the document names have changed.
			Cognito.refreshElement(Cognito.Forms.model.currentElement);

			// Update the LastTemplateNumber with the data from the dialog
			Cognito.Forms.model.currentForm.set_LastTemplateNumber(lastTemplateNumber);
		}

	};

	Cognito.Forms.controller = controller;

	//#endregion

	//#region Localization

	Object.defineProperty(Cognito.resources, "ratings", {
		get: function () {
			return {
				satisfied: {
					label: Cognito.resources["field-ratingscale-satisfied-unsatisfied-label"],
					choices: Cognito.resources.getArray("field-ratingscale-satisfied-unsatisfied-options")
				},
				agree: {
					label: Cognito.resources["field-ratingscale-agree-disagree-label"],
					choices: Cognito.resources.getArray("field-ratingscale-agree-disagree-options")
				},
				will: {
					label: Cognito.resources["field-ratingscale-will-wont-label"],
					choices: Cognito.resources.getArray("field-ratingscale-will-wont-options")
				},
				good: {
					label: Cognito.resources["field-ratingscale-good-poor-label"],
					choices: Cognito.resources.getArray("field-ratingscale-good-poor-options")
				},
				onethrufive: {
					label: Cognito.resources["field-ratingscale-one-five-label"],
					choices: ["1", "2", "3", "4", "5"]
				}
			};
		}
	});

	Object.defineProperty(Cognito.resources, "toggleOptions", {
		get: function () {
			var options = Cognito.resources.getArray("field-toggle-options");
			options.push("Other");

			return options;
		}
	});

	//#endregion

	//#region Security Alert

	var securityAlerts = new ExoWeb.Model.ConditionTypeSet("Security Alerts");
	function createSecurityAlert(name, message, url) {
		var alert = new ExoWeb.Model.ConditionType.Error(name, message, [securityAlerts], "client");
		alert.url = url;
		return alert;
	}

	var securityAlertDialog;
	securityAlerts.addConditionsChanged(function (set, args) {
		if (!args.add || !builderInitialized || context.server.isApplyingChanges())
			return;

		if (!securityAlertDialog) {
			securityAlertDialog = $.fn.dialog({
				title: "Security Alert",
				contentSelector: "#security-alert-dialog",
				width: 800,
				height: 600,
				buttons: [
					{
						label: "OK",
						autoClose: true
					}
				]
			});

			securityAlertDialog._dialog.find(".c-modal-content").remove();
			securityAlertDialog._dialog.find(".c-modal-content-container").append("<iframe id='securityAlert' style='width: 100%; height: 100%; overflow-x: hidden; overflow-y: hidden; -ms-overflow-style: scrollbar'></iframe>");
		}

		securityAlertDialog._options.cancel = function () {
			$("#securityAlert").attr("src", "about:blank");
		};

		// Only show the warning dialog due to user initiated changes
		$("#securityAlert").attr("src", args.condition.type.url);
		securityAlertDialog.open();
	});

	//#endregion

	//#region  Callout
	Cognito.showCallout = function showCallout(callout, target) {
		if (Cognito.config.isUnitTesting || Cognito.config.hideCallouts || Cognito.config.anonymousRestored || Cognito.config.whiteLabel)
			return;
		callout = $(callout);
		target = $(target);
		if (!callout.length || !target.length)
			return;
		$(target).append(callout);
		callout.addClass('active-callout');
		$('#c-forms-layout-elements').addClass('new-field-callout');
	}

	Cognito.hideCallout = function hideCallout(callout) {
		$(callout).remove();
	}

	$(document).on("click", ".c-callout-dismiss", function dismissCallout(e) {
		$(this).parent(".c-callout").remove();
		e.stopPropagation();
		e.preventDefault();
	});
	//#endregion

	//#region Feature Availability

	var featureWarnings = new ExoWeb.Model.ConditionTypeSet("Feature Availability");
	function createFeatureWarning(name, message, url) {
		var feature = new ExoWeb.Model.ConditionType.Error(name, message, [featureWarnings], "client");
		feature.url = url;
		return feature;
	}

	var featureNotAvailableDialog;
	var builderInitialized = false;
	featureWarnings.addConditionsChanged(function (set, args) {

		if (!args.add || !builderInitialized || context.server.isApplyingChanges())
			return;

		if (!featureNotAvailableDialog) {
			featureNotAvailableDialog = $.fn.dialog({
				title: args.condition.type.url == "savesquarecustomercard" ? "Reconnect Square Account" : "Upgrade for more powerful forms",
				contentSelector: "#feature-not-available-dialog",
				width: 800,
				height: 600,
				buttons: [
					{
						label: "Close",
						autoClose: true
					}
				]
			});

			featureNotAvailableDialog._dialog.find(".c-modal-content").remove();
			featureNotAvailableDialog._dialog.find(".c-modal-content-container").append("<iframe id='featureNotAvailable' style='width: 100%; height: 100%; overflow-x: hidden; overflow-y: hidden; -ms-overflow-style: scrollbar'></iframe>");
			featureNotAvailableDialog._dialog.find(".c-modal-button-bar").remove();
		}

		featureNotAvailableDialog._options.cancel = function () {
			$("#featureNotAvailable").attr("src", "about:blank");
			featureWarningCancelled(args.condition.type);
		};

		// Only show the warning dialog due to user initiated changes
		$("#featureNotAvailable").attr("src", args.condition.type.url);
		featureNotAvailableDialog.open();
	});

	function featureWarningCancelled(conditionType) {
		if (conditionType.url) {
			var $section;
			if (conditionType.url === "saveandresume")
				$section = $(".c-forms-settings-save-and-resume-section");
			else if (conditionType.url === "entrysharing")
				$section = $(".c-forms-settings-entry-sharing-section:visible");

			if ($section) {
				$section.next().slideUp(500);
				$section.addClass("c-collapsed");
			}
		}
	}

	//#endregion

	//#region Element Types

	/*
	// Client-side model to assist in the presentment of field settings and the rendering of the field in the layout pane
	<Element>: {
		type: "Input" | "Layout", // Used to categorize the presentment of the fields in the â€œAdd Fieldâ€ pane
		tag: "field" | "content" | "pageBreak" | "progressBar" | "section" | "table", // Additional metadata used to correctly display/render elements in the layout pane (.c-forms-layout-<tag>)
		fieldType: Field.FieldType.Name, // FieldType enum
		name: "<name>", // The value displayed in the â€œAdd Fieldâ€ pane
		icon: "icon-<name>", // The name of the icon
		defaultWidth: -1 | 1 | 2, // The number of columns the element should span by default. If a -1 is specified then the default width is the viewColumnWidth (form's column layout). The default value is the minimum width.
		minimumWidth: -1 | 1 | 2, // The minimum number of columns the element can span. If a -1 is specified then the default width is the viewColumnWidth (form's column layout).  The default value is 1.
		maximumWidth: -1 | 2, // The maximum number of columns the element can span. The default value is the viewColumnWidth.
		canAddToSection: true | false, // Indicates whether or not the an element can be added to a section. The default value is true.
		canRequire: true | false, // Indicates whether or not the "Is Required" setting is displayed. The default value is true.
		canDefault: true | false, // Indicates whether or not the "Default Value" setting is displayed. The default value is true.
		canLimit: true | false, // Indicates whether or not the Range setting is displayed. The default value is false.
		helpText: "<Description>",
		hasSubTypes: true | false, // Indicates whether or not the type setting is displayed. The default value  is false.
		isEnabled: true | false, // Indicates whether or not the field is enabled in the "Add Field" pane. The default value is true.
		defaultLabel: "<label>", // The key used to look into Cognito.resources for the default value of the label setting. The default value is "Untitled".
		// hasSubTypes == true
		subTypes: [
			{
				fieldSubType: Field.FieldSubType.Name, // FieldSubType enum
				name: "<name>", // The value displayed in the "Field Settings" pane
				helpText: "<Description>"
			}
		]
	}
	*/
	var elementTypes = {
		Text: {
			type: "Input",
			tag: "field",
			fieldType: "Text",
			name: "Textbox",
			icon: "icon-font",
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: false,
			hasSubTypes: true,
			hasPlaceholderText: true,
			helpText: "Used to collect free-form, text-based responses.",
			subTypes: [
				{
					fieldSubType: "SingleLine",
					name: "Single Line",
					helpText: "The Single Line Text field is used to collect single line, text based responses.  This is the most commonly used field type on a form.",
					canLimitQuantities: true
				},
				{
					fieldSubType: "MultipleLines",
					name: "Multiple Lines",
					helpText: "Similar to the Single Line Text field, the Multiple Lines Text field is used collect text based responses.  In addition, this field spans multiple lines and is better suited for collecting longer responses."
				},
				{
					fieldSubType: "Password",
					name: "Password",
					helpText: "The Password field is used to collect single line, text based responses that are intended to be hidden.  Use of this field will force the form to use encryption."
				},
			]
		},
		Name: {
			type: "Input",
			tag: "field",
			fieldType: "Name",
			name: "Name",
			icon: "icon-smile",
			defaultWidth: -1,
			minimumWidth: Grid.full / 6,
			canProtect: true,
			canAddToSection: true,
			canAddToTable: false,
			canRequire: true,
			canDefault: false,
			canLimit: false,
			helpText: "Used to collect a person&apos;s name (first, middle, last&hellip;) in a single field.",
			isEnabled: true,
			defaultLabel: "element-label-name"
		},
		Choice: {
			type: "Input",
			tag: "field",
			fieldType: "Choice",
			name: "Choice",
			icon: "icon-list-ul",
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: false,
			canCollectPayment: true,
			canAssignPrices: true,
			canAssignValues: true,
			hasChoices: true,
			hasSubTypes: true,
			helpText: "Allows users to select from predefined options in the form of a dropdown, radio buttons, or checkboxes.",
			subTypes: [
				{
					fieldSubType: "DropDown",
					name: "Drop Down",
					helpText: "The Choice, Drop Down field allows a user to select a single value from a list of choices presented in a single line box. The list of choices are displayed when the user clicks an arrow to open the list of choices.",
					canDefault: true,
					canLimitQuantities: true,
					hasPlaceholderText: true
				},
				{
					fieldSubType: "RadioButtons",
					name: "Radio Buttons",
					helpText: "The Choice, Radio Buttons field allows a user to select a single value from a list of choices presented as a group of radio buttons.  With a radio button, users make a choice among a set of mutually exclusive choices.",
					hasColumns: true,
					canDefault: true,
					canAddToTable: false,
					canLimitQuantities: true,
					hasPlaceholderText: false
				},
				{
					fieldSubType: "Checkboxes",
					name: "Checkboxes",
					helpText: "The Choice, Checkboxes field allows a user to select multiple values from a list of choices presented as a group of checkboxes. With a check box, users indicate a selection by checking the box next to the choice.",
					hasColumns: true,
					canAddToTable: false,
					canLimitQuantities: false,
					hasPlaceholderText: false
				},
			]
		},
		Address: {
			type: "Input",
			tag: "field",
			fieldType: "Address",
			name: "Address",
			icon: "icon-map-marker",
			defaultWidth: -1,
			minimumWidth: Grid.full / 6,
			canProtect: true,
			canAddToSection: true,
			canAddToTable: false,
			hasPlaceholderText: false,
			canRequire: true,
			canDefault: false,
			canLimit: false,
			helpText: "Used to collect address information (street, city, state, zip &hellip;) in a single field.",
			isEnabled: true,
			defaultLabel: "element-label-address",
			hasSubTypes: true,
			subTypes: [
				{
					fieldSubType: "USAddress",
					name: "US"
				},
				{
					fieldSubType: "InternationalAddress",
					name: "International"
				}
			]
		},
		YesNo: {
			type: "Input",
			tag: "field",
			fieldType: "YesNo",
			name: "Yes/No",
			icon: "icon-check",
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: false,
			canCollectPayment: true,
			canAssignPrices: true,
			hasSubTypes: true,
			helpText: "Allows a user to specify yes/no or true/false responses by checking a box.",
			canLimitQuantities: true,
			subTypes: [
				{
					fieldSubType: "RadioButtons",
					name: "Radio Buttons",
					helpText: "The Yes/No, Radio Buttons field allows a user to specify yes/no or true/false responses by selecting the response from a set of mutually exclusive choices.",
					canAddToTable: false
				},
				{
					fieldSubType: "Checkbox",
					name: "Checkbox",
					helpText: "The Yes/No, Checkbox field allows a user to specify yes/no or true/false responses by checking a box.",
					canAddToTable: false
				},
				{
					fieldSubType: "Toggle",
					name: "Toggle",
					helpText: "The Yes/No, Toggle field allows a user to specify yes/no or true/false responses by clicking buttons to toggle between the two states representing the choices."
				},
			]
		},
		Phone: {
			type: "Input",
			tag: "field",
			fieldType: "Phone",
			name: "Phone",
			icon: "icon-phone",
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: false,
			helpText: "Used to collect valid phone numbers.",
			defaultLabel: "element-label-phone",
			hasSubTypes: true,
			hasPlaceholderText: true,
			canLimitQuantities: true,
			subTypes: [
				{
					fieldSubType: "USPhone",
					name: "US"
				},
				{
					fieldSubType: "InternationalPhone",
					name: "International"
				}
			]
		},
		Date: {
			type: "Input",
			tag: "field",
			fieldType: "Date",
			name: "Date",
			icon: "icon-calendar",
			hasSubTypes: true,
			hasPlaceholderText: true,
			helpText: "Used to collect date/time responses.",
			canLimitQuantities: true,
			subTypes: [
				{
					fieldSubType: "Date",
					name: "Date",
					helpText: "The Date field presents a date picker to collect valid date responses."
				},
				{
					fieldSubType: "Time",
					name: "Time",
					helpText: "The Time field presents a time picker to collect valid time responses.",
					icon: "icon-time"
				},
				//{
				//	fieldSubType: "DateTime",
				//	name: "Date & Time",
				//	helpText: "The Date & Time field presents both a date picker and a time picker to collect valid date time responses."
				//}
			],
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: true
		},
		Email: {
			type: "Input",
			tag: "field",
			fieldType: "Email",
			name: "Email",
			icon: "icon-envelope",
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: false,
			hasPlaceholderText: true,
			helpText: "Used to collect valid email addresses.",
			defaultLabel: "element-label-email",
			canLimitQuantities: true
		},
		Number: {
			type: "Input",
			tag: "field",
			fieldType: "Number",
			name: "Number",
			icon: "c-forms-icon-number",
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: true,
			hasSubTypes: true,
			hasPlaceholderText: true,
			helpText: "Used to collect number values such as integers, decimals, or percentages.",
			subTypes: [
				{
					fieldSubType: "Integer",
					name: "Integer",
					helpText: "The Integer field is used to collect negative or positive whole numbers."
				},
				{
					fieldSubType: "Decimal",
					name: "Decimal",
					helpText: "The Decimal field is used to collect numerical responses requiring a decimal point. Cognito will prevent responses from exceeding the specified number of decimal spaces."
				},
				{
					fieldSubType: "Percent",
					name: "Percent",
					helpText: "The Percent field is used to collect numerical responses displayed as percentages."
				},
			]
		},
		Website: {
			type: "Input",
			tag: "field",
			fieldType: "Website",
			name: "Website",
			icon: "icon-link",
			maximumWidth: 2,
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: false,
			hasPlaceholderText: true,
			helpText: "Used to collect valid URLs or website addresses.",
			defaultLabel: "element-label-website",
			canLimitQuantities: true
		},
		Currency: {
			type: "Input",
			tag: "field",
			fieldType: "Currency",
			name: "Currency",
			icon: "icon-money",
			canProtect: true,
			canAddToSection: true,
			canRequire: true,
			canDefault: true,
			canLimit: true,
			canCollectPayment: true,
			hasPlaceholderText: true,
			helpText: "Used to collect responses that are in monetary formats."
		},
		RatingScale: {
			type: "Input",
			tag: "field",
			fieldType: "RatingScale",
			name: "Rating Scale",
			icon: "icon-tasks",
			defaultWidth: -1,
			canProtect: true,
			canAddToTable: false,
			minimumWidth: Grid.half,
			helpText: "A matrix of choices or a Likert scale to allow users to rank statements or questions."
		},
		Price: {
			type: "Input",
			tag: "field",
			fieldType: "Calculation",
			name: "Price",
			icon: "icon-dollar",
			canProtect: true,
			canAddToSection: true,
			canRequire: false,
			canDefault: false,
			canLimit: true,
			canCollectPayment: true,
			helpText: "Used to specify the price of an item, either fixed or calculated, along with the name and description to include on the receipt."
		},
		Signature: {
			type: "Input",
			tag: "field",
			fieldType: "Signature",
			name: "Signature",
			icon: "icon-pencil",
			canAddToSection: true,
			canAddToTable: false,
			canRequire: true,
			canDefault: false,
			minimumWidth: Grid.full / 6,
			helpText: "Used to capture a hand-written electronic signature.",
			defaultLabel: "element-label-signature"
		},
		Content: {
			type: "Layout",
			tag: "content",
			name: "Content",
			icon: "icon-edit",
			//maximumWidth: 2,
			canAddToSection: true,
			canAddToTable: false,
			canRequire: false,
			canShowError: false,
			canDefault: false,
			canLimit: false,
			helpText: "Used to display read-only text on the form."
		},
		PageBreak: {
			type: "Layout",
			tag: "pageBreak",
			name: "Page Break",
			icon: "icon-resize-horizontal",
			minimumWidth: -1,
			canAddToSection: false,
			canAddToTable: false,
			canRequire: false,
			canShowError: false,
			canDefault: false,
			canLimit: false,
			helpText: "Used to split your form into multiple pages where each page represents a step in the collection process.",
			isEnabled: true
		},
		ProgressBar: { isEnabled: false, type: "Layout", tag: "progressBar" },
		Section: {
			type: "Layout",
			tag: "section",
			fieldType: "Entity",
			name: "Section",
			icon: "icon-file",
			defaultWidth: -1,
			minimumWidth: Grid.full / 3,
			canAddToSection: true,
			canAddToTable: false,
			hasPlaceholderText: false,
			canRequire: false,
			canDefault: false,
			canLimit: false,
			maxGridColumns: Grid.full,
			defaultColspan: Grid.half,
			minColspan: 4,
			helpText: "A container used to group a set of related fields."
		},
		RepeatingSection: {
			type: "Layout",
			tag: "section",
			fieldType: "EntityList",
			name: "Repeating Section",
			icon: "icon-copy",
			defaultWidth: -1,
			minimumWidth: Grid.full / 3,
			canAddToSection: true,
			canAddToTable: false,
			hasPlaceholderText: false,
			canRequire: false,
			canDefault: false,
			canLimit: true,
			maxGridColumns: Grid.full,
			defaultColspan: Grid.half,
			minColspan: 4,
			helpText: "A container used to group a set of fields that repeats as needed, allowing users to add multiple instances of the section to the form."
		},
		Table: {
			type: "Layout",
			tag: "table",
			fieldType: "EntityList",
			name: "Table",
			icon: "icon-table",
			defaultWidth: -1,
			canAddToSection: true,
			canAddToTable: false,
			hasPlaceholderText: false,
			canRequire: false,
			canDefault: false,
			canLimit: true,
			minimumWidth: Grid.full / 6,
			maxGridColumns: Grid.full,
			minColspan: 3,
			defaultColspan: 6,
			helpText: "Display fields as columns in a table where each row can be repeated as needed. Summarize columns using count, sum, or custom calculations."
		},
		File: {
			type: "Advanced",
			tag: "field",
			fieldType: "File",
			name: "File Upload",
			icon: "icon-upload",
			minimumWidth: 6,
			canProtect: true,
			canAddToSection: true,
			canAddToTable: false,
			canRequire: true,
			canDefault: false,
			canLimit: false,
			helpText: "Used to upload one or more files."
		},
		Calculation: {
			type: "Advanced",
			tag: "field",
			fieldType: "Calculation",
			name: "Calculation",
			icon: "icon-bolt",
			canProtect: true,
			canAddToSection: true,
			canRequire: false,
			canDefault: false,
			canLimit: false,
			hasSubTypes: true,
			helpText: "Displays a read-only value based on a calculation which may include values from other form fields on the form.",
			subTypes: [
				{
					fieldSubType: "SingleLine",
					name: "Text",
					helpText: "The text field is used to collect text based responses.",
					canLimitQuantities: true
				},
				{
					fieldSubType: "YesNo",
					name: "Yes/No",
					helpText: "Allows a user to specify yes/no or true/false responses by checking a box.",
					canLimitQuantities: true
				},
				{
					fieldSubType: "Decimal",
					name: "Number",
					helpText: "The Number field is used to collect numerical responses requiring a decimal point. Cognito will prevent responses from exceeding the specified number of decimal spaces."
				},
				{
					fieldSubType: "Percent",
					name: "Percent",
					helpText: "The Percent field is used to collect numerical responses displayed as percentages."
				},
				{
					fieldSubType: "Currency",
					name: "Currency",
					helpText: "The Currency field is used to collect valid monetary values."
				},
				{
					fieldSubType: "Date",
					name: "Date",
					helpText: "The Date field presents a date picker to collect valid date responses.",
					canLimitQuantities: true
				},
				{
					fieldSubType: "Time",
					name: "Time",
					helpText: "The Time field presents a time picker to collect valid time responses.",
					canLimitQuantities: true
				}
				//{
				//	fieldSubType: "DateTime",
				//	name: "Date & Time",
				//	helpText: "The Date & Time field presents both a date picker and a time picker to collect valid date time responses."
				//}
			]
		}
	};

	Cognito.Forms.elementTypes = elementTypes;

	function initElementTypes() {
		// Add additional properties to the elementTypes object
		for (var prop in elementTypes) {
			var elementType = elementTypes[prop];
			elementType.code = prop;

			//// Add a reference to the corresponding FieldType
			elementType["fieldType"] = Cognito.FieldType.get_All().filter(function (a) { return a.get_Name() === elementType.fieldType; })[0];
			if (elementType.fieldType)
				elementType.fieldType.set_elementType(elementType);

			// Add missing properties w/ default values
			elementType["canValidate"] = elementType["canRequire"] || elementType["canLimit"];
			elementType["hasSubTypes"] = elementType["hasSubTypes"] == undefined ? false : elementType["hasSubTypes"];
			elementType["hasChoices"] = elementType["hasChoices"] == undefined ? false : elementType["hasChoices"]; // TODO: Remove unnecessary property, Replace UI usage with .code === 'Choice'
			elementType["isEnabled"] = elementType["isEnabled"] == undefined ? true : elementType["isEnabled"];
			elementType["defaultLabel"] = elementType["defaultLabel"] == undefined ? "element-label-default" : elementType["defaultLabel"];
			elementType["canAddToSection"] = elementType["canAddToSection"] == undefined ? true : elementType["canAddToSection"];
			elementType["canAddToTable"] = elementType["canAddToTable"] == undefined ? true : elementType["canAddToTable"];
			elementType["canRequire"] = elementType["canRequire"] == undefined ? true : elementType["canRequire"];
			elementType["canShowError"] = elementType["canShowError"] == undefined ? true : elementType["canShowError"];
			elementType["canDefault"] = elementType["canDefault"] == undefined ? true : elementType["canDefault"];
			elementType["canLimit"] = elementType["canLimit"] == undefined ? false : elementType["canLimit"];
			elementType["canCollectPayment"] = elementType["canCollectPayment"] == undefined ? false : elementType["canCollectPayment"];
			elementType["canAssignPrices"] = elementType["canAssignPrices"] == undefined ? false : elementType["canAssignPrices"];
			elementType["canAssignValues"] = elementType["canAssignValues"] == undefined ? false : elementType["canAssignValues"];
			elementType["canLimitQuantities"] = elementType["canLimitQuantities"] == undefined ? false : elementType["canLimitQuantities"];

			// Minimum Width
			elementType.minimumWidth = elementType.minimumWidth || (Grid.full / 6);
			if (elementType.minimumWidth < 0)
				elementType.minimumWidth = viewColumnWidth;

			// Maximum Width
			elementType.maximumWidth = elementType.maximumWidth || viewColumnWidth;
			if (elementType.maximumWidth < 0)
				elementType.maximumWidth = viewColumnWidth;

			// Default Width
			elementType.defaultWidth = elementType.defaultWidth || Math.max(elementType.minimumWidth, Grid.full / 2);
			if (elementType.defaultWidth < 0)
				elementType.defaultWidth = viewColumnWidth;

			if (elementType.subTypes) {
				elementType.subTypes.forEach(function (subType) {
					// Add a reference to the corresponding FieldSubType
					subType["fieldSubType"] = Cognito.FieldSubType.get_All().filter(function (s) { return s.get_Name() === subType.fieldSubType; })[0];
				});
			}
		}
	}
	//#endregion

	//#region Model Type Definitions

	var image = context.model.meta.addType("Cognito.Image");
	image.addProperty({ name: "file", type: Cognito.FileDataRef })
		.addChanged(function (sender, args) {
			if (!args.calculated && !args.newValue) {
				sender.set_url(null);
			}
		});
	image.addProperty({ name: "source", type: String })
		.allowedValues(function () { return ["URL", "File"]; })
		.defaultValue("URL");
	image.addProperty({ name: "url", type: String });
	image.addProperty({ name: "width", type: Number });
	image.addProperty({ name: "height", type: Number });
	image.addProperty({ name: "constrain", type: Boolean });

	$extend("Cognito.Payment.PaymentAccountRef", function (account) {
		account.meta.addProperty({ name: "defaultCurrency", type: Cognito.Currency });
		account.meta.addProperty({ name: "canIncludeProcessingFees", type: Boolean });
		account.meta.addProperty({ name: "canSaveSquareCustomerCard", type: Boolean }).calculated({
			calculate: function () {
				return Cognito.Payment.model.canSaveSquareCustomerCard;
			}
		});;
	});

	$extend("Cognito.Forms.Form", function (form) {

		form.meta.addProperty({ name: "tokens", type: Object, isList: true }).calculated({
			calculate: function () {
				return Cognito.Forms.generateTokens();
			}
		});

		// The list of tokens excluding the protected tokens. This list is used to display the tokens
		// that are allowed to be inserted into an email message.
		form.meta.addProperty({ name: "protectedTokens", type: Object, isList: true }).calculated({
			calculate: function () {
				var protectedTokens = [];
				var that = this;

				this.get_tokens().forEach(function (sender, args) {
					if (!sender.IsProtected) {
						protectedTokens.push(sender);
					}
				});

				return protectedTokens;
			},
			onChangeOf: ["tokens"]
		});

		form.meta.addProperty({ name: "namePaths", type: String, isList: true }).calculated({
			calculate: function () {
				var paths = [];
				this.get_tokens().forEach(function (sender, args) {
					if (sender.FieldType === "Name")
						paths.push(sender.InternalName);
				});

				return paths;
			},
			onChangeOf: "tokens"
		});

		form.meta.addProperty({ name: "addressPaths", type: String, isList: true }).calculated({
			calculate: function () {
				var paths = [];
				this.get_tokens().forEach(function (sender, args) {
					if (sender.FieldType === "Address")
						paths.push(sender.InternalName);
				});

				return paths;
			},
			onChangeOf: "tokens"
		});

		form.meta.addProperty({ name: "phonePaths", type: String, isList: true }).calculated({
			calculate: function () {
				var paths = [];
				this.get_tokens().forEach(function (sender, args) {
					if (sender.FieldType === "Phone")
						paths.push(sender.InternalName);
				});

				return paths;
			},
			onChangeOf: "tokens"
		});

		form.meta.addProperty({ name: "emailPaths", type: String, isList: true }).calculated({
			calculate: function () {
				var paths = [];
				this.get_tokens().forEach(function (sender, args) {
					if (sender.FieldType === "Email")
						paths.push(sender.InternalName);
				});

				return paths;
			},
			onChangeOf: "tokens"
		}).addChanged(function (sender, args) {
			// clear the mapped email field if the path is no longer valid
			var mappedEmailPath = sender.get_BillingEmailField();
			if (mappedEmailPath && sender.get_emailPaths().indexOf(mappedEmailPath) == -1) {
				// clear the mapped email field
				sender.set_BillingEmailField(null);

				// Rerender the payment block
				renderPayment();
			}
		});

		form.$Name.addChanged(function (sender, args) {
			if (!args.calculated) {
				if (!sender.get_Name() || sender.get_Name().trim() === "")
					// Queue up the script to default the name to "Untitled"
					window.setTimeout(function () { sender.set_Name(Cognito.resources["element-label-default"]); });
				else
					updateFormat();
			}
		});

		form.meta.addProperty({ name: "HasChanges", type: Boolean });

		form.$InternalName.defaultValue("Form");

		// Template Share Url
		form.meta.addProperty({ name: "templateShareUrl", type: String })
			.calculated({
				calculate: function () {
					return Cognito.config.formsUrl + "templates/shared/" + Cognito.config.organizationCode + "/" + Cognito.Forms.model.currentForm.get_InternalName();
				},
				onChangeOf: "InternalName"
			});

		form.meta.addProperty({ name: "folderId", type: String });

		// International Form
		form.meta.addProperty({ name: "internationalForm", type: Boolean })
			.calculated({
				calculate: function () {
					var international = false;
					if (this.get_Localization() && this.get_Localization().get_Country()) {
						return this.get_Localization().get_Country().get_Code() !== "US";
					}

					return international;
				},
				onChangeOf: ["Localization.Country"]
			});

		// format
		form.meta.addProperty({ name: "format", type: String });

		// Add endpoint notification
		form.$EnablePostToEndpoint.addChanged(function (sender, args) {
			if (sender.get_EnablePostToEndpoint() && !sender.get_endpointNotification())
				sender.get_Notifications().add(new Cognito.EndpointNotification());
		});

		// endpointNotification
		form.meta.addProperty({ name: "endpointNotification", type: Cognito.EndpointNotification })
			.calculated({
				calculate: function () {
					return this.get_Notifications().filter(function (n) { return n instanceof Cognito.EndpointNotification; })[0] || null;
				},
				onChangeOf: "Notifications"
			});

		// Submit Entry Endpoint
		form.meta.addProperty({ name: "submitUrl", type: String }).label("Submit Entry Endpoint")
			.calculated({
				calculate: function () {
					return this.get_endpointNotification() ? this.get_endpointNotification().get_SubmitEndpoint() : null;
				},
				onChangeOf: "endpointNotification"
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var url = sender.get_submitUrl();
					if (url && !/^http:\/\/|https:\/\//.test(url)) {
						url = "http://" + url;
						sender.set_submitUrl(url);
					}

					sender.get_endpointNotification().set_SubmitEndpoint(url);
				}
			}).errorIf({
				isValid: function (form) {
					// Invalid if the url begins with http:// and encryption is enabled
					var url = form.get_submitUrl();
					return (!form.get_EncryptEntries() || !url) ||
						(Cognito.config.allowEntryEncryption && form.get_EncryptEntries() && url && url.indexOf("https") === 0);
				},
				message: "Encrypted entries may only be transmitted over a secure channel.",
				onChangeOf: ["EncryptEntries"]
			}).errorIf({
				isValid: function (form) {
					// Invalid if the url begines with http:// and the form contains a signature
					var url = form.get_submitUrl();
					return !(url && url.indexOf("https") !== 0 && visitFields(form, function (field) { return field.get_FieldType().get_Name() === "Signature"; }));
				},
				message: "Signature field data may only be transmitted over a secure channel.",
				onChangeOf: ["Fields"]
			});

		// Update Entry Endpoint
		form.meta.addProperty({ name: "updateUrl", type: String }).label("Update Entry Endpoint")
			.calculated({
				calculate: function () {
					return this.get_endpointNotification() ? this.get_endpointNotification().get_UpdateEndpoint() : null;
				},
				onChangeOf: "endpointNotification"
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var url = sender.get_updateUrl();
					if (url && !/^http:\/\/|https:\/\//.test(url)) {
						url = "http://" + url;
						sender.set_updateUrl(url);
					}

					sender.get_endpointNotification().set_UpdateEndpoint(url);
				}
			}).errorIf({
				isValid: function (form) {
					// Invalid if the url begins with http:// and encryption is enabled
					var url = form.get_updateUrl();
					return (!form.get_EncryptEntries() || !url) ||
						(Cognito.config.allowEntryEncryption && form.get_EncryptEntries() && url && url.indexOf("https") === 0);
				},
				message: "Encrypted entries may only be transmitted over a secure channel.",
				onChangeOf: ["EncryptEntries"]
			}).errorIf({
				isValid: function (form) {
					// Invalid if the url begines with http:// and the form contains a signature
					var url = form.get_updateUrl();
					return !(url && url.indexOf("https") !== 0 && visitFields(form, function (field) { return field.get_FieldType().get_Name() === "Signature"; }));
				},
				message: "Signature field data may only be transmitted over a secure channel.",
				onChangeOf: ["Fields"]
			});

		// sharePointNotification
		form.meta.addProperty({ name: "sharePointNotification", type: Cognito.Forms.SharePointNotification })
			.calculated({
				calculate: function () {
					return this.get_Notifications().filter(function (n) { return n instanceof Cognito.Forms.SharePointNotification; })[0] || null;
				},
				onChangeOf: "Notifications"
			});

		form.meta.addProperty({ name: "sharePointSiteUrl", type: String })
			.label("Microsoft SharePoint Site Url")
			.required()
			.calculated({
				calculate: function () {
					return this.get_sharePointNotification() ? this.get_sharePointNotification().get_SiteUrl() : null;
				}
			})
			.errorIf({
				isValid: function (form) {
					// Invalid if the url begins with http:// and encryption is enabled
					return (!form.get_EncryptEntries() || !form.get_sharePointSiteUrl()) ||
						(Cognito.config.allowEntryEncryption && form.get_EncryptEntries() && form.get_sharePointSiteUrl() && form.get_sharePointSiteUrl().indexOf("https") === 0);
				},
				message: "Encrypted entries may only be transmitted over a secure channel.",
				onChangeOf: ["EncryptEntries"]
			})
			.errorIf({
				isValid: function (form) {
					// Invalid if the url begines with http:// and the form contains a signature
					return !(form.get_sharePointSiteUrl() && form.get_sharePointSiteUrl().indexOf("https") !== 0 && visitFields(form, function (field) { return field.get_FieldType().get_Name() === "Signature"; }));
				},
				message: "Signature field data may only be transmitted over a secure channel.",
				onChangeOf: ["Fields"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var url = sender.get_sharePointSiteUrl();
					if (url !== null && url !== "" && !/^http:\/\/|https:\/\//.test(url))
						sender.set_sharePointSiteUrl("http://" + url);
				}
			});

		form.meta.addProperty({ name: "uiSharePointSiteUrl", type: String }).label("Url").calculated({
			calculate: function () {
				var value = this.get_sharePointSiteUrl();
				if (value !== null) {
					var startOfUrl = value.indexOf("://") + 3;
					value = value.substr(startOfUrl, value.length - startOfUrl);
				}

				return value;
			},
			onChangeOf: "sharePointSiteUrl"
		});

		form.meta.addProperty({ name: "sharePointUserName", type: String }).label("Username").required().calculated({
			calculate: function () {
				return this.get_sharePointNotification() ? this.get_sharePointNotification().get_Credentials().get_Username() : null;
			}
		});

		form.meta.addProperty({ name: "sharePointPassword", type: String }).label("Password").required();

		// Stores the valid site url used to establish a SharePoint connnection
		form.meta.addProperty({ name: "validSharePointUrl", type: String }).calculated({
			calculate: function () {
				return this.get_sharePointNotification() ? this.get_sharePointNotification().get_SiteUrl() : null;
			}
		});

		// Stores the valid username used to establish a SharePoint connnection
		form.meta.addProperty({ name: "validSharePointUsername", type: String }).calculated({
			calculate: function () {
				return this.get_sharePointNotification() ? this.get_sharePointNotification().get_Credentials().get_Username() : null;
			}
		});

		// Stores the valid password used to establish a SharePoint connnection
		form.meta.addProperty({
			name: "validSharePointPassword", type: String
		});

		form.meta.addProperty({
			name: "sharePointLists", type: String, isList: true, ignoreValidation: true
		});

		form.meta.addProperty({ name: "sharePointListName", type: String })
			.label("List Name")
			.calculated({
				calculate: function () {
					return this.get_sharePointNotification() ? this.get_sharePointNotification().get_ListName() : null;
				},
				onChangeOf: "sharePointLists"
			})
			.allowedValues("sharePointLists");

		// Flag used to display the edit view
		form.meta.addProperty({ name: "editSharePointCredentials", type: Boolean }).calculated({
			calculate: function () {
				return this.get_sharePointNotification() == null;
			},
			onChangeOf: "sharePointNotification"
		});

		// Flag indicating a successful connection, used to show/hide the "Cancel" button
		form.meta.addProperty({ name: "connectedToSharePoint", type: Boolean }).calculated({
			calculate: function () {
				return this.get_sharePointNotification() != null;
			}
		});

		form.meta.addProperty({ name: "limitAvailability", type: Boolean }).calculated({
			calculate: function () {
				return this.get_AvailabilityStart() !== null || this.get_AvailabilityEnd() !== null;
			}
		})
			.addChanged(function (sender, args) {
				if (!sender.get_limitAvailability()) {
					sender.set_AvailabilityStart(null);
					sender.set_AvailabilityEnd(null);
				}
			});

		form.meta.addProperty({ name: "availabilityStartDate", type: Date, format: "d" })
			.calculated({
				calculate: function () {
					return this.get_AvailabilityStart();
				},
				onChangeOf: ["AvailabilityStart"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var date = sender.get_AvailabilityStart() || new Date();
					var value = args.newValue;

					if (value) {
						var newDate = args.oldValue ?
							new Date(date.setFullYear(value.getFullYear(), value.getMonth(), value.getDate())) :
							new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0);

						sender.set_AvailabilityStart(newDate);
					} else {
						sender.set_AvailabilityStart(null);
					}
				}
			});

		form.meta.addProperty({ name: "availabilityStartTime", type: Date, format: "t" })
			.calculated({
				calculate: function () {
					return this.get_AvailabilityStart();
				},
				onChangeOf: ["AvailabilityStart"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var date = sender.get_AvailabilityStart() || new Date();
					var value = args.newValue;

					if (value) {
						var newDate = new Date(date.setHours(value.getHours(), value.getMinutes()));
						sender.set_AvailabilityStart(newDate);
					} else if (sender.get_AvailabilityStart()) {
						sender.set_AvailabilityStart(new Date(date.setHours(0, 0)));
					}
				}
			});

		form.meta.addProperty({ name: "availabilityEndDate", type: Date, format: "d" })
			.calculated({
				calculate: function () {
					return this.get_AvailabilityEnd();
				},
				onChangeOf: ["AvailabilityEnd"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var date = sender.get_AvailabilityEnd() || new Date();
					var value = args.newValue;

					if (value) {
						var newDate = args.oldValue ?
							new Date(date.setFullYear(value.getFullYear(), value.getMonth(), value.getDate())) :
							new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0);

						sender.set_AvailabilityEnd(newDate);
					} else {
						sender.set_AvailabilityEnd(null);
					}
				}
			});

		form.meta.addProperty({ name: "availabilityEndTime", type: Date, format: "t" })
			.calculated({
				calculate: function () {
					return this.get_AvailabilityEnd();
				},
				onChangeOf: ["AvailabilityEnd"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var date = sender.get_AvailabilityEnd() || new Date();
					var value = args.newValue;

					if (value) {
						var newDate = new Date(date.setHours(value.getHours(), value.getMinutes()));
						sender.set_AvailabilityEnd(newDate);
					} else if (sender.get_AvailabilityEnd()) {
						sender.set_AvailabilityEnd(new Date(date.setHours(0, 0)));
					}
				}
			});

		// UI property to represent the AllowSharedEditLinks radio buttons
		form.meta.addProperty({ name: "allowSharedEditLinks", type: String }).calculated({
			calculate: function () {
				var expr = this.get_AllowSharedEditLinks();
				if (expr == "true")
					return "Always";
				else if (expr == "false")
					return "Never";
				else
					return "When";
			}
		}).allowedValues(function () {
			return ["Always", "When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			if (args.newValue == "Always")
				sender.set_AllowSharedEditLinks("true");
			else if (args.newValue == "Never")
				sender.set_AllowSharedEditLinks("false");
			else {
				sender.set_AllowSharedEditLinks(null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);
				var selectedElement = currentElement;
				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "AllowSharedEditLinks", "Allow Editing When...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
					var form = Cognito.Forms.model.currentForm;
					if (newExpression === "")
						form.set_allowSharedEditLinks("Always");
					else
						form.set_AllowSharedEditLinks(newExpression);
				},
					function () {
						Cognito.Forms.model.currentForm.set_allowSharedEditLinks("Always");
					});
			}
		});

		// UI property to show a preview of the AllowSharedEditLinks expression (if possible)
		form.meta.addProperty({ name: "allowSharedEditLinksPreview", type: String }).calculated({
			calculate: function () {
				var expr = this.get_AllowSharedEditLinks();
				var that = this;

				// Only important if required is an non-empty/null expression
				if (this.get_allowSharedEditLinks() != "When" || expr == "" || expr == null)
					return null;

				// Try to create required preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, "", expr, function (preview) {

					that.set_allowSharedEditLinksPreview(preview);
				});
			},
			onChangeOf: ["AllowSharedEditLinks"]
		});

		// UI property to represent the AllowSharedViewLinks radio buttons
		form.meta.addProperty({ name: "allowSharedViewLinks", type: String }).calculated({
			calculate: function () {
				var expr = this.get_AllowSharedViewLinks();
				if (expr == "true")
					return "Always";
				else if (expr == "false")
					return "Never";
				else
					return "When";
			}
		}).allowedValues(function () {
			return ["Always", "When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			if (args.newValue == "Always")
				sender.set_AllowSharedViewLinks("true");
			else if (args.newValue == "Never")
				sender.set_AllowSharedViewLinks("false");
			else {
				sender.set_AllowSharedViewLinks(null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);
				var selectedElement = currentElement;
				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "AllowSharedViewLinks", "Allow Viewing When...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
					var form = Cognito.Forms.model.currentForm;
					if (newExpression === "")
						form.set_allowSharedViewLinks("Always");
					else
						form.set_AllowSharedViewLinks(newExpression);
				},
					function () {
						Cognito.Forms.model.currentForm.set_allowSharedViewLinks("Always");
					});
			}
		});

		// UI property to show a preview of the AllowSharedViewLinks expression (if possible)
		form.meta.addProperty({ name: "allowSharedViewLinksPreview", type: String }).calculated({
			calculate: function () {
				var expr = this.get_AllowSharedViewLinks();
				var that = this;

				// Only important if required is an non-empty/null expression
				if (this.get_allowSharedViewLinks() != "When" || expr == "" || expr == null)
					return null;

				// Try to create required preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, "", expr, function (preview) {

					that.set_allowSharedViewLinksPreview(preview);
				});
			},
			onChangeOf: ["AllowSharedViewLinks"]
		});

		form.$PaymentAccount.addChanged(function (sender, args) {
			ensureProcessorIcon(args.newValue);

			// A mapped billing email field is required to be mapped if the there is a payment account and "Save Customer Card" is enabled
			$("#map-billing-fields").bootstrapSwitch('setActive', !args.newValue || !sender.get_saveCustomerCardEnabled());
		})
			.errorIf({
				isValid: function (form) {
					return Cognito.config.allowPayPal || !form.get_PaymentAccount() || form.get_PaymentAccount().get_ProcessorName() !== "PayPal";
				},
				onChangeOf: "PaymentAccount.ProcessorName",
				conditionType: createFeatureWarning("PayPal Payment Account", "This feature is not available on your current plan. <a href='/admin/organization/selectplan?source=tryitnow-unavailfeat&details=paypal'>Upgrade now</a> to re-enable.", "paypal")
			})
			.errorIf({
				isValid: function (form) {
					return Cognito.config.allowSquare || !form.get_PaymentAccount() || form.get_PaymentAccount().get_ProcessorName() !== "Square";
				},
				onChangeOf: "PaymentAccount.ProcessorName",
				conditionType: createFeatureWarning("Square Payment Account", "This feature is not available on your current plan. <a href='/admin/organization/selectplan?source=tryitnow-unavailfeat&details=square'>Upgrade now</a> to re-enable.", "square")
			});

		// Payment Mode
		form.$PaymentMode.allowedValues(function () {
			return Cognito.Payment.PaymentMode.get_All();
		});

		form.$RequirePayment.calculated({
			calculate: function () {
				return this.get_RequirePayment() || "true";
			}
		});

		// UI property to represent the 'Require Payment' radio buttons
		form.meta.addProperty({ name: "isPaymentRequired", type: String }).calculated({
			calculate: function () {
				var requirePaymentExpr = this.get_RequirePayment();
				if (requirePaymentExpr == "true")
					return "Always";
				else if (requirePaymentExpr == "false")
					return "Never";
				else
					return "When";
			},
			onChangeOf: ["RequirePayment"]
		}).allowedValues(function () {
			return ["Always", "When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			if (args.newValue == "Always")
				sender.set_RequirePayment("true");
			else if (args.newValue == "Never")
				sender.set_RequirePayment("false");
			else {
				sender.set_RequirePayment(null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);
				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "RequirePayment", "Require Payment When...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {

					if (newExpression === "")
						Cognito.Forms.model.currentForm.set_isPaymentRequired("Always");
					else
						Cognito.Forms.model.currentForm.set_RequirePayment(newExpression);
				},
					function () {
						Cognito.Forms.model.currentForm.set_isPaymentRequired("Always");
					});
			}
		});

		// UI property to show a preview of the RequirePayment expression (if possible)
		form.meta.addProperty({ name: "requirePaymentPreview", type: String }).calculated({
			calculate: function () {
				var requirePaymentExpression = this.get_RequirePayment();
				var that = this;

				// Only important if RequirePayment is an non-empty/null expression
				if (this.get_isPaymentRequired() != "When" || requirePaymentExpression == "" || requirePaymentExpression == null)
					return null;

				// Try to create RequirePayment preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, "", requirePaymentExpression, function (preview) {
					that.set_requirePaymentPreview(preview);
				});
			},
			onChangeOf: ["RequirePayment"]
		});

		// Do not show the "Process Payment?" setting if payment is not being collected
		form.meta.addProperty({ name: "showRequirePayment", type: Boolean })
			.calculated({
				calculate: function () {
					return this.get_PaymentEnabled();
				},
				onChangeOf: "PaymentEnabled"
			});

		// Show a appropriate label for the selected payment account
		form.meta.addProperty({ name: "saveCustomerCardLabel", type: String })
			.calculated({
				calculate: function () {
					var label = "Keep Card on File in Stripe?";
					if (this.get_PaymentAccount() !== null) {
						if (this.get_PaymentAccount().get_ProcessorName() === "Stripe") {
							label = "Keep Card on File in Stripe?";
						}
						else if (this.get_PaymentAccount().get_ProcessorName() === "Square") {
							label = "Keep Card on File in Square?";
						}
					}

					return label;
				},
				onChangeOf: "PaymentAccount"
			});

		// Do not show the SaveCustomerCard setting if the payment prcessor is PayPal
		form.meta.addProperty({ name: "showSaveCustomerCard", type: Boolean })
			.calculated({
				calculate: function () {
					return this.get_PaymentAccount() !== null && this.get_PaymentAccount().get_ProcessorName() !== "PayPal"
				},
				onChangeOf: "PaymentAccount"
			});

		// UI property to represent the SaveCustomerCard radio buttons
		form.meta.addProperty({ name: "saveCustomerCard", type: String }).calculated({
			calculate: function () {
				var saveCustomerCardExpr = this.get_SaveCustomerCard();
				if (saveCustomerCardExpr == "true")
					return "Always";
				else if (saveCustomerCardExpr == "false")
					return "Never";
				else
					return "When";
			},
			onChangeOf: ["SaveCustomerCard"]
		}).allowedValues(function () {
			return ["Always", "When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			if (args.newValue == "Always")
				sender.set_SaveCustomerCard("true");
			else if (args.newValue == "Never")
				sender.set_SaveCustomerCard("false");
			else {
				// If the saving customer card feature is not allowed then do not open the expression builder dialog since the upsell dialog will be displayed instead. 
				if (Cognito.config.allowSaveCustomerCard) {

					sender.set_SaveCustomerCard(null);

					// Open expression builder with null expression and containing type
					Cognito.Forms.updateViewDefinition(false);
					Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "SaveCustomerCard", "Keep Card on File When...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {

						if (newExpression === "")
							Cognito.Forms.model.currentForm.set_saveCustomerCard("Never");
						else
							Cognito.Forms.model.currentForm.set_SaveCustomerCard(newExpression);
					},
						function () {
							Cognito.Forms.model.currentForm.set_saveCustomerCard("Never");
						});
				}
				else {
					// Set the value to trigger change on saveCustomerCardEnabled, which will cause the upsell dialog to display
					sender.set_SaveCustomerCard("true");
				}
			}
		});

		// UI property to show a preview of the SaveCustomerCard expression (if possible)
		form.meta.addProperty({ name: "saveCustomerCardPreview", type: String }).calculated({
			calculate: function () {
				var saveCustomerCardExpression = this.get_SaveCustomerCard();
				var that = this;

				// Only important if SaveCustomerCard is an non-empty/null expression
				if (this.get_saveCustomerCard() != "When" || saveCustomerCardExpression == "" || saveCustomerCardExpression == null)
					return null;

				// Try to create SaveCustomerCard preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, "", saveCustomerCardExpression, function (preview) {
					that.set_saveCustomerCardPreview(preview);
				});
			},
			onChangeOf: ["SaveCustomerCard"]
		});

		// Flag indicating whether or not the form is configured to create a payment customer
		form.meta.addProperty({ name: "saveCustomerCardEnabled", type: Boolean }).calculated({
			calculate: function () {
				return this.get_SaveCustomerCard() !== null && this.get_SaveCustomerCard() !== "false";
			},
			onChangeOf: ["SaveCustomerCard"]
		}).addChanged(function (sender, args) {
			if (Cognito.config.allowSaveCustomerCard && sender.get_PaymentAccount() && (sender.get_PaymentAccount().get_ProcessorName() !== "Square"
				|| sender.get_PaymentAccount().get_canSaveSquareCustomerCard())) {
				// Saving Customer's card is enabled
				if (args.newValue) {
					// Check "Map Billing Fields?"
					sender.set_mapBillingFields(true);

					// Expand the Billing Fields if a billing email field has not been mapped
					if (!sender.get_BillingEmailField()) {
						var $section = $("#map-billing-fields").parents("div.c-forms-settings-section");
						if ($section.length > 0 && $section.hasClass("c-collapsed")) {
							$section.trigger("click");
						}
					}
				}

				// Disable the "Map Billing Fields?" toggle if saving a customer's card
				$("#map-billing-fields").bootstrapSwitch('setActive', !args.newValue);
			}

			// Update the mapped email billing field
			if (sender.get_BillingEmailField() != null) {
				updateCustomerEmail(sender, sender.get_BillingEmailField());
			}
		});

		// Flag indicating whether or not a mapped billing email field is required
		form.meta.addProperty({ name: "requireBillingEmailField", type: Boolean }).calculated({
			calculate: function () {
				return !!this.get_PaymentAccount() && this.get_saveCustomerCardEnabled();
			},
			onChangeOf: ["PaymentAccount", "saveCustomerCardEnabled"]
		});

		form.meta.addProperty({ name: "mapBillingFields", type: Boolean })
			.calculated({
				calculate: function () {
					return this.get_BillingNameField() != null || this.get_BillingAddressField() != null || this.get_BillingPhoneField() != null || this.get_BillingEmailField() != null;
				}
			});

		form.meta.addProperty({ name: "showBillingPhoneMapping", type: Boolean })
			.calculated({
				calculate: function () {
					return this.get_PaymentAccount() !== null && this.get_PaymentAccount().get_ProcessorName() !== "Square"
				},
				onChangeOf: "PaymentAccount"
			});

		form.$BillingNameField.optionValues("namePaths");
		form.$BillingNameField.addChanged(function (sender, args) {
			var condition;
			if (args.newValue)
				if (condition = Cognito.Forms.model.currentForm.meta.getCondition(formExpressionConditionTypes["BillingNameField"]))
					condition.condition.destroy();
		});

		form.$BillingAddressField.optionValues("addressPaths");
		form.$BillingAddressField.addChanged(function (sender, args) {
			var condition;
			if (args.newValue)
				if (condition = Cognito.Forms.model.currentForm.meta.getCondition(formExpressionConditionTypes["BillingAddressField"]))
					condition.condition.destroy();
		});

		form.$BillingPhoneField.optionValues("phonePaths");
		form.$BillingPhoneField.addChanged(function (sender, args) {
			var condition;
			if (args.newValue)
				if (condition = Cognito.Forms.model.currentForm.meta.getCondition(formExpressionConditionTypes["BillingPhoneField"]))
					condition.condition.destroy();
		});

		form.$BillingEmailField.optionValues("emailPaths");
		form.$BillingEmailField.addChanged(function (sender, args) {
			var condition;

			if (args.newValue) {
				if (condition = Cognito.Forms.model.currentForm.meta.getCondition(formExpressionConditionTypes["BillingEmailField"]))
					condition.condition.destroy();

				// The mapped email field is required if saving customer's card
				updateCustomerEmail(sender, args.newValue);
			}
		});

		form.$BillingEmailField.requiredIf("this.requireBillingEmailField", "Equal", true, "Please select an email address field to save customer details.");

		// showProcessingFees
		form.meta.addProperty({ name: "showProcessingFees", type: Boolean })
			.calculated({
				calculate: function () {
					var showFees = false;

					if (this.get_PaymentAccount()) {
						showFees = this.get_PaymentAccount().get_defaultCurrency() === this.get_Localization().get_Currency()
							&& this.get_PaymentAccount().get_canIncludeProcessingFees();
					}

					return showFees;
				},
				onChangeOf: ["Localization.Currency", "PaymentAccount.defaultCurrency", "PaymentAccount.canIncludeProcessingFees"]
			});

		form.meta.addProperty({ name: "hasFees", type: Boolean })
			.calculated({
				calculate: function () {
					return this.get_IncludeProcessingFees() || this.get_TransactionFees().filter(function (f) { return f.get_FixedAmount() || f.get_PercentageAmount(); }).length > 0;
				},
				onChangeOf: ["IncludeProcessingFees", "TransactionFees{FixedAmount, PercentageAmount}"]
			});

		form.$hasFees.addChanged(function (sender, args) {
			if (args.newValue) {
				sender.set_ShowSubTotal(true);
			}

			// The subtotal is required to be shown if there are fees
			$("#show-subtotal").bootstrapSwitch('setActive', !args.newValue);

		});

		form.meta.addRule({
			execute: function (sender, args) {
				renderPayment();
			},
			onChangeOf: ["PaymentAccount", "PaymentEnabled", "SaveCustomerCard", "RequirePayment", "ProcessingFeeItemDesc", "ShowSubTotal", "ShowLineItems", "TransactionFees", "TransactionFees.Description", "TransactionFees.FixedAmount", "TransactionFees.PercentageAmount", "IncludeProcessingFees"]
		});

		form.meta.addProperty({ name: "PaymentSetupStatus", type: String }).calculated({
			fn: function () {
				var status = "Incomplete";

				if (this.get_PaymentAccount()) {
					if (!this.get_PaymentEnabled() && !this.get_saveCustomerCardEnabled()) {
						status = "MissingPaymentField";
					}
					else if (this.get_saveCustomerCardEnabled() && this.get_BillingEmailField() === null) {
						status = "MissingCustomerEmail";
					}
					else {
						status = "Complete";
					}
				}
				else if (this.get_PaymentEnabled()) {
					status = "MissingPaymentAccount";
				}
				else if (!Cognito.config.paymentAvailable && (this.get_PaymentAccount() || this.get_PaymentEnabled())) {
					status = "Complete";
				}

				return status;
			}, onChangeOf: ["PaymentAccount", "PaymentEnabled", "saveCustomerCardEnabled", "BillingEmailField",]
		});

		// Display upgrade dialog if the user is not on plan that allows saving a customer's card
		form.$saveCustomerCardEnabled.errorIf({
			isValid: function (form) {
				var isValid = Cognito.config.allowSaveCustomerCard || !form.get_saveCustomerCardEnabled();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						form.set_saveCustomerCard("Never");
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Card on File", "Upgrade to save customer's card.", "savecustomercard")
		});

		// Display upgrade dialog if the user is not on plan that allows saving a customer's card
		form.$saveCustomerCardEnabled.errorIf({
			isValid: function (form) {
				var notValid = form.get_saveCustomerCardEnabled() && form.get_PaymentAccount() && form.get_PaymentAccount().get_ProcessorName() === "Square"
					&& !form.get_PaymentAccount().get_canSaveSquareCustomerCard();
				if (notValid && builderInitialized) {
					window.setTimeout(function () {
						form.set_saveCustomerCard("Never");
					}, 0);
				}
				return !notValid;
			},
			conditionType: createFeatureWarning("Save Square Customer Card", "Upgrade to save square customer's card.", "savesquarecustomercard")
		});

		// Progress Bar

		// Type used to facilitate editing page titles
		var page = context.model.meta.addType('Cognito.Forms.PageTitle').get_jstype();
		page.meta.addProperty({
			name: 'name', type: String
		});
		page.meta.addProperty({
			name: 'number', type: Number
		});
		page.meta.set_format("[name]");

		form.meta.addProperty({ name: "isMultiPage", type: Boolean }).defaultValue(false);

		// Progress Bar Type
		form.meta.addProperty({ name: "progressBarType", type: Cognito.ProgressBarType })
			// default to" Steps"
			.defaultValue(function () {
				return Cognito.ProgressBarType.get_All().filter(function (t) {
					return t.get_Name().toLowerCase() === "steps";
				})[0];
			}).allowedValues(function () {
				return Cognito.ProgressBarType.get_All();
			});

		// Flag used to show/hide the progress bar and its settings
		form.meta.addProperty({ name: "showProgressBar", type: Boolean }).calculated({
			calculate: function () {
				return this.get_isMultiPage() && this.get_progressBarType().get_Name() !== "None";
			},
			onChangeOf: ["isMultiPage", "progressBarType"]
		});

		// Flag used to show/hide the page titles input fields
		form.meta.addProperty({ name: "showPageTitles", type: Boolean }).defaultValue(true);

		// Flage used to show/hide the page numbers in the page footer
		form.meta.addProperty({ name: "displayPageNumbersInFooter", type: Boolean }).defaultValue(true).addChanged(function (sender, args) {
			updatePageNumbers();
		});

		// Tracks the list of page titles
		form.meta.addProperty({
			name: "pageTitles", type: Cognito.Forms.PageTitle, isList: true
		});

		// Css to be applied to the progress bar
		form.meta.addProperty({ name: "progressBarCss", type: String }).calculated({
			calculate: function () {
				var css = "c-forms-progress " + (this.get_progressBarType().get_Name() === "Steps" ? "c-progress-steps" : "c-progress-bar");
				if (!this.get_showPageTitles())
					css += " c-progress-notext";

				return css;
			},
			onChangeOf: ["progressBarType", "showPageTitles"]
		});

		form.meta.addRule({
			execute: function (sender, args) {
				var width = "";
				if (sender.get_showProgressBar() && sender.get_progressBarType().get_Name() === "Bar") {
					width = 100 / sender.get_pageTitles().length;
					width = (Math.floor(width * 100) / 100) + "%";
				}
				window.setTimeout(function () {
					$(".c-progress-section li").css("width", width);
				});
			},
			onChangeOf: ["showProgressBar", "progressBarType", "pageTitles"]
		});

		// Page title changed event handler to propagate the name change to the corresponding page break element attribute (storage)
		Cognito.Forms.PageTitle.$name.addChanged(function (sender, args) {
			// Exit early if this is default value, "Untitled", being set
			if (!args.oldValue)
				return;
			else {
				// Find the page break element based on its sequence
				var pageBreakElement = $(".c-forms-layout-pagebreak").eq(sender.get_number() - 1);

				pageBreakElement.set_pageTitle(args.newValue);
				updatePageNumbers();
			}
		});

		// Save & Resume
		form.$EnableSaveAndResume.errorIf({
			isValid: function (form) {
				var isValid = Cognito.config.allowSaveAndResume || !form.get_EnableSaveAndResume();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						form.set_EnableSaveAndResume(false);
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Save & Resume", "Upgrade to save and resume.", "saveandresume")
		}).addChanged(function (sender, args) {
			if (sender.get_EnableSaveAndResume() && !sender.get_SaveAndResumeNotification()) {
				sender.set_SaveAndResumeNotification(new Cognito.Forms.EntryEmailNotification({
					Type: Cognito.Forms.EmailNotificationType.get_All().filter(function (t) { return t.get_Name() === "SaveAndResume"; })[0],
					Sender: new Cognito.NotificationAddress(),
					Body: Cognito.resources["save-and-resume-message"],
					SendWhenSubmitted: "false",
					SendWhenUpdated: "false",
					IncludeOrgFormName: true
				}));
			}
		});

		// Entry Sharing
		form.$EnableEntrySharing.errorIf({
			isValid: function (form) {
				var isValid = Cognito.config.allowEntrySharing || !form.get_EnableEntrySharing();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						form.set_EnableEntrySharing(false);
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Entry Sharing", "Upgrade to share entries.", "entrysharing")
		}).addChanged(function (sender, args) {
			if (sender.get_EnableEntrySharing() && !sender.get_SharedEntryNotification()) {
				sender.set_SharedEntryNotification(new Cognito.Forms.EntryEmailNotification({
					Type: Cognito.Forms.EmailNotificationType.get_All().filter(function (t) { return t.get_Name() === "SharedEntry"; })[0],
					Sender: new Cognito.NotificationAddress(),
					Body: Cognito.resources["shared-entry-email-message"],
					SendWhenSubmitted: "false",
					SendWhenUpdated: "false",
					IncludeOrgFormName: true
				}));
			}
		});

		// Recalculate protectedTokens when any field has this setting change
		form.$EnableEntrySharing.addChanged(function (sender, args) {
			var form = Cognito.Forms.model.currentForm;
			form.meta.pendingInit(form.meta.property("tokens"), true);
			form.meta.property("tokens").raiseChanged(form);
		});

		var encryptEntriesDialog;
		form.$EncryptEntries.errorIf({
			isValid: function (form) {
				var isValid = Cognito.config.allowEntryEncryption || !form.get_EncryptEntries();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						form.set_EncryptEntries(false);
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Entry Encryption", "Upgrade to encrypt entries.", "encryptentries")
		}).addChanged(function (sender, args) {
			var form = Cognito.Forms.model.currentForm;
			form.meta.pendingInit(form.meta.property("tokens"), true);
			form.meta.property("tokens").raiseChanged(form);

			// Display dialog if enabling
			if (builderInitialized && args.newValue === true && !Cognito.config.encryptInstructionsShown && Cognito.config.allowEntryEncryption) {
				if (!encryptEntriesDialog) {
					encryptEntriesDialog = $.fn.dialog({
						title: "Encrypt Entries",
						contentSelector: "#encrypt-entries-dialog",
						width: 800,
						height: 600,
						buttons: [
							{
								label: "Close",
								autoClose: true
							}
						]
					});
				}

				Cognito.config.encryptInstructionsShown = true;
				encryptEntriesDialog.open();
			}
		});

		form.meta.addProperty({ name: "linkExpires", type: String }).calculated({
			calculate: function () {
				return this.get_DaysToLinkExpiration() === 0 ? "Never" : "After";
			}
		}).allowedValues(function () {
			return ["Never", "After"];
		}).addChanged(function (sender, args) {
			if (!args.calculated) {
				if (sender.get_linkExpires() === "Never")
					sender.set_DaysToLinkExpiration(0);
				else if (sender.get_DaysToLinkExpiration() === 0) {
					sender.set_expirationDays("7 Days");
					sender.set_DaysToLinkExpiration(7);
				}

			}
		});

		form.meta.addProperty({ name: "expirationDays", type: String }).calculated({
			calculate: function () {
				return this.get_linkExpires() === "Never" ? null : (this.get_DaysToLinkExpiration() === 1 ? "1 Day" : this.get_DaysToLinkExpiration() + " Days");
			}
		}).allowedValues(function () {
			return ["1 Day", "4 Days", "7 Days", "14 Days", "21 Days", "28 Days"];
		}).addChanged(function (sender, args) {
			if (!args.calculated) {
				sender.set_DaysToLinkExpiration(parseInt(sender.get_expirationDays().split(" ")[0]));
			}
		});

		// Confirmation Settings
		form.meta.addProperty({ name: "confirmationMessage", type: String })
			.calculated({
				calculate: function calculate$confirmationMessage() {
					return $(".c-forms-layout-pagebreak:last").propData("confirmationMessage");
				}
			})
			.addChanged(function changed$confirmationMessage(sender, args) {
				if (!args.calculated) {
					var submissionPage = $(".c-forms-layout-pagebreak:last");
					submissionPage.propData("confirmationMessage", sender.get_confirmationMessage());
					refreshElement(submissionPage);
				}
			});
		form.meta.addProperty({ name: "redirectUrl", type: String })
			.calculated({
				calculate: function calculate$redirectUrl() {
					return $(".c-forms-layout-pagebreak:last").propData("redirectUrl");
				}
			})
			.addChanged(function changed$redirectUrl(sender, args) {
				if (!args.calculated) {
					var url = sender.get_redirectUrl();
					/*
					if (url && !/^https?:\/\//.test(url)) {
						url = "http://" + url;
						sender.set_redirectUrl(url);

					}
					*/

					var submissionPage = $(".c-forms-layout-pagebreak:last");
					submissionPage.propData("redirectUrl", url);
					refreshElement(submissionPage);
				}
			})
			.errorIf({
				isValid: function isValid$redirectUrl(form, property, redirectUrl) {
					if (!redirectUrl) return true;

					return /^[\[|https?:\/\/]/.test(redirectUrl.trim());
				},
				message: "Url must begin with http:// or https://"
			})
			.errorIf({
				isValid: function isValid$redirectUrl(form, property, redirectUrl) {
					if (!redirectUrl) return true;

					//redirectUrl = redirectUrl.toLowerCase();
					var containsProtected = false;

					// Parse all tokens out of the string
					var tokens = redirectUrl.match(/[^[\]]+(?=])/g);
					var protectedTokens = [];

					$.each(Cognito.Forms.model.currentForm.get_protectedTokens(), function () {
						protectedTokens.push(this.InternalName);
					});

					// Determine if any of the tokens are protected, if so, flag
					if (tokens) {
						$.each(tokens, function (index, value) {
							if (protectedTokens.indexOf(value) === -1) {
								containsProtected = true;
								return false;
							}
						});
					}

					return !containsProtected || (containsProtected && (redirectUrl.indexOf("https") === 0 || redirectUrl.indexOf("[") === 0));
				},
				onChangeOf: ["protectedTokens"],
				message: "Url must begin with https if it contains protected fields."
			});
		form.meta.addProperty({ name: "includeEntryDetails", type: Boolean })
			.calculated({
				calculate: function calculate$includeEntryDetails() {
					var includeEntryDetails = $(".c-forms-layout-pagebreak:last").propData("includeEntryDetails");
					return includeEntryDetails && includeEntryDetails === "true";
				}
			})
			.addChanged(function changed$includeEntryDetails(sender, args) {
				if (!args.calculated) {
					var submissionPage = $(".c-forms-layout-pagebreak:last");
					submissionPage.propData("includeEntryDetails", sender.get_includeEntryDetails());
					refreshElement(submissionPage);
				}
			});
		form.meta.addProperty({ name: "includeDocumentLinks", type: Boolean })
			.calculated({
				calculate: function calculate$includeDocumentLinks() {
					var includeDocumentLinks = $(".c-forms-layout-pagebreak:last").propData("includeDocumentLinks");
					return includeDocumentLinks && includeDocumentLinks === "true";
				}
			})
			.addChanged(function changed$includeDocumentLinks(sender, args) {
				if (!args.calculated) {
					var submissionPage = $(".c-forms-layout-pagebreak:last");
					submissionPage.propData("includeDocumentLinks", sender.get_includeDocumentLinks());
					if (args.newValue === false) {
						sender.get_includedDocuments().clear();
					}
					refreshElement(submissionPage);
				}
			});

		form.meta.addProperty({ name: "documentSource", type: Cognito.Forms.Form })
			.calculated({
				calculate: function calculate$documentSource() {
					return Cognito.Forms.model.currentForm;
				}
			});

		form.meta.addProperty({ name: "includedDocuments", type: Cognito.Forms.FormDocumentTemplate, isList: true, format: "[Name]" })
			.calculated({
				calculate: function calculate$includedDocuments() {
					var source = this.get_documentSource();
					if (!source) {
						return [];
					}

					var docs = [];

					var includedDocuments = $(".c-forms-layout-pagebreak:last").propData("includedDocuments");
					if (includedDocuments) {
						includedDocuments.split(",").forEach(function (s) {
							var number = parseInt(s, 10);
							var doc = source.get_DocumentTemplates().first(function (d) {
								return d.get_Number() === number;
							});
							if (doc) {
								docs.push(doc);
							}
						});
					}

					if (this._initialCalculation === undefined) {
						this._initialCalculation = true;
						this._initialCalculationCount = docs.length;
					} else {
						this._initialCalculation = false;
					}

					return docs;
				},
				onChangeOf: ["documentSource.DocumentTemplates"]
			})
			// NOTE: Timing is very important here. Validation rules can cause the property to be
			// accessed, and if it is accessed before the view is initialized, then it will return
			// null. For this reason, the 'optionValues' rule is used, since it doesn't enforce
			// validation, and also does not run in response to events such as 'init'.
			.optionValues("documentSource.DocumentTemplates")
			.addChanged(function changed$includedDocuments(sender) {

				// Only refresh the element/view when the underlying value changes after it was initially
				// calculated. Otherwise, the initial calculation would cause the page to be "dirty" and
				// result in an "unsaved changes" prompt without the user having done anything worth saving.

				try {

					// Guarding on '_initialCalculation' only would cause an early exit in all cases but one. If the
					// initial calculation value is an empty array, then it will not cause the change event to fire.
					// If the user then modifies the list, the event will fire for the first time, and the value of
					// '_initialCalculation' will still be true. So, also add a test of the initial calculation count,
					// since if the count is zero, then the calculation could not have triggered the event.
					if (sender._initialCalculation && sender._initialCalculationCount > 0) {
						return;
					}

					var submissionPage = $(".c-forms-layout-pagebreak:last");
					submissionPage.propData("includedDocuments", sender.get_includedDocuments().map(function (d) { return d.get_Number(); }).join(","));
					refreshElement(submissionPage);

				} finally {
					sender._initialCalculation = false;
				}
			});

		form.meta.addProperty({ name: "showConfirmationMessage", type: Boolean, format: "Confirmation Message;Redirect Url" })
			.calculated({
				calculate: function calculate$showConfirmationMessage() {
					return this.get_redirectUrl() === null || this.get_redirectUrl() === "";
				}
			})
			.addChanged(function changed$showConfirmationMessage(sender, args) {
				if (!args.calculated) {
					if (sender.get_showConfirmationMessage()) {
						sender.set_redirectUrl(null);
					}

					refreshElement($(".c-forms-layout-pagebreak:last"));
				}
			});
	});

	$extend("Cognito.TypeMeta", function (typeMeta) {

		// The current field being edited
		typeMeta.meta.addProperty({ name: "currentField", type: Cognito.Field });

		// Show the editor if the current field is set, otherwise show the list of field types
		typeMeta.meta.addProperty({ name: "showFieldTypes", type: Boolean }).calculated({
			calculate: function () {
				return !this.get_currentField();
			},
			onChangeOf: "currentField"
		});

		// Propogate internal name changes to all children type metas
		typeMeta.$InternalName.addChanged(function (sender, args) {
			window.setTimeout(function () {
				for (var i = 0; i < sender.get_Fields().length; i++) {
					// If field has a child type, propogate the internal name changes
					var field = sender.get_Fields()[i];
					if (field.get_ChildType())
						field.get_ChildType().set_InternalName(sender.get_InternalName() + "." + field.get_InternalName());
				}
			});
		});

		// Type expression validation
		var validating = false;
		typeMeta.meta.addRule({
			execute: function (sender, args) {

				// Throttle requests
				if (validating)
					return;
				validating = true;
				window.setTimeout(function () {
					validating = false;

					// Ignore while animating
					if (animations.isActive())
						return;

					if ((args.triggeredBy && args.triggeredBy.get_name() === "InternalName") || args.property.get_name() === "InternalName") {
						// View definition is sent up to validate visible, readonly, etc.
						Cognito.Forms.updateViewDefinition(false);
						validateExpressions(Cognito.Forms.model.currentForm, rename.serializedOldRootType, rename.newFieldPath, rename.oldFieldPath);
					}
				}, 1);
			},
			onChangeOf: ["InternalName", "Fields{InternalName}"]
		});
	});

	$extend("Cognito.FieldType", function (field) {
		field.meta.addProperty({ name: "elementType", type: Object });

		initElementTypes();
	});

	var columnSummaryOptions = {
		"Sum": { type: "numeric", name: "Sum", expression: "={table}.Sum({column})" },
		"Avg": { type: "numeric", name: "Avg", expression: "={table}.Average({column})" },
		"Min": { type: "numeric", name: "Min", expression: "={table}.Min({column})" },
		"Max": { type: "numeric", name: "Max", expression: "={table}.Max({column})" },
		"Count": { type: "non-numeric", name: "Count", expression: "={table}.Count()" },
		"Custom": { type: "any", name: "Custom" },
		"None": { type: "any", name: "None", expression: null }
	};

	function calculateSummaryPresetOption(tableName, fieldName, expression) {
		var presetOption = Object.keys(columnSummaryOptions).map(function (name) {
			return columnSummaryOptions[name];
		}).filter(function (o) {
			return o.name !== "Custom" && o.name !== "None" && fillSummaryExpression(tableName, fieldName, o.expression) === expression;
		})[0];

		if (presetOption)
			return presetOption.name;
		else if (expression === null)
			return "None";
		else
			return "Custom";
	}

	function fillSummaryExpression(tableName, fieldName, expression) {
		return expression.replace("{table}", tableName).replace("{column}", fieldName);
	}

	$extend("Cognito.Field", function (field) {

		// Field expression validation
		var validating = false;
		field.meta.addRule({
			execute: function (sender, args) {
				// Throttle requests
				if (validating)
					return;

				var selectedElement = Cognito.Forms.model.currentElement;
				if (selectedElement && !selectedElement.isPlaceholder()) {
					validating = true;
					window.setTimeout(function () {
						validating = false;

						// Ignore while animating
						if (animations.isActive())
							return;

						// View definition is sent up to validate visible, readonly, etc.
						Cognito.Forms.updateViewDefinition(false);
						if (selectedElement && selectedElement.length > 0)
							Cognito.validateElementExpressions(selectedElement, Cognito.Forms.model.currentForm, $(selectedElement).get_scope(), serializeElement($(selectedElement), false), Cognito.Forms.model.currentForm.get_Localization());
					}, 1);
				}
			},
			onChangeOf: ["DefaultValue", "MinValue", "MaxValue", "Calculation", "ColumnSummary", "Required", "Error", "ErrorMessage", "LineItemName", "LineItemDescription", "Format", "Quantity", "QuantityError"]
		});

		// Set the default value of the amount field to null here, because using the DefaultValueAttribute causes
		// a write to protected memory error that crashes IIS
		field.$Amount.defaultValue(null);

		field.$Quantity.defaultValue(null);
		field.$Quantity.format;
		field.$QuantityLimitFieldIndex.defaultValue(null);
		field.$QuantityUsedFieldIndex.defaultValue(null);

		field.$Required.calculated({
			calculate: function () {
				return this.get_Required() || "false";
			}
		});

		// UI property to represent the 'Require This Field' radio buttons
		field.meta.addProperty({ name: "isRequired", type: String }).calculated({
			calculate: function () {
				var requiredExpr = this.get_Required();
				if (requiredExpr == "true")
					return "Always";
				else if (requiredExpr == "false")
					return "Never";
				else
					return "When";
			}
		}).allowedValues(function () {
			return ["Always", "When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			if (args.newValue == "Always")
				sender.set_Required("true");
			else if (args.newValue == "Never")
				sender.set_Required("false");
			else {
				sender.set_Required(null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);
				var selectedElement = currentElement;
				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, $(currentElement).get_scope(), "Required", "Required When...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
					var field = $(selectedElement).get_field();
					if (field) {
						if (newExpression === "")
							field.set_isRequired("Never");
						else
							field.set_Required(newExpression);
					}
				},
					function () {
						var field = $(selectedElement).get_field();
						if (field)
							field.set_isRequired("Never");
					});
			}
		});

		// UI property to show a preview of the required expression (if possible)
		field.meta.addProperty({ name: "requiredPreview", type: String }).calculated({
			calculate: function () {
				var requiredExpression = this.get_Required();
				var that = this;

				// Only important if required is an non-empty/null expression
				if (this.get_isRequired() != "When" || requiredExpression == "" || requiredExpression == null)
					return null;

				// Try to create required preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, $(currentElement).get_scope(), requiredExpression, function (preview) {

					that.set_requiredPreview(preview);
				});
			},
			onChangeOf: ["Required"]
		});

		field.$Error.calculated({
			calculate: function () {
				return this.get_Error() || "false";
			}
		});

		// UI property to represent the 'Show Error Message' radio buttons
		field.meta.addProperty({ name: "showError", type: String }).calculated({
			calculate: function () {
				return this.get_Error() == "false" ? "Never" : "When";
			}
		}).allowedValues(function () {
			return ["When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			if (args.newValue == "Never")
				sender.set_Error("false");
			else {
				sender.set_Error(null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);
				var selectedElement = currentElement;
				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, $(currentElement).get_scope(), "Error", "Show Custom Error When...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
					var field = $(selectedElement).get_field();
					if (field) {
						if (newExpression === "")
							field.set_showError("Never");
						else
							field.set_Error(newExpression);
					}
				},
					function () {
						var field = $(selectedElement).get_field();
						if (field)
							field.set_showError("Never");
					});
			}
		});

		// UI property to show a preview of the show error expression (if possible)
		field.meta.addProperty({ name: "showErrorPreview", type: String }).calculated({
			calculate: function () {
				var showErrorExpression = this.get_Error();
				var that = this;

				// Only important if show error is an non-empty/null expression
				if (this.get_showError() != "When" || showErrorExpression == "" || showErrorExpression == null)
					return null;

				// Try to create show error preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, $(currentElement).get_scope(), showErrorExpression, function (preview) {

					that.set_showErrorPreview(preview);
				});
			},
			onChangeOf: ["Error"]
		});

		// UI property to show the 'Include On Invoice' property
		field.meta.addProperty({ name: "isPriceField", type: Boolean }).calculated({
			calculate: function () {
				return this.get_elementType().canCollectPayment && (this.get_FieldType().get_Name() !== "Calculation" || this.get_FieldSubType().get_Name() === "Currency");
			},
			onChangeOf: ["FieldType", "FieldSubType"]
		});

		field.meta.addProperty({ name: "isNumericField", type: Boolean }).calculated({
			calculate: function () {
				var numericTypes = ["Number", "Percent", "Currency", "Price", "Decimal"];
				var type = this.get_FieldType().get_Name();
				var subType = this.get_FieldSubType();
				subType = (subType ? subType.get_Name() : "");
				return numericTypes.some(function (t) { return t === type || t === subType; });
			},
			onChangeOf: ["FieldType", "FieldSubType"]
		});

		// UI property to show the 'Assign Prices' property
		field.meta.addProperty({ name: "canAssignPrices", type: Boolean }).calculated({
			calculate: function () {
				return this.get_elementType().canAssignPrices;
			},
			onChangeOf: ["FieldType"]
		});
		// UI property to show the 'Assign Values' property
		field.meta.addProperty({ name: "canAssignValues", type: Boolean }).calculated({
			calculate: function () {
				return this.get_elementType().canAssignValues;
			},
			onChangeOf: ["FieldType"]
		});

		// UI property to indicate this field can be marked as a billing field
		field.meta.addProperty({ name: "isBillingField", type: Boolean }).calculated({
			calculate: function () {
				return this.get_FieldType().get_Name() === "Name" || this.get_FieldType().get_Name() === "Address" || this.get_FieldType().get_Name() === "Phone" || this.get_FieldType().get_Name() === "Email"
			},
			onChangeOf: ["FieldType"]
		});

		// UI property to show a preview of the required expression (if possible)
		field.meta.addProperty({ name: "choiceCss", type: String }).calculated({
			calculate: function () {
				var classes = [];
				if (this.get_HasValue())
					classes.push("c-forms-settings-choice-with-value");
				if (this.get_HasQuantity())
					classes.push("c-forms-settings-choice-with-quantity");
				if (this.get_HasPrice())
					classes.push("c-forms-settings-choice-with-price");

				if (classes.length > 2)
					classes.push("c-forms-settings-choice-hide-actions");

				return classes.join(" ");
			},
			onChangeOf: ["HasValue", "HasQuantity", "HasPrice"]
		});

		field.meta.addRule({
			execute: function (sender, args) {
				if (sender.get_FieldType().get_Name() === "Choice") {
					if (sender.get_HasQuantity())
						sender.set_Quantity("=" + sender.get_InternalName() + "_Quantity");
					else {
						sender.set_Quantity(null);
						sender.get_Choices().forEach(function (choice) {
							choice.set_Quantity(null);
						});
					}
				}
			},
			onChangeOf: ["HasQuantity", "InternalName"]
		});

		field.meta.addProperty({ name: "canLimit", type: Boolean }).calculated({
			calculate: function () {
				return this.get_elementType().canLimit || (this.get_FieldType().get_Name() === "Calculation" && this.get_FieldSubType().get_Name() !== "SingleLine" && this.get_FieldSubType().get_Name() !== "YesNo");
			},
			onChangeOf: ["FieldType", "FieldSubType"]
		});

		field.meta.addProperty({ name: "canSetPlaceholderText", type: Boolean }).calculated({
			calculate: function () {
				var type = this.get_elementType();
				var fieldSubType = this.get_FieldSubType();
				var _subType = (type.subTypes || []).filter(function (t) { return t.fieldSubType === fieldSubType; })[0];
				var canSet = this.get_elementType().hasPlaceholderText === true || (_subType && _subType.hasPlaceholderText === true);

				if (!canSet)
					this.set_PlaceholderText(null);

				return canSet;
			},
			onChangeOf: ["FieldType", "FieldSubType"]
		});

		// Recalculate protectedTokens when any field has this setting change
		field.$IsProtected.addChanged(function (sender, args) {
			var form = Cognito.Forms.model.currentForm;
			form.meta.pendingInit(form.meta.property("tokens"), true);
			form.meta.property("tokens").raiseChanged(form);
		});

		// Sets the internal name to a unique value within its container based on the new name
		field.$Name.addChanged(function (sender, args) {
			// Prevent the rule from running when the name is being initialized during the creation of a field or the copying of a field.
			if (args.oldValue !== null) {
                if (!sender.get_OverrideInternalName()) {
					updateInternalName(sender, sender.get_Name());
                }

				// Do not allow the field name to be blank.
				if (args.newValue === null || args.newValue.length === 0) {
					setTimeout(function () { sender.set_Name(sender.get_InternalName()); });
				}
			}
		});

		function updateInternalName(field, label) {
			var $currentElement = $(currentElement);
			var isCurrentElement = $currentElement.get_field() === field;

			var containingType, elementType;
			if (isCurrentElement) {
				containingType = $currentElement.containingType();
				elementType = $currentElement.elementType();
			}
			// Name change due to a RatingScale question being changed
			else if ($currentElement.elementType() === elementTypes.RatingScale) {
				containingType = $currentElement.get_field().get_ChildType();
				elementType = elementTypes.Choice;
			}
            else {
                return;
            }

			var internalName = getInternalName(containingType, field, label, elementType);

			// Setup rename object
			Cognito.Forms.updateViewDefinition(false);
			rename.serializedOldRootType = Cognito.serialize(Cognito.Forms.model.currentForm);
			rename.oldFieldPath = containingType.get_InternalName() + "." + field.get_InternalName();
			rename.newFieldPath = containingType.get_InternalName() + "." + internalName;

			window.setTimeout(function () {

				// Set the internal name
				field.set_InternalName(internalName);

				// Set ChildType.InternalName
				if (field.get_ChildType()) {
					var containingType = $currentElement.containingType();
					field.get_ChildType().set_InternalName(containingType.get_InternalName() + "." + field.get_InternalName());
				}

				// Update the element based on the new name.
				if (isCurrentElement)
					$currentElement.set_field(field);
			});
		}

		field.meta.addProperty({ name: "customName", type: String }).calculated({
			calculate: function () {
				return this.get_InternalName();
			},
			onChangeOf: ["InternalName"]
		})
			.addChanged(function (sender, args) {

				// Prevent the rule from running when the name is being initialized during the creation of a field or the copying of a field or during internal name updates.
				if (args.oldValue !== null && !args.calculated) {
					var field = sender;
					var name = (field.get_customName() || "").trim();
					field.set_OverrideInternalName(!!name);
					updateInternalName(field, name || field.get_Name());
				}
			});

		// Set HasPrice to true when IncludeOnInvoice is set to true
		field.$IncludeOnInvoice.addChanged(function (sender, args) {
			window.setTimeout(function () {
				if (sender.get_IncludeOnInvoice() && sender.get_elementType().canAssignPrices)
					sender.set_HasPrice(true);
			}, 0);
		});

		// UI property to represent the 'Price' of fields
		field.meta.addProperty({ name: "price", type: String })
			.calculated({
				calculate: function () {
					return this.get_Amount() == null ? "" : this.get_Amount().localeFormat("C");
				},
				onChangeOf: ["Amount"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					result = Number.parseLocale(sender.get_price().replace(Sys.CultureInfo.CurrentCulture.numberFormat.CurrencySymbol, ""));
					sender.set_Amount(isNaN(result) ? null : result);
					sender.set_price(sender.get_Amount() == null ? "" : sender.get_Amount().localeFormat("C"));
					window.setTimeout(function () { sender.raisePropertyChanged("price"); }, 0);
				}
			});

		field.$Helptext.addChanged(function (sender, args) {
			var $currentElement = $(currentElement);
			if ($currentElement.elementType() === elementTypes.Section ||
				$currentElement.elementType() === elementTypes.Table ||
				$currentElement.elementType() === elementTypes.RepeatingSection) {
				$currentElement.find(".c-forms-layout-helptext").first().html(sender.get_Helptext());
			}
		});

		field.$PlaceholderText.addChanged(function (sender, args) {
			//alert(args);
		});

		field.$HideLabel.addChanged(function (sender, args) {
			var $currentElement = $(currentElement);
			if ($currentElement.elementType() === elementTypes.Section ||
				$currentElement.elementType() === elementTypes.Table ||
				$currentElement.elementType() === elementTypes.RepeatingSection) {
				$currentElement.find(".c-label").first().toggleClass("c-field-label-hidden", sender.get_HideLabel());
			}
		});

		// Determine if the field has columns
		field.meta.addProperty({ name: "hasColumns", type: Boolean }).calculated({
			calculate: function () {
				var fieldSubType = this.get_FieldSubType();
				var elementType = $(currentElement).elementType();
				if (fieldSubType && elementType.subTypes) {
					var subType = elementType.subTypes.filter(function (t) { return t.fieldSubType === fieldSubType; });
					if (subType.length > 0) {
						return !!subType[0].hasColumns;
					}
				}
				return false;
			},
			onChangeOf: ["FieldSubType"]
		});

		// Determine if the field can default based the element's configuraiton
		field.meta.addProperty({ name: "canDefault", type: Boolean }).calculated({
			calculate: function () {
				var elementType = $(currentElement).elementType();
				if (elementType == elementTypes.Choice) {
					var fieldSubType = this.get_FieldSubType();
					if (fieldSubType.get_Name() == "RadioButtons" && this.get_AllowFillIn())
						return false;
					if (fieldSubType && elementType.subTypes) {
						var subType = elementType.subTypes.filter(function (t) { return t.fieldSubType === fieldSubType; });
						if (subType.length > 0) {
							return !!subType[0].canDefault;
						}
					}
				}

				return elementType.canDefault;
			},
			onChangeOf: ["FieldSubType", "AllowFillIn"]
		});

		field.meta.addProperty({ name: "elementType", type: Object }).calculated({
			calculate: function () {
				return this.get_FieldType().get_Name() === "Calculation" && this.get_IncludeOnInvoice() ? elementTypes.Price : this.get_FieldType().get_elementType();
			},
			onChangeOf: ["FieldType{elementType}", "FieldSubType"]
		});

		// List of valid sub types
		field.meta.addProperty({ name: "allowedSubTypes", type: Cognito.FieldSubType, isList: true }).calculated({
			calculate: function () {
				var allowedSubTypes = [];

				var subTypes = this.get_FieldType().get_elementType().subTypes;
				var isTableColumn = $(currentElement).isTableColumn();
				if (subTypes) {
					subTypes.forEach(function (s) {
						if (!isTableColumn || s.canAddToTable !== false)
							allowedSubTypes.push(s.fieldSubType);
					});
				}

				return allowedSubTypes;
			}
		});

		// Determine if the field can limit duplicates based on the element's configuraiton
		field.meta.addProperty({ name: "canLimitQuantities", type: Boolean }).calculated({
			calculate: function () {
				var elementType = this.get_elementType();
				var canLimitQuantities = !!elementType.canLimitQuantities;
				if (!canLimitQuantities && elementType.subTypes) {
					var fieldSubType = this.get_FieldSubType();
					if (fieldSubType) {
						var subType = elementType.subTypes.filter(function (t) { return t.fieldSubType === fieldSubType || fieldSubType.get_Name() === t.fieldSubType; });
						if (subType.length > 0) {
							canLimitQuantities = !!subType[0].canLimitQuantities;
						}
					}
				}

				return canLimitQuantities;
			},
			onChangeOf: ["elementType", "FieldSubType"]
		});

		field.meta.addRule({
			execute: function (sender, args) {
				if (sender.get_Quantity() === "")
					sender.set_Quantity(null);
			},
			onInitExisting: true
		});

		field.meta.addProperty({ name: "limitQuantities", type: String }).calculated({
			calculate: function () {
				if (!this.get_canLimitQuantities()) {
					this.set_Quantity(null);
					this.set_QuantityError(null);
					this.set_HasQuantity(false);
					return "Never";
				}
				var quantityExpr = this.get_Quantity();
				if (quantityExpr == "1")
					return "No Duplicates";
				else if (quantityExpr == null)
					return "Never";
				else
					return "Specific Quantity";
			},
			onChangeOf: ["canLimitQuantities"]
		}).allowedValues(function () {
			return ["No Duplicates", "Specific Quantity", "Never"];
		}).addChanged(function (sender, args) {
			if (args.calculated)
				return;

			if (args.newValue == "No Duplicates")
				sender.set_Quantity("1");
			else if (args.newValue == "Never")
				sender.set_Quantity(null);
			else {
				sender.set_Quantity("");
			}
		});

		field.meta.addRule({
			execute: function (sender, args) {
				var quantity = args.newValue;
				if (quantity !== null && quantity !== undefined) {
					var asNumber = Number.parseLocale(quantity);
					if (!args.calculated && quantity && !quantity.startsWith("=") && (isNaN(asNumber) || asNumber < 0)) {
						sender.set_Quantity(null);
					}
					else if (!isNaN(asNumber)) {
						sender.set_Quantity(parseInt(asNumber).localeFormat("N0"));
					}
				}
			},
			onChangeOf: ["Quantity"]
		});

		// List of valid tokens
		field.meta.addProperty({ name: "tokens", type: String, isList: true }).calculated({
			calculate: function () {
				return Cognito.Forms.model.currentElement.get_tokens() || [];
			}
		});

		field.meta.addProperty({ name: "presetSummaryCalculations", type: Object, isList: true }).calculated({
			calculate: function () {
				var isNumeric = this.get_isNumericField();
				return Object.keys(columnSummaryOptions).filter(function (name) {
					var type = columnSummaryOptions[name].type;
					return (!isNumeric && type === "non-numeric") || (isNumeric && type === "numeric") || type === "any";
				});
			},
			onChangeOf: ["isNumericField"]
		});

		field.meta.addProperty({ name: "columnSummaryPreset", type: String })
			.defaultValue("None")
			.allowedValues("presetSummaryCalculations")
			.calculated({
				calculate: function () {
					var field = this;
					var newExpression = field.get_ColumnSummary();
					if ((!currentElement || currentElement.getAttribute("data-type") === "RepeatingSection") && !newExpression) {
						// if the field is being initialized with an empty ColumnSummary expression, null it out
						field.set_ColumnSummary(null);
						return "None";
					}

					var tableField = $(currentElement).parentElement().get_field();
					if (tableField)
						return calculateSummaryPresetOption(tableField.get_InternalName(), field.get_InternalName(), newExpression);

					return field.get_columnSummaryPreset() || "None";
				},
				onChangeOf: ["ColumnSummary"]
			}).addChanged(function (sender, args) {
				if (args.calculated)
					return;

				var $tableElement = $(currentElement).parentElement();
				var tableName = $tableElement.get_field().get_InternalName();
				var field = sender;
				var preset = sender.get_columnSummaryPreset();
				if (preset && preset === "Custom")
					sender.set_ColumnSummary("");
				else if (preset && preset === "None") {
					sender.set_ColumnSummary(null);
					sender.set_ColumnSummaryLabel(null);
				}
				else if (preset) {
					var option = columnSummaryOptions[preset];
					sender.set_ColumnSummary(fillSummaryExpression(tableName, sender.get_InternalName(), option.expression) || "");
				}

				var showSummaryRow = $(currentElement).containingType().get_Fields().some(function (f) {
					return f.get_columnSummaryPreset() !== "None";
				});

				if (showSummaryRow)
					$tableElement.find(".c-columns").addClass("has-summary-row");
				else
					$tableElement.find(".c-columns").removeClass("has-summary-row");

				showToolbar(true);
			});

		// Set the allowed values for FieldSubType, specifying the options to disable validation
		new ExoWeb.Model.Rule.allowedValues(field, {
			property: field.$FieldSubType,
			source: "allowedSubTypes",
			ignoreValidation: true
		});

		var hasEntriesDialog;
		field.$FieldSubType.addChanged(function (sender, args) {
			// Existing Form, Field is not new, hasEntries flag is false, and field type is Choice or Date
			if (Cognito.Forms.model.currentForm.get_Id() && !sender.get_isNew() && !Cognito.Forms.model.hasEntries && (sender.get_FieldType().get_Name() === "Choice" || sender.get_FieldType().get_Name() === "Date"))
				Cognito.Forms.hasEntries(Cognito.Forms.model.currentForm.get_Id(), function (hasEntries) {
					if (hasEntries) {
						Cognito.Forms.model.hasEntries = true;

						// Rollback Change
						window.setTimeout(function () { sender.set_FieldSubType(args.oldValue); });

						if (!hasEntriesDialog) {
							hasEntriesDialog = $.fn.dialog({
								title: "Cannot Change Type",
								text: "Type cannot be changed after creating entries for this field.",
								buttons: [
									{
										label: "Ok",
										autoClose: true
									}]
							});
						}

						hasEntriesDialog.open();
					}
				});

			// Handle Text field subtype changes (to/from 'Password')
			if (sender.get_FieldType().get_Name() === "Text") {
				var currentForm = Cognito.Forms.model.currentForm;

				if (sender.get_FieldSubType().get_Name() === "Password") {

					if (!Cognito.config.allowPasswordField) {
						// Display upsell dialog and change field back to previous subtype
						if (currentForm.meta.getCondition(passwordConditionType))
							currentForm.meta.getCondition(passwordConditionType).condition.destroy();

						new ExoWeb.Model.Condition(passwordConditionType, "Cannot add Password Fields.", currentForm, ["Fields"], "client");

						// Change the field type back to what it was previously
						window.setTimeout(function () {
							sender.set_FieldSubType(args.oldValue);
						});

						return;
					}

					if (!Cognito.config.whiteLabel) {
						// Enable encryption
						Cognito.config.encryptInstructionsShown = true;
						currentForm.set_EncryptEntries(true);

						// Disable the encryption toggle
						$("#encrypt-entries").bootstrapSwitch('setActive', false);

						// Set the field as IsProtected
						sender.set_IsProtected(true);

						// Rebind the currentElement to force the IsProtected template to re-render
						window.setTimeout(function () {
							ExoWeb.Observer.setValue(Cognito.Forms.model, "currentElement", ExoWeb.Observer.makeObservable($(Cognito.Forms.model.currentElement)));
						});
					}
				}
				else {
					// Re-enable option to un-protect field
					$(".c-forms-isprotected").bootstrapSwitch('setActive', true);

					// Re-enable turning off form encryption if there are no password fields and HIPAA compliance not enabled
					if (!hasPassword() && !Cognito.config.hipaaCompliant)
						$("#encrypt-entries").bootstrapSwitch('setActive', true);

					// Remove the feature warning if there are no remaining password fields
					if (!hasPassword() && currentForm.meta.getCondition(passwordConditionType))
						currentForm.meta.getCondition(passwordConditionType).condition.destroy();
				}
			}

			else if (sender.get_FieldType().get_Name() === "Address") {
				if (args.newValue && args.newValue.get_Name() == "USAddress") {
					sender.set_includeCountry(false);
				}
				else {
					sender.set_includeCountry(true);
				}
				sender.set_defaultCountry(null);
			}

			else if (args.newValue) {
				if (args.newValue == "Decimal" || args.newValue == "Percent") {
					if (!sender.get_decimalPlaces()) {
						sender.set_decimalPlaces(Sys.CultureInfo.CurrentCulture.numberFormat.NumberDecimalDigits);
					}

					var prefix = args.newValue == "Decimal" ? "N" : "P";

					sender.set_Format(prefix + sender.get_decimalPlaces());
				} else if (args.newValue == "Integer") {
					sender.set_decimalPlaces(0);
				}
				else {
					sender.set_Format(null);
				}
			}
		});


		function getDefaultValueFor(field, prop) {
			var pair = field.get_DefaultValues().filter(function (p) { return p.get_Property() === prop; })[0];
			if (pair)
				return pair.get_Value();
			return null;
		};

		function setDefaultValueFor(field, prop, value) {
			var pair = field.get_DefaultValues().filter(function (p) { return p.get_Property() === prop; })[0];
			if (pair) {
				if (value)
					pair.set_Value(value);
				else
					field.get_DefaultValues().remove(pair);
			}
			else {
				pair = new Cognito.DefaultValue({ Property: prop, Value: value });
				field.get_DefaultValues().add(pair);
			}
		};

		field.meta.addProperty({ name: "stateLabel", type: String }).calculated({
			calculate: function () {
				if (this.get_FieldSubType().get_Name() === "USAddress")
					return "State";
				return "State / Province";
			},
			onChangeOf: "FieldSubType"
		});
		field.meta.addProperty({ name: "postalCodeLabel", type: String }).calculated({
			calculate: function () {
				if (this.get_FieldSubType().get_Name() === "USAddress")
					return "Zip Code";
				return "Postal / Zip Code";
			},
			onChangeOf: "FieldSubType"
		});

		field.meta.addProperty({ name: "defaultLine1", type: String }).calculated({
			calculate: function () {
				return getDefaultValueFor(this, "Line1");
			},
			onChangeOf: "DefaultValues"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				setDefaultValueFor(sender, "Line1", args.newValue);
			}
		});
		field.meta.addProperty({ name: "defaultLine2", type: String }).calculated({
			calculate: function () {
				return getDefaultValueFor(this, "Line2");
			},
			onChangeOf: "DefaultValues"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				setDefaultValueFor(sender, "Line2", args.newValue);
			}
		});
		field.meta.addProperty({ name: "defaultCity", type: String }).calculated({
			calculate: function () {
				return getDefaultValueFor(this, "City");
			},
			onChangeOf: "DefaultValues"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				setDefaultValueFor(sender, "City", args.newValue);
			}
		});
		field.meta.addProperty({ name: "defaultState", type: String }).calculated({
			calculate: function () {
				return getDefaultValueFor(this, "State");
			},
			onChangeOf: "DefaultValues"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				setDefaultValueFor(sender, "State", args.newValue);
			}
		});
		field.meta.addProperty({ name: "defaultPostalCode", type: String }).calculated({
			calculate: function () {
				return getDefaultValueFor(this, "PostalCode");
			},
			onChangeOf: "DefaultValues"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				setDefaultValueFor(sender, "PostalCode", args.newValue);
			}
		});
		field.meta.addProperty({ name: "defaultCountry", type: String }).calculated({
			calculate: function () {
				return getDefaultValueFor(this, "Country");
			},
			onChangeOf: "DefaultValues"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				setDefaultValueFor(sender, "Country", args.newValue);
			}
		});

		field.meta.addProperty({ name: "includeLine1", type: Boolean }).calculated({
			calculate: function () {
				return this.get_Format().indexOf("Line1") !== -1;
			},
			onChangeOf: "Format"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				sender.set_Format(updateAddressFormat(args.newValue, sender.get_includeLine2(), sender.get_includeCity(), sender.get_includeState(), sender.get_includePostalCode(), sender.get_includeCountry()));
			}
		});
		field.meta.addProperty({ name: "includeLine2", type: Boolean }).calculated({
			calculate: function () {
				return this.get_Format().indexOf("Line2") !== -1;
			},
			onChangeOf: "Format"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				sender.set_Format(updateAddressFormat(sender.get_includeLine1(), args.newValue, sender.get_includeCity(), sender.get_includeState(), sender.get_includePostalCode(), sender.get_includeCountry()));
			}
		});
		field.meta.addProperty({ name: "includeCity", type: Boolean }).calculated({
			calculate: function () {
				return this.get_Format().indexOf("City") !== -1;
			},
			onChangeOf: "Format"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				sender.set_Format(updateAddressFormat(sender.get_includeLine1(), sender.get_includeLine2(), args.newValue, sender.get_includeState(), sender.get_includePostalCode(), sender.get_includeCountry()));
			}
		});
		field.meta.addProperty({ name: "includeState", type: Boolean }).calculated({
			calculate: function () {
				return this.get_Format().indexOf("State") !== -1;
			},
			onChangeOf: "Format"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				sender.set_Format(updateAddressFormat(sender.get_includeLine1(), sender.get_includeLine2(), sender.get_includeCity(), args.newValue, sender.get_includePostalCode(), sender.get_includeCountry()));
			}
		});
		field.meta.addProperty({ name: "includePostalCode", type: Boolean }).calculated({
			calculate: function () {
				return this.get_Format().indexOf("PostalCode") !== -1;
			},
			onChangeOf: "Format"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				sender.set_Format(updateAddressFormat(sender.get_includeLine1(), sender.get_includeLine2(), sender.get_includeCity(), sender.get_includeState(), args.newValue, sender.get_includeCountry()));
			}
		});
		field.meta.addProperty({ name: "includeCountry", type: Boolean }).calculated({
			calculate: function () {
				return this.get_Format().indexOf("Country") !== -1;
			},
			onChangeOf: "Format"
		}).addChanged(function (sender, args) {
			if (!args.calculated && args.oldValue !== args.newValue) {
				sender.set_Format(updateAddressFormat(sender.get_includeLine1(), sender.get_includeLine2(), sender.get_includeCity(), sender.get_includeState(), sender.get_includePostalCode(), args.newValue));
			}
		});

		// The description of the field displayed in the form designer
		field.meta.addProperty({ name: "description", type: String }).calculated({
			calculate: function () {

				var elementType = this.get_elementType();
				var desc = elementType.name;
				var that = this;
				if (elementType.subTypes && that.get_FieldSubType() && that.get_FieldSubType().get_Name() !== "None") {
					var subType = elementType.subTypes.filter(function (s) { return s.fieldSubType === that.get_FieldSubType(); })[0];
					desc = desc + " (" + subType.name + ")";
				}

				return desc;
			},
			onChangeOf: "FieldSubType"
		});

		// Format Default
		field.$Format.calculated({
			calculate: function () {
				if (this.get_FieldType().get_Name() === "Name")
					return "[First] [Last]";
				else if (this.get_FieldType().get_Name() === "Address")
					return "[Line1] [Line2] [City] [State] [PostalCode]";
				else
					return null;
			}
		});

		// Indicates the field is new and was created in the current forms builder session
		field.meta.addProperty({ name: "isNew", type: Boolean }).defaultValue(false);

		// UI property to show a allow fill in option (if applicable)
		field.meta.addProperty({ name: "showAllowFillIn", type: Boolean }).calculated({
			calculate: function () {
				var show = this.get_FieldType() && this.get_FieldType().get_Id() === "Choice" && !this.get_HasPrice() && !this.get_HasValue() && !this.get_HasQuantity();
				if (!show)
					this.set_AllowFillIn(false);

				return show;
			},
			onChangeOf: ["HasPrice", "HasValue", "HasQuantity", "FieldType"]
		});


		field.meta.addProperty({ name: "showPrices", type: Boolean })
			.calculated({
				calculate: function () {
					return !this.get_HidePrices();
				}
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					sender.set_HidePrices(!sender.get_showPrices());
				}
			});


		//#region File Upload

		// Allowed File Types UI Property
		field.meta.addProperty({ name: "allowedFileTypes", type: String }).calculated({
			calculate: function () {
				var choices = this.get_Choices();
				var fileTypes = "";
				for (i = 0; i < choices.length; i++) {
					fileTypes += i > 0 ? ", " + choices[i].get_Label() : choices[i].get_Label();
				}
				return fileTypes;
			},
			onChangeOf: ["Choices"]
		})
			.addChanged(function (sender, args) {
				if (sender.get_FieldType().get_Name() === "File") {
					ExoWeb.updateArray(sender.get_Choices(),
						$.makeArray(args.newValue.match(/[0-9a-zA-Z!@#$%^&()_\-+=\[\]{}~`]+/g))
							.map(function (ext) { return new Cognito.Choice({ Label: ext }); }));

					if (args.oldValue !== args.newValue)
						window.setTimeout(function () { sender.raisePropertyChanged("allowedFileTypes"); }, 0);
				}
			});

		// Max File Size
		field.meta.addProperty({ name: "maxFileSize", type: String })
			.alias("MaxValue")
			.addChanged(function (sender, args) {
				if (sender.get_FieldType().get_Name() === "File") {
					var value = Number.parseLocale(args.newValue);
					sender.set_MaxValue("infinity");
					if (!value || value <= 0)
						sender.set_MaxValue("");
					else if (value > 100)
						sender.set_MaxValue("100");
					else
						sender.set_MaxValue(value + "");

					if (args.oldValue !== args.newValue)
						window.setTimeout(function () { sender.raisePropertyChanged("maxFileSize"); }, 0);
				}
			});

		//#endregion

		//#region YesNo

		// The selected toggleOption is calculated by concatenating the pair of toggle option values delimited by "/". If the concatenated
		// value does not exist then a custom toggle option was specified.
		field.meta.addProperty({ name: "toggleOption", type: String }).label("Choices")
			.allowedValues(function () { return Cognito.resources.toggleOptions; }).calculated({
				calculate: function () {
					// Exit early if this is not a YesNo field
					if (this.get_FieldType().get_Name() === "YesNo") {
						var choices = this.get_Choices();
						if (choices.length > 0) {
							var toggleOption = choices[0] + "/" + choices[1];
							var exist = Cognito.resources.toggleOptions.filter(function (t) { return t === toggleOption; }).length > 0;
							if (exist)
								return toggleOption;
							else
								return "Other";
						}
						// Default value
						else {
							var defaultOption = Cognito.resources.toggleOptions[0];
							var options = defaultOption.split('/');

							// Populate allowed values
							choices.add(new Cognito.Choice({ Label: options[0] }));
							choices.add(new Cognito.Choice({ Label: options[1] }));

							// Set the default value
							this.set_DefaultValue(options[1]);

							// return the default toggle option
							return defaultOption;
						}
					}
				}
			});

		// The custom toggle option "True" value.
		field.meta.addProperty({ name: "toggleTrue", type: String }).label("True").calculated({
			calculate: function () {
				if (this.get_toggleOption() === "Other") {
					return this.get_Choices()[0].get_Label();
				} else {
					return null;
				}
			}
		});

		// The custom toggle option "False" value.
		field.meta.addProperty({ name: "toggleFalse", type: String }).label("True").calculated({
			calculate: function () {
				if (this.get_toggleOption() === "Other") {
					return this.get_Choices()[1].get_Label();
				} else {
					return null;
				}
			}
		});

		field.meta.addProperty({ name: "requireLabel", type: String }).calculated({
			calculate: function () {
				var typeDescriptor = $(currentElement).get_typeDescriptor();
				if (this.get_FieldType().get_Name() == "YesNo") {
					if (this.get_toggleOption() === "Other") {
						if (this.get_toggleTrue())
							return "Require " + this.get_toggleTrue() + " Response";
						else
							return "Require This " + typeDescriptor;
					}
					else
						return "Require " + this.get_toggleOption().split('/')[0] + " Response";
				}
				else
					return "Require This " + typeDescriptor;
			},
			onChangeOf: ["toggleOption", "toggleTrue"]
		});

		// Rule to keep the Choices in sync with the toggle option selection
		field.meta.addRule({
			execute: function (sender, args) {
				// Do not run the rule when the values are being calculated when the template is being rendered.
				if (!args.calculated && sender.get_FieldType().get_Name() === "YesNo") {
					var choices = sender.get_Choices();

					// if the toggleOption is null (which should only happen for existing elements when the language of the form is switched)
					// store off the current values into the custom toggle properties, and treat the element as a "Custom" set of choices
					if (!sender.get_toggleOption()) {
						sender.set_toggleOption("Other");

						if (choices && choices.length == 2) {
							sender.set_toggleTrue(choices[0].get_Label());
							sender.set_toggleFalse(choices[1].get_Label());
						}
					}

					// Reset the allowed values
					choices.clear();

					// Add the custom toggle option values
					if (sender.get_toggleOption() === "Other") {
						if (sender.get_toggleTrue() && sender.get_toggleFalse()) {
							choices.add(new Cognito.Choice({ Label: sender.get_toggleTrue() }));
							choices.add(new Cognito.Choice({ Label: sender.get_toggleFalse() }));
						}
					}
					// Add the selected toggle option
					else {
						// Reset the custom toggle option values
						sender.set_toggleTrue(null);
						sender.set_toggleFalse(null);
						sender.get_toggleOption().split("/").forEach(function (t) {
							choices.add(new Cognito.Choice({ Label: t }));
						});
					}

					// Default the "False" toggle value if the value exist, otherwise set the value to null
					if (choices[1])
						sender.set_DefaultValue(choices[1].get_Label());
					else
						sender.set_DefaultValue(null);
				}
			},
			onChangeOf: ["toggleOption", "toggleTrue", "toggleFalse"]
		});

		// #endregion

		//#region RatingScale

		// Custom Ratings - the custom ratings are the allowed values excluding the N/A option.
		field.meta.addProperty({ name: "allowedRatings", type: Cognito.Choice, isList: true }).calculated({
			calculate: function () {
				var choices = this.get_Choices();
				if (this.get_AllowNA())
					return choices.slice(0, choices.length - 1);
				else
					return choices;
			},
			onChangeOf: "Choices"
		});

		// Predefined Ratings
		field.meta.addProperty({ name: "rating", type: String }).label("Ratings")
			.calculated({
				calculate: function () {
					var allowedRatings = this.get_allowedRatings();
					var allowedRatingsMap = allowedRatings.map(function (c) { return c.get_Label(); }).join().toLowerCase();
					var selectedRating;

					for (var prop in Cognito.resources.ratings) {
						var currentRating = Cognito.resources.ratings[prop];
						// Find the selected rating by comparing the allowed values
						if (currentRating.choices.join().toLowerCase() === allowedRatingsMap) {
							selectedRating = currentRating;
							break;
						}
					}

					if (selectedRating)
						return selectedRating.label;
					else
						return "Custom";
				}
			})
			.allowedValues(function () {
				var values = [];
				for (var prop in Cognito.resources.ratings)
					values.push(Cognito.resources.ratings[prop].label);

				values.push("Custom");

				return values;
			})
			.defaultValue(Cognito.resources.ratings.satisfied.label)
			// update the allowed values based on the selected rating
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var selectedRating;
					for (var prop in Cognito.resources.ratings) {
						var currentRating = Cognito.resources.ratings[prop];
						if (currentRating.label === sender.get_rating()) {
							selectedRating = currentRating;
							break;
						}
					}

					if (selectedRating) {
						ExoWeb.updateArray(sender.get_Choices(), selectedRating.choices.map(function (rating) { return new Cognito.Choice({ Label: rating }); }));

						if (sender.get_AllowNA() && sender.get_naValue() !== "")
							sender.get_Choices().add(new Cognito.Choice({ Label: sender.get_naValue() }));

						// Reset Default Value
						var selectedChoices = sender.get_Choices().filter(function (c) { return c.get_Label() === sender.get_DefaultValue(); });
						if (selectedChoices.length == 0)
							sender.set_DefaultValue("");
						else
							selectedChoices[0].set_IsSelected(true);
					}
				}
			});

		// N/A Label
		field.meta.addProperty({ name: "naValue", type: String })
			.calculated({
				calculate: function () {
					if (this.get_AllowNA()) {
						var choices = this.get_Choices();
						return choices[choices.length - 1].get_Label();
					}
					else
						return null;
				}
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					// Remove N/A value
					if (args.newValue === null)
						sender.get_Choices().pop();
					// Add N/A value
					else if (args.oldValue === null)
						sender.get_Choices().add(new Cognito.Choice({ Label: args.newValue }));
					// Update N/A value
					else {
						var choices = sender.get_Choices();
						choices[choices.length - 1].set_Label(args.newValue);
					}
				}
			});

		// Update naValue based on AllowNA flag
		field.$AllowNA.addChanged(function (sender, args) {
			if (sender.get_AllowNA())
				sender.set_naValue(Cognito.resources["field-ratingscale-na-label"]);
			else
				sender.set_naValue(null);
		});

		// #endregion

		// Update default value for choice fields with choice selections change
		var updatingDefaultValue;
		field.$DefaultValue
			.calculated({
				calculate: function () {
					if (this.get_FieldType().get_Name() === "Choice") {

						// Get the original default value
						var originalDefaultValue = this.get_DefaultValue();

						// Determine the default value based on selections
						defaultValue = "";
						var choices = this.get_Choices();
						for (var c = 0; c < choices.length; c++) {
							var choice = choices[c];
							if (choice.get_IsSelected())
								defaultValue = defaultValue + (defaultValue.length > 0 ? "\r" : "") + choice.get_Label();
						}

						// Do not update if a calculation has been used for the default and a choice has not been selected
						if (originalDefaultValue && originalDefaultValue.startsWith("=") && !defaultValue)
							return originalDefaultValue;

						return defaultValue;
					}
				},
				onChangeOf: "Choices{Label,IsSelected}"
			})

			// Set the selected Choice when the DefaultValue changes
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					if (sender.get_FieldType().get_Name() === "RatingScale") {
						var choices = sender.get_Choices();
						for (var c = 0; c < choices.length; c++) {
							var choice = choices[c];
							if (choice.get_Label() == sender.get_DefaultValue())
								choice.set_IsSelected(true);
							else
								choice.set_IsSelected(false);
						}
					}

					// Set the default value selection for choices when the default value changes
					else if (sender.get_FieldType().get_Name() === "Choice" || sender.get_FieldType().get_Name() === "Yes/No") {
						var defaultValue = sender.get_DefaultValue();
						var choices = sender.get_Choices();
						for (var c = 0; c < choices.length; c++) {
							var choice = choices[c];
							choice.set_IsSelected(choice.get_Label() == defaultValue);
						}
					}
				}
			});

		field.$IncludeOnInvoice.addChanged(function (sender, args) {


			// Set HasPrice to true when IncludeOnInvoice is set to true
			window.setTimeout(function () {
				if (sender.get_IncludeOnInvoice() && sender.get_elementType().canAssignPrices)
					sender.set_HasPrice(true);
			}, 0);

			var form = Cognito.Forms.model.currentForm;

			if (form && args.newValue) {

				if (!form.get_PaymentEnabled()) {
					// if payment is not enabled on the form, enable it and initialize the form's payment settings
					form.set_PaymentEnabled(true);

					// if the payment account is not set,
					// open payment settings dialog to manage form's payment account
					if (!form.get_PaymentAccount()) {
						editPaymentAccount(false);
					}
				}
			} else {
				// if the form has no fields on invoice, disable payment
				if (!hasInvoicedFields())
					form.set_PaymentEnabled(false);
			}
		});

		// Raise property change on Choices whenever changes are made to force the UI to update
		new ExoWeb.Model.Rule(field, {
			execute: function (f) { f.raisePropertyChanged("Choices"); },
			onChangeOf: "Choices{Label,IsSelected,Price,Description,Images}"
		});

		var formatOptions = [
			{ Name: "", Mask: null, Regex: null },
			{ Name: "Alphabetic", Mask: null, Regex: "^([A-Za-z]+)$", Reformat: "$&", Error: "{{string-format-alphabetic}}" },
			{ Name: "Numeric", Mask: null, Regex: "^(\\d+)$", Reformat: "$&", Error: "{{string-format-numeric}}" },
			{ Name: "Alphanumeric", Mask: null, Regex: "^([A-Za-z\\d]+)$", Reformat: "$&", Error: "{{string-format-alphanumeric}}" },
			{ Name: "SSN", Mask: "###(-)##(-)####", Regex: "^(\\d{3})-?(\\d{2})-?(\\d{4})$", Reformat: "$1-$2-$3", Error: "{###-##-####}" },
			{ Name: "Zip Code", Mask: null, Regex: "^(\\d{5})[ -]?(\\d{4})?$", Reformat: "$&", Error: "{#####( ####)}" },
			{ Name: "IP Address", Mask: null, Regex: "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$", Reformat: "$&", Error: "{#.#.#.#}" },
			{ Name: "MAC Address", Mask: null, Regex: "^([0-9A-Fa-f]{2})[:-]?([0-9A-Fa-f]{2})[:-]?([0-9A-Fa-f]{2})[:-]?([0-9A-Fa-f]{2})[:-]?([0-9A-Fa-f]{2})[:-]?([0-9A-Fa-f]{2})$", Reformat: "$1:$2:$3:$4:$5:$6", Error: "{##:##:##:##:##:##}" },
			{ Name: "Custom Mask", Mask: null, Regex: null, Reformat: "$&", Error: "" },
			{ Name: "Custom Regular Expression", Mask: null, Regex: "", Reformat: "", Error: "" }
		];

		function maskToRegex(mask) {
			var subs = {
				"#": "\\d",
				"@": "[A-Za-z]",
				"(": "\\(?(",
				")": ")?\\)?",
			};

			var input = mask.split("");
			var output = [];
			for (var i = 0; i < input.length; i++) {
				var token = input[i];
				var regex = "";
				if (subs[token]) {
					regex = subs[token];
					if (token !== "(" && token !== ")") {
						var j = i + 1;

						while (j < input.length && input[j] === token)
							j++;

						if (j - i > 1) {
							regex += "{" + (j - i) + "}";
							i = j - 1;
						}
					}
				}
				else {
					regex = token.replace(/[\\^$*+?.()|[\]{}\-\/]/g, "\\$&");
				}

				output.push(regex);
			}

			return "^" + output.join("") + "$";
		}

		window.maskToRegex = maskToRegex;

		field.meta.addProperty({ name: "formatOption", type: String })
			.allowedValues(function () { return formatOptions.map(function (o) { return o.Name; }); });

		field.meta.addProperty({ name: "formatMask", type: String })
			.errorIf({
				isValid: function (sender) {
					try {
						new RegExp(maskToRegex(sender.get_formatMask() || ""));
					} catch (e) {
						console.log(sender.get_formatMask());
						return false;
					}
					return true;
				},
				message: "Invalid mask.",
				onChangeOf: ["formatMask"]
			});

		field.meta.addProperty({ name: "formatRegex", type: String })
			.errorIf({
				isValid: function (sender) {
					try {
						new RegExp(sender.get_formatRegex());
					} catch (e) {
						return false;
					}
					return true;
				},
				message: "Invalid regular expression.",
				onChangeOf: ["formatRegex"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var val = args.newValue;
					if (val) {
						var before = val;
						if (val.indexOf("^") !== 0)
							val = "^" + val;
						if (val.lastIndexOf("$") !== val.length - 1)
							val = val + "$";

						if (before !== val)
							setTimeout(function () {
								sender.set_formatRegex(val);
							}, 1);
					}
				}
			});

		field.meta.addProperty({ name: "reformatExpression", type: String });

		field.meta.addRule({
			execute: function (sender, args) {
				if (sender.get_FieldType().get_Name() === "Text") {
					var format = sender.get_Format() || "";
					var parts = format.split("\r\n");
					var selectedOption = null;

					if (!format) {
						sender.set_formatOption("");
						return;
					}

					var regex = parts[0] || null;
					var reformat = parts[1] || null;
					var mask = parts[2] || null;

					if (parts[2]) {
						selectedOption = formatOptions.filter(function (o) { return o.Mask === mask; })[0];
					}
					else {
						selectedOption = formatOptions.filter(function (o) { return o.Regex === regex; })[0];
					}

					// Not using the setter for formatOption because of rule limbo issues
					if (selectedOption && selectedOption.Reformat === reformat
						&& (!sender.get_FormatErrorMessage()
							|| selectedOption.Error === sender.get_FormatErrorMessage()))
						sender._formatOption = selectedOption.Name;
					else if (!sender.get_formatOption()) {
						if (mask)
							sender._formatOption = "Custom Mask";
						else if (regex)
							sender._formatOption = "Custom Regular Expression";
					}

					sender.set_formatRegex(regex);
					sender.set_reformatExpression(reformat);
					sender.set_formatMask(mask);

				}
			},
			onChangeOf: ["Format"],
			onInitExisting: true
		});

		field.meta.addRule({
			execute: function (sender, args) {
				if (sender.get_FieldType().get_Name() === "Text") {
					var regex = sender.get_formatRegex() || "";
					var reformat = sender.get_reformatExpression() || "";
					var mask = sender.get_formatMask() || "";
					if (sender.get_formatOption() === "Custom Mask")
						regex = maskToRegex(mask);
					var delim = "\r\n";
					sender.set_Format(regex + delim + reformat + delim + mask);
				}
			},
			onChangeOf: ["formatRegex", "formatMask", "reformatExpression"]
		});

		field.meta.addRule({
			execute: function (sender, args) {
				if (sender.get_FieldType().get_Name() === "Text") {
					var optionName = sender.get_formatOption();
					if (!optionName) {
						sender.set_Format("");
						return;
					}
					var option = formatOptions.filter(function (o) { return o.Name == optionName; })[0];
					var regex = option.Regex || "";
					var reformat = option.Reformat || "";
					var mask = option.Mask || "";

					var delim = "\r\n";
					sender.set_Format(regex + delim + reformat + delim + mask);
					sender.set_FormatErrorMessage(option.Error);
				}
			},
			onChangeOf: ["formatOption"]
		});

		field.meta.addProperty({ name: "decimalPlaces", type: Number })
			.allowedValues(function () { return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
			.calculated({
				fn: function () {

					var subType = this.get_FieldSubType();

					if (!subType || (subType.get_Name() !== "Decimal" && subType.get_Name() !== "Percent"))
						return 0;

					if (this.get_Format() && this.get_Format().length > 1) {
						return parseInt(this.get_Format().substr(1));
					}
				}, onInitExisting: true
			})
			.addChanged(function (sender, args) {
				var subType = sender.get_FieldSubType();
				var decimalPlaces = args.newValue || 0;

				if (subType == "Decimal") {
					sender.set_Format("N" + decimalPlaces);
				} else if (subType == "Percent") {
					sender.set_Format("P" + decimalPlaces);
				} else if (subType == "Integer") {
					sender.set_Format("N0");
				}
			});
	});

	$extend("Cognito.Choice", function (choice) {

		choice.$Value.defaultValue(null);
		choice.$Quantity.defaultValue(null);
		choice.$Price.defaultValue(null);

		// UI property to represent the 'Price' of choice values
		choice.meta.addProperty({ name: "price", type: String })
			.calculated({
				calculate: function () {
					return this.get_Price() == null ? "" : this.get_Price().localeFormat("C");
				},
				onChangeOf: ["Price"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					result = Number.parseLocale(sender.get_price().replace(Sys.CultureInfo.CurrentCulture.numberFormat.CurrencySymbol, ""));
					sender.set_Price(isNaN(result) ? null : result);
					sender.set_price(sender.get_Price() == null ? "" : sender.get_Price().localeFormat("C"));
					window.setTimeout(function () { sender.raisePropertyChanged("price"); }, 0);
				}
			});

		// UI property to represent the 'Value' of choice values
		choice.meta.addProperty({ name: "value", type: String })
			.calculated({
				calculate: function () {
					return this.get_Value() == null ? "" : this.get_Value().toString();
				},
				onChangeOf: ["Value"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					result = Number.parseLocale(sender.get_value());
					sender.set_Value(isNaN(result) ? null : result);
					sender.set_value(sender.get_Value() == null ? "" : sender.get_Value().toString());
					window.setTimeout(function () { sender.raisePropertyChanged("value"); }, 0);
				}
			});

		// UI property to represent the 'Quantity' of choice values
		choice.meta.addProperty({ name: "quantity", type: String })
			.calculated({
				calculate: function () {
					return this.get_Quantity() == null ? "" : this.get_Quantity().localeFormat("N0");
				},
				onChangeOf: ["Quantity"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					result = parseInt(Number.parseLocale(sender.get_quantity()));
					sender.set_Quantity(isNaN(result) || result < 0 ? null : result);
					sender.set_quantity(sender.get_Quantity() == null ? "" : sender.get_Quantity().localeFormat("N0"));
					window.setTimeout(function () { sender.raisePropertyChanged("quantity"); }, 0);
				}
			});
	});

	$extend("Cognito.Localization", function (local) {

		local.$Country.allowedValues("Cognito.Country.All").addChanged(function (sender, args) {
			if (args.newValue) {
				sender.set_Language(args.newValue.get_SupportedLanguages()[0]);
				sender.set_Currency(args.newValue.get_Currency());
			} else {
				sender.set_Language(null);
				sender.set_Currency(null);
			}
		});

		local.$Currency.allowedValues("Cognito.Currency.All");
		local.$Language.allowedValues("Cognito.Language.All");
		local.$TimeZone.allowedValues("Cognito.TimeZone.All");
	});

	$extend("Cognito.DocumentTemplate", function (template) {
		template.$Name.addChanged(function (sender, args) {
			window.setTimeout(function () {
				var submissionPage = $(".c-forms-layout-pagebreak:last");
				Cognito.refreshElement(submissionPage);
			});
		});
	});

	//#endregion

	//#region Element Wrapper

	jQuery.fn.init.mixin({
		getAttrIgnoreCase: function getAttrIgnoreCase(name) {
			if (this.length === 0)
				return;

			var map = this[0].attributes;
			for (var i = 0, len = map.length; i < len; i++) {
				var a = map[i];
				if (a.name.toLowerCase() === name.toLowerCase())
					return a;
			}
		},

		propData: function propData(name, value) {
			if (!this.prefix)
				this.prefix = this.length == 0 || this[0].tagName.toLowerCase() === "div" ? "data-" : "";
			var fullName = this.prefix + name;
			var attributeObject = this.getAttrIgnoreCase(fullName);
			if (arguments.length === 1)
				return attributeObject && attributeObject.value;
			else if (arguments.length > 1) {
				if (!attributeObject) {
					attributeObject = document.createAttribute(fullName);
					this.length && this[0].attributes.setNamedItem(attributeObject);
				}
				if (value === null || value === undefined)
					this[0].removeAttribute(fullName);
				else
					attributeObject.value = value;
				return this;
			}
		},

		// Gets the set of custom element attributes for the current element
		attributes: function attributes() {
			if (this.length == 0)
				return {};
			if (!this.prefix)
				this.prefix = this[0].tagName.toLowerCase() === "div" ? "data-" : "";
			var attributes = this[0].attributes;
			var result = {};
			for (i = 0; i < attributes.length; i++) {
				var name = attributes[i].name.toLowerCase();
				if (name.startsWith(this.prefix)) {
					name = name.substr(this.prefix.length);
					if (name === "tag" || name === "type" || name === "source" || name === "field" || name === "column" || name === "colspan" || name === "hover" || name === "isvisible-preview" || name === "isvisible-validation" || name === "uuid")
						continue;
					result[name] = attributes[i].value;
				}
			}
			return result;
		},
		column: function column(value) {
			if (arguments.length === 0)
				return parseInt(this.propData("column") || 1);
			else {
				this.propData("column", value);
				return this;
			}
		},
		colspan: function colspan(value) {
			if (arguments.length === 0)
				return parseInt(this.propData("colspan") || 1);
			else {
				this.propData("colspan", value);
				return this;
			}
		},
		initialWidth: function initialWidth(value) {
			if (arguments.length === 0)
				return parseInt(this.propData("initial-width") || 0);
			else {
				this.propData("initial-width", value);
				return this;
			}
		},
		get_field: function get_field(containingType) {
			// See if the field is cached on the element
			var field = this.data("fieldObj");
			if (field)
				return field;

			// If not, look it up
			field = this.propData("field") || this.propData("source");
			field = field ? (containingType || this.containingType()).get_Fields().filter(function (a) { return a.get_InternalName() == field; })[0] : null;

			// Cache and return
			if (field)
				this.data("fieldObj", field);
			return field;
		},
		set_field: function set_field(value) {
			this.propData("field", value.get_InternalName());
		},
		get_columns: function get_columns() {
			var columns = this.propData("columns");
			return columns ? parseInt(columns) : 0;
		},
		set_columns: function set_columns(value) {
			this.propData("columns", value);
		},
		tag: function tag(value) {
			if (arguments.length === 0)
				return this.propData("tag") || this[0].localName.toLowerCase();
			else {
				this.propData("tag", value);
				return this;
			}
		},
		elementType: function elementType(value) {
			if (arguments.length === 0)
				return elementTypes[this.propData("type")] || (this.isSection() ? elementTypes.Section : null);
			else {
				this.propData("type", value.code);
				return this;
			}
		},

		clearInlineStyles: function clearInlineStyles() {
			this.attr("style", "");
		},

		// Unique id to identify an element, this id is not persisted!
		uuid: function uuid(value) {
			if (arguments.length === 0) {
				if (!this.propData("uuid"))
					this.uuid(uuidCounter++);
				return this.propData("uuid");
			}
			else {
				this.propData("uuid", value);
				return this;
			}
		},

		// Visible
		get_visible: function get_visible() {
			var visible = this.propData("isVisible");
			return visible === undefined ? "true" : visible;
		},
		set_visible: function set_visible(value, isInitialization) {
			this.propData("isVisible", value);

			// Skip rest during initialization
			if (isInitialization)
				return;

			// Need currentElement to correctly raise property change unless currentElement !== this, then property change is irrelevant
			var element = this.uuid() === $(currentElement).uuid() ? Cognito.Forms.model.currentElement : this;

			// Validate the new expression
			Cognito.validateElementExpressions(element, Cognito.Forms.model.currentForm, element.get_scope(), serializeElement(element, false), Cognito.Forms.model.currentForm.get_Localization());

			// Only important if visible is an non-empty/null expression
			if (element.get_isVisible() !== "When" || value === "" || value === null) {
				ExoWeb.Observer.setValue(element, "visiblePreview", null);
				return;
			}

			// Try to create visible preview
			Cognito.Forms.updateViewDefinition(false);
			Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, element.get_scope(), value, function (preview) {

				ExoWeb.Observer.setValue(element, "visiblePreview", preview);
			});
		},
		get_isVisible: function get_isVisible() {

			// Need currentElement to correctly raise property change unless currentElement !== this, then property change is irrelevant
			var element = this.uuid() === $(currentElement).uuid() ? Cognito.Forms.model.currentElement : this;

			var visibleExpr = element.get_visible();
			if (visibleExpr === "true")
				return "Always";
			else if (visibleExpr === "false")
				return "Never";
			else if (visibleExpr === "internal")
				return "Internally";
			else if (calculatingVisiblePreview || this.get_visiblePreview())
				return "When";
			else {
				// Initial setup, need to calculate visible preview
				calculatingVisiblePreview = true;
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, element.get_scope(), visibleExpr, function (preview) {

					ExoWeb.Observer.setValue(element, "visiblePreview", preview);
					calculatingVisiblePreview = false;
				});

				return "When";
			}
		},
		set_isVisible: function set_isVisible(value) {
			// Update radio button selection
			$(".c-forms-settings-visible input[type='radio'][value=" + value + "]").attr('checked', 'checked');

			// Need currentElement to correctly raise property change unless currentElement !== this, then property change is irrelevant
			var element = this.uuid() === $(currentElement).uuid() ? Cognito.Forms.model.currentElement : this;

			// Update visible value
			if (value === "Always")
				ExoWeb.Observer.setValue(element, "visible", "true");
			else if (value === "Never")
				ExoWeb.Observer.setValue(element, "visible", "false");
			else if (value === "Internally")
				ExoWeb.Observer.setValue(element, "visible", "internal");
			else {
				ExoWeb.Observer.setValue(element, "visible", null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);
				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, element.get_scope(), "Visible", "Visible When...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
					if (newExpression === "")
						ExoWeb.Observer.setValue(element, "isVisible", "Always");
					else
						ExoWeb.Observer.setValue(element, "visible", newExpression);
				},
					// Cancel
					function () {
						ExoWeb.Observer.setValue(element, "isVisible", "Always");
					});
			}
		},
		get_visiblePreview: function get_visiblePreview() {
			return this.propData("isVisible-preview");
		},
		set_visiblePreview: function set_visiblePreview(value) {
			this.propData("isVisible-preview", value);
		},
		get_visibleValidationError: function get_visibleValidationError() {
			return this.propData("isVisible-validation");
		},
		set_visibleValidationError: function set_visibleValidationError(value) {
			this.propData("isVisible-validation", value);
		},

		get_typeDescriptor: function get_typeDescriptor() { return capitalize(this.tag()); },

		isPlaceholder: function isPlaceholder() { return this.hasClass("c-forms-layout-placeholder"); },
		isElement: function isElement() { return this.hasClass("c-forms-layout-element"); },
		isSection: function isSection() { return this.hasClass("c-forms-layout-section"); },
		isTable: function isTable() { return this.hasClass("c-forms-layout-table"); },
		isTableColumn: function isTableColumn() { return this.parentElement() && this.parentElement().isTable(); },
		isView: function isView() { return this[0].id === "c-forms-layout-elements"; },
		isContent: function isContent() { return this.hasClass("c-forms-layout-content"); },
		isSubmission: function isSubmission() { return this.propData("isSubmission"); },

		isTableFull: function isTableFull() {
			return this.childElements(".c-field").length >= Math.floor((this.colspan()) / elementTypes.Table.minColspan);
		},

		// Indicates whether the element is allowed to be moved
		canMove: function canMove() { return !this.isSubmission(); },

		// Gets the parent container for the current element
		parentElement: function parentElement() {
			var parents = this.parents(".c-forms-layout-element, #c-forms-layout-elements");
			return parents.length > 0 ? parents.first() : null;
		},

		// Gets the child elements for the current container
		childElements: function childElements(filter) {
			var container = this.children('.c-forms-layout-section-container');
			var children;

			if (this.is("#c-forms-layout-elements"))
				container = this;
			else if (this.is(".c-columns"))
				children = this.children(".c-forms-layout-element");
			else if (this.is(".c-forms-row"))
				children = this.children(".c-columns").children(".c-forms-layout-element");
			else if (this.isTable())
				children = this.find(".c-forms-layout-element");
			else {
				var repeatingContainer = container.children('.c-forms-layout-repeatingsection-container');
				if (repeatingContainer.length > 0)
					container = repeatingContainer;
			}

			if (!children)
				children = container.children(".c-forms-row").children(".c-columns").children(".c-forms-layout-element");

			if (filter)
				return children.filter(filter);

			return children;
		},

		// Gets the next element in the current container
		nextElement: function nextElement() {
			if (this.is(":last-child"))
				return this.closest(".c-forms-row").nextAll('.c-forms-row').first().children(".c-columns").children('.c-forms-layout-element').first();
			else
				return this.next('.c-forms-layout-element');
		},

		// Gets the back element in the current container
		backElement: function backElement() {
			if (this.is(":first-child"))
				return this.closest(".c-forms-row").prevAll('.c-forms-row').first().children(".c-columns").children('.c-forms-layout-element').last();
			else
				return this.prev('.c-forms-layout-element');
		},

		// Gets the field that contains the specified element, or null for root elements
		containingField: function containingField() {
			var section = this.parentElement();

			if (!section)
				return null;

			// If the containing element is the root form (TypeMeta) then return null
			if (section.isView())
				return null;

			// Otherwise, determine the field associated to the element's container
			else {
				// Build the property path by walking the DOM
				var paths = [];
				while (!section.isView()) {
					// Add the associated field's internal name stored in the element's data-field attribute
					paths.push(section.get_field().get_InternalName());
					// Move to the next parent element
					section = section.parentElement();

					if (!section)
						return null;
				}

				// Locate the field in the model using the property path
				var entity = Cognito.Forms.model.currentForm;
				var containingField;
				while (paths.length > 0) {
					// Pop the first path off the stack
					var path = paths.pop();
					// Locate the field using the path
					containingField = entity.get_Fields().filter(function (f) { return f.get_InternalName() === path; })[0];
					// Move to the next entity in the model
					entity = containingField.get_ChildType();
				}

				return containingField;
			}
		},

		// Returns a list of fields representing the path to the current element's field (excludes current field)
		fieldPath: function fieldPath() {
			var section = this.parentElement();

			if (!section)
				return null;

			// If the containing element is the root form (TypeMeta) then return null
			if (section.isView()) {
				return [];
			}

			// Otherwise, determine the field associated to the element's container
			else {
				// Build the property path by walking the DOM
				var fieldPath = [];
				while (!section.isView()) {
					// Add the associated field's internal name stored in the element's data-field attribute
					fieldPath.unshift(section.get_field());
					// Move to the next parent element
					section = section.parentElement();

					if (!section)
						return null;
				}
				return fieldPath;
			}
		},

		// Gets the type that contains the specified element
		containingType: function containingType() {
			var container = this.containingField();
			return container ? container.get_ChildType() : Cognito.Forms.model.currentForm;
		},

		enableTransitions: function enableTransitions() {
			setTimeout(function () {
				this.removeClass("no-animate");
				this.offset(); // Trigger a reflow, flushing the CSS changes (http://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily)
			}.bind(this), 10);
			return this;
		},

		disableTransitions: function disableTransitions() {
			this.addClass("no-animate");
			this.offset(); // Trigger a reflow, flushing the CSS changes (http://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily)
			return this;
		},

		// Gets the minimum width of the element
		minimumWidth: function minimumWidth(container) {
			if (this.isPlaceholder())
				return 0;
			else if (this.isTableColumn() || $(container).isTable())
				return elementTypes.Table.minColspan;
			else if (this.isTable() || this.isSection()) {
				var rows = this.rows();
				return Math.max(elementTypes.Section.minimumWidth,
					rows.reduce(function (max, row) {
						// Assume fields with colspan 0 are being deleted
						var fields = row.filter(".c-field:not([data-colspan='0'])");
						return Math.max(max,
							fields.get().reduce(function (total, el) {
								return total + $(el).minimumWidth();
							}, 0) + fields.first().column() - 1);
					}, 0));
			}
			else
				return this.elementType().minimumWidth;
		},

		// Gets the maximum width of the element
		maximumWidth: function maximumWidth(assumeFullReflow) {
			if (this.isPlaceholder())
				return 1;
			else {
				var parentCols = this.parentElement().colspan();
				var $ne = this.nextElement();
				if (!assumeFullReflow && !Cognito.altResizing && $ne && isMinimum($ne) && !getFreeColumns(this.row().filter(".c-field")))
					return this.colspan();
				else if (assumeFullReflow)
					return parentCols - sumColspans(this.siblings(".c-forms-layout-element").get(), true);

				var $row = this.row();
				var myIndex = $row.index(this);
				var $before = $row.slice(0, myIndex).filter(".c-field");
				var $after = $row.slice(myIndex + 1).filter(".c-field");
				var startCol = (this.isTableColumn()
					? $before.get().reduce(function (total, el) { return total + $(el).colspan(); }, 0)
					: this.column() - 1);
				var minWidthsAfter = $after.get().reduce(function (total, el) { return total + $(el).minimumWidth(); }, 0);

				return parentCols - startCol - minWidthsAfter;
			}
		},

		// Gets the set of elements on the current row
		row: function row() {
			return this.parent().children(".c-forms-layout-element");
		},

		rows: function rows() {
			//if (!this.isSection())
			//	return [this.childElements()];

			var container = this.children('.c-forms-layout-section-container');

			var repeatingContainer = container.children('.c-forms-layout-repeatingsection-container');
			if (repeatingContainer.length > 0)
				container = repeatingContainer;

			return container.children('.c-forms-row').get().map(function (row) { return $(row).childElements(); });
		},

		subscribe: function subscribe() {
			Sys.Observer.addPropertyChanged(this, refreshElement);
			var field = this.get_field();
			if (field) {
				Sys.Observer.addPropertyChanged(field, refreshElement);
				if (field.get_FieldType().get_Name() === "RatingScale") {
					var childType = field.get_ChildType();
					if (childType)
						Sys.Observer.addPropertyChanged(childType, refreshElement);
				}
			}
		},

		// Unsubscribe from property changes for the element
		unsubscribe: function unsubscribe() {
			Sys.Observer.removePropertyChanged(this, refreshElement);
			var field = this.get_field();
			if (field) {
				Sys.Observer.removePropertyChanged(field, refreshElement);
				if (field.get_FieldType().get_Name() === "RatingScale") {
					var childType = field.get_ChildType();
					if (childType)
						Sys.Observer.removePropertyChanged(childType, refreshElement);
				}
			}
		},

		get_allElementTypes: function get_allElementTypes() {
			var types = [];
			for (var prop in elementTypes)
				types.push(elementTypes[prop]);

			return types;
		},

		// Page Break's page title
		get_pageTitle: function get_pageTitle() {
			return this.propData("pageTitle");
		},
		set_pageTitle: function set_pageTitle(value) {
			this.propData("pageTitle", value);
		},

		// Page Break's next page text
		get_nextButtonText: function get_nextButtonText() {
			var nextButtonText = this.propData("nextButtonText");
			if (!nextButtonText) {
				this.set_nextButtonText(nextButtonText);
				nextButtonText = this.propData("nextButtonText");
			}
			return nextButtonText;
		},
		set_nextButtonText: function set_nextButtonText(value) {
			this.propData("nextButtonText", value || (this.isSubmission() ? Cognito.resources["submit-button-text"] : Cognito.resources["next-button-text"]));

			var element = this;
			window.setTimeout(function () {
				Sys.Observer.raisePropertyChanged(element, "nextButtonText");
			});
		},

		// Confirmation
		get_redirectUrl: function get_redirectUrl() { return this.propData("redirectUrl"); },
		get_confirmationMessage: function get_confirmationMessage() { return this.propData("confirmationMessage"); },
		get_includeDocumentLinks: function get_includeDocumentLinks() {
			var includeDocumentLinks = this.propData("includeDocumentLinks");
			return includeDocumentLinks && includeDocumentLinks === "true";
		},
		get_includedDocuments: function get_includedDocuments() {
			var includedDocuments = this.propData("includedDocuments");
			if (!includedDocuments) {
				return [];
			}
			var docs = [];
			includedDocuments.split(",").forEach(function (s) {
				var number = parseInt(s, 10);
				var doc = Cognito.Forms.model.currentForm.get_DocumentTemplates().first(function (d) {
					return d.get_Number() === number;
				});
				if (doc) {
					docs.push(doc);
				}
			});
			return docs;
		},

		// Page Break's back page text
		get_backButtonText: function get_backButtonText() {
			var backButtonText = this.propData("backButtonText");
			if (!backButtonText) {
				this.set_backButtonText(backButtonText);
				backButtonText = this.propData("backButtonText");
			}
			return backButtonText;
		},
		set_backButtonText: function set_backButtonText(value) {
			this.propData("backButtonText", value || Cognito.resources["back-button-text"]);

			var element = this;
			window.setTimeout(function () {
				Sys.Observer.raisePropertyChanged(element, "backButtonText");
			});
		},

		// Page Break's page number
		get_pageNumber: function get_pageNumber() {
			return this.propData("pageNumber");
		},
		set_pageNumber: function set_pageNumber(value) {
			this.propData("pageNumber", value);
		},

		// Page Break's show back button
		get_showBackButton: function get_showBackButton() {
			var showBackButton = this.propData("showBackButton");

			// Default to true
			if (showBackButton == undefined) {
				this.set_showBackButton(showBackButton);
				showBackButton = this.propData("showBackButton");
			}

			return showBackButton === "true";
		},
		set_showBackButton: function set_showBackButton(value) {
			value = value == undefined ? true : value;
			this.propData("showBackButton", value);

			var element = this;
			window.setTimeout(function () {
				Sys.Observer.raisePropertyChanged(element, "showBackButton");
			});
		},

		// Progress Bar's type
		get_progressBarType: function get_progressBarType() {
			return this.propData("progressBarType");
		},
		set_progressBarType: function set_progressBarType(value) {
			this.propData("progressBarType", value);
		},

		// Progress Bar's show page titles
		get_showPageTitles: function get_showPageTitles() {
			return this.propData("showPageTitles");
		},
		set_showPageTitles: function set_showPageTitles(value) {
			this.propData("showPageTitles", value);
		},

		// Progress Bar's show page numbers in footer
		get_displayPageNumbersInFooter: function get_displayPageNumbersInFooter() {
			return this.propData("displayPageNumbersInFooter");
		},
		set_displayPageNumbersInFooter: function set_displayPageNumbersInFooter(value) {
			this.propData("displayPageNumbersInFooter", value);

			var element = this;
			window.setTimeout(function () {
				Sys.Observer.raisePropertyChanged(element, "displayPageNumbersInFooter");
			});
		},

		// Item Label
		get_itemLabel: function get_itemLabel() {
			var itemLabel = this.propData("itemLabel");
			if (!itemLabel) {
				this.set_itemLabel(itemLabel);
				itemLabel = this.propData("itemLabel");
			}
			return itemLabel;
		},
		set_itemLabel: function set_itemLabel(value) {
			this.propData("itemLabel", value || Cognito.resources["field-repeatingsection-item-label"]);

			var element = this;
			window.setTimeout(function () {
				Sys.Observer.raisePropertyChanged(element, "itemLabel");
			});
		},

		get_contentText: function get_contentText() {
			//content already set to dom
			if (this.propData("text"))
				return this.propData("text");
			//initial load, load xml inner text
			else if (this.is('content'))
				return htmlUnescape(this.text());
			//default text
			else
				return "Insert and format text, links, and images here.";
		},

		set_contentText: function set_contentText(value) {
			this.propData("text", value);
			refreshElement();
		},

		// Name
		get_includePrefix: function get_includePrefix(field) {
			field = field || this.get_field();
			return field && field.get_Format() && field.get_Format().indexOf("[Prefix]") > -1;
		},
		set_includePrefix: function set_includePrefix(value) {
			this.get_field().set_Format(updateNameFormat(value, true, this.get_includeMiddle(), this.get_includeMiddleInitial(), true, this.get_includeSuffix()));
		},
		get_includeMiddle: function get_includeMiddle(field) {
			field = field || this.get_field();
			return field && field.get_Format() && field.get_Format().indexOf("[Middle]") > -1;
		},
		set_includeMiddle: function set_includeMiddle(value) {
			// Middle Name and Middle Initial are mutually exclusive
			if (value)
				ExoWeb.Observer.setValue(Cognito.Forms.model.currentElement, "includeMiddleInitial", false);

			this.get_field().set_Format(updateNameFormat(this.get_includePrefix(), true, value, this.get_includeMiddleInitial(), true, this.get_includeSuffix()));
		},
		get_includeMiddleInitial: function get_includeMiddleInitial(field) {
			field = field || this.get_field();
			return field && field.get_Format() && field.get_Format().indexOf("[MiddleInitial]") > -1;
		},
		set_includeMiddleInitial: function set_includeMiddleInitial(value) {
			// Middle Name and Middle Initial are mutually exclusive
			if (value)
				ExoWeb.Observer.setValue(Cognito.Forms.model.currentElement, "includeMiddle", false);

			this.get_field().set_Format(updateNameFormat(this.get_includePrefix(), true, this.get_includeMiddle(), value, true, this.get_includeSuffix()));
		},
		get_includeSuffix: function get_includeSuffix(field) {
			field = field || this.get_field();
			return field && field.get_Format() && field.get_Format().indexOf("[Suffix]") > -1;
		},
		set_includeSuffix: function set_includeSuffix(value) {
			this.get_field().set_Format(updateNameFormat(this.get_includePrefix(), true, this.get_includeMiddle(), this.get_includeMiddleInitial(), true, value));
		},
		get_tokens: function get_tokens() {
			return Cognito.Forms.generateTokens(this.parentElement());
		},
		get_propertyPath: function get_propertyPath() {
			return this.getPropertyPath(this, "");
		},
		get_scope: function get_scope() {
			if (this.parentElement() && this.parentElement().get_field())
				return this.getPropertyPath(this.parentElement(), "");
			return "";
		},
		isLastPlaceholderInSection: function isLastPlaceholderInSection() {
			var parents, section, list;

			return this.isPlaceholder() &&
				(parents = $(this).parents()).length >= 3 &&
				($(section = parents[3]).hasClass("c-forms-layout-section") || $(section = parents[3]).hasClass("c-forms-layout-section-container")) &&
				section.getAttribute("id") == null &&
				(list = $(section).find(".c-forms-layout-placeholder[data-colspan!=0]")).index(this) + 1 == list.length;

		},

		isLastPlaceholder: function isLastPlaceholder() {
			var list;
			return this.isPlaceholder() && (list = $(".c-forms-layout-placeholder")).index(this) + 1 == list.length;
		},

		isPlaceholder: function isPlaceholder() {
			return this.hasClass("c-forms-layout-placeholder");
		},

		//"This" is above "Target"
		isAbove: function isAbove(target) {
			var targetColumn = target.column();
			var targetSpan = target.colspan();
			var thisColumn = this.column();
			var thisSpan = this.colspan();

			//if the elements are the same or on the same row
			if (this === target || this.parent().get(0) === target.parent().get(0)) {
				return false;
			}

			//Placeholders' columns have an offset of their span if they have not been modified (like when a neighbor field's width has been changed)
			if (this.isPlaceholder()) {
				thisColumn = thisColumn == 25 || this.isLastPlaceholder() || this.isLastPlaceholderInSection() ? thisColumn - thisSpan : thisColumn;
			}
			if (target.isPlaceholder()) {
				targetColumn = targetColumn == 25 || target.isLastPlaceholder() || target.isLastPlaceholderInSection() ? targetColumn - targetSpan : targetColumn;
			}

			return (thisColumn >= targetColumn && thisColumn < targetSpan + targetColumn) || (thisColumn < targetColumn && thisSpan + thisColumn > targetColumn);
		},

		//"This" is below "Target"
		isBelow: function isBelow(target) {
			var targetColumn = target.column();
			var targetSpan = target.colspan();
			var thisColumn = this.column();
			var thisSpan = this.colspan();

			//if the elements are the same or on the same row
			if (this === target || this.parent().get(0) === target.parent().get(0)) {
				return false;
			}

			//Placeholders' columns have an offset of their span if they have not been modified (like when a neighbor field's width has been changed)
			if (this.isPlaceholder()) {
				thisColumn = thisColumn == 25 || this.isLastPlaceholder() || this.isLastPlaceholderInSection() ? thisColumn - thisSpan : thisColumn;
			}
			if (target.isPlaceholder()) {
				targetColumn = targetColumn == 25 || target.isLastPlaceholder() || target.isLastPlaceholderInSection() ? targetColumn - targetSpan : targetColumn;
			}

			return (targetColumn == thisColumn) || (targetColumn > thisColumn && thisColumn + thisSpan >= targetColumn) || (targetColumn < thisColumn && targetColumn + targetSpan > thisColumn);
		},

		// Returns true if the element is contained within a list
		isInList: function isInList(parentElement) {

			if (parentElement) {
				var field = parentElement.get_field();

				if (field && field.get_FieldType().get_Name() === "EntityList") {
					return true;
				}

				return isInList(parentElement.parentElement());
			}

			return false;
		},

		// Returns the full property path to the element
		getPropertyPath: function get_PropertyPath(element, path) {
			if (element && element.get_field()) {
				path = element.get_field().get_InternalName() + path;

				if (element.parentElement() && element.parentElement().get_field()) {
					path = this.getPropertyPath(element.parentElement(), "." + path);
				}
			}

			return path;
		},

		hasField: function hasField() {
			var tag = this.tag().toLowerCase();
			return tag === "field" || tag === "section" || tag === "table" || tag === "column";
		}
	});

	//#endregion

	//#region Initialize Builder

	// Disable change batching to prevent error, "Nested change batches are not currently supported. Batch already in progress..."
	ExoWeb.config.enableBatchChanges = false;

	// Initializes the builder when the form is loaded
	Cognito.Forms.initBuilder = function () {

		var form = Cognito.Forms.model.currentForm;

		// Hiding the builder content until the builder is initialized
		$("#c-forms-builder").show();

		// Global variables for the form builder
		currentElement = null;
		cutCopyElement = null;
		isCut = false;
		dragging = false;
		dragElementType = null;

		// Observable list of valid field types based on the container
		ExoWeb.Observer.setValue(Cognito.Forms.model, "currentElement", $([]));

		// Setup the form builder
		renderLayoutElements(form);

		// Setup the form builder
		if (Cognito.Forms.model.currentForm.get_showProgressBar())
			$(".c-progress-section").show();

		// Show the form settings
		repositionSettings($(".c-forms-heading")[0]);

		// Set the initial forms settings top used to reposition field settings
		// The value is being set in a setTimeout due to a timing issue in Firefox
		window.setTimeout(function () { initialSettingsTop = $("#c-forms-settings").position().top; }, 0);

		// Calculate action bar's height to ensure the action bar remains at the bottom of the viewport
		actionBarHeight = $("#c-forms-builder .c-forms-actionBar").height();

		// Set focus on the form's title textbox
		window.setTimeout(function () {
			if (Cognito.config.whiteLabel || Cognito.config.mode == "anonymous" && form.get_Fields().length == 0)
				$(".c-forms-layout-element").get(0).focus();
			else
				setFocus($("#c-forms-settings-form-title").get(0));
		}, 0);

		window.setTimeout(function () {
			// Block turning off encryption if the organization is HIPAA compliant or if the form contains password fields
			if (Cognito.config.hipaaCompliant || hasPassword()) {
				window.setTimeout(function () {
					$('#encrypt-entries').bootstrapSwitch('setActive', false);
				}, 0);
			}

			// Disable the "Map Billing Fields?" toggle if saving a customer's card
			if (Cognito.Forms.model.currentForm.get_PaymentAccount())
				$("#map-billing-fields").bootstrapSwitch('setActive', !Cognito.Forms.model.currentForm.get_saveCustomerCardEnabled());

			// Disable the Subtotal toggle. The subtotal is required to be shown if there are fees
			$("#show-subtotal").bootstrapSwitch('setActive', !Cognito.Forms.model.currentForm.get_hasFees());

		}, 0);

		// Reposition field settings to the top
		$("#c-forms-settings").css("marginTop", 0);

		// Validate expressions to add conditions, if any, to the fields
		Cognito.Forms.updateViewDefinition(false);
		validateExpressions(Cognito.Forms.model.currentForm);

		// ensure payment account data
		if (form.get_PaymentAccount()) {
			if (Cognito.Payment.model.defaultCurrency)
				form.get_PaymentAccount().set_defaultCurrency(Cognito.Payment.model.defaultCurrency);

			if (Cognito.Payment.model.canIncludeProcessingFees)
				form.get_PaymentAccount().set_canIncludeProcessingFees(Cognito.Payment.model.canIncludeProcessingFees);
		}

		if (form.get_sharePointNotification() !== null) {
			// Defer execution until the form has rendered completely so the "icon-spin" class can be added
			window.setTimeout(function () {
				$("#c-forms-settings-sharepoint-refresh .icon-refresh").addClass("icon-spin");
				Cognito.Forms.getSharePointListsByForm(form,
					function (data) {
						$("#c-forms-settings-sharepoint-refresh .icon-refresh").removeClass("icon-spin");
						ExoWeb.updateArray(form.get_sharePointLists(), data.sharePointListNames.slice(0, data.sharePointListNames.length - 1));
						sharePointTimeZoneHoursOffset = data.sharePointListNames[data.sharePointListNames.length - 1];
					},
					function (jqXHR, textStatus, errorThrown) {
						$("#c-forms-settings-sharepoint-refresh .icon-refresh").removeClass("icon-spin");
						Cognito.Forms.displaySharePointConnectionErrors(textStatus);
					});
			});
		}

		if (!Cognito.Forms.model.currentForm.get_Localization()) {
			Cognito.Forms.model.currentForm.set_Localization(new Cognito.Localization());
		}

		// Default HasChanges to true for new forms
		var isNew = !Cognito.Forms.model.currentForm.get_Id();
		Cognito.Forms.model.currentForm.set_HasChanges(isNew);

		// Set HasChanges to true when input fields change
		$("#c-forms-settings").on("change", "input, textarea", function (event) {
			// Exclude the timepicker to prevent the form from being incorrectly flagged due to the timepicker’s updateElement function raising the change event
			if (!$(event.target).hasClass('c-timepicker'))
				Cognito.Forms.model.currentForm.set_HasChanges(true);
		});

		// Check to see if signatures are not allowed
		if (!Cognito.config.allowSignatures && hasSignature()) {
			new ExoWeb.Model.Condition(signatureConditionType, "Cannot add electronic signatures.", form, ["Fields"], "client");
		}

		// Check to see if password fields are not allowed
		if (!Cognito.config.allowPasswordField && hasPassword()) {
			new ExoWeb.Model.Condition(passwordConditionType, "Cannot add password fields.", form, ["Fields"], "client");
		}

		// Check to see if tables are not allowed
		if (!Cognito.config.allowTables && hasTable()) {
			new ExoWeb.Model.Condition(tableConditionType, "Cannot add tables.", form, ["Fields"], "client");
		}

		// Show a warning message if features have been disabled due to a plan downgrade
		if (featureWarnings.conditions.length > 0) {
			Cognito.showUnavailableFeatureWarning();
		}

		// Recalculate redirectUrl value now that builder is rendered
		form.meta.pendingInit(form.meta.property("redirectUrl"), true);

		// Indicate that the builder is now initialized
		builderInitialized = true;

		// Show a callout to prompt users to add their first field
		if (Cognito.Forms.model.currentForm.get_Source() === 'scratch' || Cognito.Forms.model.currentForm.get_Source() === 'tryitnow') {
			window.setTimeout(function () {
				Cognito.showCallout("#c-callout-new-field", ".c-forms-layout-placeholder");
			});
		}
	};

	var featureWarningDialog = $.fn.dialog({
		title: "Unavailable Features Detected",
		contentSelector: "#feature-availability-warning-dialog",
		height: 400,
		width: 540,
		buttons: [
			{
				label: "Upgrade Now",
				isCancel: false,
				click: function () {

					var source = "unavailfeat";
					var details = [];

					if (Cognito.Forms.model.currentForm.get_Source() && Cognito.Forms.model.currentForm.get_Source().indexOf("shared") >= 0) {
						var sourceItems = Cognito.Forms.model.currentForm.get_Source().split(" - ");
						source = "shared-template";

						if (sourceItems.length > 1)
							details.push(sourceItems[1]);
					} else {
						var disabledFeatures = featureWarnings.conditions.map(function (condition) { return condition.type; }).distinct();
						for (var f = 0; f < disabledFeatures.length; f++) {
							if (!details.contains(disabledFeatures[f].url))
								details.push(disabledFeatures[f].url);
						}
					}

					window.location.href = "/admin/organization/selectplan?source=" + source + "&details=" + details.join("::");
				}
			},
			{
				label: "OK",
				autoClose: true
			}
		],
		onClose: function () {
			$("#feature-not-available-list").empty();
		}
	});

	Cognito.showUnavailableFeatureWarning = function Cognito$showUnavailableFeatureWarning() {
		var disabledFeatures = featureWarnings.conditions.map(function (condition) { return condition.type; }).distinct();
		$("#feature-not-available-list").children().remove();
		for (var f = 0; f < disabledFeatures.length; f++)
			$("#feature-not-available-list").append("<li>" + disabledFeatures[f].code + "</li>");
		featureWarningDialog.open();
	};

	// Override resize to prevent "Small Mode" while editing in the builder
	Cognito.resize = function Cognito$resize() {
		var width = Cognito.viewport.width();
		if (width < 800)
			Cognito.viewport.removeClass("c-sml").addClass("c-med").removeClass("c-lrg");
		else
			Cognito.viewport.removeClass("c-sml").removeClass("c-med").addClass("c-lrg");
	};

	//#endregion

	//#region Serialization

	// Recursively serializes the view markup for the specified element
	function serializeElement(element, forPersistance) {
		var xml = "";

		var field = element.get_field();
		if (forPersistance && field)
			field.set_isNew(false);

		var source = field ? field.get_InternalName() : null;

		// Do not serialize field elements that do not have a source
		if (element.hasField() && !source)
			return xml;

		var column = element.column();
		var colspan = element.colspan();

		if (source)
			xml += " source='" + source + "'";
		if (column > 1)
			xml += " column='" + column + "'";
		if (colspan > 1)
			xml += " colspan='" + colspan + "'";
		if (!forPersistance && !element.isPlaceholder())
			xml += " uuid='" + element.uuid() + "'";

		// Serialize custom attributes, except for content
		var attributes = element.attributes();
		if (!element.isContent()) {
			if (forPersistance && element.tag().toLowerCase() == "pagebreak") {
				var form = Cognito.Forms.model.currentForm;
				for (var name in attributes) {
					name = name.toLowerCase();
					// Clear page titles
					if (name === "pagetitle") {
						if (form.get_showProgressBar() && form.get_showPageTitles())
							xml += " " + name + "='" + htmlEscape(attributes[name]) + "'";
					}
					// Clear back button text
					else if (name === "backbuttontext") {
						if (element.get_showBackButton())
							xml += " " + name + "='" + htmlEscape(attributes[name]) + "'";
					}
					else
						xml += " " + name + "='" + htmlEscape(attributes[name]) + "'";
				}
			}
			else {
				for (var name in attributes)
					xml += " " + name + "='" + htmlEscape(attributes[name]) + "'";
			}
		}

		// View
		if (element.isView()) {
			xml = "<view columns='" + colspan + "'>";

			if (Cognito.Forms.model.currentForm.get_isMultiPage())
				xml += serializeProgressBar();

			element.childElements('.c-forms-layout-element').each(function () {
				xml += serializeElement($(this), forPersistance);
			});
			xml += "</view>";
		}

		// Section
		else if (element.isSection()) {
			xml = "<section" + xml + ">";
			element.childElements().each(function () {
				xml += serializeElement($(this), forPersistance);
			});
			xml += "</section>";
		}

		// Table
		else if (element.isTable()) {
			xml = "<table" + xml + ">";
			element.childElements().each(function () {
				xml += serializeElement($(this), forPersistance);
			});
			xml += "</table>";
		}

		// Placeholder
		else if (element.isPlaceholder())
			xml = "";

		// Content
		else if (element.isContent()) {
			// Do not serialize the 'text' attribute as it is a convenience property to allow
			// for data binding and rules execution (not part of the markup)
			var contentAttributes = "";
			for (var name in attributes) {
				if (name !== "text") contentAttributes += " " + name + "='" + htmlEscape(element.attributes()[name]) + "'";
			}

			var contentText = element.get_contentText();

			// Remove invalid divs related to image resize handles that are inlcuded in the markup when the content is saved
			contentText = contentText.replace(/\<div.*?\>/gi, "").replace(/\<\/div\>/gi, "");

			xml = "<content" + contentAttributes + xml + ">" + htmlEscape(contentText) + "</content>";
		}

		// Everything else
		else
			xml = "<" + element.tag() + xml + " />";

		return xml;
	}

	function serializeProgressBar() {
		var form = Cognito.Forms.model.currentForm;
		var barType = form.get_progressBarType().get_Name();

		var form = Cognito.Forms.model.currentForm;
		var xml = "<progressbar ";
		xml += "progressbartype='" + form.get_progressBarType().get_Name() + "' ";
		xml += "showpagetitles='" + (barType === "None" ? "true" : form.get_showPageTitles()) + "' ";
		xml += "displaypagenumbersinfooter='" + form.get_displayPageNumbersInFooter() + "' />";

		return xml;
	}

	// Updates the view definition for the current form
	Cognito.Forms.updateViewDefinition = function (forPersistance) {
		// TODO: Remove temporary fix until a permanent fix can be implemented and tested (Refactor code to no longer require the renaming of ChildType.InternalName)
		updateTypeMetaInternalName();

		var form = Cognito.Forms.model.currentForm;
		form.get_Views()[0].set_Definition(serializeElement($("#c-forms-layout-elements"), forPersistance));
		form.set_PaymentEnabled(hasInvoicedFields());
		form.set_QuantityLimitsEnabled(hasQuantityLimitedFields());

		// Ensure quantity field indexes are set to reserve storage slots
		ensureQuantityFieldsAllocated(form);
	};

	//#endregion

	//#region Rendering

	// Renders the all elements to the layout pane
	function renderLayoutElements(form) {

		var layout = $($.parseXML(form.get_Views()[0].get_Definition())).children();
		//var layout = $(form.get_Views()[0].get_Definition());

		// Mark the last page break as the submission page break
		var submissionPageBreak = layout.find("pageBreak,pagebreak").last();
		submissionPageBreak.attr("isSubmission", "true");

		// Clear the builder
		$("#c-forms-layout-elements .c-forms-layout-element").remove();

		// Setup the form builder
		$("#c-forms-layout-elements")
			.append(renderSection(form, null, viewColumnWidth, layout.children()))
			.find(".c-columns").each(function () {
				// Mark grid rows as being full
				var children = $(this).childElements();
				if (children.length) {
					if (isRowFull(children))
						$(this).addClass("c-full");
					if (getFreeColumns(children, true) < $(this).parentElement().elementType().minColspan)
						$(this).addClass("c-no-add");
				}
			});

		// Find the submission page break
		var submissionPageBreak = $("#c-forms-layout").find(".c-forms-layout-pagebreak").last();
		submissionPageBreak.propData("isSubmission", "true");

		// Move the payment section before the submission page break
		$("#c-forms-payment").insertBefore(submissionPageBreak);

		// Update page numbers
		updatePageNumbers();

		// if payment is enabled on the form, render the payment section
		if (hasInvoicedFields()) {
			form.set_PaymentEnabled(true);
		} else {
			form.set_PaymentEnabled(false);
		}

		if (form.get_PaymentEnabled() || form.get_saveCustomerCardEnabled())
			renderPayment();
	}

	// Renders a section, with the specified number of columns
	function renderSection(containingType, field, columns, children) {
		var html = "";
		var currentColumn = 1;
		var element = $(this);
		var sectionType = field ? field.get_ChildType() : containingType;
		var defaultPlaceholderWidth = Grid.getDefaultPlaceholderWidth(columns);
		var openRow = "<div class='c-forms-row'>";
		var openColumns = "<div class='c-columns'>";
		var closeColumns = "</div>";
		var closeRow = "</div>";

		var fieldName = "[" + (field ? field.get_Name() : "--") + "]";

		// Render child elements
		children.each(function (idx) {
			var element = $(this);

			// Verify field elements have a source attribute by accessing the element's field property
			if (element.hasField()) {
				var field = element.get_field(sectionType);
				if (!field) {
					// Skip fields w/o a source attribute
					return true;
				}
			}

			if (element.tag().toLowerCase() === elementTypes.ProgressBar.tag.toLowerCase())
				initProgressBarProperties(element);
			else {
				var column = element.column();
				var colSpan = element.colspan();

				// Insert placeholders to fill in empty columns at the end of a row
				if (column < currentColumn) {
					html += renderPlaceholders(currentColumn, columns - currentColumn + 1, columns, true);
					currentColumn = columns + 1;
				}

				// Reset the current column once past the end of the row
				if (currentColumn > columns) {
					currentColumn = 1;
					html += closeColumns;
					html += closeRow;
					//console.log(fieldName + "close - column reset");
				}

				if (currentColumn === 1) {
					html += openRow;
					html += renderQuickInsert(true, element.isSubmission());
					html += openColumns;
					//console.log(fieldName + "open - first column");
				}

				// Insert placeholders if the element column is greater than the current column
				if (column > currentColumn) {
					html += renderPlaceholders(currentColumn, column - currentColumn + 1, column - currentColumn);
					currentColumn = column;
				}

				// Always render a placeholder row above the submission page break
				if (element.isSubmission()) {
					html += renderPlaceholders(1, defaultPlaceholderWidth, columns, true);
					html += closeColumns;
					html += closeRow;
					//console.log(fieldName + "close - pre-submission placeholders");
					html += openRow;
					html += openColumns;
					//console.log(fieldName + "open - submission");
				}

				// Render the element
				html += renderElement(element, sectionType, element.children());

				// Increment the current column
				currentColumn += colSpan;

				if (element.isSubmission()) {
					html += closeRow;
					//console.log(fieldName + "close - submission");
				}
				else if (currentColumn > columns) {
					html += renderPlaceholders(columns + 1, 0, 0, true);
					if (idx === children.length - 1) {
						html += closeColumns;
						html += closeRow;
						//console.log(fieldName + "close - last column");
					}
				}
			}
		});

		// Insert placeholders to fill in empty columns at the end of a row
		if (children.length && currentColumn < columns + 1) {
			html += renderPlaceholders(currentColumn, columns - currentColumn + 1, columns, true);
			html += closeColumns;
			html += closeRow;
			//console.log(fieldName + "close - remaining columns after loop");
			currentColumn = columns + 1;
		}

		// Always render a placeholder at the bottom of each section
		if (field) {
			html += openRow;
			html += renderQuickInsert(true, true);
			html += openColumns;
			//console.log(fieldName + "open - section bottom");
			html += renderPlaceholders(1, defaultPlaceholderWidth, columns, true);
			html += closeColumns;
			html += closeRow;
			//console.log(fieldName + "close - section bottom");
		}

		return html;
	}

	function renderTableField(field, tableField) {
		var fieldSubType = field.get_FieldSubType();
		var subType = fieldSubType ? fieldSubType.get_Name() : null;
		var label = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + htmlEscape(field.get_Name()) + "</label>" +
			(field.get_isRequired() != "Never" ? "<i class='c-forms-layout-required'></i>" : "") +
			"<div class='c-icons'>" +
			(Cognito.config.allowEntryEncryption && field.get_IsProtected() && Cognito.Forms.model.currentForm.get_EncryptEntries() ? "<i class='icon-protect'></i>" : "") +
			(field.get_IncludeOnInvoice() ? "<i class='icon-payment'></i>" : "") +
			"</div></div>";
		var elementType = field.get_elementType();
		var defaultValue = field.get_DefaultValue();
		var phText = field.get_PlaceholderText();

		if (field)
			field.meta.pendingInit(field.meta.property("requireLabel", field), true);

		var html = label;
		switch (elementType) {
			// Yes/No
			case elementTypes.YesNo:
			// Choice
			case elementTypes.Choice:
				var price = ""
				if (field.get_HasPrice()) {
					field.get_Choices().forEach(function (choice) {
						if (choice.get_IsSelected() && choice.get_price()) {
							price = " - " + choice.get_price();
						}
					});
				}
				html += "<div class='c-editor'><div class='c-forms-layout-control field" + (subType ? " c-forms-" + subType.toLowerCase() : "") + "'>" + (defaultValue ? defaultValue + price : "<span class='c-forms-layout-watermark'><i class='" + elementType.icon + "'></i> " + (phText || field.get_description()) + "</span>") + "</div></div>";
				break;
			// Calculation/Price
			case elementTypes.Calculation:
			case elementTypes.Price:
				html += "<div class='c-editor c-readonly'><div class='c-forms-layout-control field" + (field.get_Calculation() ? " has-value" : "") + "'>" + (field.get_Calculation() ? htmlEscape(field.get_Calculation()) : "<span class='c-forms-layout-watermark'><i class='" + elementType.icon + "'></i> " + htmlEscape(field.get_description()) + "</span>") + "</div></div>";
				break;
			// Date
			case elementTypes.Date:
			// Simple Field
			default:
				var desc = htmlEscape(field.get_description());
				var _subType = (elementType.subTypes || []).filter(function (t) { return t.fieldSubType === fieldSubType; })[0];
				html += "<div class='c-editor'><div class='c-forms-layout-control field" + (defaultValue ? " has-value" : "") + (subType ? " c-forms-layout-" + subType.toLowerCase() : "") + "'>" + (defaultValue ? defaultValue : "<span class='c-forms-layout-watermark'><i class='" + ((_subType || elementType).icon || elementType.icon) + "'></i> " + (phText || (subType && (/(Date)|(Time)/).test(subType) ? subType : desc)) + "</span>") + "</div></div>";

		}

		html += renderColumnResizer();
		html += renderQuickInsert();

		// Summary row element
		var preset = calculateSummaryPresetOption(tableField.get_InternalName(), field.get_InternalName(), field.get_ColumnSummary());
		var summLabel = field.get_ColumnSummaryLabel();
		html += "<div class='c-label c-forms-column-summary'><label><span class='label'>" + (summLabel ? summLabel + ": " : "") + "</span>" + (preset === "Custom" ? field.get_ColumnSummary() : preset === "None" ? "" : preset || "") + "</label></div>";

		return html;
	}

	function renderColumnResizer() {
		return "<div class='c-col-resizer' onmousedown='Cognito.Forms.resizeDragStart(event)' ondragenter='Cognito.Forms.dragEnter(event)' ondragleave='Cognito.Forms.dragLeave(event)' ondrop='Cognito.Forms.dragDrop(event)'></div>";
	}

	function renderQuickInsert(insertRow, hidden) {
		return "<div style='" + (hidden ? "display: none;" : "") + "' " + (insertRow ? "tabindex='-1'" : "") + " class='c-quick-insert" + (insertRow ? " c-quick-insert-row" : "") + "' ondragenter='Cognito.Forms.dragEnter(event)' ondragleave='Cognito.Forms.dragLeave(event)' ondrop='Cognito.Forms.dragDrop(event)'><div class='plus'><i class='icon-plus'></i></div><div class='line'></div></div>";
	}

	// Renders a table
	function renderTable(containingType, field, columns, children, itemLabel) {
		var html = "";
		var tableField = field;
		var currentColumn = 1;
		var element = $(this);
		var tableType = field ? field.get_ChildType() : containingType;
		var commonAttributes = "draggable='true' ondragstart='Cognito.Forms.dragStart(event)' ondragover='Cognito.Forms.dragOver(event)' ondragenter='Cognito.Forms.dragEnter(event)' ondragleave='Cognito.Forms.dragLeave(event)' ondrop='Cognito.Forms.dragDrop(event)' ondragend='Cognito.Forms.dragEnd(event)'";
		var hasSummaryRow = children.get().some(function (el) {
			var element = $(el);
			if (element.hasField()) {
				var field = element.get_field(tableType);
				if (field) {
					return field.get_ColumnSummary();
				}
			}
			return false;
		});

		var colspanSum = sumColspans(children.get());
		var freeCols = columns - colspanSum;

		html += "<div class='c-forms-layout-remove-item'><i class='icon-remove-sign'></i></div>";
		html += "<div class='c-forms-row c-columns" + (hasSummaryRow ? " has-summary-row" : "") + "'>";
		children.each(function () {
			var element = $(this);

			// Verify field elements have a source attribute by accessing the element's field property
			if (element.hasField()) {
				var field = element.get_field(tableType);
				if (!field) {
					// Skip fields w/o a source attribute
					return true;
				}

				field.meta.pendingInit(field.meta.property("columnSummaryPreset", field), true);

				html += renderTableElement(element, tableType, tableField);
			}
		});
		// placeholder element for adding column
		html += "<div tabindex='0' class='c-forms-layout-element c-forms-layout-placeholder c-static' data-colspan='" + Math.min(elementTypes.Table.defaultColspan, freeCols) + "' " + commonAttributes + "><div></div>" + renderColumnResizer() + renderQuickInsert() + "<div class='c-forms-placeholder-plus'><i class='icon-plus'></i></div><div class='c-label c-forms-column-summary'></div></div>";
		html += "</div>";
		html += "<div class='c-forms-layout-add-item'><i class='icon-plus'></i> " + Cognito.resources["field-repeatingsection-add-link-text"] + " <span class='c-forms-layout-item-label'><label>" + itemLabel + "</label></span></div>";

		return html;
	}

	function renderTableElement(element, containingType, tableField) {

		// Get the field for the element, if applicable
		var field = element.get_field(containingType);

		var elementType = element.elementType();
		if (!elementType) {
			// Determine the element type based on the field type for fields
			if (field)
				elementType = field.get_elementType();
			// Otherwise, determine the element type based on the name of element in the markup
			else {
				for (var name in elementTypes) {
					elementType = elementTypes[name];
					if (elementType.tag.toLowerCase() === element.tag().toLowerCase())
						break;
				}
			}
		}

		// Create element markup based on the type of element
		var innerMarkup = renderTableField(field, tableField);

		var colSpan = element.colspan();
		var column = element.column();

		// Serialize custom element attributes
		var attributes = element.attributes();
		var attrMarkup = "";
		for (var name in attributes)
			attrMarkup += " data-" + name + "='" + htmlEscape(attributes[name]) + "'";

		// Render the element container
		return "<div tabindex='" + (colSpan == 0 ? -1 : 0) + "' class='c-forms-layout-element c-field c-forms-layout-" + element.tag().toLowerCase() + "'" +
			(element.canMove() ? " draggable='true' ondragstart='Cognito.Forms.dragStart(event)' ondragover='Cognito.Forms.dragOver(event)' ondragenter='Cognito.Forms.dragEnter(event)' ondragleave='Cognito.Forms.dragLeave(event)' ondrop='Cognito.Forms.dragDrop(event)' ondragend='Cognito.Forms.dragEnd(event)'" : "") +
			" data-colspan='" + colSpan + "' data-column='" + column + "'" + attrMarkup + (field ? " data-field='" + field.get_InternalName() + "'" : "") + " data-tag='column' data-type='" + elementType.code + "'>" + innerMarkup + "</div>";
	}

	// Renders an element (field, section or table)
	function renderElement(element, containingType, children) {

		// Get the field for the element, if applicable
		var field = element.get_field(containingType);

		// Determine the element type
		var elementType = element.elementType();
		if (!elementType) {

			// Determine the element type based on the field type for fields
			if (field) {
				elementType = field.get_elementType();
				if (field.get_FieldType().get_Name() === "EntityList") {
					elementType = element.tag() === "section" ? elementTypes.RepeatingSection : elementTypes.Table;
				}
			}

			// Otherwise, determine the element type based on the name of element in the markup
			else {
				for (var name in elementTypes) {
					elementType = elementTypes[name];
					if (elementType.tag.toLowerCase() === element.tag().toLowerCase())
						break;
				}
			}
		}

		// Create element markup based on the type of element
		var innerMarkup = renderElementBody(element, containingType, children, field, elementType);

		var colSpan = element.colspan();
		var column = element.column();

		// Serialize custom element attributes
		var attributes = element.attributes();
		var attrMarkup = "";
		for (var name in attributes)
			attrMarkup += " data-" + name + "='" + htmlEscape(attributes[name]) + "'";
		if (elementType.name === "Content")
			attrMarkup += " data-text='" + htmlEscape(element.get_contentText()) + "'";

		// Render the element container
		return "<div tabindex='0' class='c-forms-layout-element c-field c-forms-layout-" + element.tag().toLowerCase() + "'" +
			(element.canMove() ? " draggable='true' ondragstart='Cognito.Forms.dragStart(event)' ondragover='Cognito.Forms.dragOver(event)' ondragenter='Cognito.Forms.dragEnter(event)' ondragleave='Cognito.Forms.dragLeave(event)' ondrop='Cognito.Forms.dragDrop(event)' ondragend='Cognito.Forms.dragEnd(event)'" : "") +
			" data-colspan='" + colSpan + "' data-column='" + column + "'" + attrMarkup + (field ? " data-field='" + field.get_InternalName() + "'" : "") + " data-tag='" + elementType.tag + "' data-type='" + elementType.code + "'>" + innerMarkup + "</div>";
	}

	// Renders an element (field, section or table)
	// Review: renderSection(columns)
	function renderElementBody(element, containingType, children, field, elementType) {
		if (field)
			field.meta.pendingInit(field.meta.property("requireLabel", field), true);

		var helptext = field && field.get_Helptext() ? "<div class='c-forms-layout-helptext'>" + field.get_Helptext() + "</div>" : "<div class='c-forms-layout-helptext'></div>";
		var html = "";
		switch (elementType) {
			case elementTypes.Section:
				html = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + field.get_Name() + (Cognito.config.allowEntryEncryption && field.get_IsProtected() && Cognito.Forms.model.currentForm.get_EncryptEntries() ? "<div class='c-icons'><i class='icon-protect'></i></div>" : "") + "</label></div>" + helptext + "<div class='c-forms-layout-section-container'>" + renderSection(containingType, field, element.colspan(), children) + "</div>";
				break;
			case elementTypes.RepeatingSection:
				html = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + field.get_Name() + (Cognito.config.allowEntryEncryption && field.get_IsProtected() && Cognito.Forms.model.currentForm.get_EncryptEntries() ? "<div class='c-icons'><i class='icon-protect'></i></div>" : "") + "</label></div>" +

					helptext +

					// repeating form
					"<div class='c-forms-layout-section-container'>" +

					// delete item
					"<div class='c-forms-layout-remove-item'><i class='icon-remove-sign'></i></div>" +
					"<div class='c-forms-layout-repeatingsection-container'><div class='c-forms-layout-repeatingsection-container-item'><span class='c-forms-layout-item-label'><label>" + element.get_itemLabel() + "</label> 1</span></div>" +

					// form fields
					renderSection(containingType, field, element.colspan(), children) +
					"</div><div class='c-forms-layout-add-item'><i class='icon-plus'></i> " + Cognito.resources["field-repeatingsection-add-link-text"] + " <span class='c-forms-layout-item-label'><label>" + element.get_itemLabel() + "</label></span></div></div>";
				break;
			case elementTypes.Table:
				html = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + field.get_Name() + "</label></div>" + helptext + "<div class='c-forms-layout-section-container'>" + renderTable(containingType, field, element.colspan(), children, element.get_itemLabel()) + "</div>";
				break;
			case elementTypes.PageBreak:
				return renderPageBreak(element) + renderQuickInsert();
			case elementTypes.Content:
				html = renderContent(element);
				break;
			case elementTypes.Name:
				html = renderName(element, field);
				break;
			case elementTypes.Address:
				html = renderAddress(element, field);
				break;
			case elementTypes.RatingScale:
				html = renderRatingScale(element, field);
				break;
			default:
				html = renderField(element, field);
				break;
		}

		html += renderColumnResizer();
		html += renderQuickInsert();

		return html;
	}

	Cognito.Forms.renderElementBody = renderElementBody;

	// Renders one or more placeholders at the specified start column
	function renderPlaceholders(column, span, threshold, isRowEnd) {
		var mySpan = 0;

		var getPlaceholderString = function () {
			return "<div tabindex='" + (mySpan == 0 ? -1 : 0) + "' class='c-forms-layout-element c-forms-layout-placeholder c-static' data-colspan='" + mySpan + "' data-column='" + column + "' draggable='true' ondragstart='Cognito.Forms.dragStart(event)' ondragover='Cognito.Forms.dragOver(event)' ondragenter='Cognito.Forms.dragEnter(event)' ondragleave='Cognito.Forms.dragLeave(event)' ondrop='Cognito.Forms.dragDrop(event)' ondragend='Cognito.Forms.dragEnd(event)'>"
				+ renderColumnResizer() + renderQuickInsert()
				+ "<div class='c-forms-placeholder-plus'><i class='icon-plus'></i></div>"
				+ "</div>";
		};

		if (threshold === 0 && span === 0)
			return getPlaceholderString();
		else if (column < ++threshold) {
			mySpan = Math.min(span, threshold - column);
			column += span;
			return getPlaceholderString();
		}
		return "";
	}

	// Renders a field
	function renderField(element, field) {
		var result = "";
		var elementType = field.get_elementType();
		var subType = field.get_FieldSubType() ? field.get_FieldSubType().get_Name() : null;
		var label = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + htmlEscape(field.get_Name()) + "</label>" +
			(field.get_isRequired() != "Never" ? "<i class='c-forms-layout-required'></i>" : "") +
			"<div class='c-icons'>" +
			(Cognito.config.allowEntryEncryption && field.get_IsProtected() && Cognito.Forms.model.currentForm.get_EncryptEntries() ? "<i class='icon-protect'></i>" : "") +
			(field.get_IncludeOnInvoice() ? "<i class='icon-payment'></i>" : "") +
			"</div></div>";
		var helptext = field.get_Helptext() ? "<div class='c-helptext'>" + htmlEscape(field.get_Helptext()) + "</div>" : "";
		var phText = field.get_PlaceholderText();
		var defaultValue = htmlEscape(field.get_DefaultValue());

		switch (elementType) {
			// Date
			case elementTypes.Date:
				phText = phText ? "<span class='c-forms-layout-watermark'>" + phText + "</span>" : "";
				result += label + "<div class='c-editor'><div class='c-forms-layout-field-date'>" +
					(subType.indexOf("Date") >= 0 ? "<div class='c-forms-layout-control field'>" + (defaultValue || phText || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/") + "</div><div><i class='icon-calendar' style='display: inline-block'></i></div>" : "") +
					(subType.indexOf("Time") >= 0 ? "<div class='c-forms-layout-control field'>" + (defaultValue || phText || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:") + "</div><div><i class='icon-time' style='display: inline-block'></i></div>" : "") +
					"</div></div>" + helptext;
				break;
			// Yes/No
			case elementTypes.YesNo:
				var trueValue = field.get_Choices().length >= 1 ? htmlEscape(field.get_Choices()[0].get_Label()) : "True";
				var falseValue = field.get_Choices().length >= 2 ? htmlEscape(field.get_Choices()[1].get_Label()) : "False";
				switch (subType) {
					case "Checkbox":
						result += "<div class='c-editor' style='position: relative;'><div class='c-forms-layout-checkbox'><input tabindex='-1' style='vertical-align: top;' onclick='Cognito.Forms.suppress(event)' type='checkbox'" + (trueValue === defaultValue ? " checked='checked'" : "") + "> <div class='c-label c-yesno-checkbox'><label>" + field.get_Name() + "</label></div></input>" + (field.get_IncludeOnInvoice() ? "&nbsp;<i class='icon-payment'></i>" : "") + "</div></div>" + helptext;
						break;
					case "RadioButtons":
						result += label + "<div class='c-editor c-forms-layout-yesno-radio'><div><input tabindex='-1' onclick='Cognito.Forms.suppress(event)' type='radio'" + (trueValue === defaultValue ? " checked='checked'" : "") + ">" + trueValue +
							"</input>&nbsp;&nbsp;&nbsp;<input tabindex='-1' onclick='Cognito.Forms.suppress(event)' type='radio'" + (falseValue === defaultValue ? " checked='checked'" : "") + ">" + falseValue + "</input></div></div>" + helptext;
						break;
					case "Toggle":
						result += label + "<div class='c-editor'><div class='has-switch'><div class='" + (trueValue === defaultValue ? "switch-on" : "switch-off") + "'><span class='switch-left'>" + trueValue + "</span><label>&nbsp;</label><span class='switch-right'>" + falseValue + "</span></div></div></div>" + helptext;
				}
				break;
			// Choice
			case elementTypes.Choice:
				var control, spacing;
				switch (subType) {
					case "DropDown":
						var price = ""
						if (field.get_HasPrice() && !field.get_HidePrices()) {
							field.get_Choices().forEach(function (choice) {
								if (choice.get_IsSelected() && choice.get_price()) {
									price = " - " + choice.get_price();
								}
							});
						}
						result += label + "<div class='c-editor'><div class='c-forms-layout-control field" + (subType ? " c-forms-" + subType.toLowerCase() : "") + "'>" + (defaultValue ? defaultValue + price : "<span class='c-forms-layout-watermark'><i class='" + elementType.icon + "'></i> " + (field.get_PlaceholderText() ? field.get_PlaceholderText() : field.get_description()) + "</span>") + "<div class='c-forms-layout-dropdown-button'><i class='icon-chevron-down'></i></div></div></div>" + helptext;
						break;
					case "RadioButtons":
						control = "<input tabindex='-1' onclick='Cognito.Forms.suppress(event)' type='radio'";
						spacing = "";
						break;
					case "Checkboxes":
						control = "<input tabindex='-1' onclick='Cognito.Forms.suppress(event)' type='checkbox'";
						spacing = "";
						break;
				}
				if (!result) {
					result = label;
					var columns = Math.min(element.get_columns(), element.colspan() * 2);
					result += "<div class='c-editor'><div class='c-columns-" + columns + "'>";
					field.get_Choices().forEach(function (choice) {
						result += "<div class='c-choice-option'><label>" + control + (choice.get_IsSelected() ? " checked" : "") + ">" + spacing + "<span>" +
							(choice.get_Label() ? htmlEscape(choice.get_Label()) : "") + (field.get_HasPrice() && !field.get_HidePrices() && choice.get_price() ? " - " + choice.get_price() : "") + "</span></label></input></div>";
					});
					if (subType !== "DropDown" && field.get_AllowFillIn() && !field.get_HasPrice()) {
						result += "<div class='c-choice-option'>" + control + ">" + spacing;
						result += "</input><div class='c-forms-layout-control field c-forms-layout-fillin'><span class='c-forms-layout-watermark'>Other</span></div></div>";
					}
					result += "</div></div>" + helptext;
				}
				break;
			// File
			case elementTypes.File:
				result += label + "<div class='c-editor c-forms-layout-fileupload'><div class='c-forms-layout-fileupload-dropzone'><div class='c-save c-button'>" + Cognito.resources["fileupload-default-upload-button-text"] + "</div> " + Cognito.resources["fileupload-dropzone-message"] + "</div></div>" + helptext;
				break;
			// Calculation/Price
			case elementTypes.Calculation:
			case elementTypes.Price:
				result += label + "<div class='c-editor'>" + (field.get_Calculation() ? htmlEscape(field.get_Calculation()) : "<span class='c-forms-layout-watermark'><i class='" + elementType.icon + "'></i> " + htmlEscape(field.get_description()) + "</span>") + "</div>" + helptext;
				break;
			// Simple Field
			default:
				result += label + "<div class='c-editor'><div class='c-forms-layout-control field" + (subType ? " c-forms-layout-" + subType.toLowerCase() : "") + "'>" + (defaultValue ? defaultValue : "<span class='c-forms-layout-watermark'><i class='c-placeholder-text-styled " + elementType.icon + "'></i> " + htmlEscape((field.get_PlaceholderText() && field.get_PlaceholderText().length ? field.get_PlaceholderText() : field.get_description())) + "</span>") + "</div></div>" + helptext;
				break;
		}

		return result;
	}

	// Renders a page break
	function renderPageBreak(element) {
		var pageNumber = element.get_pageNumber();
		var confirmationMarkup = "";

		if (element.isSubmission() && !element.get_redirectUrl()) {
			confirmationMarkup = "<div class='c-forms-confirmation c-html'>" + (element.get_confirmationMessage() || "").replace(/\[(([a-z0-9_.]+)(?:\:(.+?))?)\]/gi, "<span class='c-forms-layout-content-token'>$1</span>") + "</div>";
			if (element.get_includeDocumentLinks()) {
				var includedDocuments = element.get_includedDocuments();
				if (includedDocuments.length > 0) {
					confirmationMarkup += "<div class='c-forms-confirmation'>";
					includedDocuments.forEach(function (d) {
						// NOTE: Accessing 'nameHtml' here could result in evaluating tokens before the view has been constructed, and so the
						// invalid result would then be returned when accessed at a later time (when it actually could be evaluated successfully).
						confirmationMarkup += "<a class='c-forms-document-link'><span class='" + (d.get_OutputType().get_Name() === 'Pdf' ? 'adobe-pdf' : d.get_OutputType().get_Name() === 'Word' ? 'ms-word' : d.get_OutputType().get_Name().toLowerCase()) + "-file-icon-32x32'></span><span>" + d.get_name() + "</span></a>";
					});
					confirmationMarkup += "</div>";
				}
			}
		}

		var markup = "<div class='c-forms-pagebreak-buttons'>" +
			(element.get_showBackButton() ? "<div tabindex='-1' class='c-button c-save'>" + htmlEscape(element.get_backButtonText()) + "</div>" : "") +
			"<div tabindex='-1' class='c-button c-save'>" + htmlEscape(element.get_nextButtonText()) + "</div></div><div class='c-forms-page-number'>" + pageNumber + "/2</div><div class='c-forms-pagebreak-divider'><div class='c-forms-pagebreak-divider-top'></div><div class='c-forms-pagebreak-divider-bottom'></div></div>" +
			confirmationMarkup;
		return markup;
	}

	// Initialize progress bar properties
	function initProgressBarProperties(element) {
		var form = Cognito.Forms.model.currentForm;
		form.set_progressBarType(Cognito.ProgressBarType.get_All().filter(function (t) {
			return t.get_Name().toLowerCase() === element.get_progressBarType().toLowerCase();
		})[0]);
		form.set_showPageTitles(element.get_showPageTitles().toLowerCase() === "true");
		form.set_displayPageNumbersInFooter(element.get_displayPageNumbersInFooter().toLowerCase() === "true");
	}

	// Renders a Content field
	function renderContent(element) {
		var content = element.get_contentText();
		content = content.replace(/\[(([a-z0-9_.\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02b8\u02bb-\u02c1\u02d0-\u02d1\u02e0-\u02e4\u02ee\u0370-\u0373\u0376-\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0523\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0621-\u064a\u0660-\u0669\u066e-\u066f\u0671-\u06d3\u06d5\u06e5-\u06e6\u06ee-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07c0-\u07ea\u07f4-\u07f5\u07fa\u0904-\u0939\u093d\u0950\u0958-\u0961\u0966-\u096f\u0971-\u0972\u097b-\u097f\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc-\u09dd\u09df-\u09e1\u09e6-\u09f1\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a59-\u0a5c\u0a5e\u0a66-\u0a6f\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0-\u0ae1\u0ae6-\u0aef\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3d\u0b5c-\u0b5d\u0b5f-\u0b61\u0b66-\u0b6f\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0be6-\u0bef\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58-\u0c59\u0c60-\u0c61\u0c66-\u0c6f\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0-\u0ce1\u0ce6-\u0cef\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d28\u0d2a-\u0d39\u0d3d\u0d60-\u0d61\u0d66-\u0d6f\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32-\u0e33\u0e40-\u0e46\u0e50-\u0e59\u0e81-\u0e82\u0e84\u0e87-\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa-\u0eab\u0ead-\u0eb0\u0eb2-\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0ed0-\u0ed9\u0edc-\u0edd\u0f00\u0f20-\u0f29\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8b\u1000-\u102a\u103f-\u1049\u1050-\u1055\u105a-\u105d\u1061\u1065-\u1066\u106e-\u1070\u1075-\u1081\u108e\u1090-\u1099\u10a0-\u10c5\u10d0-\u10fa\u10fc\u1100-\u1159\u115f-\u11a2\u11a8-\u11f9\u1200-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u1676\u1681-\u169a\u16a0-\u16ea\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u17e0-\u17e9\u1810-\u1819\u1820-\u1877\u1880-\u18a8\u18aa\u1900-\u191c\u1946-\u196d\u1970-\u1974\u1980-\u19a9\u19c1-\u19c7\u19d0-\u19d9\u1a00-\u1a16\u1b05-\u1b33\u1b45-\u1b4b\u1b50-\u1b59\u1b83-\u1ba0\u1bae-\u1bb9\u1c00-\u1c23\u1c40-\u1c49\u1c4d-\u1c7d\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u2094\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2183-\u2184\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2c6f\u2c71-\u2c7d\u2c80-\u2ce4\u2d00-\u2d25\u2d30-\u2d65\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3006\u3031-\u3035\u303b-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31b7\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fc3\ua000-\ua48c\ua500-\ua60c\ua610-\ua62b\ua640-\ua65f\ua662-\ua66e\ua680-\ua697\ua722-\ua788\ua78b-\ua78c\ua7fb-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8d0-\ua8d9\ua900-\ua925\ua930-\ua946\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa50-\uaa59\uac00-\ud7a3\uf900-\ufa2d\ufa30-\ufa6a\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]+)(?:\:(.+?))?)\]/gi, "<span class='c-forms-layout-content-token'>$1</span>");
		content = content.replace(/\s+href=\".*?\"/gi, '');
		return "<div class='c-forms-layout-field-content'><div class='c-html c-editor'>" + content + "</div></div>";
	}

	var nameParts = {
		Prefix: { width: 10, resource: "name-prefix" },
		First: { width: 20, resource: "name-first" },
		Middle: { width: 20, resource: "name-middle" },
		MiddleInitial: { width: 5, resource: "name-middleinitial" },
		Last: { width: 20, resource: "name-last" },
		Suffix: { width: 10, resource: "name-suffix" }
	};

	var nameFormat = /\[Prefix\]|\[First\]|\[Middle\]|\[MiddleInitial\]|\[Last\]|\[Suffix\]/g;

	// renders a Name field
	function renderName(element, field) {
    var label = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + field.get_Name() + "</label>" + (field.get_isRequired() != "Never" ? "<i class='c-forms-layout-required'></i>" : "") + (Cognito.config.allowEntryEncryption && field.get_IsProtected() && Cognito.Forms.model.currentForm.get_EncryptEntries() ? "<div class='c-icons'><i class='icon-protect'></i></div>" : "") + "</div>";
		var helptext = field && field.get_Helptext() ? "<div class='c-helptext'>" + field.get_Helptext() + "</div>" : "";

		// determine the name parts to display
		var parts = [];
		var format = field.get_Format();
		var totalWidth = 0;
		var token;
		nameFormat.lastIndex = 0;
		while (token = nameFormat.exec(format)) {
			var part = nameParts[token[0].substr(1, token[0].length - 2)];
			parts.push(part);
			totalWidth += part.width;
		}

		// build the name markup
		var nameMarkup = "";
		for (var p = 0; p < parts.length; p++) {
			var part = parts[p];
			nameMarkup += "<div style='width: " + part.width * 100 / totalWidth + "%; float: left;' class='c-editor c-forms-layout-element-part'><div class='c-forms-layout-control c-forms-layout-watermark'>" + Cognito.resources[part.resource] + "</div></div>";
		}

		return label + "<div>" + nameMarkup + "</div>" + helptext;
	}

	// Renders an Address field
	function renderAddress(element, field) {
    var label = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + field.get_Name() + "</label>" + (field.get_isRequired() != "Never" ? "<i class='c-forms-layout-required'></i>" : "") + (Cognito.config.allowEntryEncryption && field.get_IsProtected() && Cognito.Forms.model.currentForm.get_EncryptEntries() ? "<div class='c-icons'><i class='icon-protect'></i></div>" : "") + "</div>";
		var helptext = field && field.get_Helptext() ? "<div class='c-helptext'>" + field.get_Helptext() + "</div>" : "<div class='c-helptext'></div>";

		var parts = {
			"Line1": { width: 100 },
			"Line2": { width: 100 },
			"City": {},
			"State": { resources: { "InternationalAddress": "address-state-province-region" } },
			"PostalCode": { resources: { "USAddress": "address-zip-code" } },
			"Country": { international: true },
		};

		var addressMarkup = "";

		var addrType = field.get_FieldSubType().get_Name();
		for (var part in parts) {
			var data = parts[part];
			if (field.get("include" + part)) {
				if (!data.international || addrType === "InternationalAddress") {
					addressMarkup += "<div style='float: left; padding-bottom: 6px;' class='c-editor c-forms-layout-element-part" + (data.width !== 100 ? " c-partial-line" : "") + "'>";
					var defaultVal = field.get("default" + part);
					if (defaultVal)
						addressMarkup += "<div class='c-forms-layout-control field c-forms-layout-singleline'>" + defaultVal + "</div>";
					else {
						var resource = "address-" + part.toLowerCase();
						addressMarkup += "<div class='c-forms-layout-control c-forms-layout-watermark'>" + Cognito.resources[data.resources ? data.resources[addrType] || resource : resource] + "</div>";
					}

					addressMarkup += "</div>";
				}
			}
		}

		return label + "<div class='c-address" + (addrType === "InternationalAddress" ? " c-international" : "") + "'>" + addressMarkup + "</div>" + helptext;
	}

	// Renders an Rating Scale field
	function renderRatingScale(element, field) {
    var label = "<div class='c-label " + (field.get_HideLabel() ? "c-field-label-hidden" : "") + "'><label>" + htmlEscape(field.get_Name()) + "</label>" + (field.get_isRequired() != "Never" ? "<i class='c-forms-layout-required'></i>" : "") + (Cognito.config.allowEntryEncryption && field.get_IsProtected() && Cognito.Forms.model.currentForm.get_EncryptEntries() ? "<div class='c-icons'><i class='icon-protect'></i></div>" : "") + "</div>";
		var helptext = field && field.get_Helptext() ? "<div class='c-helptext'>" + htmlEscape(field.get_Helptext()) + "</div>" : "<div class='c-helptext'></div>";
		var ratings = field.get_Choices();

		var ratingScaleMarkup = "";
		ratingScaleMarkup += "<thead>";
		ratingScaleMarkup += "<tr>";
		ratingScaleMarkup += "<th></th>";
		ratings.forEach(function (rating) {
			ratingScaleMarkup += "<th class='c-choice-option-header'>" + htmlEscape(rating) + "</th>";
		});
		ratingScaleMarkup += "</tr>";
		ratingScaleMarkup += "</thead>";

		var defaultValue = field.get_DefaultValue();
		var index = 0;
		field.get_ChildType().get_Fields().forEach(function (question) {
			ratingScaleMarkup += "<tbody><tr>";
			ratingScaleMarkup += "<td class='c-question-" + index + "'>" + "<label>" + htmlEscape(question.get_Name()) + "</label>" + (field.get_isRequired() != "Never" ? "<i class='c-forms-layout-required'></i>" : "") + "</td>";
			ratings.forEach(function (rating) {
				ratingScaleMarkup += "<td class='c-choice-option'><span><input tabindex='-1' onclick='Cognito.Forms.suppress(event)' type='radio'" + (defaultValue === rating.get_Label() ? " checked " : "") + "></span></td>";
			});
			ratingScaleMarkup += "</tr></tbody>";
			index++;
		});


		return label + helptext + "<div class='c-rating-scale'><table style='width:100%'>" + ratingScaleMarkup + "</table></div>";
	}

	// Suppresses
	Cognito.Forms.suppress = function supress(event) {
		event.preventDefault();
	};

	//#endregion

	//#region Table Column Drag to Resize
	(function () {
		var _numCols;
		var _colContainer, _field;
		var _containerOffset, _colWidth, _startCol;
		var _x;

		function getCol(x) {
			return Math.round((x - _containerOffset) / _colWidth);
		}

		Cognito.Forms.resizeDragStart = function (event) {
			// Setup per-drag constants
			_field = $(event.target).closest(".c-forms-layout-element").prev();
			_colContainer = _field.closest(".c-forms-row");
			_colContainer.addClass("no-animate");
			var $parent = _field.parentElement();
			$parent.addClass("c-drag-resize");
			_numCols = $parent.colspan();
			_containerOffset = _colContainer.offset().left;
			_colWidth = _colContainer.width() / _numCols;
			_startCol = getCol(_field.offset().left);
			hideToolbar();

			$(document).on("mouseup", Cognito.Forms.tableResizeDragEnd);
			$(document).on("mousemove", Cognito.Forms.tableResizeDrag);

			event.stopPropagation();
			event.preventDefault();
		};

		function doResize(x) {
			var currCol = getCol(x);
			var currSpan = _field.colspan();
			var fullSpan = sumColspans(_colContainer.children(".c-field").get());
			var newSpan = currCol - _startCol;
			var isInSection = _colContainer.isSection();
			if (newSpan >= _field.minimumWidth()
				&& newSpan <= _field.maximumWidth()
				&& newSpan !== currSpan
				/*&& (!isInSection || Math.abs(newSpan - currSpan) > 1)*/) {
				if ((fullSpan + newSpan - currSpan) === _numCols) {
					_colWidth = _colContainer.width() / _numCols;
				}
				reflowSectionCols(_field.parentElement(), _field[0], newSpan - currSpan);
			}
		}

		Cognito.Forms.tableResizeDrag = function (event) {
			doResize(event.clientX);
		};
		Cognito.Forms.tableResizeDragEnd = function (event) {
			// run the resize logic when the drag ends in case ondrag/ondragover events don't work properly (IE 10)
			doResize(event.target, event.clientX);

			_colContainer.removeClass("no-animate");
			_field.parentElement().removeClass("c-drag-resize");

			showToolbar();

			$(document).off("mouseup", Cognito.Forms.tableResizeDragEnd);
			$(document).off("mousemove", Cognito.Forms.tableResizeDrag);

			// Since this allows resizing an element without selecting it, the user may be on a placeholder that
			// becomes too narrow to accomodate a certain element type once the resize is complete
			if ($(currentElement).isPlaceholder())
				$(".c-forms-setting-add-field").html(renderAddFieldSelections());

			event.preventDefault();
			event.stopPropagation();
		};
	})();
	//#endregion

	//#region Drag & Drop

	// Track which element is being dragged
	Cognito.Forms.dragStart = function dragStart(event) {
		var target = event.target;

		// Cancel the DnD operation if the target is a placeholder. Placeholders are draggable to prevent
		// the parent containers from being dragged through a child placeholder element.
		if ($(target).isPlaceholder()) {
			event.preventDefault();
			return;
		}

		// Change the target to the container div if the target element is an image
		if (target.tagName.toUpperCase() == "IMG") {
			target = $(target).parents(".c-forms-layout-element-selected").get(0);
			if (!target)
				return;
		}

		dragging = true;
		$("#c-forms-layout-elements").addClass("drag-drop");

		// Make the drag source the selected element unless the drag source is an element type
		if (!$(target).hasClass("c-forms-settings-elementTypes"))
			target.focus();

		// Set the drag data to initiate the drag
		event.dataTransfer.setData("text", "data");

		// Cut elements being dragged
		if ($(target).isElement()) {
			cancelCutCopy();
			cutCopyElement = target;
			dragElementType = null;

			$(cutCopyElement).addClass("drag-drop");

			if (event.ctrlKey == false)
				isCut = true;
			else
				isCut = false;
		}
		// Create new elements if dragging from toolbar
		else
			dragElementType = Cognito.Forms.elementTypes[$(target).attr("data-code")];

		// Hide the toolbar
		hideToolbar();

		// prevent duplicate dragStart operations (issue with nested fields)
		event.stopPropagation();
	};

	function getElementFromQuickInsert(quickInsert) {
		if ($(quickInsert).is(".c-quick-insert-row"))
			return $(quickInsert).parent().childElements().first();
		else
			return $(quickInsert).closest(".c-forms-layout-element");
	}

	// Highlight drop targets when dragging into elements
	var nestedDropTarget = 0;
	Cognito.Forms.dragEnter = function dragEnter(event) {
		if (!dragging)
			return;

		var target = $(event.target);

		$(".c-quick-insert.hover").removeClass("hover");

		if (target.is(".c-col-resizer, .c-quick-insert")) {
			var quickInsert = target;

			if (target.is(".c-col-resizer"))
				quickInsert = target.siblings(".c-quick-insert");

			var element = getElementFromQuickInsert(quickInsert);
			var row = element.row();
			if (element[0] === cutCopyElement && isCut && !quickInsert.is(".c-quick-insert-row"))
				return;
			if ((!element.isPlaceholder()
				|| element.colspan() === 0)
				&& canPaste(cutCopyElement || dragElementType, element)
				&& (quickInsert.is(".c-quick-insert-row")
					|| dragElementType !== null
					|| canElementFitOnRow(row, cutCopyElement)
					|| (isCut && row.index(cutCopyElement) > -1)))	// rearranging row
			{
				quickInsert.addClass("hover");
			}

			return;
		}

		if (!target.isElement()) {
			target = target.parents(".c-forms-layout-element").first();
			nestedDropTarget++;
		}

		// Exit immediately if not over a valid drop target or if the drop target is not valid for the drag source
		if (target.length == 0 || !canPaste(cutCopyElement || dragElementType, target)) {
			event.preventDefault();
			return;
		}

		if (currentDropTarget && currentDropTarget != target[0]) {
			$(currentDropTarget).removeClass("c-forms-layout-drag-over");
		}
		currentDropTarget = target[0];
		if (target.isPlaceholder())
			target.addClass("c-forms-layout-drag-over");

		nestedDropTarget = Math.max(nestedDropTarget, 0);
		window.setTimeout(function () { nestedDropTarget = 0; }, 1);
	};

	// Remove the highlight when dragging out of elements
	Cognito.Forms.dragLeave = function dragLeave(event) {
		if (!dragging)
			return;

		var target = $(event.target);
		if (!target.isElement())
			target = target.parents(".c-forms-layout-element").first();

		// Exit immediately if not over a valid drop target
		if (target.length == 0)
			return;

		if (!nestedDropTarget) {
			target.removeClass("c-forms-layout-drag-over");
		}
		nestedDropTarget--;
		nestedDropTarget = Math.max(nestedDropTarget, 0);
	};

	// Highlight drop targets when dragging over them
	Cognito.Forms.dragOver = function dragLeave(event) {
		if (!dragging)
			return;

		var target = $(event.target);
		if (!target.isElement())
			target = target.parents(".c-forms-layout-element").first();

		// Exit immediately if not over a valid drop target
		if (target.length == 0 || !canPaste(cutCopyElement || dragElementType, target)) {
			return;
		}

		if (target.isPlaceholder())
			target.addClass("c-forms-layout-drag-over");

		event.preventDefault();
	};

	// Handle drops on valid drop targets
	Cognito.Forms.dragDrop = function dragDrop(event) {
		if (!dragging)
			return;

		dragging = false;
		$(".c-quick-insert.hover").removeClass("hover");

		// Cancel the paste operation if the drop target is not valid for the drag source
		if (!canPaste(cutCopyElement || dragElementType, event.target)) {
			event.preventDefault();
			cancelCutCopy();
			return;
		}

		$(currentDropTarget).removeClass("c-forms-layout-drag-over");
		var target = $(event.target);
		if (!target.is(".c-quick-insert")) {
			if (!target.isElement())
				target = target.parents(".c-forms-layout-element").first();
			currentElement = target[0];
		}

		// Paste the element being dragged
		var pasteAfter = false;
		var pasteBetween = true;
		if (!target.isPlaceholder()) {
			var pasteBetween = !target.is(".c-quick-insert-row");
			var element = getElementFromQuickInsert(target);
			// Cannot paste if same element or element is child of copied element
			if ((element[0] === cutCopyElement && isCut && pasteBetween) || !canPaste(cutCopyElement || dragElementType, element)) {
				event.preventDefault();
				return;
			}
			var row = element.row();
			if (!pasteBetween
				|| canElementFitOnRow(row, cutCopyElement)
				|| (isCut && row.index(cutCopyElement) > -1))	// rearranging row
			{
				pasteElement(cutCopyElement, dragElementType, element[0], false, pasteBetween);
			}
		}
		else
			pasteElement(cutCopyElement, dragElementType, target[0], pasteAfter, pasteBetween);

		event.preventDefault();
	};

	// Cancel the drop operation when aborted
	Cognito.Forms.dragEnd = function dragEnd(event) {
		$(".c-forms-layout-drag-over").removeClass("c-forms-layout-drag-over");
		$(".drag-drop").removeClass("drag-drop");
		$(".c-quick-insert.hover").removeClass("hover");
		event.preventDefault();

		if (dragging)
			cancelCutCopy();
		dragging = false;
	};

	//#endregion

	//#region Builder UI Functions

	// Selects the specified form element
	function selectElement(element) {
		// Reset flag
		calculatingVisiblePreview = false;

		// Exit immediately if the element is already selected
		if (currentElement == element) return;

		// Unsubscribe from changes to the back element
		if (Cognito.Forms.model.currentElement)
			Cognito.Forms.model.currentElement.unsubscribe();

		// Hide the toolbar
		hideToolbar();

		// Deselect the back element if still in the DOM and the element either has siblings or is a child element of a section
		if (currentElement && !$(currentElement).isTableColumn() && ($(currentElement).siblings().length > 0 ||
			($(currentElement).parentElement() && !$(currentElement).parentElement.isView))) {

			// Remove the row the back element was on if the row is blank and has been abandoned
			var removeBackRow = $(currentElement).isPlaceholder() && // Placeholder
				$(currentElement).row().filter(function () { return this === element; }).length === 0 && // Selected element on different row
				($(currentElement).column() > 1 || $(currentElement).nextElement().length > 0); // Not a section footer placeholder

			// Attempt to remove the back row
			if (removeBackRow)
				!removeRowIfBlank(currentElement);
		}
		// Remove non-static table placeholder column
		if (currentElement && $(currentElement).parent().length && $(currentElement).isPlaceholder() && $(currentElement).is(".c-insert-between")) {
			removeElement(currentElement);
		}

		// Set the current element
		currentElement = element;
		ExoWeb.Observer.setValue(Cognito.Forms.model, "currentElement", ExoWeb.Observer.makeObservable($(currentElement)));
		Cognito.Forms.model.currentElement.subscribe();

		// Show the toolbar for the selected element
		animations.waitForAll(function () {
			showToolbar();
		});

		// Render the "Add Field" selections
		if ($(currentElement).isPlaceholder()) {
			$(".c-forms-setting-add-field").html(renderAddFieldSelections());
		}
		else if ($(currentElement).isSubmission()) {
			// Hide the submission settings callout
			Cognito.hideCallout("#c-callout-submission-settings");
		}

		// Apply intellisense to expression fields. Table column summary fields must scope intellisense to the parent (table)
		var scope = $(currentElement).get_scope();
		var parentScope = $(currentElement).parentElement().get_scope();
		$(".cognito:first").find(".c-expression input, .c-expression textarea").each(function () {
			var isColumnSummary = $(this).closest(".c-forms-settings-column-summary").length;
			Cognito.initializeIntellisense($(this), Cognito.Forms.model.currentForm, isColumnSummary ? parentScope : scope);
		});
		// Apply intellisense to expression fields
		//Cognito.initializeIntellisense($('.cognito:first'), Cognito.Forms.model.currentForm, $(currentElement).get_scope());

		var field = $(currentElement).get_field();

		// If the field is an address field, ensure the form's language is set on the field to calculate default countries properly
		if (field && field.get_FieldType().get_Name() === 'Address') {

			var defaultCountry = $(currentElement).get_field().get_defaultCountry();
			$(".c-forms-test-defaultcountry-choices option").remove();

			$(".c-forms-test-defaultcountry-choices")
				.append($("<option></option>")
					.attr("value", ""));

			$.each(Cognito.resources.getArray("countries"), function (key, value) {
				$(".c-forms-test-defaultcountry-choices")
					.append($("<option></option>")
						.attr("value", value)
						.attr("selected", (defaultCountry === value ? "selected" : null))
						.text(value));
			});
		}

		if (field && $(currentElement).isTableColumn()) {
			var cs = field.get_ColumnSummary();
			field.set_ColumnSummary("");
			field.set_ColumnSummary(cs);
		}

		// Suppress event cascading to support nested elements
		return false;
	}

	var _toolbarTimeout;
	// Shows the toolbar for the current element
	function showToolbar(immediate) {
		if (_toolbarTimeout)
			clearTimeout(_toolbarTimeout);
		_toolbarTimeout = window.setTimeout(function () {
			_toolbarTimeout = null;

			if (!currentElement)
				return;

			var element = $(currentElement);
			var isTableColumn = element.isTableColumn();

			// Do not show a toolbar for elements that cannot be moved
			if (!element.canMove())
				return;

			// Determine the position of the current element
			var pos = element.offset();

			// Determine if the selected element is a placeholder
			var isPlaceholder = element.isPlaceholder();
			var columns = element.colspan();

			// Cut button
			if (isPlaceholder)
				$("#c-forms-cut").addClass("disabled");
			else {
				$("#c-forms-cut").removeClass("disabled");
				if (currentElement == cutCopyElement && isCut)
					$("#c-forms-cut").addClass("c-forms-layout-toolbar-selected");
				else
					$("#c-forms-cut").removeClass("c-forms-layout-toolbar-selected");
			}

			// Copy button
			if (isPlaceholder)
				$("#c-forms-copy").addClass("disabled");
			else {
				$("#c-forms-copy").removeClass("disabled");
				if (currentElement == cutCopyElement && !isCut)
					$("#c-forms-copy").addClass("c-forms-layout-toolbar-selected");
				else
					$("#c-forms-copy").removeClass("c-forms-layout-toolbar-selected");
			}

			// Paste button
			if (!cutCopyElement || ($(cutCopyElement).parent().length && !canPaste(cutCopyElement, currentElement))) {
				$("#c-forms-paste").addClass("disabled");
				$("#c-forms-paste").removeClass("parent");
			}
			else if (isPlaceholder) {
				$("#c-forms-paste").removeClass("disabled");
				$("#c-forms-paste").removeClass("parent");
			}
			else {
				$("#c-forms-paste").removeClass("disabled");
				$("#c-forms-paste").addClass("parent");

				// Paste Above/Below
				if (isTableColumn)
					$("#c-forms-paste-above,#c-forms-paste-below").addClass("disabled");
				else
					$("#c-forms-paste-above,#c-forms-paste-below").removeClass("disabled");

				// Paste Before/After
				if (!(isCut && currentElement === cutCopyElement)
					&& (canElementFitOnRow($(currentElement).row(), cutCopyElement)
						|| (isCut && $(currentElement).row().index(cutCopyElement) > -1)))
					$("#c-forms-paste-before,#c-forms-paste-after").removeClass("disabled");
				else
					$("#c-forms-paste-before,#c-forms-paste-after").addClass("disabled");
			}

			// Delete button
			if (isPlaceholder)
				$("#c-forms-delete").addClass("disabled");
			else
				$("#c-forms-delete").removeClass("disabled");

			// Justify row
			if (isPlaceholder || isJustified($(currentElement).row()))
				$("#c-forms-justify-row").addClass("disabled");
			else
				$("#c-forms-justify-row").removeClass("disabled");

			// Insert Above/Below buttons
			if (isPlaceholder || isTableColumn)
				$("#c-forms-insert-above, #c-forms-insert-below").addClass("disabled");
			else
				$("#c-forms-insert-above, #c-forms-insert-below").removeClass("disabled");

			// Smaller
			if (!isPlaceholder && columns > element.minimumWidth())
				$("#c-forms-make-smaller").removeClass("disabled");
			else
				$("#c-forms-make-smaller").addClass("disabled");

			// Bigger
			if (!isPlaceholder && columns < element.maximumWidth(true))
				$("#c-forms-make-bigger").removeClass("disabled");
			else
				$("#c-forms-make-bigger").addClass("disabled");

			if (isPlaceholder) {
				$("#c-forms-make-smaller").removeClass("c-always-show");
				$("#c-forms-make-bigger").removeClass("c-always-show");
			}
			else {
				$("#c-forms-make-smaller").addClass("c-always-show");
				$("#c-forms-make-bigger").addClass("c-always-show");
			}

			// Insert before/after
			if (!isPlaceholder && !element.parent().is(".c-no-add") && !isRowFull(element.row().filter(".c-field")))
				$("#c-forms-insert-before, #c-forms-insert-after").removeClass("disabled");
			else
				$("#c-forms-insert-before, #c-forms-insert-after").addClass("disabled");

			if (isTableColumn)
				$("#c-forms-insert").html($("#c-forms-insert").html().replace("Field", "Column"));
			else
				$("#c-forms-insert").html($("#c-forms-insert").html().replace("Column", "Field"));

			if (element.isTable())
				$("#c-forms-convert-section").removeClass("disabled");
			else
				$("#c-forms-convert-section").addClass("disabled");

			if (element.elementType() === elementTypes.RepeatingSection
				&& element.childElements(".c-field").length <= ((element.colspan()) / elementTypes.Table.minColspan)
				&& element.childElements(".c-field").get().every(function (el) { return canPlaceFieldInTable($(el).get_field()); })
			)
				$("#c-forms-convert-table").removeClass("disabled");
			else
				$("#c-forms-convert-table").addClass("disabled");

			$("#c-forms-layout-toolbar .parent").each(function () {
				if (!$(".children." + this.id + " >div:not(.disabled)").length)
					$(this).addClass("disabled");
				else
					$(this).removeClass("disabled");
			});

			// Reposition the toolbar and fade into view if the toolbar has visible buttons
			if ((!isPlaceholder || cutCopyElement) && !immediate) {
				var $toolbar = $("#c-forms-layout-toolbar");
				var top = pos.top - 32;
				var extraMargin = 60;
				var left = pos.left + extraMargin;
				var parentRight = $toolbar.parent().offset().left + $toolbar.parent().width();
				var elementRight = pos.left + element.width();
				var contentWidth = $toolbar.children(".option:not(.disabled),.option.c-always-show").get().reduce(function (w, el) { return w + $(el).outerWidth(); }, 0);
				var toolbarOverflow = (left + contentWidth) - parentRight;
				if (toolbarOverflow > 0)
					left -= toolbarOverflow + parentRight - elementRight + extraMargin;

				if (isTableColumn)
					top = pos.top + element.outerHeight() - 5;

				top += $("#c-admin").scrollTop();

				$toolbar
					.css({ position: "absolute", top: top + "px", left: left + "px" }, 0)
					.fadeIn(200);
			}
		}, immediate ? 0 : 300);
	}

	// Hides the toolbar
	function hideToolbar() {
		clearTimeout(_toolbarTimeout);
		$("#c-forms-layout-toolbar").fadeOut(200);
		$(".c-forms-modal-menu").hide();
	}

	// Cuts the current form element
	function cutElement() {

		// Abort the cut operation if the current element is already cut
		if (cutCopyElement === currentElement && isCut) {
			cancelCutCopy();
			return;
		}

		// Otherwise cancel pending cut/copy operations and cut the current element
		cancelCutCopy();
		$(currentElement).fadeTo(200, 0.5);
		isCut = true;
		cutCopyElement = currentElement;
		showToolbar();
	}

	// Copies the current form element
	function copyElement() {

		// Abort the copy operation if the current element is already copied
		if (cutCopyElement === currentElement && !isCut) {
			cancelCutCopy();
			return;
		}

		// Otherwise cancel pending cut/copy operations and copy the current element
		cancelCutCopy();
		$(".c-forms-layout-label", currentElement).append(" <i class='icon-copy'></i>");
		isCut = false;
		cutCopyElement = currentElement;
		showToolbar();
	}

	// Cancels the pending cut or copy operation
	function cancelCutCopy() {
		if (cutCopyElement) {
			$(cutCopyElement).fadeTo(200, 1);
			$(".c-forms-layout-label I", cutCopyElement).remove();
			cutCopyElement = null;
			showToolbar();
		}
	}

	var deleteConfirmation = $.fn.dialog({
		title: "Delete Field?",
		text: "All data associated with this field will be deleted. Are you sure you want to delete?",
		buttons: [
			{
				label: "Cancel",
				isCancel: true
			},
			{
				label: "Delete",
				autoClose: false,
				click: function () {
					deleteElement(true);
					this.close();
				}
			}
		]
	});

	function sumColspans(columns, assumeMinimums) {
		return columns.reduce(function (total, field) {
			return total + (assumeMinimums ? Math.min($(field).minimumWidth(), $(field).colspan()) : $(field).colspan());
		}, 0);
	}

	function getFreeColumns($row, assumeMinimums) {
		var freeColumns = $row.first().parentElement().colspan();
		$row.each(function (i) {
			//if (!$(this).isPlaceholder() || ($(this).isPlaceholder() && i < $row.length - 1))
			freeColumns -= (assumeMinimums ? Math.min($(this).colspan(), $(this).minimumWidth()) : $(this).colspan());
		});

		return freeColumns;
	}

	function itemsAfter($collection, $target) {
		var index = $collection.index($element);
		var $before = $collection.slice(0, index);
		var $after = $collection.slice(index + 1);
		return $after;
	}

	function isMinimum(el) { return $(el).colspan() <= $(el).minimumWidth(); }

	function isRowFull($row) {
		// Assume fields with colspan 0 are being deleted
		var fields = $row.filter(".c-field:not([data-colspan='0'])").get();
		return fields.every(isMinimum) && sumColspans(fields) >= $row.eq(0).parentElement().colspan();
		//return getFreeColumns($row, true) < $row.eq(0).parentElement().elementType().minColspan;
	}

	/**
	 * Returns true if the element can fit (at minimum width) on the row assuming all other fields are at minimum width as well.
	 */
	function canElementFitOnRow(row, element) {
		return getFreeColumns(row, true) >= $(element).minimumWidth(row.first().parentElement());
	}

	function propagateSectionResize(section) {
		section = $(section);
		var rows = section.rows();
		rows.forEach(function (row) {
			if (row.length === 1 && row.first().isPlaceholder())
				row.colspan(Grid.getDefaultPlaceholderWidth(section.colspan())).column(1);
			else if (row.get().every(function (e) { return $(e).isPlaceholder(); }))
				justifyRow(row, true);
			else
				reflowSectionCols(section, row, 0);
		});
	}

	function reflowSectionCols(container, changingElement, incomingCols, callback) {
		var containerType = $(container).elementType();
		var numCols = containerType.maxGridColumns;
		var $colContainer = $(changingElement).parent(".c-columns");
		var $row;
		var $changingElement;
		if (changingElement instanceof jQuery && changingElement.length > 1) {
			$changingElement = $();
			$row = changingElement;
		}
		else {
			$changingElement = $(changingElement);
			$row = $(changingElement).row();
		}

		if (isNaN(incomingCols))
			incomingCols = 0;

		var maxCols = $(container).colspan();
		var freeColumns = maxCols;

		var $siblings;
		var isPlaceholder = $changingElement.isPlaceholder();

		var allPlaceholders = $row.get().every(function (el) { return $(el).isPlaceholder(); });
		var changingIndex = $row.index($changingElement);
		var $before = $row.slice(0, changingIndex);
		var $after = $row.slice(changingIndex + 1).filter(!isPlaceholder || allPlaceholders ? ".c-field" : "div");

		$row.each(function (i) {
			if (!$(this).isPlaceholder())
				freeColumns -= $(this).colspan();
		});

		freeColumns -= incomingCols;

		// A full reflow can modify colspan of any element on the row. Otherwise, columns are simply redistributed between
		// target element and it's neighbor
		var fullReflow = Cognito.altResizing
			|| (!Cognito.altResizing
				&& (!$changingElement.length
					|| $changingElement.is(".c-forms-layout-placeholder:not(.c-insert-between)")
					|| $changingElement.next().colspan() - incomingCols < $changingElement.next().minimumWidth()
					|| (isMinimum($changingElement.next()) && incomingCols > 0 && freeColumns + incomingCols >= 0)));

		if (fullReflow) {
			if (isPlaceholder && !allPlaceholders && incomingCols >= 0)
				freeColumns -= $changingElement.colspan();

			if (changingIndex === $row.length - 1 || sumColspans($after.get()) - sumColspans($after.get(), true) < -freeColumns)
				$siblings = $before.add($after);
			else
				$siblings = $after;

			if ($siblings.last().isPlaceholder() && freeColumns < 0) {
				var freed = Math.min($siblings.last().colspan(), -freeColumns);
				$siblings.last().colspan($siblings.last().colspan() - freed);
				freeColumns += freed;
			}

			var richToPoor = $siblings.sort(function (a, b) { return $(b).colspan() - $(a).colspan(); });

			// Take columns away from other fields as long as necessary
			for (var i = 0, len = richToPoor.length; freeColumns < 0; i++) {
				var $field = richToPoor.eq(i % len);
				var currentColspan = $field.colspan();
				if (currentColspan > $field.minimumWidth()) {
					$field.colspan(currentColspan - 1);
					updateColumnLayoutOptions($field);
					if ($field.isSection() || $field.isTable())
						propagateSectionResize($field);

					freeColumns++;
				}

				// Prevent infinite loop scenario
				if (i % len === 0 && freeColumns < 0 && $siblings.get().every(isMinimum)) {
					if (isRowFull($colContainer.childElements()))
						$colContainer.addClass("c-full");
					else
						$colContainer.removeClass("c-full");
					return callback && callback(false);
				}
			}

			if (!allPlaceholders && !$changingElement.is(".c-forms-layout-placeholder.c-static")) {
				var ph = $row.filter(function (i, el) {
					return $(el).is(".c-forms-layout-placeholder.c-static") && i === $row.length - 1;
				});

				ph.colspan(containerType === elementTypes.Table ? Math.min(containerType.defaultColspan, freeColumns) : freeColumns)
					.column(ph.prev().column() + ph.prev().colspan());

				// Get rid of multiple placeholders on end of row
				var extra = ph.prev(".c-forms-layout-placeholder");
				while (extra.length) {
					ph.column(extra.column());
					ph.colspan(ph.colspan() + extra.colspan());
					extra.remove();
					extra = ph.prev(".c-forms-layout-placeholder");
				}
			}
		}

		// Get next element before callback, since callback may remove it
		var $ne = $changingElement.nextElement();

		if (callback)
			callback(changingElement);
		else {
			$changingElement.colspan($changingElement.colspan() + incomingCols);
			updateColumnLayoutOptions($changingElement);
		}

		// Adjust the width of the next element
		if (!fullReflow) {
			if ($ne.is(".c-forms-layout-placeholder.c-static"))
				$ne.colspan(containerType === elementTypes.Table ? Math.min(containerType.defaultColspan, freeColumns) : freeColumns);
			else {
				$ne.colspan($ne.colspan() - incomingCols);
				updateColumnLayoutOptions($ne);
				if ($ne.isSection() || $ne.isTable())
					propagateSectionResize($ne);
			}
		}

		if ($changingElement.isSection() || $changingElement.isTable())
			propagateSectionResize($changingElement);

		// Reevaluate column position for each field
		// In case the row has been modified, do not use the stored version of the row
		assignColumns($colContainer.childElements());

		// Travel up tree, recalculating if rows are full
		while ($colContainer.length) {
			var $row = $colContainer.childElements();
			var parent = $colContainer.parentElement();
			if (isRowFull($row))
				$colContainer.addClass("c-full");
			else
				$colContainer.removeClass("c-full");

			if (getFreeColumns($row, true) < parent.elementType().minColspan)
				$colContainer.addClass("c-no-add");
			else
				$colContainer.removeClass("c-no-add");

			$colContainer = $colContainer.parent().closest(".c-columns");
		}
	}


	// Deletes the current form element
	function deleteElement(doNotPrompt) {

		var promptUser = doNotPrompt === true ? false : Cognito.Forms.model.hasEntries && ($(currentElement).get_field() && !$(currentElement).get_field().get_isNew());

		if (promptUser)
			deleteConfirmation.open();
		else {

			// See if this is a page break being deleted
			var isPageBreak = $(currentElement).tag().toLowerCase() == "pagebreak";

			// Hide the toolbar
			hideToolbar();

			var fieldToRemove = $(currentElement).get_field();

			// Remove the corresponding field
			$(currentElement).containingType().get_Fields().remove(fieldToRemove);

			// Clear the billing email field if the mapped email field is being removed 
			if (fieldToRemove) {
				var form = Cognito.Forms.model.currentForm;
				var emailPath = form.get_BillingEmailField();
				if (emailPath) {
					// Clear the mapping if the mapped field cannot be found
					if (!findField(form, emailPath)) {
						// clear the mapped email field
						form.set_BillingEmailField(null);

						// Rerender the payment block
						renderPayment();
					}
				}
			}

			// Cancel cut/copy operations if the item on the clipboard is deleted
			if (currentElement === cutCopyElement)
				cancelCutCopy();

			// Unsubscribe from changes for the element being removed
			Cognito.Forms.model.currentElement.unsubscribe();
			Cognito.Forms.model.currentElement = null;

			var elementType = $(currentElement).elementType();

			// Remove the element and select an appropriate alternate element
			removeElement(currentElement, null, function (nextElement) {

				// Once animations are complete, validate type
				animations.waitForAll(function () {
					nextElement.focus();

					// Update page numbers if this is a page break element
					if (isPageBreak)
						updatePageNumbers();

					Cognito.Forms.updateViewDefinition(false);
					validateExpressions(Cognito.Forms.model.currentForm);

					if (!Cognito.config.allowSignatures && elementType === elementTypes.Signature && !hasSignature()) {
						var currentForm = Cognito.Forms.model.currentForm;
						if (currentForm.meta.getCondition(signatureConditionType))
							currentForm.meta.getCondition(signatureConditionType).condition.destroy();
					}
					else if (!Cognito.config.allowTables && elementType === elementTypes.Table && !hasTable()) {
						var currentForm = Cognito.Forms.model.currentForm;
						if (currentForm.meta.getCondition(tableConditionType))
							currentForm.meta.getCondition(tableConditionType).condition.destroy();
					}
				});
			});
		}
	}

	// Remove the specified element and replace with placeholders
	// Returns the first placeholder used to replace the removed item
	function removeElement(element, pasteTarget, callback) {
		Cognito.Forms.model.currentForm.set_HasChanges(true);

		if (!$(element).isTableColumn()) {
			// First attempt to just remove the row if this is the only element on it
			var nextElement = removeRowIfBlank(element, pasteTarget);
			if (nextElement) {
				if (callback)
					callback(nextElement);
				return;
			}
		}

		var nextElement = $(element).nextElement()[0];
		var $colContainer = $(element).parent();

		reflowSectionCols($(element).parentElement(), element, -$(element).colspan(), function () {
			$colContainer.removeClass("c-full");
			if ($colContainer.children().length === 1)
				$colContainer.addClass("c-empty");

			$(element).colspan(0);

			setTimeout(animations.pending(function () {
				$(element).remove();
				if (callback)
					callback(nextElement);
			}), 300);
		});
	}

	// Removes the row for the specified element if it just contains placeholders
	// Returns the element immediately following the removed row, or null if the row was not removed
	function removeRowIfBlank(element, pasteTarget, force) {
		var row = $(element).row();
		var nextElement = row.last().nextElement();

		if (nextElement.length > 0 && !nextElement.isSubmission() && row.filter(function () { return (this !== element && !$(this).isPlaceholder())/* || (pasteTarget && this === pasteTarget)*/; }).length === 0) {
			var rowToRemove = $(element).closest(".c-forms-row");
			var $nextRow = rowToRemove.next(".c-forms-row");
			rowToRemove.slideUp(500).promise().then(animations.pending(function () {
				rowToRemove.remove();
				if ($nextRow.childElements(".c-field").length > 0)
					$nextRow.children(".c-quick-insert-row").clearInlineStyles();
			}));

			return nextElement[0];
		}
		return null;
	}

	// Determines whether the specified source element can be pasted into the target
	function canPaste(elementOrType, dropTarget) {
		if (!elementOrType)
			return;

		var $dropTarget = $(dropTarget).closest(".c-forms-layout-element");

		//if (elementOrType === $dropTarget.get(0))
		//	return false;

		// Cannot paste an element into a placeholder that is a child of the element
		var canPaste = $dropTarget.parents().filter(function (e) { return this === elementOrType; }).length === 0;

		if (elementOrType instanceof HTMLElement)
			elementOrType = $(elementOrType);

		var field, elementType;
		if (elementOrType instanceof jQuery) {
			elementType = elementOrType.elementType();
			field = elementOrType.get_field();
		}
		else
			elementType = elementOrType;

		// Check to see if the element is a valid element type for the target container, ie a page break cannot be pasted into a section
		var containingSection = $dropTarget.parent().closest(".c-forms-layout-section");
		var containerType = containingSection.elementType();
		canPaste = canPaste
			&& (containingSection.is("#c-forms-layout-elements")
				|| elementType.canAddToSection
				|| (containerType !== elementTypes.Section && containerType !== elementTypes.RepeatingSection));

		// See if the element can be pasted into a table
		var containingTable = $dropTarget.parents(".c-forms-layout-element.c-forms-layout-table");
		containerType = containingTable.elementType();
		canPaste = canPaste && ((containerType !== elementTypes.Table || (field ? canPlaceFieldInTable(field) : elementType.canAddToTable)));
		if (elementOrType instanceof jQuery && containingTable.length && elementOrType.parentElement().uuid() !== containingTable.uuid())
			canPaste = canPaste && !containingTable.isTableFull();

		if (elementOrType instanceof jQuery && containingSection.length && elementOrType.parent().uuid() !== $dropTarget.parent().uuid()) {
			canPaste = canPaste && containingSection.colspan() >= elementOrType.minimumWidth();
		}

		return canPaste;
	}

	var moveConfirmation = $.fn.dialog({
		title: "Move Field?",
		text: "All data associated with this field will be deleted. Are you sure you want to move this element?",
		buttons: [
			{
				label: "Cancel",
				isCancel: true
			},
			{
				label: "Move",
				autoClose: false,
				click: function () {
					pasteElement(_sourceElement, _sourceElementType, _targetElement, _pasteAfter, _pasteBetween, true);
					this.close();
				}
			}
		]
	});

	var updateLocalizationDialog = $.fn.dialog({
		title: "Update Location Settings",
		text: "Update your forms location settings.  Please wait...",
		closeOnOverlayClick: false,
		closeOnEscape: false,
		includeCloseButton: false,
		buttons: []
	});

	function canPlaceFieldInTable(field) {
		if (!field)
			return false;

		var type = field.get_FieldType();
		var subType = field.get_FieldSubType();
		return field.get_elementType().canAddToTable !== false && (type.get_Name() !== "Choice" || subType.get_Name() !== "Checkboxes");
	}

	function updateSubTypes(element, field) {
		// Update field's allowed subtypes
		var isTableCol = $(element).isTableColumn();
		var subTypes = field.get_FieldType().get_elementType().subTypes;
		if (subTypes) {
			subTypes = subTypes.filter(function (s) {
				return (!isTableCol || s.canAddToTable !== false);
			}).map(function (s) { return s.fieldSubType; });
			// Force property to be recalculated since the isTableColumn property is changing
			field.meta.pendingInit(field.meta.property("allowedSubTypes", field), true);
		}

		// Ensure field's subtype is allowed
		if (subTypes.length > 0 && !subTypes.some(function (s) { return s.get_Id() === field.get_FieldSubType().get_Id(); })) {
			field.set_FieldSubType(subTypes[0]);
		}
	}

	Cognito.updateSubTypes = updateSubTypes;

	var _sourceElement, _sourceElementType, _targetElement, _pasteAfter, _pasteBetween;

	// Pastes a copied or cut element
	function pasteElement(sourceElement, sourceElementType, targetElement, pasteAfter, pasteBetween, doNotPrompt) {

		// Store the pasteElement arguments so it can be access by the moveConfirmation dialog
		_sourceElement = sourceElement;
		_sourceElementType = sourceElementType;
		_targetElement = targetElement;
		_pasteAfter = pasteAfter;
		_pasteBetween = pasteBetween;

		var sourceField = sourceElement ? $(sourceElement).get_field() : null;
		var targetContainingType = $(targetElement).containingType();
		var sourceContainingType = sourceElement ? $(sourceElement).containingType() : null;
		var targetIsTableCol = $(targetElement).isTableColumn() || $(targetElement).parent().isTable();
		var isSameContainer = sourceElement && $(sourceElement).row().index(targetElement) > -1;

		// Prompt the user if the form has entries and the element is being cut/moved into another container
		var promptUser = doNotPrompt === true ? false : isCut && Cognito.Forms.model.hasEntries && sourceField && !sourceField.get_isNew() && sourceContainingType !== targetContainingType;
		if (promptUser)
			moveConfirmation.open();
		else {

			// Setup rename object if containing type changes.  Cannot rename if the element is moving from or to a different repeating section
			if (sourceField && sourceContainingType != targetContainingType) {

				// Find nearest repeating section for source container
				var sourceContainingRepeatingSection = $(sourceElement).parentElement()
				while (sourceContainingRepeatingSection !== null && sourceContainingRepeatingSection.elementType() !== elementTypes.RepeatingSection) {
					sourceContainingRepeatingSection = sourceContainingRepeatingSection.parentElement();
				}

				var targetContainingRepeatingSection = $(targetElement).parentElement();

				// Find nearest repeating section for target container
				while (targetContainingRepeatingSection !== null && targetContainingRepeatingSection.elementType() !== elementTypes.RepeatingSection) {
					targetContainingRepeatingSection = targetContainingRepeatingSection.parentElement();
				}

				var sourceContainerId = sourceContainingRepeatingSection === null ? null : sourceContainingRepeatingSection.uuid();
				var targetContainerId = targetContainingRepeatingSection === null ? null : targetContainingRepeatingSection.uuid();

				// If source and target share a containing repeating section, can try to rename
				if (sourceContainerId === targetContainerId) {
					// Update the view definition to ensure the UIDs are included to process the renames
					Cognito.Forms.updateViewDefinition(false);
					rename.serializedOldRootType = Cognito.serialize(Cognito.Forms.model.currentForm);
					rename.oldFieldPath = sourceContainingType.get_InternalName() + "." + sourceField.get_InternalName();
				}
				// Cannot try to rename
				else
					rename.serializedOldRootType = rename.oldFieldPath = null;
			}
			// No rename necessary
			else
				rename.serializedOldRootType = rename.oldFieldPath = null;


			// Hide the toolbar
			hideToolbar();
			var copyElement;

			// Create a new element if the source element type was specified
			if (sourceElementType)
				copyElement = createElement(targetElement, sourceElementType);
			// Otherwise copy the source element
			else if (sourceElement) {
				var resultingField = sourceField;
				if (sourceField) {
					if (isCut) {
						// Move the source field to the correct containing type
						if (sourceContainingType != targetContainingType) {
							// Remove the source from its old container
							sourceContainingType.get_Fields().remove(sourceField);

							// Add the source to the new target container
							targetContainingType.get_Fields().add(sourceField);

							// Recalculate the internal name based on its new container
							var name = sourceField.get_OverrideInternalName() ? sourceField.get_InternalName() : sourceField.get_Name();
							sourceField.set_InternalName(getInternalName(targetContainingType, sourceField, name, $(sourceElement).elementType()));

							// Recalculate the index based on its new container
							targetContainingType.set_NextFieldIndex(targetContainingType.get_NextFieldIndex() + 1);
							sourceField.set_Index(targetContainingType.get_NextFieldIndex());

							// Force quantity field indexes to be recalculated for the moved field based on new container
							ensureQuantityFieldsAllocated(targetContainingType, sourceField);
						}
					}
					// Copy the source field
					else {
						// Do not rename if a copy operation is being performed
						rename.newFieldPath = null;
						rename.oldFieldPath = null;

						// Deep copy the sourceField into the targetElement's container
						resultingField = cloneField(sourceField, targetContainingType);

						resultingField.set_limitQuantities(sourceField.get_limitQuantities());
						resultingField.set_Quantity(sourceField.get_Quantity());
						resultingField.set_QuantityError(sourceField.get_QuantityError());

						// Recalculate the internal name based on its new container
						var name = sourceField.get_OverrideInternalName() ? sourceField.get_InternalName() : sourceField.get_Name();
						resultingField.set_InternalName(getInternalName(targetContainingType, resultingField, name, $(sourceElement).elementType()));
						resultingField.set_InternalName(getInternalName(targetContainingType, resultingField, sourceField.get_Name(), $(sourceElement).elementType()));
					}

					if ($(sourceElement).elementType().subTypes) {
						updateSubTypes(targetElement, resultingField);
					}
				}

				// If pasting into a table from outside the table, create the element to ensure proper markup is rendered
				if (!isSameContainer && (targetIsTableCol || $(sourceElement).isTableColumn())) {
					copyElement = createElement(targetElement, $(sourceElement).elementType(), targetContainingType, resultingField)[0];
					for (var a in $(sourceElement).attributes()) {
						$(copyElement).propData(a, $(sourceElement).propData(a));
					}
				}
				else
					copyElement = $(sourceElement).clone()[0];

				if (!isCut) {
					// Clear unique id for new element
					$(copyElement).uuid(null);

					// Clear the unique ids on the new element's child elements
					$(copyElement).find("div").attr("data-uuid", null);
				}

				// Set the field on the element wrapper
				if (sourceField)
					$(copyElement).set_field(resultingField);

				$(".c-forms-layout-label I", copyElement).remove();

				// Move the element (and field) if performing a cut-paste operation
				if (isCut) {
					if (!isSameContainer || !pasteBetween)
						removeElement(sourceElement, targetElement);
					else {
						if ($(sourceElement).column() === 1)
							$(sourceElement).nextElement().column(1);
						$(sourceElement).remove();
					}
				}

			}

			// Create a function to cancel cut operations once the paste is complete
			var afterInsert = animations.pending(function () {
				if (isCut)
					cancelCutCopy();
			});

			if (!copyElement) return;

			cutCopyElement = copyElement;

			// Paste into a placeholder
			if ($(targetElement).isPlaceholder() && (!isSameContainer || !isCut)) {
				// Try to insert in the target placeholder first
				insertElement(copyElement, targetElement, afterInsert, function () {
					if (!targetIsTableCol) {
						// If the target placeholder is too small, insert on the row below
						insertRow(targetElement, false, 1, function (placeholder) {
							insertElement(copyElement, placeholder, afterInsert);
						});
					}
				});
			}
			// Paste above an existing element
			else {
				if (!targetIsTableCol && !pasteBetween) {
					insertRow(targetElement, !pasteAfter, $(targetElement).column(), function (placeholder) {
						insertElement(copyElement, placeholder, afterInsert);
					});
				}
				else {
					var $ce = $(copyElement);
					var $te = $(targetElement);

					$te.parent().disableTransitions();

					if (pasteAfter)
						$(targetElement).after(copyElement);
					else
						$(targetElement).before(copyElement);

					afterInsert();

					$(copyElement).css("opacity", 0).fadeTo(300, 1, animations.pending());

					reflowSectionCols($(targetElement).parentElement(), $(targetElement).row(), 0);
					$te.parent().enableTransitions();

					$ce.focus();
				}
			}

			if (rename.oldFieldPath)
				rename.newFieldPath = targetContainingType.get_InternalName() + "." + sourceField.get_InternalName();
			else
				rename.newFieldPath = null;

			// Once animations are complete, validate type
			animations.waitForAll(function () {

				// Update page numbers if this is a page break element
				if ($(copyElement).tag().toLowerCase() == "pagebreak") {
					updatePageNumbers(!!sourceElementType);
				}

				// Select element by setting focus
				copyElement.focus();

				Cognito.Forms.updateViewDefinition(false);
				validateExpressions(Cognito.Forms.model.currentForm, rename.serializedOldRootType, rename.newFieldPath, rename.oldFieldPath);
			});
		}
	}

	// Adds a placeholder row for a new element above the current element
	function insertAbove() {

		// Hide the toolbar
		hideToolbar();

		// Insert the row above and select the placeholder above the selected element
		insertRow(currentElement, true, $(currentElement).column());
	}

	// Adds a placeholder row for a new element below the current element
	function insertBelow() {

		// Hide the toolbar
		hideToolbar();

		// Insert the row below and select the placeholder below the selected element
		insertRow(currentElement, false, $(currentElement).column());
	}

	// Adds a placeholder a new element left of the current element
	function insertBefore() {

		// Hide the toolbar
		hideToolbar();

		var $prevCol = $(currentElement).prev();
		if ($prevCol.is(".c-forms-layout-placeholder"))
			$prevCol.focus();
		else
			insertGridColumn(currentElement, true, showToolbar);
	}

	// Adds a placeholder row for a new element below the current element
	function insertAfter(element) {
		element = $(element instanceof HTMLElement || element instanceof jQuery ? element : currentElement);

		// Hide the toolbar
		hideToolbar();

		var $nextCol = element.next();
		if ($nextCol.is(".c-forms-layout-placeholder") && $nextCol.colspan() > 0)
			$nextCol.focus();
		else
			insertGridColumn(element, false, showToolbar);
	}

	function insertGridColumn(element, before, callback) {
		var placeholder = $(element).row().filter(".c-forms-layout-placeholder");
		var $parent = $(element).parentElement();
		var phWidth = $parent.elementType().minColspan;
		var done = function () {
			placeholder.colspan(Math.max(phWidth, placeholder.parentElement().colspan() - sumColspans(placeholder.siblings().get())));
			$(currentElement).blur();
			placeholder.focus()
			if (callback)
				callback(placeholder[0]);
		};

		if (placeholder.length > 1)
			placeholder = placeholder.filter(":not(.c-static)").first();

		if (!$(element).is(".c-forms-layout-placeholder.c-static") && (before || $(element).next()[0] !== placeholder[0])) {
			if (placeholder.is(".c-static")) {
				placeholder = placeholder.clone(true);
				placeholder.removeClass("c-static");
			}

			if (before) {
				$(element).before(placeholder);
				if ($(element).column() === 1)
					$(placeholder).column(1);
				$(element).column(2);
			}
			else {
				$(element).after(placeholder);
			}

			placeholder.colspan(0).addClass("c-insert-between");

			//Setting Tab Index
			placeholder.removeAttr("tabindex");
			placeholder.attr("tabindex", 0);
			placeholder.offset();

			reflowSectionCols($parent, placeholder[0], phWidth, done);
		}
		else {
			if ($(element).colspan() === $(element).minimumWidth())
				element = $(element).siblings(".c-field").filter(function (e) { return $(this).colspan() > $(this).minimumWidth(); }).sort(function (a, b) { return $(b).colspan() - $(a).colspan(); })[0];

			$(element).colspan($(element).colspan() - phWidth);

			if ($(element).isSection() || $(element).isTable())
				propagateSectionResize($(element));

			done();
			assignColumns($(element).row());
		}
	}

	// Inserts a row above or below the specified element,
	// calling back to the success function with the new placeholder for the specified column
	function insertRow(element, above, column, success) {

		// Hide the toolbar
		$("#c-forms-layout-toolbar").fadeOut(200);

		var row = $(element).row();
		var columns = $(element).parentElement().colspan();
		var target = $(element).closest(".c-forms-row");
		var $newRow = $("<div class='c-forms-row'>" + renderQuickInsert(true) + "<div class='c-columns'>" + renderPlaceholders(1, Grid.getDefaultPlaceholderWidth(columns), columns, true) + "</div></div>");
		var placeholders = $newRow.find(".c-forms-layout-placeholder");

		// Insert the row above
		if (above)
			$newRow.insertBefore(target);
		// Insert the row below
		else
			$newRow.insertAfter(target);

		if (placeholders.last().column() > column)
			target = placeholders.first();
		else
			target = placeholders.last();

		$newRow.children(".c-quick-insert-row").hide();
		$newRow.next(".c-forms-row").children(".c-quick-insert-row").hide();

		// Call the success callback before expanding the new row
		if (success)
			success(target[0]);

		// Slide the new row into view
		$newRow.hide()
			.slideDown(500, function () {
				$(this).css("display", "");
			}).promise().then(animations.pending());

		// Select element by setting focus
		target[0].focus();
	}

	var passwordConditionType = createFeatureWarning("Password Fields", "Upgrade to add Password Fields.", "passwordfields");
	var signatureConditionType = createFeatureWarning("Electronic Signatures", "Upgrade to add Electronic Signatures.", "esignatures");
	var tableConditionType = createFeatureWarning("Tables", "Upgrade to add Tables.", "tables");
	// Creates and returns an element of the specified type
	function createElement(targetElement, elementType, containingType, existingField) {

		// Show the preview callout
		Cognito.showCallout("#c-callout-preview", "#c-forms-preview");

		if (!Cognito.config.allowSignatures && elementType === elementTypes.Signature) {
			var currentForm = Cognito.Forms.model.currentForm;
			if (currentForm.meta.getCondition(signatureConditionType))
				currentForm.meta.getCondition(signatureConditionType).condition.destroy();

			new ExoWeb.Model.Condition(signatureConditionType, "Cannot add Electronic Signatures.", currentForm, ["Fields"], "client");
		}
		else if (!Cognito.config.allowTables && elementType === elementTypes.Table) {
			var currentForm = Cognito.Forms.model.currentForm;
			if (currentForm.meta.getCondition(tableConditionType))
				currentForm.meta.getCondition(tableConditionType).condition.destroy();

			new ExoWeb.Model.Condition(tableConditionType, "Cannot add Tables.", currentForm, ["Fields"], "client");
		}

		Cognito.Forms.model.currentForm.set_HasChanges(true);

		var name = "";
		containingType = containingType || $(targetElement).containingType();
		var element = $("<div />");
		element.elementType(elementType);
		element.tag(elementType.tag);

		// Create fields for elements that represent fields
		if (elementType.fieldType)
			element.set_field(existingField || createField(containingType, elementType));


		// Visible default value
		element.set_visible("true", true);

		// Create and return the new field element
		if (!$(targetElement).isTableColumn()) {
			// Set the default width of the element
			element.colspan(elementType.defaultWidth);

			return $(renderElement(element, containingType, $([])));
		}
		else {
			// Set the default width of the element
			element.colspan(elementTypes.Table.defaultColspan);

			return $(renderTableElement(element, containingType, $(targetElement).parentElement().get_field()));
		}
	}

	// Inserts an element into the specified target placeholder
	// Calls success if inserted, or fail if the placeholder is too small
	function insertElement(element, target, success, fail) {

		// Hide the add field callout
		$('#c-forms-layout-elements').removeClass('new-field-callout');
		Cognito.hideCallout("#c-callout-new-field");

		Cognito.Forms.model.currentForm.set_HasChanges(true);

		// Add additional placeholders below before pasting if this is the last placeholder
		var newPlaceholders = null;
		var lastElement = $(target).row().last();
		var isTableColumn = $(target).isTableColumn() || $(target).parentElement().isTable();

		if (!isTableColumn && lastElement.nextElement().length == 0 || lastElement.nextElement().isSubmission())
			$("<div class='c-forms-row'>" + renderQuickInsert(true) + "<div class='c-columns'>" + renderPlaceholders(1, Grid.getDefaultPlaceholderWidth($(target).parentElement().colspan()), $(target).parentElement().colspan(), true) + "</div></div>")
				.insertAfter(lastElement.closest(".c-forms-row"))
				.hide()
				.slideDown(500)
				.children(".c-quick-insert-row").hide();

		var _success = success;
		var success = function () {
			var field = $(element).get_field();
			if (field) {
				// Force the property to be reevaluated AFTER the insert since the rule may not run by itself based on the changeOf prop
				field.meta.pendingInit(field.meta.property("allowedSubTypes", field), true);
			}
			if (_success)
				_success();
		}

		var minimumWidth = $(element).minimumWidth();

		var $target = $(target);
		var $element = $(element);

		var spanBefore = $element.colspan();
		var $parent = $target.parentElement();

		var isPlaceholderRow = !$target.row().filter(":not(.c-forms-layout-placeholder)").length;
		var span = (spanBefore > 1 ? spanBefore : $parent.elementType().defaultColspan);
		var emptyCols = $target.parentElement().colspan() - sumColspans($target.row().filter(".c-field").get());
		var freeCols = getFreeColumns($target.row(), true);
		while (freeCols < span && span > $element.minimumWidth($parent))
			span--;

		if (span <= freeCols) {
			// Don't allow inserting at the end of a placeholder row
			//if ($target.column() > 1 && isPlaceholderRow)
			//	$target = $target.backElement();

			// If not a placeholder row and element is bigger than target
			if (!isPlaceholderRow && $target.colspan() < $element.minimumWidth($parent))
				span = $element.minimumWidth($parent);
			else if (isPlaceholderRow && $element.colspan() === Grid.full)
				span = $parent.colspan();
			else if ($target.colspan() < span && span > emptyCols)
				span = $target.colspan();

			$element.attr("style", "");
			$element.colspan(0);

			if (!isTableColumn && (span === $target.colspan() || span === $parent.colspan()))
				$target.parent().disableTransitions();

			var targetSpanBefore = $target.colspan();

			// Deselect placeholder to avoid quick selection change
			$target.removeClass("c-forms-layout-element-selected");

			// Resize the target placeholder to accomodate the element, then insert the element
			reflowSectionCols($parent, $target, span - $target.colspan(), function () {
				$element
					.column($target.column())
					.insertBefore($target);

				/**
				 * - If field is same size as placeholder, or spans the entire placeholder row, it will fade into the placeholder(s)
				 * - If field is bigger than placeholder on a placeholder row, it will replace the placeholder and the extra placeholder will be made smaller
				 * - If field is smaller than placeholder, it will be inserted before the placeholder, and the placeholder will be properly resized
				 * - If a field is bigger than the number of EMPTY columns, it will be added to the row at minimum width, minimizing the impact on existing fields
				 */
				if (!$target.is(".c-insert-between")) {
					var targetSpanAfter = $target.colspan() - span;
					if (!isTableColumn) {
						$element.colspan(span);
						if ($target.is(".c-forms-layout-placeholder:not(.c-static)")) {
							$element.hide();
							var fadeElements = $target;
							var fadeTime = ($target.colspan() === span ? 400 : 0);

							fadeElements.fadeOut(fadeTime).promise().then(animations.pending(function () {
								$element.show();
								fadeElements.each(function () {
									$(this).disableTransitions().colspan(0).enableTransitions();
									if ($(this).is(".c-static"))
										$(this).attr("style", "");	// Clear inline styles so the placeholder is ready to use later
									else
										$target.remove();
								});
							}));
						}
						else {
							$target.colspan(getFreeColumns($target.row().filter(".c-field")));
						}
					}
					else {
						$element.show();
						$element.colspan(span);
						$target.colspan(Math.min(elementTypes.Table.defaultColspan, getFreeColumns($target.row().filter(".c-field"))));
					}
				}

				// When inserting between fields, the field's width will animate
				if ($target.is(".c-insert-between")) {
					$element.colspan(targetSpanBefore);
					$target.remove();
					$element.attr("style", "").colspan(span);
				}

				$element.parent().enableTransitions();

				// If this row was a placeholder row, allow the row insert element to be shown now above and below this row
				if (isPlaceholderRow) {
					var $row = $element.closest(".c-forms-row");
					$row.children(".c-quick-insert-row").clearInlineStyles();
					var $nextRow = $row.next(".c-forms-row");
					if ($nextRow.childElements(".c-field").length > 0)
						$nextRow.children(".c-quick-insert-row").clearInlineStyles();
				}

				if (spanBefore !== span)
					propagateSectionResize(element);

				if (success)
					success();
				else
					element.focus(); // Select element by setting focus
			});
		}
		// Element was too big to fit
		// Execute fail callback if specified
		else if (fail)
			fail();
		// Insert a new row below to insert the element
		else if (!isTableColumn) {
			insertRow(target, false, 1, function (placeholder) {
				insertElement(element, placeholder, success, fail);
			});
		}

		// Show new placeholders if added
		if (newPlaceholders != null)
			newPlaceholders.fadeIn(300).css("display", "");
	}

	function resizeGridColumn(element, smaller, callback) {
		var element = $(element);
		var parent = element.parentElement();
		var mult = (smaller ? -1 : 1);
		var resizeAmt = Math.min(Grid.minResize, Math.abs((smaller ? element.minimumWidth() : element.maximumWidth(true)) - element.colspan()));
		var diff = mult * (parent.isSection() ? resizeAmt : 1);
		reflowSectionCols(parent, element, diff, function () {
			element.colspan(element.colspan() + diff);
			showToolbar(true);
			updateColumnLayoutOptions(element);
			if (callback)
				callback();
		});
	}

	function assignColumns($row) {
		// Reevaluate column position for each field
		var col = 1;
		// In case the row has been modified, do not use the stored version of the row
		$row.each(function () {
			$(this).column(col);
			col += $(this).colspan();
		});
	}

	function isJustified($row) {
		$row = $row.filter(".c-field");
		// Simulate justification process and see if any spans change...
		var spansAfter = {}, spansBefore = {};
		$row.each(function () {
			spansBefore[$(this).uuid()] = $(this).colspan();
			spansAfter[$(this).uuid()] = $(this).minimumWidth();
		});

		var columns = $row.first().parentElement().colspan() - sumColspans($row.get(), true);
		var poorToRich = $row.slice().sort(function (a, b) { return spansAfter[$(a).uuid()] - spansAfter[$(b).uuid()]; });
		var baseline = poorToRich.eq(0);
		for (var i = 0, len = poorToRich.length; columns > 0; i++) {
			var $field = poorToRich.eq(i % len);
			var span = spansAfter[$field.uuid()];
			if (span <= spansAfter[baseline.uuid()]) {
				spansAfter[$field.uuid()] = span + 1;
				columns--;
			}
		};

		return $row.get().every(function (el) {
			return spansBefore[$(el).uuid()] === spansAfter[$(el).uuid()];
		});
	}

	/**
	 * Attempts to equally distribute columns to each field in a row.
	 */
	function justifyRow($row, includePlaceholders) {
		$row.each(function () { $(this).colspan($(this).minimumWidth()); });
		if (!includePlaceholders)
			$row = $row.filter(".c-field");

		if (!$row.length)
			return;

		var columns = $row.first().parentElement().colspan() - sumColspans($row.get(), true);
		var poorToRich = $row.slice().sort(function (a, b) { return $(a).colspan() - $(b).colspan(); });
		var baseline = poorToRich.eq(0);
		for (var i = 0, len = poorToRich.length; columns > 0; i++) {
			var $field = poorToRich.eq(i % len);
			var span = $field.colspan();
			if (span <= baseline.colspan()) {
				$field.colspan(span + 1);
				columns--;
			}
		}

		$row.each(function () {
			updateColumnLayoutOptions($(this));
			if ($(this).isSection() || $(this).isTable())
				propagateSectionResize($(this));
		});

		assignColumns($row);

		showToolbar(true);
	}

	// Makes the specified element smaller
	function makeSmaller(element) {
		Cognito.Forms.model.currentForm.set_HasChanges(true);

		$("#c-forms-make-smaller").off("click");

		var element = $(currentElement);

		resizeGridColumn(element, true, function () {
			$("#c-forms-make-smaller").on("click", clickMakeSmaller);
		});
	}

	// Makes the specified element bigger
	function makeBigger() {

		Cognito.Forms.model.currentForm.set_HasChanges(true);

		$("#c-forms-make-bigger").off("click");

		// Determine what to resize
		var element = $(currentElement);

		resizeGridColumn(element, false, function () {
			updateColumnLayoutOptions(element);
			$("#c-forms-make-bigger").on("click", clickMakeBigger);
		});
	}

	function convertSectionOrTable() {
		var $element = $(currentElement);
		$element[0].blur();

		var $newElement;
		if ($element.isTable()) {
			$element.tag("section");
			$element.elementType(elementTypes.RepeatingSection);
		}
		else {
			$element.tag("table");
			$element.elementType(elementTypes.Table);
			$element.childElements(".c-field").each(function () {
				$(this).colspan(elementTypes.Table.minColspan);
				if (!$(this).elementType().canAddToTable) {
					$(this).containingType().get_Fields().remove($(this).get_field());
					$(this).remove();
				}
			});
		}

		var $newElement = $(renderElement($element, $element.containingType(), $element.childElements(".c-field")));
		$newElement.set_field($element.get_field());
		$element.replaceWith($newElement);

		var column = 1;
		var parentCols = $newElement.colspan();
		var overflow;
		$newElement.childElements(".c-field").each(function () {
			var span = Math.max($(this).colspan(), $(this).minimumWidth());

			if (column + span > parentCols + 1) {
				column = 1;
				overflow = $("<div class='c-forms-row'>" + renderQuickInsert(true) + "<div class='c-columns'>" + renderPlaceholders(1, 0, 0, true) + "</div></div>").insertAfter(overflow || $(this).closest(".c-forms-row"));
			}

			if (overflow)
				$(this).insertBefore(overflow.childElements().last());

			$(this).colspan(span).column(column);

			// Clear column summary
			$(this).get_field().set_ColumnSummary(null);
			$(this).get_field().set_ColumnSummaryLabel(null);

			updateSubTypes($(this), $(this).get_field());
			column += span;
		});

		propagateSectionResize($newElement);

		$newElement.rows().forEach(function ($row) {
			if ($row.filter(".c-field").length > 1)
				justifyRow($row);
		});

		if ($newElement.isTable() && $newElement.childElements(".c-field").length === 0)
			$newElement.find(".c-forms-layout-placeholder.c-static").colspan(Grid.full / 4);


		Cognito.Forms.updateViewDefinition(false);
		Cognito.Forms.model.currentForm.set_HasChanges(true);

		var currentForm = Cognito.Forms.model.currentForm;
		if (currentForm.meta.getCondition(tableConditionType))
			currentForm.meta.getCondition(tableConditionType).condition.destroy();

		if (!Cognito.config.allowTables && hasTable()) {
			new ExoWeb.Model.Condition(tableConditionType, "Cannot add Tables.", currentForm, ["Fields"], "client");
		}

		$newElement[0].focus()

		showToolbar(true);
	}
	//#endregion

	//#region Utility Functions

	// Escape literal html
	function htmlEscape(str) {
		return str ? String(str)
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			: str;
	}

	// Unescape literal html
	function htmlUnescape(value) {
		return String(value)
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&');
	}

	// Capitalize a word
	function capitalize(word) {
		return word.replace(/^[a-z]/, function (letter) {
			return letter.toUpperCase();
		});
	}

	function setActiveTab(selector) {
		$(".c-admin-fixed-action-bar-content .c-web-forms-formSettingsButton, .c-admin-fixed-action-bar-content .c-forms-payment-status").removeClass("c-active");

		if (selector) {
			var $tabElement = $(selector);
			if ($tabElement) {
				$tabElement.addClass("c-active");
			}
		}
	}

	var _repositionTimeout;
	// Reposition the field settings as high as possible while intersecting the selected element with enough space to display
	// the indicator
	function repositionSettings(targetElement) {
		// Unselect the back settings element if it's different than the current settings element
		if (settingsElement && settingsElement != targetElement) {
			$(settingsElement).removeClass("c-forms-layout-element-selected");
			$(settingsElement).trigger("element-unselected");
		}

		// Set and highlight the new settings element, assuming it is the current element if a target is not specified
		settingsElement = targetElement || currentElement;
		$(settingsElement).addClass("c-forms-layout-element-selected");

		// Show the settings form for the selected element
		var settingsFormId = $(settingsElement).attr("data-settings-editor") || "#c-forms-settings-field";
		$("#c-forms-settings-form").hide();
		$("#c-forms-settings-payment").hide();
		$("#c-forms-settings-field").hide();
		var settingsForm = $(settingsFormId);

		var tabElementSelector;
		if (settingsForm.attr("data-tabelement") != null) {
			tabElementSelector = settingsForm.attr("data-tabelement");
		} else {
			var isSubmission = Cognito.Forms.model.currentElement && Cognito.Forms.model.currentElement.isSubmission();
			if (isSubmission) tabElementSelector = "#c-forms-submission-settings";
		}

		setActiveTab(tabElementSelector);

		settingsForm.show();

		clearTimeout(_repositionTimeout);
		_repositionTimeout = window.setTimeout(function () {
			if (!$(settingsElement).is(":visible"))
				return;

			// Initialize HTML editors if the settings field contains them
			if (settingsForm.find(".c-field.c-html").length)
				Cognito.initializeHtmlEditors();

			// Reset min-height
			$("#c-forms-settings").css("min-height", "0");

			// Determine the current scroll and element positions and heights
			var scrollTop = $("#c-admin").scrollTop();
			var viewHeight = $("#c-admin").height();
			var elementTop = $(settingsElement).offset().top + scrollTop - 20;
			var elementHeight = $(settingsElement).height();

			// Determine if we need to scroll the selected element into view
			var scrollOffset = 0;
			// Scroll the view up to bring the element into view
			if (elementTop - 20 < scrollTop)
				scrollOffset = elementTop - 20 - scrollTop;
			// Scroll the view down to bring the element into view unless the element is larger than the viewport
			else if (elementHeight < viewHeight && elementTop + elementHeight + 45 > scrollTop + viewHeight)
				scrollOffset = elementTop + elementHeight + 45 - (scrollTop + viewHeight);

			// Scroll the selected element into view
			if (scrollOffset) {
				scrollTop += scrollOffset;
				$("#c-admin").animate({ scrollTop: scrollTop }, 500);
			}

			// Increase the top margin to keep the field settings in view based on the window's scroll top
			var topMargin = 0;
			if (scrollTop > initialSettingsTop)
				topMargin = scrollTop - initialSettingsTop;

			var settingsBottom = initialSettingsTop + topMargin + $("#c-forms-settings").outerHeight();
			var indicatorHeight = $(".c-forms-settings-indicator").height();
			var middlePosition = 64 / 2 - (Math.floor(indicatorHeight / 2)); // 64 is the placeholder's height
			var indicatorSpace = indicatorHeight + middlePosition;

			// Calculate the top margin needed to ensure the settings intersect with the selected element with enough space to display
			// the indicator
			if (settingsBottom - indicatorSpace < elementTop)
				topMargin = topMargin + elementTop - settingsBottom + indicatorSpace;

			// Set a min height on the settings to prevent inconsistencies with the settings window
			$("#c-forms-settings").css("min-height", $("#c-forms-settings").height());

			// Reposition the field settings
			$("#c-forms-settings").animate({ "marginTop": topMargin }, 500);

			// Reposition the indicator
			var settingsTop = initialSettingsTop + topMargin;
			var indicatorOffset = elementTop - settingsTop + middlePosition;
			$(".c-forms-settings-indicator").css("top", indicatorOffset.toString() + "px");
		}, 1);
	}

	function makeChoicesSortable(targetElement) {
		var $container = $(".c-forms-settings-choice-editor tbody");
		var sortable = new Sortable($container[0], {
			handle: ".c-forms-settings-choice-drag-handle",
			onUpdate: function (e) {
				if (e.oldIndex === e.newIndex)
					return;

				var choices = $(targetElement).get_field().get_Choices();
				var idList = $container.children().toArray().map(function (el) {
					return $parentContextData(el).meta.id;
				});
				choices.sort(function (a, b) {
					return idList.indexOf(a.meta.id) - idList.indexOf(b.meta.id);
				});
				Cognito.Forms.model.currentForm.set_HasChanges(true);
			}
		});
	}

	function updateAddressFormat(line1, line2, city, state, postalCode, country) {
		var addressFormat = "";

		if (line1)
			addressFormat += "[Line1] ";
		if (line2)
			addressFormat += "[Line2] ";
		if (city)
			addressFormat += "[City] ";
		if (state)
			addressFormat += "[State] ";
		if (postalCode)
			addressFormat += "[PostalCode] ";
		if (country)
			addressFormat += "[Country] ";

		return addressFormat.trim();
	}

	function updateNameFormat(prefix, first, middle, mi, last, suffix) {
		var nameFormat = "";

		if (prefix)
			nameFormat += "[Prefix] ";
		if (first)
			nameFormat += "[First] ";
		if (middle)
			nameFormat += "[Middle] ";
		if (mi)
			nameFormat += "[MiddleInitial] ";
		if (last)
			nameFormat += "[Last] ";
		if (suffix)
			nameFormat += "[Suffix]";

		return nameFormat.trim();
	}

	// Calculate a unique internal name based on the specified name and containing type.
	function getInternalName(containingType, field, name, elementType) {
		// Build a list of existing internal names
		var names = [];

		// add dynamic fields
		containingType.get_Fields().forEach(function (f) {
			if (f != field)
				names.push(f.get_InternalName());
		});

		var nameFilter = function (name) {
			return name.trim().toLowerCase() === newInternalName.trim().toLowerCase();
		};

		var internalName = Cognito.getNormalizedName(name);

		// Default the internal name if the name is null or empty due to normalization or untitled
		if (!internalName || internalName === Cognito.resources["element-label-default"])
			internalName = elementType.code;

		// Prevent the internal name from being set to a reserved word
		else if (reservedWords.contains(internalName.toLowerCase()))
			internalName = internalName + "1";

		// Calculate a unique internal name by appending a numeric value
		var count = 1;
		var newInternalName = internalName;

		while (names.filter(nameFilter).length > 0) {
			count++;
			newInternalName = internalName + count;
		}

		return newInternalName;
	}

	function updateTypeMetaInternalName(typeMeta) {
		if (!typeMeta)
			typeMeta = Cognito.Forms.model.currentForm;
		for (var i = 0; i < typeMeta.get_Fields().length; i++) {
			var field = typeMeta.get_Fields()[i];
			if (field.get_ChildType()) {
				field.get_ChildType().set_InternalName(typeMeta.get_InternalName() + "." + field.get_InternalName());
				updateTypeMetaInternalName(field.get_ChildType());
			}
		}
	}

	function ensureQuantityFieldsAllocated(typeMeta, movedField) {
		var nextFieldIndex = typeMeta.get_NextFieldIndex();

		if (!movedField) {
			typeMeta.get_Fields().forEach(function (field) {
				var childType = field.get_ChildType();
				if (childType !== null) {
					ensureQuantityFieldsAllocated(field.get_ChildType());
				}
				else if (field.get_Quantity() !== null && field.get_QuantityLimitFieldIndex() === null) {
					field.set_QuantityLimitFieldIndex(++nextFieldIndex);
					field.set_QuantityUsedFieldIndex(++nextFieldIndex);
				}
			});
		}
		else if (movedField.get_QuantityLimitFieldIndex() !== null) {
			movedField.set_QuantityLimitFieldIndex(++nextFieldIndex);
			movedField.set_QuantityUsedFieldIndex(++nextFieldIndex);
		}

		typeMeta.set_NextFieldIndex(nextFieldIndex);
	}

	// Adds a field with the specified element type to the specified containing type
	function createField(containingType, elementType, name) {
		name = name || Cognito.resources[elementType.defaultLabel];

		// Create the new field
		var field = new Cognito.Field(
			{
				isNew: true,
				Name: name,
				FieldType: elementType.fieldType,
				FieldSubType: elementType.subTypes ? elementType.subTypes[0].fieldSubType : null
			});

		field.set_FieldSubType(field.get_allowedSubTypes()[0] || null);

		// Create a new child type if the field represents a section or table
		if (elementType === elementTypes.Section || elementType === elementTypes.RepeatingSection || elementType === elementTypes.Table || elementType === elementTypes.RatingScale) {
			var childTypeMeta = new Cognito.TypeMeta({
				RootType: "Cognito.DynamicEntity"
			});
			field.set_ChildType(childTypeMeta);

			// Rating Scale Field
			if (elementType === elementTypes.RatingScale) {
				// Add the allowed values
				ExoWeb.updateArray(field.get_Choices(), Cognito.resources.ratings.satisfied.choices.map(function (rating) { return new Cognito.Choice({ Label: rating }); }));

				// Set the rating
				field.set_rating(Cognito.resources.ratings.satisfied.label);

				// Add the questions
				var childType = field.get_ChildType();
				var fields = childType.get_Fields();
				for (var i = 1; i <= 3; i++)
					fields.add(createRatingScaleQuestion(childType, Cognito.resources["question"] + " " + i));
			}
		}

		// Choice Field
		else if (elementType === elementTypes.Choice) {
			Array.forEach(Cognito.resources.getArray("field-choice-defaults"), function (c) {
				field.get_Choices().add(new Cognito.Choice({ Label: c, IsSelected: false }));
			});
			field.get_Choices()[0].set_IsSelected(true);
		}

		// Price Field
		else if (elementType === elementTypes.Price) {
			field.set_FieldSubType(Cognito.FieldSubType.get_All().filter(function (s) { return s.get_Name() === "Currency"; })[0]);
			field.set_IncludeOnInvoice(true);
		}
		else if (elementType == elementTypes.Address && Cognito.Forms.model.currentForm.get_internationalForm()) {
			field.set_FieldSubType(Cognito.FieldSubType.get_All().filter(function (s) { return s.get_Name() === "InternationalAddress"; })[0]);
		}
		else if (elementType == elementTypes.Phone && Cognito.Forms.model.currentForm.get_internationalForm()) {
			field.set_FieldSubType(Cognito.FieldSubType.get_All().filter(function (s) { return s.get_Name() === "InternationalPhone"; })[0]);
		}

		// Add the field to the containing type
		containingType.get_Fields().add(field);

		// Calculate the internal name based on its container and element type
		field.set_InternalName(getInternalName(containingType, field, name || elementType.code, elementType));

		// Set ChildType.InternalName
		if (field.get_ChildType()) {
			field.get_ChildType().set_InternalName(containingType.get_InternalName() + "." + field.get_InternalName());
		}

		// Recalculate the index based on its new container
		containingType.set_NextFieldIndex(containingType.get_NextFieldIndex() + 1);
		field.set_Index(containingType.get_NextFieldIndex());

		// Return the new field
		return field;
	}

	// Deep copy the source field into the specified target container
	function cloneField(sourceField, targetContainingType) {

		var newField;

		// Copy a field
		if (!sourceField.get_ChildType()) {
			newField = copyField(sourceField, targetContainingType);
		}

		// Copy a section and its children
		else {
			newField = copyField(sourceField, targetContainingType);
			sourceField.get_ChildType().get_Fields().forEach(function (field) {
				return cloneField(field, newField.get_ChildType());
			});
		}

		return newField;
	}

	// Shallow copy the source field into the specified target container
	function copyField(sourceField, targetContainingType) {

		// Create a new field based on the source field
		var newField = createField(targetContainingType, sourceField.get_elementType(), sourceField.get_Name());

		// Clear out default RatingScale.Questions
		if (newField.get_elementType() === elementTypes.RatingScale)
			newField.get_ChildType().get_Fields().clear();

		// Copy Internal Name
		newField.set_InternalName(sourceField.get_InternalName());

		// Copy FieldSubType setting
		if (sourceField.get_FieldSubType())
			newField.set_FieldSubType(sourceField.get_FieldSubType());

		// Copy Choices setting
		newField.set_AllowFillIn(sourceField.get_AllowFillIn());

		// Copy IncludeOnInvoice setting
		newField.set_IncludeOnInvoice(sourceField.get_IncludeOnInvoice());

		// Copy HasPrice setting
		newField.set_HasPrice(sourceField.get_HasPrice());
		// Copy HasValue setting
		newField.set_HasValue(sourceField.get_HasValue());
		// Copy HasQuantity setting
		newField.set_HasQuantity(sourceField.get_HasQuantity());

		// Copy IsProtected setting
		newField.set_IsProtected(sourceField.get_IsProtected());

		// Copy Price
		newField.set_Amount(sourceField.get_Amount());

		// Clear out default values
		newField.get_Choices().clear();
		sourceField.get_Choices().forEach(function (a) {
			newField.get_Choices().add(new Cognito.Choice({
				Label: a.get_Label(),
				IsSelected: a.get_IsSelected(),
				Price: a.get_Price(),
				Quantity: a.get_Quantity(),
				Value: a.get_Value(),
				Description: a.get_Description()
				//Images: a.get_Images()
			}));
		});

		// Copy Default Value setting
		if (sourceField.get_DefaultValue())
			newField.set_DefaultValue(sourceField.get_DefaultValue());

		// Copy Required setting
		newField._isRequired = sourceField.get_isRequired();
		newField.set_Required(sourceField.get_Required());

		// Copy Custom Error settings
		newField.set_Error(sourceField.get_Error());
		newField.set_ErrorMessage(sourceField.get_ErrorMessage());
		newField._showError = sourceField.get_showError(); // Must set it directly to ignored changed value calculations

		// Copy Format settings
		newField.set_Format(sourceField.get_Format());

		// Copy Range setting
		if (sourceField.get_MinValue())
			newField.set_MinValue(sourceField.get_MinValue());
		if (sourceField.get_MaxValue())
			newField.set_MaxValue(sourceField.get_MaxValue());

		// Copy Instructions setting
		if (sourceField.get_Helptext())
			newField.set_Helptext(sourceField.get_Helptext());

		// Price Fields
		newField.set_Calculation(sourceField.get_Calculation());
		newField.set_LineItemName(sourceField.get_LineItemName());
		newField.set_LineItemDescription(sourceField.get_LineItemDescription());

		// Number of decimals
		newField.set_decimalPlaces(sourceField.get_decimalPlaces());

		return newField;
	}

	// Set focus on the specified element
	function setFocus(element) {
		if (element) {
			element.selectionStart = 0;
			element.selectionEnd = element.value.length;
			element.focus();
		}
	}

	// Set focus on the next element based on the specified element
	function setFocusOnNext(element) {

		// Get the list of focusable elements
		var focusableElements = $("#c-forms-layout-container :focusable");

		// Get the index of the next focusable element
		var index = $.inArray(element, focusableElements) + 1;

		// Find the next focusable element participating in tab navigation
		var nextElement = focusableElements[index];
		while ($(nextElement).attr("tabindex") === "-1") {
			index++;
			nextElement = focusableElements[index];
		}

		if (!nextElement)
			nextElement = $("#c-forms-layout-elements").childElements().get(0);

		// Set focus on the next element
		nextElement.focus();
	}

	function createRatingScaleQuestion(containingType, question) {
		var field = new Cognito.Field(
			{
				isNew: true,
				Name: question || "",
				FieldType: elementTypes.Choice.fieldType,
				FieldSubType: elementTypes.Choice.subTypes.filter(function (s) { return s.name === "Radio Buttons"; })[0].fieldSubType
			});

		// Calculate the internal name based on its container and element type
		field.set_InternalName(getInternalName(containingType, field, question, elementTypes.Choice));

		// Calculate the index
		containingType.set_NextFieldIndex(containingType.get_NextFieldIndex() + 1);
		field.set_Index(containingType.get_NextFieldIndex());

		return field;
	}

	// Renders a RatingScale rating
	function renderRating() {
		var html = "<div><input class='c-forms-settings-ratingScale-rating-text c-forms-settings-choice-text' type='text' />"
			+ "<a class='c-forms-settings-choice-remove' href='#' onclick='return false;' title='remove'><i class='icon-trash'></i></a>"
			+ "<a class='c-forms-settings-choice-add' href='#' onclick='return false;' title='add'><i class='icon-plus'></i></a></div>";

		return html;
	}

	// Renders a Choice option
	function renderOption() {
		var html = "<div><input class='c-forms-settings-choice-select' type='checkbox' name='choices' />"
			+ "<input class='c-forms-settings-choice-text' type='text' />"
			+ "<a class='c-forms-settings-choice-remove' href='#' onclick='return false;' title='remove'><i class='icon-trash'></i></a>"
			+ "<a class='c-forms-settings-choice-add' href='#' onclick='return false;' title='add'><i class='icon-plus'></i></a></div>";

		return html;
	}

	// Gets the next element based on the arrow key
	function getNextElement(keyCode) {

		var $currentElement = Cognito.Forms.model.currentElement;
		var nextElement = null;
		// up, down
		if (keyCode === 38 || keyCode === 40) {

			//Get all focusable elements excluding quick insert columns
			var focusableElements = $("#c-forms-layout-container .c-forms-layout-element:not(.c-quick-insert):focusable").filter("[data-colspan!=0]");
			var index = $.inArray($currentElement.get(0), focusableElements);


			//If the element is not in the focusableElements (like the heading) just select the first element
			if (index < 0)
				nextElement = focusableElements.get(0);
			//up
			else if (keyCode === 38) {
				do {
					index--;
					nextElement = focusableElements[index];
				}
				//while next element exists and it is not above the current element or off the page
				while (nextElement && (!$(nextElement).isAbove($currentElement) || $(nextElement).attr("tabindex") === "-1"));
			}
			// down
			else {
				do {
					index++;
					nextElement = focusableElements[index];
				}
				//while next element exists and it is not below the current element or off the page
				while (nextElement && (!$(nextElement).isBelow($currentElement) || $(nextElement).attr("tabindex") === "-1"));
			}

		}
		// left, right
		else {
			var siblings = $currentElement.row().filter("[data-colspan!=0]");
			var focusableElements = $("#c-forms-layout-container .c-forms-layout-element:not(.c-quick-insert):focusable").filter("[data-colspan!=0]");
			var index;

			// right
			if (keyCode == 39)
				index = $.inArray($currentElement.get(0), siblings) + 1;
			// left
			else
				index = $.inArray($currentElement.get(0), siblings) - 1;

			//If current element is at beginning of row and we're going up, wrap around to prev row
			if (index < 0)
				nextElement = focusableElements[$.inArray($currentElement.get(0), focusableElements) - 1];
			//If current element is at end of row and we're going down, wrap around to next row
			else if (index >= siblings.length)
				nextElement = focusableElements[$.inArray($currentElement.get(0), focusableElements) + 1];
			else
				nextElement = siblings[index];
		}

		return nextElement;
	}

	function getElementForField(field) {

		var fieldPath = $()
	}

	// Update the column layout options displayed for choices based on the current element's colspan
	function updateColumnLayoutOptions(currentElement) {

		// Exit early if the column select is not visible
		if ($(".columnSelectContainer:visible").length === 0)
			return;

		// Default options
		var layoutOptions = [
			{ value: 1, text: "One Column" },
			{ value: 2, text: "Two Column" },
			{ value: 3, text: "Three Column" },
			{ value: 4, text: "Four Column" },
			{ value: 0, text: "Side by Side" },
		];

		if (currentElement.colspan() <= Grid.half) {
			layoutOptions = [
				{ value: 1, text: "One Column" },
				{ value: 2, text: "Two Column" },
				{ value: 0, text: "Side by Side" },
			];

			if (currentElement.get_columns() > 2)
				currentElement.set_columns(2);
		}

		// Clear existing options
		$("#columnSelect option").remove();

		// Add the appropriate options
		layoutOptions.forEach(function (option) {
			if (currentElement.get_columns() === option.value)
				$("#columnSelect").append(new Option(option.text, option.value, false, true));
			else
				$("#columnSelect").append(new Option(option.text, option.value));
		});

		refreshElement();
	}

	// Select input text from start position to end position
	function setSelectionRange(input, selectionStart, selectionEnd) {
		if (input.setSelectionRange) {
			input.focus();
			input.setSelectionRange(selectionStart, selectionEnd);
		}
		else if (input.createTextRange) {
			var range = input.createTextRange();
			range.collapse(true);
			range.moveEnd('character', selectionEnd);
			range.moveStart('character', selectionStart);
			range.select();
		}
	}

	function renderAddFieldSelections() {
		// Determine valid types based on the container
		var validTypes = []
		var containingElementType = $(currentElement).parentElement().elementType();
		var containerWidth = $(currentElement).parentElement().colspan();
		var containerIsField = $(currentElement).parentElement().get_field();
		for (var prop in Cognito.Forms.elementTypes) {
			var elementType = Cognito.Forms.elementTypes[prop];
			var isValid = containerWidth >= elementType.minimumWidth;

			if (isValid && containerIsField) {
				if (containingElementType && containingElementType === elementTypes.Section) {
					isValid = elementType.canAddToSection;
				}
				else if (containingElementType && containingElementType === elementTypes.Table) {
					isValid = elementType.canAddToTable;
				}
				else if (containingElementType && containingElementType === elementTypes.RepeatingSection) {
					isValid = elementType !== elementTypes.PageBreak;
				}
			}

			if (isValid)
				validTypes.push(elementType);
		}

		var html = "<div class='c-forms-settings-field-sep'><br />Input</div>";
		var tempType = "Input";
		validTypes.forEach(function (e) {
			if (e.isEnabled) {
				if (tempType !== e.type) {
					html += "<div class='c-forms-settings-field-sep'><br />" + e.type + "</div>";
					tempType = e.type;
				}
				var css = "class='c-forms-settings-elementTypes'";
				var dnd = e.isEnabled ? "draggable='true' ondragstart='Cognito.Forms.dragStart(event)'" : "";
				var payment = e.canCollectPayment ? "<i class='icon-payment'></i>" : "";
				html += "<div class='c-forms-settings-elementtype-container' data-code='" + e.code + "'>"
					+ "<div data-code='" + e.code + "' data-title='" + e.helpText + "' "
					+ css
					+ dnd
					+ ">"
					+ "<i class='" + e.icon + "'></i>"
					+ "<span>" + e.name + "</span>"
					+ payment
					+ "</div>"
					+ "</div>";
			}
		});

		return html;
	}

	function updateSharePointCredentials() {
		var deferred = $.Deferred();
		var currentForm = Cognito.Forms.model.currentForm;

		// Create/Update SharePoint Notification
		if (currentForm.get_validSharePointUrl() && currentForm.get_validSharePointUsername() && currentForm.get_validSharePointPassword() && currentForm.get_sharePointListName()) {
			var resetPassword = function () {
				currentForm.set_sharePointPassword(null);
				currentForm.set_validSharePointPassword(null);
			};
			if (currentForm.get_sharePointNotification()) {
				Cognito.updateCredentials(currentForm.get_sharePointNotification().get_Credentials().get_Id(), currentForm.get_validSharePointUsername(), currentForm.get_validSharePointPassword(),
					function () {
						resetPassword();
						var sharePoint = currentForm.get_sharePointNotification();
						sharePoint.set_SiteUrl(currentForm.get_validSharePointUrl());
						sharePoint.set_ListName(currentForm.get_sharePointListName());
						sharePoint.set_TimeZoneHoursOffset(sharePointTimeZoneHoursOffset);
						sharePoint.get_Credentials().set_Username(currentForm.get_validSharePointUsername());
						deferred.resolve();
					},
					deferred.resolve);
			}
			else {
				Cognito.createCredentials(currentForm.get_validSharePointUsername(), currentForm.get_validSharePointPassword(),
					function (data) {
						resetPassword();
						var notification = new Cognito.Forms.SharePointNotification(
							{
								SiteUrl: currentForm.get_validSharePointUrl(),
								ListName: currentForm.get_sharePointListName(),
								TimeZoneHoursOffset: sharePointTimeZoneHoursOffset,
								Credentials: new Cognito.CredentialsRef({ Id: data, Username: currentForm.get_validSharePointUsername() })
							});
						currentForm.get_Notifications().add(notification);
						currentForm.set_sharePointNotification(notification);

						deferred.resolve();
					}, deferred.resolve);
			}
		}
		else if (currentForm.get_sharePointNotification() && currentForm.get_sharePointListName()) {
			currentForm.get_sharePointNotification().set_ListName(currentForm.get_sharePointListName());

			deferred.resolve();
		}
		// Delete SharePoint Notification
		else {
			var resetSharePoint = function () {
				currentForm.set_sharePointSiteUrl(null);
				currentForm.set_sharePointListName(null);
				currentForm.set_sharePointUserName(null);
				currentForm.set_sharePointPassword(null);
				currentForm.set_validSharePointUrl(null);
				currentForm.set_validSharePointUsername(null);
				currentForm.set_validSharePointPassword(null);

				// Reset flags
				currentForm.set_editSharePointCredentials(true);
				currentForm.set_connectedToSharePoint(false);
			}

			if (currentForm.get_sharePointNotification()) {
				Cognito.deleteCredentials(currentForm.get_sharePointNotification().get_Credentials().get_Id(),
					function () {
						resetSharePoint();
						currentForm.get_Notifications().remove(currentForm.get_sharePointNotification());

						deferred.resolve();
					}, deferred.resolve);
			}
			else {
				resetSharePoint();
				deferred.resolve();
			}
		}

		return deferred.promise();
	}

	Cognito.Forms.updateSharePointCredentials = updateSharePointCredentials;

	function displaySharePointConnectionErrors(error) {
		var currentForm = Cognito.Forms.model.currentForm;

		// Ensure the edit view is displayed
		currentForm.set_editSharePointCredentials(true);

		// Show Validation Errors
		$('.c-forms-sharepoint-settings .c-validation').show();

		// Remove existing connection errors if any
		if (currentForm.meta.getCondition(sharePointConditionType))
			currentForm.meta.getCondition(sharePointConditionType).condition.destroy();

		// Add the connection error
		new ExoWeb.Model.Condition(sharePointConditionType, "Cannot connect: invalid settings.", currentForm, ["sharePointPassword"], "client");
	}

	Cognito.Forms.displaySharePointConnectionErrors = displaySharePointConnectionErrors;

	function generateTokens(element) {
		var tokens = [];
		var includeShareLinks = !element;
		element = element || $("#c-forms-layout-elements");

		if (element.isView()) {
			element.childElements().each(function () {
				var element = $(this);
				if (!element.isPlaceholder())
					internalGenerateTokens(element, tokens);
			});

			if (!Cognito.config.whiteLabel) {

				tokens.push({ Name: "Entry", InternalName: "", Path: "Entry", FieldType: null });
				tokens.push({ Name: "Number", InternalName: "Entry.Number", Path: "    Number", FieldType: null });
				tokens.push({ Name: "Status", InternalName: "Entry.Status", Path: "    Status", FieldType: null });
				tokens.push({ Name: "Date Created", InternalName: "Entry.DateCreated", Path: "    Date Created", FieldType: null });
				tokens.push({ Name: "Date Submitted", InternalName: "Entry.DateSubmitted", Path: "    Date Submitted", FieldType: null });
				tokens.push({ Name: "Date Updated", InternalName: "Entry.DateUpdated", Path: "    Date Updated", FieldType: null });

				// Only add entry sharing links when generating tokens for email messages
				if (includeShareLinks) {
					tokens.push({ Name: Cognito.resources["entry-email-view-details-text"], InternalName: "Entry.AdminLink", Path: "    Admin Link", FieldType: null, IsLink: true });

					if (Cognito.config.allowEntrySharing && Cognito.Forms.model.currentForm.get_EnableEntrySharing()) {
						tokens.push({ Name: Cognito.resources["shared-entry-edit-link"], InternalName: "Entry.EditLink", Path: "    Edit Link", FieldType: null, IsLink: true });
						tokens.push({ Name: Cognito.resources["shared-entry-view-link"], InternalName: "Entry.ViewLink", Path: "    View Link", FieldType: null, IsLink: true });
					}
				}

				if (Cognito.Forms.model.currentForm && Cognito.Forms.model.currentForm.get_PaymentEnabled()) {
					tokens.push({ Name: "Order", InternalName: "", Path: "Order", FieldType: null });
					tokens.push({ Name: "Id", InternalName: "Order.Id", Path: "    Id", FieldType: null });
					tokens.push({ Name: "Date", InternalName: "Order.Date", Path: "    Date", FieldType: null });
					tokens.push({ Name: "SubTotal", InternalName: "Order.SubTotal", Path: "    SubTotal", FieldType: null });
					tokens.push({ Name: "AdditionalFees", InternalName: "Order.AdditionalFees", Path: "    AdditionalFees", FieldType: null });
					tokens.push({ Name: "ProcessingFees", InternalName: "Order.ProcessingFees", Path: "    ProcessingFees", FieldType: null });
					tokens.push({ Name: "OrderAmount", InternalName: "Order.OrderAmount", Path: "    OrderAmount", FieldType: null });
					tokens.push({ Name: "AmountPaid", InternalName: "Order.AmountPaid", Path: "    AmountPaid", FieldType: null });
					tokens.push({ Name: "AmountDue", InternalName: "Order.AmountDue", Path: "    AmountDue", FieldType: null });
					tokens.push({ Name: "BillingAddress", InternalName: "Order.BillingAddress", Path: "    BillingAddress", FieldType: null });
					tokens.push({ Name: "BillingName", InternalName: "Order.BillingName", Path: "    BillingName", FieldType: null });
					tokens.push({ Name: "PhoneNumber", InternalName: "Order.PhoneNumber", Path: "    PhoneNumber", FieldType: null });
					tokens.push({ Name: "EmailAddress", InternalName: "Order.EmailAddress", Path: "    EmailAddress", FieldType: null });
					tokens.push({ Name: "PaymentConfirmationNumber", InternalName: "Order.PaymentConfirmationNumber", Path: "    PaymentConfirmationNumber", FieldType: null });
					tokens.push({ Name: "PaymentDate", InternalName: "Order.PaymentDate", Path: "    PaymentDate", FieldType: null });
					tokens.push({ Name: "PaymentMessage", InternalName: "Order.PaymentMessage", Path: "    PaymentMessage", FieldType: null });
					tokens.push({ Name: "PaymentMethod", InternalName: "Order.PaymentMethod", Path: "    PaymentMethod", FieldType: null });
					tokens.push({ Name: "PaymentStatus", InternalName: "Order.PaymentStatus", Path: "    PaymentStatus", FieldType: null });
					tokens.push({ Name: "RefundAmount", InternalName: "Order.RefundAmount", Path: "    RefundAmount", FieldType: null });
					tokens.push({ Name: "RefundDate", InternalName: "Order.RefundDate", Path: "    RefundDate", FieldType: null });
				}
			}
		}
		else {
			element.childElements().each(function () {
				var childElement = $(this);
				if (!childElement.isPlaceholder()) {
					internalGenerateTokens(childElement, tokens);
				}
			});
		}

		return tokens;
	}

	Cognito.Forms.generateTokens = generateTokens;

	function internalGenerateTokens(element, tokens, path, isProtected) {
		path = path || "";
		var field = element.get_field();
		if (!field) return;

		var hierarchyLevel = path.split('.').length - 1;
		var indentation = "";
		for (var i = 0; i < hierarchyLevel; i++)
			indentation += "    ";

		var fieldType = field.get_FieldType().get_Name();
		if (fieldType !== "EntityList" && fieldType !== "File") {
			if (element.isSection() || (fieldType === "RatingScale")) {

				tokens.push({ Name: field.get_Name(), InternalName: "", Path: indentation + field.get_Name(), FieldType: fieldType, IsProtected: isProtected || isFieldProtected(field) });
				var scaleProtected = isProtected || isFieldProtected(field);

				if (fieldType === "RatingScale") {
					indentation += "    ";
					path = path + field.get_InternalName() + ".";

					field.get_ChildType().get_Fields().forEach(function (field) {
						tokens.push({ Name: field.get_Name(), InternalName: path + field.get_InternalName(), Path: indentation + field.get_Name(), FieldType: field.get_FieldType().get_Name(), IsProtected: scaleProtected });
					});
				}
				else {
					element.childElements().each(function () {
						var childElement = $(this);
						if (!childElement.isPlaceholder()) {
							var newPath = path + field.get_InternalName() + ".";
							internalGenerateTokens(childElement, tokens, newPath, isProtected || isFieldProtected(field));
						}
					});
				}
			}
			else if (fieldType === "Name") {
				var internalName = path + field.get_InternalName();
				tokens.push({ Name: field.get_Name(), InternalName: internalName, Path: indentation + field.get_Name(), FieldType: fieldType, IsProtected: isProtected || isFieldProtected(field) });

				path = internalName + ".";
				indentation += "    ";

				if (field.get_Format().indexOf("Prefix") > -1)
					tokens.push({ Name: "Title", InternalName: path + "Prefix", Path: indentation + "Title", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });

				if (field.get_Format().indexOf("First") > -1)
					tokens.push({ Name: "First", InternalName: path + "First", Path: indentation + "First", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });

				if (field.get_Format().indexOf("MiddleInitial") > -1)
					tokens.push({ Name: "Middle Initial", InternalName: path + "MiddleInitial", Path: indentation + "Middle Initial", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });

				if (field.get_Format().indexOf("Middle") > -1)
					tokens.push({ Name: "Middle Name", InternalName: path + "Middle", Path: indentation + "Middle Name", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });

				if (field.get_Format().indexOf("Last") > -1)
					tokens.push({ Name: "Last", InternalName: path + "Last", Path: indentation + "Last", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });

				if (field.get_Format().indexOf("Suffix") > -1)
					tokens.push({ Name: "Suffix", InternalName: path + "Suffix", Path: indentation + "Suffix", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });
			}
			else if (fieldType === "Address") {
				var internalName = path + field.get_InternalName();
				tokens.push({ Name: field.get_Name(), InternalName: internalName, Path: indentation + field.get_Name(), FieldType: fieldType, IsProtected: isProtected || isFieldProtected(field) });

				path = internalName + ".";
				indentation += "    ";

				if (field.get_includeLine1())
					tokens.push({ Name: "Line 1", InternalName: path + "Line1", Path: indentation + "Line 1", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });
				if (field.get_includeLine2())
					tokens.push({ Name: "Line 2", InternalName: path + "Line2", Path: indentation + "Line 2", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });
				if (field.get_includeCity())
					tokens.push({ Name: "City", InternalName: path + "City", Path: indentation + "City", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });
				if (field.get_includeState())
					tokens.push({ Name: "State", InternalName: path + "State", Path: indentation + "State", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });

				if (field.get_FieldSubType().get_Name() == "InternationalAddress") {
					if (field.get_includePostalCode())
						tokens.push({ Name: "Postal Code", InternalName: path + "PostalCode", Path: indentation + "Postal Code", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });
				}
				else if (field.get_includePostalCode()) {
					tokens.push({ Name: "Zip Code", InternalName: path + "PostalCode", Path: indentation + "Zip Code", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });
				}

				if (field.get_FieldSubType().get_Name() == "InternationalAddress")
					if (field.get_includeCountry())
						tokens.push({ Name: "Country", InternalName: path + "Country", Path: indentation + "Country", FieldType: null, IsProtected: isProtected || isFieldProtected(field) });
			}
			else if (fieldType !== "Signature") {
				var internalName = path + field.get_InternalName();
				tokens.push({ Name: field.get_Name(), InternalName: internalName, Path: indentation + field.get_Name(), FieldType: fieldType, IsProtected: isProtected || isFieldProtected(field) });
			}
		}
		else if (fieldType === "EntityList" && element.isTable()) {
			var tableField = field;
			tokens.push({ Name: field.get_Name(), InternalName: "", Path: indentation + field.get_Name(), FieldType: fieldType, IsProtected: isProtected || isFieldProtected(field) });
			indentation += "    ";
			element.childElements().filter(function (i, e) {
				return $(e).get_field() && $(e).get_field().get_ColumnSummary();
			}).each(function () {
				var field = $(this).get_field();
				var label = field.get_Name() + " Summary";
				tokens.push({
					Name: label,
					InternalName: path + tableField.get_InternalName() + "_" + field.get_InternalName() + "_Summary",
					Path: indentation + label,
					FieldType: null,
					IsProtected: isProtected || isFieldProtected(field)
				});
			});
		}
	}

	function isFieldProtected(field) {
		return Cognito.config.allowEntryEncryption &&
			Cognito.Forms.model.currentForm.get_EncryptEntries() &&
			field.get_IsProtected();
	}

	function visitFields(type, boolCallback) {
		return type.get_Fields().some(function (field) {
			if (!boolCallback(field) && field.get_ChildType() != null) {
				return visitFields(field.get_ChildType(), boolCallback);
			}

			return boolCallback(field);
		});
	}

	// recursively look through all the fields to see if there is one
	// set to be included on invoice
	function hasInvoicedFields() {
		return visitFields(Cognito.Forms.model.currentForm, function (field) { return field.get_IncludeOnInvoice(); });
	}

	// recursively look through all the fields to see if there is one with quantity limits
	function hasQuantityLimitedFields() {
		return visitFields(Cognito.Forms.model.currentForm, function (field) {
			var quantity = field.get_Quantity();
			return field.get_canLimitQuantities() && quantity !== null && quantity !== undefined && quantity !== "";
		});
	}

	// Determine if a signature field is present
	function hasSignature() {
		return visitFields(Cognito.Forms.model.currentForm, function (field) { return field.get_FieldType().get_Name() === "Signature"; });
	}

	// Determine if a password field is present
	function hasPassword() {
		return visitFields(Cognito.Forms.model.currentForm, function (field) { return (field.get_FieldSubType() && field.get_FieldSubType().get_Name() === "Password"); });
	}

	// Determine if a table field is present
	function hasTable() {
		return Cognito.Forms.model.currentForm.get_Views()[0].get_Definition().indexOf("<table") !== -1;
	}

	function addDropdownOption(element, value, display, isSelected) {
		var optionText = display;

		if (display.indexOf('.') <= 0) {
			optionText = ExoWeb.makeHumanReadable(display);
		}

		element.append($("<option value='" + value + "'></option>").html(optionText));

		if (isSelected) {
			element.val(value);
		}
	}
	Cognito.Forms.addDropdownOption = addDropdownOption;

	function upgradeForm(formDefinition, callback) {
		Cognito.Forms.serviceRequest({
			endpoint: "upgrade",
			method: "POST",
			dataType: "text",
			contentType: "application/x-www-form-urlencoded",
			data: { "formDefinition": formDefinition },
			success: callback
		});
	}
	Cognito.Forms.upgradeForm = upgradeForm;

	function validateExpressions(newForm, serializedOldForm, newFieldPath, oldFieldPath) {
		serializedOldForm = serializedOldForm == "" ? null : serializedOldForm;

		updateFormat();

		Cognito.Forms.serviceRequest({
			endpoint: "validateFormExpressions",
			method: "POST",
			contentType: "application/json+cognito; charset=utf-8",
			data: { NewRootType: Cognito.serialize(newForm), OldRootType: serializedOldForm, NewFieldPath: newFieldPath, OldFieldPath: oldFieldPath, Localization: Cognito.serialize(newForm.get_Localization()) },
			success: function (validationResults) { applyConditions(validationResults); }
		});
	}

	function rebindHtmlEditors() {

		// Attempt to rebind all html editors to handle scenarios where model changes are not reflected
		window.tinyMCE.editors.forEach(function (editor) {

			try {

				var element = $(editor.getElement());

				// Get the target property that is being bound to.
				var targetProperty = element.attr("data-property");

				// Get the current value of the target.
				var instance = $parentContextData(element.get(0));
				var currentValue = window.ExoWeb.evalPath(instance, targetProperty);

				editor.setContent(Cognito.Forms.tokenizeHtml(currentValue, element.parentElement()));
			}
			catch (e) { }
		});
	}

	function applyConditions(validationResults, validateFormOnly) {
		var form = Cognito.Forms.model.currentForm;

		// flag path calculated properties to recalculate
		form.meta.pendingInit(form.meta.property("tokens"), true);

		// apply all validation results against the elements
		if (!validateFormOnly)
			Cognito.applyElementsConditions($("#c-forms-layout-elements").childElements().filter(function () { return !$(this).isPlaceholder() }), validationResults);

		// apply form's validation results
		var formResults = Cognito.deserialize(Cognito.ValidationResult, validationResults["Form"]);
		if (formResults)
			applyFormConditions(formResults);

		// raise change on the calculated path properties to force re-calculation
		form.meta.property("tokens").raiseChanged(form);

		// Force any visible content editors to rebind
		rebindHtmlEditors();
	}

	// Localizes the builder
	Cognito.Forms.localizeBuilder = function Forms$localizeBuilder() {

		var locale = Cognito.Forms.model.currentForm.get_Localization();
		Cognito.Forms.serviceRequest({
			endpoint: "localize",
			method: "POST",
			contentType: "application/json; charset=utf-8",
			data: {
				Country: locale.get_Country() ? locale.get_Country().get_Code() : "",
				Language: locale.get_Language() ? locale.get_Language().get_Code() : "",
				Currency: locale.get_Currency() ? locale.get_Currency().get_Code() : "",
				TimeZone: locale.get_TimeZone() ? locale.get_TimeZone().get_Code() : "",
				Scopes: ["Form", "Build", "Payment"]
			},
			dataType: "script",
			success: function () {
				Cognito.Forms.model.currentForm.get_Fields().forEach(function (field) {
					if (field.get_FieldType().get_Name() === "Choice") {
						field.get_Choices().forEach(function (choice) {
							Cognito.Choice.meta.property("Value").raiseChanged(choice);
						});
					}
					else if (field.get_FieldType().get_Name() === "YesNo") {
						Cognito.Field.meta.property("Amount").raiseChanged(field);
					}
				});

				// re-render all elements in the layout pan
				renderLayoutElements(Cognito.Forms.model.currentForm);

				// re-render settings panes
				$("#c-forms-settings-form").get(0).control.update(true);
				$("#c-forms-settings-payment").get(0).control.update(true);

				// make sure that the include processing fees option is handled appropriately
				ensureIncludeProcessingFees();

				// update the view definition
				Cognito.Forms.updateViewDefinition(false);

				// validate all elements on the form
				validateExpressions(Cognito.Forms.model.currentForm);

				// close the dialog
				updateLocalizationDialog.close();
			},
			error: function () {
				updateLocalizationDialog.close();
			}
		});
	}

	function applyFormConditions(validationResults) {
		var form = Cognito.Forms.model.currentForm;
		var pathParser = /(\w*)(\[\d*\])|(\w+)/g;

		for (var i = 0; i < validationResults.length; i++) {
			var target = form;
			var validationResult = validationResults[i];
			var targetPath = validationResult.get_Target();
			var property = validationResult.get_Property();
			var conditionCode = property;
			// Validation
			if (validationResult.get_ExceptionMessage() != null) {
				if (targetPath) {
					conditionCode = targetPath.replace(pathParser, "$1$3") + "." + property;
					target = eval("Cognito.Forms.model.currentForm." + targetPath.replace(pathParser, "get('$1$3')$2"));
				}

				var message = validationResult.get_ExceptionMessage();

				conditionType = formExpressionConditionTypes[conditionCode];
				if (!conditionType)
					conditionType = formExpressionConditionTypes[conditionCode] = new ExoWeb.Model.ConditionType.Error(conditionCode);

				new ExoWeb.Model.Condition(conditionType, message, target, [property], "client");
			}
			// Rename
			else {
				var property = targetPath ? targetPath + "." + property : property;
				// if the property path contains a list indexer then convert the path so the property is the leaf node and the target instance
				// is the leaf node's parent. For example, if the property is "Notifications[0].Sender.Address" then
				// the target instance would be "Sender" and the property is "Address".
				if (property.indexOf("[") > 0) {
					var lastIndex = property.lastIndexOf(".");

					// Set the target instance to the leaf node's parent by converting the leaf node's parent path to an expression that can be evaluated
					var targetPath = property.substring(0, lastIndex);
					target = eval("Cognito.Forms.model.currentForm." + targetPath.replace(pathParser, "get('$1$3')$2"));

					// Set the property to the leaf node
					property = property.substring(lastIndex + 1);
				}

				if (target)
					target.set(property, validationResult.get_FormattedValue());
			}
		}
	}

	function updateFormat() {
		var token = Cognito.Forms.generateTokens().filter(function (t) {
			return t.FieldType === "Name";
		})[0];
		if (!token)
			token = Cognito.Forms.generateTokens().filter(function (t) {
				return t.FieldType === "Text";
			})[0];

		var currentForm = Cognito.Forms.model.currentForm;
		if (token)
			currentForm.set_format(currentForm.get_Name() + " - [" + token.InternalName + "]");
		else
			currentForm.set_format(currentForm.get_Name() + " - [Entry.Number]");
	}

	var viewUsersDialog;
	function viewUsers() {
		var oldActiveTab = $(".c-admin-fixed-action-bar-content .c-active");
		setActiveTab($("#c-forms-form-users"));
		var url = Cognito.config.baseUrl + "forms/admin/view/" + Cognito.Forms.model.currentForm.get_InternalName() + "/users";

		viewUsersDialog = $.fn.dialog({
			title: "Users",
			width: 800,
			height: "80%",
			buttons: [
				{
					label: "Close",
					autoClose: true,
					click: function () { setActiveTab(oldActiveTab); }
				}
			]
		});

		viewUsersDialog._dialog.find(".c-modal-content").remove();
		viewUsersDialog._dialog.find(".c-modal-content-container").append("<iframe name='users' style='width: 100%; height: 100%; overflow-x: hidden; overflow-y: hidden; -ms-overflow-style: scrollbar' src='" + url + "'></iframe>");
		viewUsersDialog.open();
	}

	// Finds a field using the specified property path (i.e. "Section.Email") and typeMeta
	// This does not support property path containing a RepeatingSection/list.
	function findField(typeMeta, path) {
		var index = path.indexOf(".");

		// Walk property path
		if (index > -1) {
			typeMeta = typeMeta.get_Fields().filter(function (field) {
				if (field.get_InternalName() == path.substring(0, index))
					return field;
			})[0];
			
			if (!!typeMeta)
				return findField(typeMeta.get_ChildType(), path.substring(index + 1));
			else
				return null;
		}

		// Find field 
		var fields = typeMeta.get_Fields().filter(function (field) {
			if (field.get_InternalName() == path)
				return field;
		});

		if (fields.length > 0)
			return fields[0];
		else
			return null;
	}

	// Returns a jQuery selector that can be used to find an element for the specified property path.
	// This does not support property path containing a RepeatingSection/list.
	function getElementSelector(path) {
		if (path) {
			var index = path.indexOf(".");

			// Walk property path
			if (index > -1)
				return "[data-field='" + path.substring(0, index) + "']" + " " + getElementSelector(path.substring(index + 1));
			else
				return "[data-field='" + path + "']";
		}

		return "";
	}

	// Ensure the mapped email field is required and disables the "Required This Field" setting and allows the old mappped email field "Required This Field" setting to be changed
	function updateCustomerEmail(form, emailPath) {
		var emailField = findField(form, emailPath);

		if (emailField) {
			// If saving a customer's card then the mapped email field required and not allowed to be changed
			if (form.get_saveCustomerCardEnabled()) {
				if (emailField.get_isRequired() === "Never") {
					emailField.set_isRequired("Always");
				}
			}

			// If the current element is not the mapped email element then find the element and re-render it so the required asterisk is displayed
			var $emailElement = $(getElementSelector(emailPath));
			if (Cognito.Forms.model.currentElement && Cognito.Forms.model.currentElement.get(0) !== $emailElement.get(0)) {
				Cognito.refreshElement($emailElement);
			}
		}
	}

	//#endregion

	//#region JQuery Event Handlers

	// Ensure the toolbar is in the right place when the browser window resizes
	$(window).resize(showToolbar);

	// Hover element
	$(".c-forms-main")
		.on("mouseenter", ".c-forms-layout-element", function () {

			// Mark the element as hovered
			$(this).attr("data-hover", true);

			// Remove the hover class for parent elements
			$(this).parents(".c-forms-layout-element", this).removeClass("c-forms-layout-element-hover");

			// Change the class if no child element is hovered
			if ($(this).find(".c-forms-layout-element[data-hover='true']").length === 0)
				$(this).addClass("c-forms-layout-element-hover");
		})
		.on("mouseleave", ".c-forms-layout-element", function () {

			// Mark the element as not hovered and remove the hover class
			$(this).attr("data-hover", false).removeClass("c-forms-layout-element-hover");

			// Apply the hover class to the first parent still hovered
			$(this).parents(".c-forms-layout-element[data-hover='true']", this).first().addClass("c-forms-layout-element-hover");

		});

	// Select the focus element
	$("#c-forms-layout-elements")

		// IE 9 does not support DnD on div elements
		.on("selectstart", "[draggable]", function (event) {
			this.dragDrop();
			return false;
		})

		// When clicking horizontal insertion element, do not select containing section before creating/selecting placeholder
		.on("focus", ".c-quick-insert-row", function (e) {
			e.stopImmediatePropagation();
			return false;
		})

		.on("click", ".c-quick-insert .plus, .c-quick-insert-row", function (e) {
			var $qi = $(e.target).closest(".c-quick-insert");
			if ($qi.is(".c-quick-insert-row")) {
				var element = $qi.parent(".c-forms-row").childElements().first();
				if (!element.isPlaceholder())
					insertRow(element, true, 0);
				else
					element[0].focus();
			}
			else
				insertBefore($(e.target).closest(".c-forms-layout-element"));

			e.stopPropagation();
		})

		.on("dblclick", ".c-col-resizer", function (e) {
			var $el = $(e.target).closest(".c-forms-layout-element").prev();
			if ($el.length)
				reflowSectionCols($el.parentElement(), $el, $el.maximumWidth() - $el.colspan());
		})

		// Select Element
		.on("focus", ".c-forms-layout-element", function (event) {
			selectElement(this);
			repositionSettings();

			var elementType = $(this).elementType();
			if (elementType && elementType === elementTypes.Choice)
				makeChoicesSortable(this);

			return false;
		});

	$(document)

		// Edit form's settings
		.on("click", ".c-forms-heading, #c-forms-form-settings", function () {
			// Hide the toolbar
			hideToolbar();

			// Unselect the current element
			currentElement = null;

			// Reposition the settings for the form
			repositionSettings($(".c-forms-heading")[0]);
		})

		// Edit submission settings
		.on("click", "#c-forms-submission-settings", function () {
			var submissionPageBreak = $(".c-forms-layout-pagebreak[data-issubmission=true]")[0];
			selectElement(submissionPageBreak);
			repositionSettings(submissionPageBreak);
			showHideEmailNotifications();
			return false;
		})

		// Edit form's payment settings by selecting element in builder
		.on("click", ".c-forms-payment", function () {
			// Unselect the current element
			currentElement = null;

			selectPaymentSettings();
		})

		.on("element-unselected", ".c-forms-payment", function () {
			var form = Cognito.Forms.model.currentForm;

			// if the payment footer element is being un-selected
			// ensure the correct payment content is being displayed
			showHidePaymentBlock();
		})

		// Edit form's payment settings by selecting settings link
		.on("click", ".c-forms-payment-status", function (event) {
			// Unselect the current element
			currentElement = null;

			// if payment has not been enabled, and the form hasn't been linked to a payment account, open the payment account dialog
			// if payment has not been enabled, and the form has been linked to a payment account, open the payment settings form
			// otherwise select the payment footer control
			if (!Cognito.Forms.model.currentForm.get_PaymentEnabled() && !Cognito.Forms.model.currentForm.get_PaymentAccount()) {
				editPaymentAccount(true);
			} else {
				selectPaymentSettings();
			}
		})

		// Users Management
		.on("click", "#c-forms-form-users", function () {
			viewUsers();
		});

	// Cut element
	$("#c-forms-cut").click(cutElement);

	// Copy element
	$("#c-forms-copy").click(copyElement);

	// Delete element
	$("#c-forms-delete").click(deleteElement);

	// Paste element
	$(document).on("click", "#c-forms-paste:not(.parent)", function () { pasteElement(cutCopyElement, null, currentElement, false, false); });

	// Paste above
	$("#c-forms-paste-above").click(function () { pasteElement(cutCopyElement, null, currentElement, false, false); });

	// Paste below
	$("#c-forms-paste-below").click(function () { pasteElement(cutCopyElement, null, currentElement, true, false); });

	// Paste before
	$("#c-forms-paste-before").click(function () { pasteElement(cutCopyElement, null, currentElement, false, true); });

	// Paste after
	$("#c-forms-paste-after").click(function () { pasteElement(cutCopyElement, null, currentElement, true, true); });

	// Insert above
	$("#c-forms-insert-above").click(insertAbove);

	// Insert below
	$("#c-forms-insert-below").click(insertBelow);

	// [Table] Insert before
	$("#c-forms-insert-before").click(insertBefore);

	// [Table] Insert after
	$("#c-forms-insert-after").click(insertAfter);

	function clickMakeSmaller() {
		if ($("#c-forms-make-smaller").is(".disabled"))
			return false;
		else
			makeSmaller();
	}

	// Make smaller
	$("#c-forms-make-smaller").on("click", clickMakeSmaller);

	function clickMakeBigger() {
		if ($("#c-forms-make-bigger").is(".disabled"))
			return false;
		else
			makeBigger();
	}

	// Make bigger
	$("#c-forms-make-bigger").on("click", clickMakeBigger);

	// Justify row
	$("#c-forms-justify-row").on("click", function (e) {
		justifyRow($(currentElement).row());
		e.stopPropagation();
	});

	$("#c-forms-layout-toolbar").on("click", ".parent", function (e) {
		var $this = $(this);
		if ($this.is(".c-forms-layout-toolbar-selected"))
			return;

		var children = $this.next(".children." + this.id);
		var width = $this.outerWidth();
		var height = $this.height();
		var pos = $this.position();
		children.css("left", pos.left + "px");
		$this.addClass("c-forms-layout-toolbar-selected");

		e.stopPropagation();

		$(document).one("click", function (e) {
			$this.removeClass("c-forms-layout-toolbar-selected");
		});
	});

	// Convert to repeating section
	$("#c-forms-convert-section, #c-forms-convert-table").on("click", convertSectionOrTable);

	// Select Field Type
	$(".c-forms-main").on("click", ".c-forms-settings-elementTypes", function () {

		var elementType = Cognito.Forms.elementTypes[$(this).attr("data-code")];
		if (!elementType.isEnabled)
			return;

		var element = createElement(currentElement, elementType);

		// If no element was created, abort
		if (!element) return;

		insertElement(element, currentElement, function success() {

			// Update page numbers if this is a page break element
			if ($(element).tag().toLowerCase() == "pagebreak")
				updatePageNumbers(true);


			window.setTimeout(function () {

				// Set focus on the new element
				element.focus();

				// The setTimemout is throwing off the timing of the UI tests, because there is no way to wait for the focus/selection to happen before proceeding.
				if (Cognito.config.isUnitTesting) {
					// Set focus on the first textbox/textarea in the field settings
					setFocus($("#c-forms-settings input[type='text']:visible, textarea:visible").first().get(0));
				}
				else {
					// The setTimeout is needed in IE 11 to give focus to the texbox
					setTimeout(function () {
						// Set focus on the first textbox/textarea in the field settings
						setFocus($("#c-forms-settings input[type='text']:visible, textarea:visible").first().get(0));
					}, 200);
				}

				// Once animations are complete, validate type
				animations.waitForAll(function () {
					// Reposition the field settings based on the selected element type
					repositionSettings();

					Cognito.Forms.updateViewDefinition(false);
					validateExpressions(Cognito.Forms.model.currentForm);
				});
			}, 1);

		});
	});


	$("#c-forms-settings")

		// IE 9 does not support DnD on div elements
		.on("selectstart", "[draggable]", function (event) {
			this.dragDrop();
			return false;
		})

		// Add/remove lock icon when protecting a field
		.on("click", ".c-forms-isprotected", function (event) {
			var $element = $(this);
			var $currentElement = $(currentElement);
			var $label = $currentElement.find(".c-label label:first");
			var isSelected = $element.is(":checked");
			var $icons = $label.children(".c-icons").length ? $label.children(".c-icons:first") : $label.append($("<div class='c-icons'></div>")).children(".c-icons:first");

			if (isSelected) {
				// Add icon
				$icons.append($("<i class='icon-protect'></i>"));
			} else {
				// Remove icon
				$icons.children("i.icon-protect").remove();
			}
		})

		// Update the element's label whenever the name/label property is changing
		.on("keyup blur", "input[type=text], textarea", function (event) {
			var selector = $(this).attr("data-label-selector");
			if (selector === ".c-question")
				selector = selector + "-" + $(".c-forms-settings-ratingScale-question-text").index(this);

				selector += " label";

			if (selector) {
				var keyupFired = true;
				var $currentElement = $(currentElement);
				window.setTimeout(function () {
					if (!keyupFired) {
						var value = event.target.value;
						if (!value) // For cases where the user has blanked out the field name
                            value = $currentElement.get_field().get_InternalName();

						var contentElement = $currentElement.find(selector);
						// If item label ensure the "Add value" updates as well
						if (selector.startsWith(".c-forms-layout-item-label")) {
							$firstContentElement = contentElement.first();
							$firstContentElement.html(value);
							$firstContentElement.closest(".c-forms-layout-repeatingsection-container").next().find(".c-forms-layout-item-label").text(value).html();
						}
						else if (selector.startsWith(".c-question"))
							contentElement.text(value).html();
						else
							contentElement.first().text(value).html();
					}
				}, 500);
				keyupFired = false;
			}
		})

		// Select the next element when the enter key is pressed inside the label's textbox
		.on("keydown", "#c-forms-label", function (event) {
			if (event.keyCode == 13) {

				// Set focus on the next element
				setFocusOnNext(currentElement);

				// Prevent the event from bubbling up the DOM tree
				event.stopPropagation();
			}
		})

		// TEST: Choice - select choice sub type
		.on("click", ".c-forms-sub-types INPUT", function (event) {
			if ($(currentElement).get_field().get_FieldType().get_Name() != "Choice")
				return;
			// If the sub type is "Drop Down" or "Radio Buttons" and multiple default values are selected then uncheck
			// all default values except for the first one.
			if ($(currentElement).get_field().get_FieldSubType().get_Name() != "Checkboxes"
				&& $(".c-forms-settings-choice-editor :checked").length > 1) {
				$(".c-forms-settings-choice-editor :checked").slice(1).each(function () {
					$parentContextData(this).set_IsSelected(false);
				});
			}
		})

		// TEST: Choice - select default selection
		.on("click", ".c-forms-settings-choice-select input", function (event) {
			// To not require a default value for "Drop Down" and "Radio Buttons" sub types, the builder is using checkboxes
			// for the default value selection. The following logic prevents multiple default values selections.
			if ($(currentElement).get_field().get_FieldSubType().get_Name() != "Checkboxes") {
				var that = this;
				$('.c-forms-settings-choice-select input').each(function () {
					if (this !== that)
						$parentContextData(this).set_IsSelected(false);
				});
			}
		})

		// TEST: Choice - add choice, RatingScale - add rating
		.on("mousedown", ".c-forms-settings-choice-add", function (event) {
			// Using a setTimeout to allow the binding on the Name/Label to occur before a new choice/rating is added
			var that = this;
			window.setTimeout(function () {
				var field = $(currentElement).get_field();
				var target = $(that).closest(".c-forms-settings-choice");

				// Enable the remove function on the last option
				if (field.get_Choices().length === 1 || (field.get_AllowNA() && field.get_Choices().length === 2))
					target.find(".c-forms-settings-choice-remove").removeClass("disabled");

				var index = $(".c-forms-settings-choice-editor .c-forms-settings-choice").index(target);
				field.get_Choices().insert(index + 1, new Cognito.Choice());

				// Find the element to restore focus since this/that is no longer the correct element due to Exo binding/rendering
				$($(".c-forms-settings-choice-editor .c-forms-settings-choice")[index + 1]).find(".c-forms-settings-choice-text input").focus();
			});
		})
		// TEST: Choice - remove choice, RatingScale - remove rating
		.on("mousedown", ".c-forms-settings-choice-remove", function (event) {
			// Using a setTimeout to allow the binding on the Name/Label to occur before removing the choice
			window.setTimeout(function () {
				var field = $(currentElement).get_field();
				var target = $(this).closest(".c-forms-settings-choice");

				// Disable the remove function on the last option
				if (field.get_Choices().length === 1 || (field.get_AllowNA() && field.get_Choices().length === 2))
					return;

				var index = $(".c-forms-settings-choice-editor .c-forms-settings-choice").index(target);
				field.get_Choices().removeAt(index);
			}.bind(this));
		})

		// RatingScale - add question
		.on("click", ".c-forms-settings-question-add", function (event) {
			var childType = $(currentElement).get_field().get_ChildType();
			var questions = childType.get_Fields();
			var index = questions.indexOf($parentContextData(this));
			var newQuestion = createRatingScaleQuestion(childType);
			questions.insert(index + 1, newQuestion);

			// Disable the remove function on the last option
			if (questions.length === 2)
				$(".c-forms-settings-question-remove").removeClass("disabled")
		})

		// Rating Scale - remove question
		.on("click", ".c-forms-settings-question-remove", function (event) {
			var fields = $(currentElement).get_field().get_ChildType().get_Fields();
			var target = $(this).closest("div");

			// Disable the remove function on the last option
			if (fields.length === 1)
				return;

			fields.remove($parentContextData(this));
		})

		// onclick go to character position of error
		.on('click', '.c-validation-message', function () {
			var position = $(this).data('position');
			var input = $(this).parents(".c-field").first().find("input")[0];
			if (input.type == "text")
				setSelectionRange(input, position + 1, position + 1);
		})

		// Expand/collapse settings sections
		.on('click', '.c-forms-settings-section', function () {
			if ($(this).next().length == 0)
				return true;
			if (arguments[0].target.tagName == "LABEL")
				return true;
			if ($(this).next().is(":visible")) {
				$(this).next().slideUp(500);
				$(this).addClass("c-collapsed");
			}
			else {
				Cognito.Forms.model.currentForm.set($(this).find("input")[0].__msajaxbindings[0]._path, true);
				$(this).next().slideDown(500);
				$(this).removeClass("c-collapsed");
			}
		})

		.on('click', '#c-forms-settings-sharepoint-connect', function (event) {
			var form = Cognito.Forms.model.currentForm;

			// Remove existing connection errors if any
			if (form.meta.getCondition(sharePointConditionType))
				form.meta.getCondition(sharePointConditionType).condition.destroy();

			// Show the validation errors
			$('.c-forms-sharepoint-settings .c-validation').show();

			if (form.get_sharePointSiteUrl() && form.get_sharePointUserName() && form.get_sharePointPassword()) {
				$(this).text("Connecting");
				$(".icon-connectingtosharepoint").show();

				Cognito.Forms.getSharePointLists(form.get_sharePointSiteUrl(), form.get_sharePointUserName(), form.get_sharePointPassword(),
					function (data) {
						var form = Cognito.Forms.model.currentForm;
						ExoWeb.updateArray(form.get_sharePointLists(), data.sharePointListNames.slice(0, data.sharePointListNames.length - 1));
						$(".icon-connectingtosharepoint").hide();
						$(".c-forms-sharepointconnect").text("Connect");
						form.set_connectedToSharePoint(true);
						form.set_editSharePointCredentials(false);
						sharePointTimeZoneHoursOffset = data.sharePointListNames[data.sharePointListNames.length - 1];

						// Store the valid credentials to be persisted
						if (form.get_sharePointLists().length > 0) {
							form.set_sharePointListName(form.get_sharePointLists()[0]);
						}

						form.set_validSharePointUrl(form.get_sharePointSiteUrl());
						form.set_validSharePointUsername(form.get_sharePointUserName());
						form.set_validSharePointPassword(form.get_sharePointPassword());
					},
					function (jqXHR, textStatus, errorThrown) {
						$(".icon-connectingtosharepoint").hide();
						$(".c-forms-sharepointconnect").text("Connect");
						Cognito.Forms.displaySharePointConnectionErrors(textStatus);
					});
			}
		})

		.on('click', '#c-forms-settings-sharepoint-refresh', function (event) {
			var form = Cognito.Forms.model.currentForm;

			$("#c-forms-settings-sharepoint-refresh .icon-refresh").addClass("icon-spin");
			if (form.get_sharePointSiteUrl() && form.get_sharePointUserName() && form.get_sharePointPassword()) {
				Cognito.Forms.getSharePointLists(form.get_sharePointSiteUrl(), form.get_sharePointUserName(), form.get_sharePointPassword(),
					function (data) {
						ExoWeb.updateArray(form.get_sharePointLists(), data.sharePointListNames.slice(0, data.sharePointListNames.length - 1));
						sharePointTimeZoneHoursOffset = data.sharePointListNames[data.sharePointListNames.length - 1];
						$("#c-forms-settings-sharepoint-refresh .icon-refresh").removeClass("icon-spin");
					},
					function (jqXHR, textStatus, errorThrown) {
						$("#c-forms-settings-sharepoint-refresh .icon-refresh").removeClass("icon-spin");
						Cognito.Forms.displaySharePointConnectionErrors(textStatus);
					}
				);
			}
			else if (form.get_sharePointNotification()) {
				Cognito.Forms.getSharePointListsByForm(form,
					function (data) {
						ExoWeb.updateArray(form.get_sharePointLists(), data.sharePointListNames.slice(0, data.sharePointListNames.length - 1));
						sharePointTimeZoneHoursOffset = data.sharePointListNames[data.sharePointListNames.length - 1];
						$("#c-forms-settings-sharepoint-refresh .icon-refresh").removeClass("icon-spin");
					},
					function (jqXHR, textStatus, errorThrown) {
						$("#c-forms-settings-sharepoint-refresh .icon-refresh").removeClass("icon-spin");
						Cognito.Forms.displaySharePointConnectionErrors(textStatus);
					}
				);
			}
		})

		.on('click', '#c-forms-settings-sharepoint-edit', function (event) {
			Cognito.Forms.model.currentForm.set_editSharePointCredentials(true);
		})

		.on('click', '#c-forms-settings-sharepoint-cancel', function (event) {
			var form = Cognito.Forms.model.currentForm;
			form.set_editSharePointCredentials(false);

			// Remove existing connection errors if any
			if (form.meta.getCondition(sharePointConditionType))
				form.meta.getCondition(sharePointConditionType).condition.destroy();

			// Rollback changes
			form.set_sharePointSiteUrl(form.get_validSharePointUrl());
			form.set_sharePointUserName(form.get_validSharePointUsername());
			form.set_sharePointPassword(form.get_validSharePointPassword());
		})

		// Validate calculation field after changing subtype
		.on("click", ".c-forms-sub-types INPUT", function (event) {
			var currentFieldType = $(currentElement).get_field().get_FieldType().get_Name();
			if (currentFieldType == "Calculation" || currentFieldType == "Number") {
				Cognito.Forms.updateViewDefinition(false);

				// Validate the entire form since the field data type changed
				validateExpressions(Cognito.Forms.model.currentForm);
			}
		})

		// Do not show validation messages when typing
		.on("focusin", ".c-expression input", function (event) {
			$(this).closest('.c-editor').siblings('.c-validation').hide();
		})

		// Show validation messages when done typing
		.on("focusout", ".c-expression input", function (event) {
			var that = this;
			// Wait to make sure input not going to gain focus again
			window.setTimeout(function () {
				if (!$(that).is(":focus"))
					$(that).closest('.c-editor').siblings('.c-validation').show();
			}, 100);
		})

		// Change element isVisible to new value
		.on("click", ".c-forms-settings-visible input[type='radio']", function (event) {

			// Open expression builder, want to keep existing 'When' expression value
			if ($(currentElement).get_isVisible() !== $(event.target).val())
				ExoWeb.Observer.setValue(Cognito.Forms.model.currentElement, "isVisible", $(event.target).val());
		})

		// Open expression builder for column summary
		.on("click", ".c-forms-settings-column-summary .c-expression-builder-open, .c-forms-settings-column-summary .c-validation-message", function (event) {
			var field = $(currentElement).get_field();
			var expression = field.get_ColumnSummary();

			var fieldType = "Text";
			var fieldSubType = null;
			var parentName = $(currentElement).parentElement().get_field().get_Name();

			// Open expression builder with required expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, $(currentElement).parentElement().get_scope(), "ColumnSummary", "Summary", fieldType, fieldSubType, expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				$(currentElement).get_field().set_ColumnSummary(newExpression);
			});
		})

		// Open expression builder for required
		.on("click", ".c-forms-settings-required .c-predicate-expression, .c-forms-settings-required .c-validation-message", function (event) {
			var expression = $(currentElement).get_field().get_Required();

			// Open expression builder with required expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, $(currentElement).get_scope(), "Required", "Required When...", "YesNo", "YesNo", expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				if (newExpression === "")
					$(currentElement).get_field().set_isRequired("Never");
				else
					$(currentElement).get_field().set_Required(newExpression);
			});
		})

		// Open expression builder for show error
		.on("click", ".c-forms-settings-show-error .c-predicate-expression, .c-forms-settings-show-error .c-validation-message", function (event) {
			var expression = $(currentElement).get_field().get_Error();

			// Open expression builder with error expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, $(currentElement).get_scope(), "Error", "Show Custom Error When...", "YesNo", "YesNo", expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				if (newExpression === "")
					$(currentElement).get_field().set_showError("Never");
				else
					$(currentElement).get_field().set_Error(newExpression);
			});
		})

		// Open expression builder for RequirePayment
		.on("click", ".c-forms-payment-settings-checkout-visible .c-predicate-expression, .c-forms-payment-settings-checkout-visible .c-validation-message", function (event) {
			var expression = Cognito.Forms.model.currentForm.get_RequirePayment();

			// Open expression builder with required expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "RequirePayment", "Require Payment When...", "YesNo", "YesNo", expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {

				// Clear any conditions prior to opening the builder
				var condition = Cognito.Forms.model.currentForm.meta.getCondition(formExpressionConditionTypes["RequirePayment"]);
				if (condition) {
					condition.condition.destroy();
				}

				if (newExpression === "")
					Cognito.Forms.model.currentForm.set_isPaymentRequired("Always");
				else
					Cognito.Forms.model.currentForm.set_RequirePayment(newExpression);
			});
		})

		// Open expression builder for SaveCustomerCard
		.on("click", ".c-forms-payment-create-payment-customer .c-predicate-expression, .c-forms-payment-create-payment-customer .c-validation-message", function (event) {
			var expression = Cognito.Forms.model.currentForm.get_SaveCustomerCard();

			// Open expression builder with required expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "SaveCustomerCard", "Keep Card on File When...", "YesNo", "YesNo", expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				if (newExpression === "")
					Cognito.Forms.model.currentForm.set_saveCustomerCard("Never");
				else
					Cognito.Forms.model.currentForm.set_SaveCustomerCard(newExpression);
			});
		})

		// Open expression builder for visible
		.on("click", ".c-forms-settings-visible .c-predicate-expression, .c-forms-settings-visible .c-validation-message", function (event) {

			// Make sure correct element is kept if user switches current element
			var selectedElement = Cognito.Forms.model.currentElement;
			var expression = selectedElement.get_visible();

			// Open expression builder with visible expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, selectedElement.get_scope(), "Visible", "Visible When...", "YesNo", "YesNo", expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				if (newExpression === "")
					ExoWeb.Observer.setValue(selectedElement, "isVisible", "Always");
				else
					ExoWeb.Observer.setValue(selectedElement, "visible", newExpression);
			});
		})

		// Open expression builder for AllowSharedEditLinks
		.on("click", ".c-forms-settings-allow-shared-edit-links .c-predicate-expression, .c-forms-settings-allow-shared-edit-links .c-validation-message", function (event) {
			var expression = Cognito.Forms.model.currentForm.get_AllowSharedEditLinks();

			// Open expression builder with allowSharedEditLinks expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "AllowSharedEditLinks", "Allow Editing When...", "YesNo", "YesNo", expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				if (newExpression === "")
					Cognito.Forms.model.currentForm.set_allowSharedEditLinks("Always");
				else
					Cognito.Forms.model.currentForm.set_AllowSharedEditLinks(newExpression);
			});
		})

		// Open expression builder for AllowSharedViewLinks
		.on("click", ".c-forms-settings-allow-shared-view-links .c-predicate-expression, .c-forms-settings-allow-shared-view-links .c-validation-message", function (event) {
			var expression = Cognito.Forms.model.currentForm.get_AllowSharedViewLinks();

			// Open expression builder with allowSharedViewLinks expression and containing type
			Cognito.Forms.updateViewDefinition(false);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "AllowSharedViewLinks", "Allow Viewing When...", "YesNo", "YesNo", expression, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				if (newExpression === "")
					Cognito.Forms.model.currentForm.set_allowSharedViewLinks("Always");
				else
					Cognito.Forms.model.currentForm.set_AllowSharedViewLinks(newExpression);
			});
		})

		// Open calculation editor
		.on("click", ".c-expression:not(.c-forms-settings-column-summary) .c-expression-builder-open", function (event) {

			var targetDIV = $(this).closest("div");
			var targetAdapter = $parentContextData(this);
			var selectedElement = Cognito.Forms.model.currentElement;
			var field = selectedElement.get_field();

			// Open calculation editor
			Cognito.Forms.updateViewDefinition(false);
			var fieldType = $(this).attr("data-fieldtype") || field.get_FieldType().get_Name();
			var fieldSubType = $(this).attr("data-fieldsubtype") || (field.get_FieldSubType() ? field.get_FieldSubType().get_Name() : null);
			Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, selectedElement.get_scope(), targetAdapter.get_propertyPath(), targetAdapter.get_label(), fieldType, fieldSubType, targetAdapter.get_systemValue(), Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {
				targetAdapter.set_displayValue(newExpression);
				targetAdapter.get_propertyChain().raiseChanged(targetAdapter.get_target());
			}, null, null, field.get_Format());
		})

		// Localize the builder
		.on("change", ".c-forms-edit-localization-settings select", function (event) {
			updateLocalizationDialog.open();
			window.setTimeout(function () {
				Cognito.Forms.localizeBuilder();
			}, 500);
		})

		.on("focus", ".c-forms-settings-choice-hide-actions .c-forms-settings-choice input", function (e) {
			$(this).closest(".c-forms-settings-choice").addClass("show-actions");
		})
		.on("blur", ".c-forms-settings-choice-hide-actions .c-forms-settings-choice input", function (e) {
			$(this).closest(".c-forms-settings-choice").removeClass("show-actions");
		});

	// Allow choices to be bulk entered by pasting multiple lines
	$(document).on("paste", ".c-forms-settings-choice-text", function (e) {
		var text = (e.originalEvent.clipboardData || window.clipboardData).getData('text');
		var lines = text.split(/\r?\n/);
		if (lines.length > 1) {
			var currentElement = $(Cognito.Forms.model.currentElement);

			var visProps = [];
			if (currentElement.get_field().get_HasValue())
				visProps.push("value");
			if (currentElement.get_field().get_HasQuantity())
				visProps.push("quantity");
			if (currentElement.get_field().get_HasPrice())
				visProps.push("price");

			var $rows = $("tr.c-forms-settings-choice");
			var index = $rows.index($(this).closest(".c-forms-settings-choice"));
			var choices = currentElement.get_field().get_Choices();
			var populateChoice = function (choice, unparsedValues) {
				var values = unparsedValues.split("\t");
				// Do Label separately because it is not numeric
				choice.set_Label(values.shift());
				values.forEach(function (v, i) {
					if (i < visProps.length)
						choice.set(visProps[i], values[i]);
				});
			}

			populateChoice(choices[index++], lines[0].trim());
			for (var i = 1; i < lines.length; i++) {
				var line = lines[i].trim();
				if (line) {
					var choice = new Cognito.Choice();
					choices.insert(index, choice);
					populateChoice(choice, line);
					index++;
				}
			}
			return false;
		}
	});

	// Keyboard Shortcuts
	$(document).on("keydown", function (event) {
		var focusElement = $(document.activeElement);
		if (focusElement.hasClass("c-forms-layout-element") || focusElement.parents(".c-forms-layout-element-selected").length > 0) {

			// In IE the child elements are receiving focus whereas in Firefox and Chrome the parent element with the tabindex attribute is the focus element
			if (!focusElement.hasClass("c-forms-layout-element"))
				focusElement = focusElement.parents(".c-forms-layout-element-selected");

			var $currentElement = Cognito.Forms.model.currentElement;
			if (!event.altKey && !event.ctrlKey && !event.metaKey) {
				// Simulate tab w/ the Enter key
				if (event.keyCode === 13)
					setFocusOnNext(focusElement.get(0));

				// Delete
				else if (!$currentElement.isPlaceholder() && $currentElement.canMove() && event.keyCode === 46)
					deleteElement();

				// Arrow keys
				else if (event.keyCode === 38 || event.keyCode === 40 || event.keyCode === 37 || event.keyCode === 39) {
					var nextElement = getNextElement(event.keyCode);

					if (nextElement)
						nextElement.focus();
				}
			}
			else if (event.ctrlKey) {
				if ((focusElement.hasClass("c-forms-layout-field") || focusElement.hasClass("c-forms-layout-section")) && $currentElement.canMove()) {
					// Ctrl+Cut
					if (event.keyCode === 88)
						cutElement();
					// Ctrl+Copy
					else if (event.keyCode === 67)
						copyElement();
				}
				else if ($currentElement.isPlaceholder()) {
					// Ctrl+Paste
					if (event.keyCode === 86 && cutCopyElement) {
						if (canPaste(cutCopyElement, currentElement))
							pasteElement(cutCopyElement, null, currentElement, false);
					}
				}
			}
		}
		// Choice - tab to the next textbox when the Enter Key is pressed
		else if (focusElement.is(".c-forms-settings-choice input[type=text]") && !event.altKey && !event.ctrlKey && !event.metaKey && event.keyCode === 13) {
			var $rows = $(".c-forms-settings-choice");
			var $row = focusElement.closest(".c-forms-settings-choice");
			var $table = $row.closest("table");
			var rowIndex = $row.index();
			var colIndex = focusElement.closest("td").index();
			document.activeElement.blur();
			if ($row.is(":last-child")) {
				$(currentElement).get_field().get_Choices().add(new Cognito.Choice());
			}
			setFocus($table.find("tbody tr:nth-child(" + (rowIndex + 2) + ") td:nth-child(" + (colIndex + 1) + ") input")[0]);
		}
		// Page Break Page Titles - tab to the next textbox when the Enter Key is pressed
		else if (focusElement.hasClass("c-forms-settings-page-title") && !event.altKey && !event.ctrlKey && !event.metaKey && event.keyCode === 13) {
			var inputs = $(".c-forms-settings-page-title:visible").toArray();
			var index = inputs.indexOf(focusElement.get(0)) + 1;
			if (index <= inputs.length)
				setFocus(inputs[index]);
		}
		// RatingScale Questions - tab to the next textbox when the Enter Key is pressed, if the focus element is the last textbox then create a new input
		else if (focusElement.hasClass("c-forms-settings-ratingScale-question-text") && !event.altKey && !event.ctrlKey && !event.metaKey && event.keyCode === 13) {
			var inputs = $(".c-forms-settings-ratingScale-question-text").toArray();
			var index = inputs.indexOf(focusElement.get(0)) + 1;
			if (index === inputs.length) {
				// Using as setTimeout to allow the binding on the Name/Label to occur before a new question is added
				window.setTimeout(function () {
					var childType = $(currentElement).get_field().get_ChildType();
					var newQuestion = createRatingScaleQuestion(childType);
					childType.get_Fields().add(newQuestion);

					setFocus($(".c-forms-settings-ratingScale-question-text")[index]);

				});
			} else
				setFocus(inputs[index]);
		}
	});

	// Updates the page numbers of all page breaks and the corresponding markup
	function updatePageNumbers(addPageBreak) {
		var form = Cognito.Forms.model.currentForm;
		var pages = $(".c-forms-layout-pagebreak");

		form.set_isMultiPage(pages.length > 1);
		Cognito.Forms.model.pages = pages.length;

		var pageTitles = [];
		var page = 1;
		$(".c-forms-layout-pagebreak").each(function (index, item) {
			var pageBreak = $(item);
			if (page == 1 && pageBreak.get_showBackButton(false)) {
				pageBreak.set_showBackButton(false);
				pageBreak.html(renderElementBody(pageBreak, pageBreak.containingType(), [], null, elementTypes.PageBreak));
			}

			var displayPageNumbers = form.get_displayPageNumbersInFooter();
			pageBreak.find(".c-forms-page-number").text(displayPageNumbers && pages.length > 1 ? page + "/" + pages.length : "");

			pageBreak.set_pageNumber(page++);

			var regex = new RegExp("^" + Cognito.resources["progressbar-page-title"] + " \\d+$");
			if (!pageBreak.get_pageTitle() || regex.test(pageBreak.get_pageTitle()))
				pageBreak.set_pageTitle(Cognito.resources["progressbar-page-title"] + " " + pageBreak.get_pageNumber());

			pageTitles.push(new Cognito.Forms.PageTitle({ name: pageBreak.get_pageTitle(), number: parseInt(pageBreak.get_pageNumber()) }));

			// Default submit's page break back button settings
			if (addPageBreak && index === 1 && pages.length === 2) {
				pageBreak.set_showBackButton(true);
				// Refresh Submission Page Break
				window.setTimeout(function () {
					pageBreak.html(renderElementBody(pageBreak, pageBreak.containingType(), [], pageBreak.get_field(), pageBreak.elementType()));
				}, 100);
			}
		});

		ExoWeb.updateArray(form.get_pageTitles(), pageTitles);
	}
	Cognito.Forms.updatePageNumbers = updatePageNumbers;

	// Refreshed the html markup of an element to reflect changes to properties
	var pendingRefresh = false;

	Cognito.refreshElement = function (element) {
		var elementType = element.elementType();
		if (elementType != elementTypes.Section && elementType != elementTypes.RepeatingSection && elementType != elementTypes.Table) {
			if ($(element).isTableColumn())
				element.html(renderTableField($(element).get_field(), $(element).parentElement().get_field()));
			else
				element.html(renderElementBody(element, element.containingType(), [], element.get_field(), elementType));
		}
		if (elementType == elementTypes.PageBreak)
			updatePageNumbers();
	};

	function refreshElement(sender, args) {
		if (args && ["showErrorPreview", "visiblePreview"].indexOf(args.get_propertyName()) !== -1)
			return;

		Cognito.Forms.model.currentForm.set_HasChanges(true);

		// Exit early if the property change notification was triggered by changes to properties that are not editable through the field settings section.
		// This is to avoid refreshing an element that may not be in a consistent state due to cut/copy operations or a rename.
		if (args && (args.get_propertyName() === "Name" || args.get_propertyName() === "InternalName" || args.get_propertyName() === "Index" || args.get_propertyName() === "isNew" || args.get_propertyName() === "ChildType"))
			return;

		if (pendingRefresh || !Cognito.Forms.model.currentElement || Cognito.Forms.model.currentElement.isPlaceholder())
			return;

		pendingRefresh = true;

		var element = Cognito.Forms.model.currentElement;

		window.setTimeout(function () {
			if (!pendingRefresh || !Cognito.Forms.model.currentElement)
				return;

			pendingRefresh = false;

			Cognito.refreshElement(element);
		}, 100);
	}

	//#endregion

	// #region Payment

	var paymentInstructionsDialog;

	$(document)

		// Add Payment Account
		.on("click", ".c-forms-payment-add-account", function () {
			editPaymentAccount(false);
		})

		// Edit Payment Account
		.on("click", ".c-forms-payment-edit-account", function () {
			editPaymentAccount(false);
		})

		// Add transaction fee
		.on("click", ".c-forms-settings-payment-fee-add", function (event) {
			// Using a setTimeout to allow the binding on the Description to occur before a new fee is added
			var that = this;

			window.setTimeout(function () {
				var form = Cognito.Forms.model.currentForm;
				var target = $(that).closest("div");

				var index = form.get_TransactionFees().length;
				form.get_TransactionFees().insert(index + 1, new Cognito.Payment.TransactionFee({ FixedAmount: null, PercentageAmount: null }));

				// Find the element to restore focus since this/that is no longer the correct element due to Exo binding/rendering
				$($(".c-forms-settings-payment-choice-editor div")[index]).find(".c-forms-settings-payment-fee-add").focus();
			});
		})

		// Remove transaction fee
		.on("click", ".c-forms-settings-payment-fee-remove", function (event) {
			var form = Cognito.Forms.model.currentForm;
			var targetDIV = $(this).closest("div");
			var targetFee = $parentContextData(this);

			if (form.get_TransactionFees().length > 1)
				form.get_TransactionFees().remove(targetFee);
		});

	// Renders the payment section on the builder
	function renderPayment() {

		var parentElement = $("#c-forms-payment-order");

		// reset visibility of the payment sections
		$("#c-forms-payment-ad").hide();
		parentElement.hide();
		parentElement.html("");

		var form = Cognito.Forms.model.currentForm;
		var paymentMarkup = "";
		if (form) {

			var showDetails = form.get_PaymentAccount() || form.get_ShowSubTotal() || form.get_ShowLineItems();
			var requirePayment = form.get_RequirePayment() !== null && form.get_RequirePayment() !== "false";
			var displayCreditCardAuthHeader = form.get_saveCustomerCardEnabled() && (!requirePayment || !form.get_PaymentEnabled());
			paymentMarkup += "<div class='c-forms-payment-label'><label>" + (displayCreditCardAuthHeader ? Cognito.resources["credit-card-authorization"] : Cognito.resources["payment"]) + "</label></div>";

			paymentMarkup += showDetails ? "<div class='c-payment-section'>" : "<div class='c-payment-section c-payment-no-details'>";
			paymentMarkup += "<div class='c-forms-payment-left'>";

			if (form.get_PaymentAccount() && form.get_PaymentAccount().get_ProcessorName() !== "PayPal") {
				paymentMarkup += "<div style='width: 100%;' class='c-editor c-forms-layout-element-part'><div class='c-forms-layout-control c-forms-layout-watermark'><i class='icon-credit-card'></i> " + Cognito.resources["credit-card-number"] + "</div></div>";

				var width = 50;
				if (form.get_PaymentAccount() && form.get_PaymentAccount().get_ProcessorName() === "Square") {
					width = 33.3;
				}

				paymentMarkup += "<div style='width: " + width + "%;' class='c-editor c-forms-layout-element-part'><div class='c-forms-layout-control c-forms-layout-watermark'><i class='icon-calendar'></i> " + Cognito.resources["credit-card-expiration"] + "</div></div>";
				paymentMarkup += "<div style='width: " + width + "%;' class='c-editor c-forms-layout-element-part'><div class='c-forms-layout-control c-forms-layout-watermark'><i class='icon-lock'></i> " + Cognito.resources["credit-card-cvv"] + "</div></div>";

				if (form.get_PaymentAccount() && form.get_PaymentAccount().get_ProcessorName() === "Square") {
					paymentMarkup += "<div style='width: " + width + "%;' class='c-editor c-forms-layout-element-part'><div class='c-forms-layout-control c-forms-layout-watermark'><i class='icon-map-marker'></i> " + Cognito.resources["credit-card-postalcode"] + "</div></div>";
				}

				//  Add "Card on File Agreement" Checkbox
				if (form.get_saveCustomerCardEnabled()) {
					paymentMarkup += "<div class='c-field' style='padding-left:0px;'>";
					paymentMarkup += "<div class='c-editor c-yesno-checkbox'>";
					paymentMarkup += "<label for='c-card-on-file-agreement'><input id='c-card-on-file-agreement' type='checkbox' /><span>" + Cognito.resources["card-on-file-agreement"] + "</span></label>";
					paymentMarkup += "</div>";
					paymentMarkup += "</div>";
				}
			}

			paymentMarkup += "</div>";

			if (form.get_PaymentEnabled()) {
				paymentMarkup += (form.get_PaymentAccount() !== null && form.get_PaymentAccount().get_ProcessorName() !== "PayPal" ? "<div class='c-forms-payment-right'><table class='c-order-summary'>" : "<div class='c-forms-payment-right c-order-noaccount'><table class='c-order-summary'>");

				if (form.get_ShowLineItems()) {
					paymentMarkup += form.get_ShowSubTotal() ? "<tbody class='c-line-item-container'>" : "<tbody>";
					paymentMarkup += "<tr class='c-editor c-order-item c-line-item'><td>Line Item</td><td>" + Number.parseLocale("0").localeFormat("C") + "</td></tr></tbody>"
				}

				if (form.get_ShowSubTotal()) {
					paymentMarkup += "<tfoot><tr class='c-editor c-order-item c-subtotal'><td>" + Cognito.resources["payment-subtotal"] + ":</td><td>" + Number.parseLocale("0").localeFormat("C") + "</td></tr>";

					var ndx = 1;
					Array.forEach(Cognito.Forms.model.currentForm.get_TransactionFees(), function (fee) {
						if (fee.get_FixedAmount() || fee.get_PercentageAmount()) {
							if (!fee.get_Description()) {
								fee.set_Description(Cognito.resources["additional-fee-default-label"] + " " + ndx);
							}
							var feeAmt = fee.get_FixedAmount() && fee.get_FixedAmount() > 0 && (!fee.get_PercentageAmount() || fee.get_PercentageAmount() <= 0) ? fee.get_FixedAmount() : 0;
							paymentMarkup += "<tr class='c-editor c-order-item c-additional-fee'><td>" + fee.get_Description() + ":</td><td>" + feeAmt.localeFormat("C") + "</td></tr>"
						}
						ndx++;
					});

					if (form.get_IncludeProcessingFees()) {
						var feeDesc = form.get_ProcessingFeeItemDesc() && form.get_ProcessingFeeItemDesc() !== "" ? form.get_ProcessingFeeItemDesc() : Cognito.resources["payment-processing-fees"];
						paymentMarkup += "<tr class='c-editor c-order-item c-processing-fee'><td>" + feeDesc + ":</td><td>" + Number.parseLocale("0").localeFormat("C") + "</td></tr>"
					}
				}

				paymentMarkup += "</tfoot></table></div></div>";
				paymentMarkup += "<div class='c-forms-payment-total-amount'>" + Cognito.resources["payment-amount-due"] + ": " + Number.parseLocale("0").localeFormat("C") + "</div>"
			}
		}

		parentElement.append(paymentMarkup);
		parentElement.show();
		showHidePaymentBlock();
	}

	function showHidePaymentBlock(paymentSettingsSelected) {
		// This check is necessary to handle the situation (selectPaymentSettings) where the payment block needs to be render before the CSS class 'c-forms-layout-element-selected' is added in repositionSettings
		paymentSettingsSelected = paymentSettingsSelected || $(".c-forms-payment").hasClass("c-forms-layout-element-selected");

		var form = Cognito.Forms.model.currentForm;
		var paymentAccount = Cognito.Forms.model.currentForm.get_PaymentAccount();
		var paymentEnabled = form.get_PaymentEnabled();
		var saveCustomerCardEnabled = form.get_saveCustomerCardEnabled();
		var saveCustomerCardConfigured = saveCustomerCardEnabled && form.get_BillingEmailField() != null; 

		// Payment Settings Selected
		if (paymentSettingsSelected) {

			if (paymentEnabled || (paymentAccount && saveCustomerCardEnabled)) {
				$("#c-forms-payment").show();
			}
			else {
				// Hide Payment Block
				$("#c-forms-payment-order").hide();

				// Show Payment Ad
				$("#c-forms-payment-ad").show();

				// Show Payment Section
				$("#c-forms-payment").show();

				if (paymentAccount) {
					// Show no payment fields (fields collecting payment) messaging
					$("#c-forms-payment-ad .c-forms-payment-off").hide();
					$("#c-forms-payment-ad .c-forms-payment-no-field").show();
				} else {
					// Show collecting payment messaging 
					$("#c-forms-payment-ad .c-forms-payment-off").show();
					$("#c-forms-payment-ad .c-forms-payment-no-field").hide();
				}
			}
		}
		else {

			if (paymentEnabled || (paymentAccount && saveCustomerCardConfigured)) {
				$("#c-forms-payment").show();
			}
			else {
				$("#c-forms-payment").hide();
			}
		}
	}

	// Open the payment settings dialog to manage the payment account associated with the form
	function editPaymentAccount(setFocusToPaymentEl) {
		var form = Cognito.Forms.model.currentForm;
		var cancelFn = function () { };

		if (setFocusToPaymentEl) {
			cancelFn = function () {
				renderPayment();
			};
		}

		if (Cognito.config.paymentAvailable) {
			Cognito.openPaymentSettings(form.get_PaymentAccount(), function (data) {
				Cognito.Forms.model.currentForm.set_HasChanges(true);
				var paymentAccountRef = data === null ? null : Cognito.deserialize(Cognito.Payment.PaymentAccountRef, data);
				var defaultProcessingFees = !form.get_PaymentAccount() && paymentAccountRef;

				// set the payment account ref on the form
				form.set_PaymentAccount(paymentAccountRef);

				// if the payment account was set, make sure that the name and default currency values are up to date
				// and that the include processing fees are check/unchecked based on the currency values of the form and payment account
				if (form.get_PaymentAccount()) {
					form.get_PaymentAccount().set_Name(data.Name);
					if (data.DefaultCurrency) {
						form.get_PaymentAccount().set_defaultCurrency(Cognito.deserialize(Cognito.Currency, { Id: "Currency::" + data.DefaultCurrency }));
					}
					form.get_PaymentAccount().set_canIncludeProcessingFees(data.CanIncludeProcessingFees);
					form.get_PaymentAccount().set_canSaveSquareCustomerCard(data.CanSaveSquareCustomerCard);

					// SaveCustomerCard is not supported on PayPal
					if (form.get_PaymentAccount().get_ProcessorName() === "PayPal")
						form.set_SaveCustomerCard("false");
				}

				// if the form did not previously have a payment account, but one is specified from the dialog
				// then assume we need to default the processing fees option.
				if (defaultProcessingFees) {
					// set the default values for the processing fees and subtotal options
					form.set_IncludeProcessingFees(form.get_showProcessingFees());

					// if the form is set to Never require payment, then default it to Always when the payment account is set
					// otherwise, leave the setting untouched
					if (form.get_RequirePayment() === "false") {
						form.set_RequirePayment("true");
					}
				}

				ensureIncludeProcessingFees();

			}, cancelFn, function (data) {
				var paymentAccountRef = data === null ? null : Cognito.deserialize(Cognito.Payment.PaymentAccountRef, data);

				if (paymentAccountRef === form.get_PaymentAccount()) {
					form.set_PaymentAccount(null);
					Cognito.Forms.model.currentForm.set_HasChanges(true);
				}
			});
		}

		if (setFocusToPaymentEl) {
			selectPaymentSettings();
		}
	}

	// Setup the payment settings section and highlight the payment element on the builder
	function selectPaymentSettings() {
		var form = Cognito.Forms.model.currentForm;

		ensureProcessorIcon(form.get_PaymentAccount());

		// Hide the toolbar
		hideToolbar();

		// Ensure there is a transaction fee "placeholder"
		if (form.get_TransactionFees().length == 0) {
			form.get_TransactionFees().add(new Cognito.Payment.TransactionFee({ FixedAmount: null, PercentageAmount: null }));
		}

		showHidePaymentBlock(true);

		// Reposition the payment settings form
		repositionSettings($(".c-forms-payment")[0]);
	}

	function ensureIncludeProcessingFees() {
		var form = Cognito.Forms.model.currentForm;

		// if the payment account is not specified on the form,
		// the currencies don't match,
		// or the form is not set to show processing fees
		//ensure include processing fees is false
		if (!form.get_PaymentAccount() || !form.get_showProcessingFees()) {
			form.set_IncludeProcessingFees(false);
		}
	}

	function ensureProcessorIcon(paymentAccount) {
		$(".c-forms-payment-account-name .c-processor-icon i").removeClass();

		// Adjust the processor icon
		if (paymentAccount) {
			$(".c-forms-payment-account-name .c-processor-icon i").addClass("icon-" + paymentAccount.get_ProcessorName().toLowerCase());
		}
	}

	// #endregion

	//#region Email Notifications

	// Feature Not Available Warnings
	var emailNotificationWarning = createFeatureWarning("Multiple Notification Emails", "Upgrade to send more than one notification email.", "emailrouting");
	var emailConfirmationWarning = createFeatureWarning("Multiple Confirmation Emails", "Upgrade to send more than one confirmation email.", "emailrouting");

	var emailRegex = /([a-zA-Z0-9\!\#\$\%\&\'\*\+\-\/\=\?\^_\`\{\|\}\~]+(\.[a-zA-Z0-9\!\#\$\%\&\'\*\+\-\/\=\?\^_\`\{\|\}\~]+)*@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,20}|([0-9]{1,3}(\.[0-9]{1,3}){3})))/g;



	$extend("Cognito.Forms.Form", function (form) {

		// Current Notification
		form.meta.addProperty({ name: "emailNotification", type: Cognito.Forms.EntryEmailNotification });

		// Notification Subject
		form.meta.addProperty({ name: "notificationSubject", type: String })
			.calculated({
				calculate: function () {
					if (!this.get_emailNotification())
						return "";
					else if (!this.get_emailNotification().get_Subject() || this.get_emailNotification().get_Subject().trim() === "")
						return getDefaultEmailSubject(this, this.get_emailNotification().get_Type().get_Name());
					else
						return this.get_emailNotification().get_Subject();
				},
				onChangeOf: ["format", "emailNotification.Subject", "Name", "PaymentEnabled"]
			})
			.addChanged(function (sender, args) {
				if (!args.calculated && args.oldValue != "") {
					sender.get_emailNotification().set_Subject(args.newValue);
					if (args.newValue == "")
						sender.set_notificationSubject(getDefaultEmailSubject(sender, sender.get_emailNotification().get_Type().get_Name()));
				}
			});

		// Notification Formatted Subject
		form.meta.addProperty({ name: "notificationSubjectHtml", type: String })
			.calculated({
				calculate: function () {
					return Cognito.Forms.tokenizeHtml(this.get_notificationSubject() ? this.get_notificationSubject() : '');
				},
				onChangeOf: "emailNotification.Subject"
			});

		//Notification Formatted Message
		form.meta.addProperty({ name: "notificationBodyHtml", type: String })
			.calculated({
				calculate: function () {
					return Cognito.Forms.tokenizeHtml(this.get_emailNotification() && this.get_emailNotification().get_Body() ? this.get_emailNotification().get_Body() : '');
				},
				onChangeOf: "emailNotification.Body"
			});

		// Email Notification Count
		form.meta.addProperty({ name: "emailNotificationCount", type: Number })
			.calculated({
				calculate: function () {
					var count = 0;
					var notifications = this.get_Notifications();
					for (var n = notifications.length - 1; n >= 0; n--) {
						if (notifications[n].get_Type && notifications[n].get_Type().get_Name() == "Notification")
							count++;
					}
					return count;
				},
				onChangeOf: "Notifications"
			})
			.errorIf({
				isValid: function (form) {
					return Cognito.config.allowEmailRouting || form.get_emailNotificationCount() <= 1;
				},
				conditionType: emailNotificationWarning
			});

		// Email Confirmation Count
		form.meta.addProperty({ name: "emailConfirmationCount", type: Number })
			.calculated({
				calculate: function () {
					var count = 0;
					var notifications = this.get_Notifications();
					for (var n = notifications.length - 1; n >= 0; n--) {
						if (notifications[n].get_Type && notifications[n].get_Type().get_Name() == "Confirmation")
							count++;
					}
					return count;
				},
				onChangeOf: "Notifications"
			})
			.errorIf({
				isValid: function (form) {
					return Cognito.config.allowEmailRouting || form.get_emailConfirmationCount() <= 1;
				},
				conditionType: emailConfirmationWarning
			});

		// Clear out the reply to address if it is set to an invalid value
		form.meta.addRule({
			execute: function (sender, args) {
				var notification = sender.get_emailNotification();
				if (notification && notification.get_Type().get_Name() == "Confirmation") {
					sender = notification.get_Sender();
					if (sender && sender.get_Address()) {
						if (!sender.get_Address().match(emailRegex))
							sender.set_Address(null);
					}
				}
			},
			onChangeOf: ["emailNotification.Sender.Address"]
		});

		// Default IncludeReceipt when PaymentEnabled changes
		form.meta.addRule({
			execute: function (sender, args) {
				var notifications = sender.get_Notifications();
				for (var n = notifications.length - 1; n >= 0; n--) {
					if (notifications[n] instanceof Cognito.Forms.EntryEmailNotification)
						notifications[n].set_IncludeReceipt(sender.get_PaymentEnabled());
				}
			},
			onChangeOf: ["PaymentEnabled"]
		});

		// Automatically add notifications when enabling for the first time
		form.$EnableEmailNotifications.addChanged(function (sender, args) {
			if (sender.get_emailNotificationCount() == 0) {
				if (sender.get_EnableEmailNotifications())
					addEmailNotification("Notification");
				else if ($(".c-email-notifications").is(":visible")) {
					$(".c-email-notifications").slideUp(500);
					$(".c-email-notifications").prev().addClass("c-collapsed");
				}
			}

		});

		// Automatically add notifications when enabling for the first time
		form.$EnableEmailConfirmations.addChanged(function (sender, args) {
			if (sender.get_emailConfirmationCount() == 0) {
				if (sender.get_EnableEmailConfirmations())
					addEmailNotification("Confirmation");
				else if ($(".c-email-confirmations").is(":visible")) {
					$(".c-email-confirmations").slideUp(500);
					$(".c-email-confirmations").prev().addClass("c-collapsed");
				}
			}
		});

	});

	$extend("Cognito.Notification", function (notification) {

		// Form
		notification.meta.addProperty({ name: "form", type: Cognito.Forms.Form })
			.calculated({
				calculate: function () {
					return Cognito.Forms.model.currentForm;
				}
			});

		// Has Errors
		notification.meta.addProperty({ name: "hasErrors", type: Boolean });

		// Update Has Errors
		notification.meta.addConditionsChanged(function (sender, args) {
			args.conditionTarget.target.set_hasErrors(sender.conditions().length > 0);
		});

		// CSS Class
		notification.meta.addProperty({ name: "cssClass", type: String })
			.calculated({
				calculate: function () {
					return this.get_hasErrors() ? "c-forms-notification c-error" : "c-forms-notification";
				},
				onChangeOf: "hasErrors"
			});
	});

	$extend("Cognito.Forms.EntryEmailNotification", function (notification) {

		// Form
		notification.meta.addProperty({ name: "form", type: Cognito.Forms.Form })
			.calculated({
				calculate: function () {
					return Cognito.Forms.model.currentForm;
				}
			});

		// Notification From
		notification.meta.addProperty({ name: "notificationFrom", type: String }).label("From")
			.calculated({
				calculate: function () {
					if (this.get_Sender() && this.get_Sender().get_Address())
						return this.get_Sender().get_Address();

					return "";
				},
				onChangeOf: "Sender.Address"
			})
			.optionValues("form.emailPaths")
			.addChanged(function (sender, args) {
				if (!args.calculated)
					sender.set_Sender(new Cognito.NotificationAddress({ Address: args.newValue }));
			});

		// Notification To
		notification.meta.addProperty({ name: "notificationTo", type: String })
			.label("To")
			.calculated({
				calculate: function () {
					var recipients = [];
					this.get_Recipients().forEach(function (recipient) {
						recipients.push(recipient.get_Address());
					});
					return recipients.join("; ");
				},
				onChangeOf: "Recipients.Address"
			})
			.addChanged(function (sender, args) {
				if (!args.calculated) {
					var recipientCount = sender.get_Recipients().length;

					sender.get_Recipients().clear();

					if (args.newValue) {
						(args.newValue.match(emailRegex) || []).forEach(function (recipient) {
							sender.get_Recipients().add(new Cognito.NotificationAddress({ Address: recipient }));
						});
					}

					if (recipientCount === 0 && sender.get_Recipients().length == 0) {
						sender.set_notificationTo("");
					}
				}
			});

		// Confirmation To
		notification.meta.addProperty({ name: "confirmationTo", type: String }).label("To")
			.calculated({
				calculate: function () {

					if (this.get_Recipients().length > 0)
						return this.get_Recipients()[0].get_Address();
					else
						return null;
				},
				onChangeOf: "Recipients.Address"
			})
			.optionValues("form.emailPaths")
			.addChanged(function (sender, args) {
				if (!args.calculated) {

					if (sender.get_Recipients().length === 0)
						sender.get_Recipients().add(new Cognito.NotificationAddress());

					sender.get_Recipients()[0].set_Address(args.newValue || "");

					if (args.oldValue && !args.newValue)
						$("#edit-notification-dialog .c-validation").show();
				}
			});

        // Confirmation From Required
        notification.meta.conditionIf({
            assert: function () {
                return this.get_Type().get_Name() == "Confirmation" && this.get_Sender().get_Address() && this.get_Sender().get_Address().trim().match("[;, ]+") !== null;
            },
            message: "Only one email address can be specified as the From address.",
            properties: ["Sender", "Sender.Address"],
            onChangeOf: "Sender.Address"
        });

		// Confirmation To Required
		notification.meta.conditionIf({
			assert: function () {
				return this.get_Type().get_Name() != "SaveAndResume" && this.get_Type().get_Name() != "SharedEntry" && (this.get_Recipients().length == 0 || !(this.get_Recipients()[0].get_Address() || "").trim());
			},
			message: "To is required.",
			properties: ["Recipients", "Recipients.Address"],
			onChangeOf: "Recipients.Address"
		});

		// notificationSubjectHtml
		notification.meta.addProperty({ name: "subject", type: String })
			.calculated({
				calculate: function () {
					return this.get_Subject() || getDefaultEmailSubject(Cognito.Forms.model.currentForm, this.get_Type().get_Name());
				},
				onChangeOf: "{ Subject, form { format, emailNotification, Name, PaymentEnabled } }"
			});

		// UI property to represent the 'Send When Submitted' radio buttons
		notification.meta.addProperty({ name: "sendWhenSubmitted", type: String }).calculated({
			calculate: function () {
				var requiredExpr = this.get_SendWhenSubmitted();
				if (requiredExpr == "true")
					return "Always";
				else if (requiredExpr == "false")
					return "Never";
				else
					return "When";
			},
			onChangeOf: "SendWhenSubmitted"
		}).allowedValues(function () {
			return ["Always", "When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			var oldValue = args.oldValue || "true";
			if (args.newValue == "Always")
				sender.set_SendWhenSubmitted("true");
			else if (args.newValue == "Never")
				sender.set_SendWhenSubmitted("false");
			else {
				sender.set_SendWhenSubmitted(null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);
				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "Send When Submitted", "Send When Submitted...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {

					// Clear any conditions prior to opening the builder
					var condition = sender.meta.getCondition({ code: "Notifications.SendWhenSubmitted" });
					if (condition) {
						condition.condition.destroy();
					}

					if (newExpression === "")
						sender.set_sendWhenSubmitted(oldValue);
					else
						sender.set_SendWhenSubmitted(newExpression);
				},
					function () {
						sender.set_sendWhenSubmitted(oldValue);
					});
			}
		});

		// UI property to show a preview of the send when submitted expression (if possible)
		notification.meta.addProperty({ name: "sendWhenSubmittedPreview", type: String }).calculated({
			calculate: function () {
				var sendWhenSubmittedExpression = this.get_SendWhenSubmitted();
				var that = this;

				// Only important if required is an non-empty/null expression
				if (this.get_sendWhenSubmitted() != "When" || sendWhenSubmittedExpression == "" || sendWhenSubmittedExpression == null)
					return null;

				// Try to create required preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, "", sendWhenSubmittedExpression, function (preview) {

					that.set_sendWhenSubmittedPreview(preview);
				});
			},
			onChangeOf: ["SendWhenSubmitted", "sendWhenSubmitted"]
		});

		// UI property to represent the 'Send When Updated' radio buttons
		notification.meta.addProperty({ name: "sendWhenUpdated", type: String }).calculated({
			calculate: function () {
				var requiredExpr = this.get_SendWhenUpdated();
				if (requiredExpr == "true")
					return "Always";
				else if (requiredExpr == "false")
					return "Never";
				else
					return "When";
			},
			onChangeOf: "SendWhenUpdated"
		}).allowedValues(function () {
			return ["Always", "When", "Never"];
		}).addChanged(function (sender, args) {
			// Ignore first time initialization
			if (args.calculated)
				return;

			var oldValue = args.oldValue || "false";
			if (args.newValue == "Always")
				sender.set_SendWhenUpdated("true");
			else if (args.newValue == "Never")
				sender.set_SendWhenUpdated("false");
			else {
				sender.set_SendWhenUpdated(null);

				// Open expression builder with null expression and containing type
				Cognito.Forms.updateViewDefinition(false);

				Cognito.openExpressionBuilder(Cognito.Forms.model.currentForm, "", "Send When Updated", "Send When Updated...", "YesNo", "YesNo", null, Cognito.Forms.model.currentForm.get_Localization(), function (newExpression) {

					// Clear any conditions prior to opening the builder
					var condition = sender.meta.getCondition({ code: "Notifications.SendWhenUpdated" });
					if (condition) {
						condition.condition.destroy();
					}

					if (newExpression === "")
						sender.set_sendWhenUpdated(oldValue);
					else
						sender.set_SendWhenUpdated(newExpression);
				},
					function () {
						sender.set_sendWhenUpdated(oldValue);
					});
			}
		});

		// UI property to show a preview of the send when updates expression (if possible)
		notification.meta.addProperty({ name: "sendWhenUpdatedPreview", type: String }).calculated({
			calculate: function () {
				var sendWhenUpdatedExpression = this.get_SendWhenUpdated();
				var that = this;

				// Only important if required is an non-empty/null expression
				if (this.get_sendWhenUpdated() != "When" || sendWhenUpdatedExpression == "" || sendWhenUpdatedExpression == null)
					return null;

				// Try to create required preview
				Cognito.Forms.updateViewDefinition(false);
				Cognito.getExpressionBuilderPreview(Cognito.Forms.model.currentForm, "", sendWhenUpdatedExpression, function (preview) {

					that.set_sendWhenUpdatedPreview(preview);
				});
			},
			onChangeOf: ["SendWhenUpdated", "sendWhenUpdated"]
		});

		// UI property to show a preview of the send when conditions
		notification.meta.addProperty({ name: "sendWhenPreview", type: String }).calculated({
			calculate: function () {
				var preview =
					this.get_sendWhenSubmitted() == "Never" && this.get_sendWhenUpdated() == "Never" ? "Never" :
						(this.get_sendWhenSubmitted() == "Always" ? "Submitted" : this.get_sendWhenSubmitted() == "Never" ? "" : "Submitted and " + this.get_sendWhenSubmittedPreview()) +
						(this.get_sendWhenSubmitted() != "Never" && this.get_sendWhenUpdated() != "Never" ? " or " : "") +
						(this.get_sendWhenUpdated() == "Always" ? "Updated" : this.get_sendWhenUpdated() == "Never" ? "" : "Updated and " + this.get_sendWhenUpdatedPreview());
				return preview;
			},
			onChangeOf: ["sendWhenSubmitted", "sendWhenUpdated", "sendWhenUpdatedPreview", "sendWhenSubmittedPreview"]
		});

		// subjectHtml
		notification.meta.addProperty({ name: "subjectHtml", type: String })
			.calculated({
				calculate: function () {
					return Cognito.Forms.tokenizeHtml(this.get_subject() ? this.get_subject() : '');
				},
				onChangeOf: "subject"
			});

		// Include Attachments Feature Warning
		notification.$IncludeAttachments.errorIf({
			isValid: function (notification) {
				var isValid = Cognito.config.allowAttachments || !notification.get_IncludeAttachments();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						notification.set_IncludeAttachments(false);
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Include Entry Attachments", "Pro Feature: Upgrade to re-enable file attachments.", "fileattachments")
		});


		// Include Document Attachments Feature Warning
		notification.$IncludeDocumentAttachments.errorIf({
			isValid: function (notification) {
				var isValid = Cognito.config.allowAttachments || !notification.get_IncludeDocumentAttachments();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						notification.set_IncludeDocumentAttachments(false);
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Attach Documents", "Pro Feature: Upgrade to re-enable file attachments.", "fileattachments")
		});

		// Include Entry Sharing Feature Warning
		notification.$IncludeEditLink.errorIf({
			isValid: function (notification) {
				var isValid = Cognito.config.allowEntrySharing || !notification.get_IncludeEditLink();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						notification.set_IncludeEditLink(false);
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Include Edit Link", "Pro Feature: Upgrade to re-enable entry sharing.", "entrysharing")
		});

		// Include Entry Sharing Feature Warning
		notification.$IncludeViewLink.errorIf({
			isValid: function (notification) {
				var isValid = Cognito.config.allowEntrySharing || !notification.get_IncludeViewLink();
				if (!isValid && builderInitialized) {
					window.setTimeout(function () {
						notification.set_IncludeViewLink(false);
					}, 0);
				}
				return isValid;
			},
			conditionType: createFeatureWarning("Include View Link", "Pro Feature: Upgrade to re-enable entry sharing.", "entrysharing")
		});
	});

	// UI Events
	$("#c-forms-settings")

		// Edit notifications/confirmations
		.on("click", ".c-forms-notification", function (event) {
			if ($(event.target).closest(".c-forms-notification-delete").length == 0)
				editEmailNotification($parentContextData(this), true);
		})

		// Add notifications/confirmations
		.on("click", ".c-forms-notification-add", function (event) {
			addEmailNotification($(this).attr("data-type"));
		})

		// Delete notifications/confirmations
		.on("click", ".c-forms-notification-delete", function (event) {
			deleteEmailNotification($parentContextData(this));
		});

	// Open expression builder for send when submitted condition
	$(document).on("click", ".c-forms-notification-send-when-submitted .c-predicate-expression, .c-forms-notification-send-when-submitted .c-validation-message, .c-forms-notification-send-when-submitted .c-expression-builder-open", function (event) {
		event.stopPropagation();

		var form = Cognito.Forms.model.currentForm;
		var notification = form.get_emailNotification();

		// Open expression builder with send when submitted expression and containing type
		Cognito.Forms.updateViewDefinition(false);
		Cognito.openExpressionBuilder(form, "", "Send When Submitted", "Send When Submitted...", "YesNo", "YesNo", notification.get_SendWhenSubmitted(), form.get_Localization(), function (newExpression) {

			// Clear any conditions prior to opening the builder
			var condition = notification.meta.getCondition({ code: "Notifications.SendWhenSubmitted" });
			if (condition) {
				condition.condition.destroy();
			}

			if (newExpression === "")
				notification.set_sendWhenSubmitted("Always");
			else
				notification.set_SendWhenSubmitted(newExpression);

		});
	});

	// Open expression builder for send when updated condition
	$(document).on("click", ".c-forms-notification-send-when-updated .c-predicate-expression, .c-forms-notification-send-when-updated .c-validation-message, .c-forms-notification-send-when-updated .c-expression-builder-open", function (event) {
		event.stopPropagation();

		var form = Cognito.Forms.model.currentForm;
		var notification = form.get_emailNotification();

		// Open expression builder with send when updated expression and containing type
		Cognito.Forms.updateViewDefinition(false);
		Cognito.openExpressionBuilder(form, "", "Send When Updated", "Send When Updated...", "YesNo", "YesNo", notification.get_SendWhenUpdated(), form.get_Localization(), function (newExpression) {

			// Clear any conditions prior to opening the builder
			var condition = notification.meta.getCondition({ code: "Notifications.SendWhenUpdated" });
			if (condition) {
				condition.condition.destroy();
			}

			if (newExpression === "")
				notification.set_sendWhenUpdated("Never");
			else
				notification.set_SendWhenUpdated(newExpression);

		});
	});

	// Notification Functions
	function getDefaultEmailSubject(form, type) {
		if (type == "Notification")
			return form.get_format();
		else if (type == "Confirmation")
			return form.get_Name() + (form.get_PaymentEnabled() ? " - [Order.Id]" : "");
		else if (type == "SaveAndResume")
			return form.get_Name() + " " + Cognito.resources["save-and-resume-email-subject"];
		else if (type == "SharedEntry")
			return form.get_Name() + " " + Cognito.resources["shared-entry-email-subject"];
	}

	var editNotification = $.fn.dialog({
		title: 'Edit Notification',
		contentSelector: '#edit-notification-dialog',
		height: 600,
		width: 800,
		checkpoint: true,
		cancel: function () {
			if (notificationBeingAdded) {
				deleteEmailNotification(notificationBeingAdded);
				notificationBeingAdded = null;
			}
		},
		buttons: [
			{
				label: "Cancel",
				isCancel: true
			},
			{
				label: "Save",
				isDefault: false,
				autoClose: false,
				click: function () {
					var validationElements = $("#edit-notification-dialog .c-validation");

					if (Cognito.Forms.model.currentForm.get_emailNotification().meta.conditions().length > 0) {
						validationElements.show();
						editNotification._dialog.find(".c-modal-button-executing").removeClass("c-modal-button-executing");
						return;
					} else {
						notificationBeingAdded = null;
						Cognito.Forms.model.currentForm.set_HasChanges(true);
						this.close();
					}
				}
			}
		]
	});
	editNotification._accelerators = {};

	// Add email notification
	var notificationBeingAdded = null;
	function addEmailNotification(type) {
		var form = Cognito.Forms.model.currentForm;

		// Create and add the new email notification
		var emailNotification = new Cognito.Forms.EntryEmailNotification({
			Type: Cognito.Forms.EmailNotificationType.get_All().filter(function (t) { return t.get_Name() === type; })[0],
			IncludeReceipt: form.get_PaymentEnabled(),
			IncludeOrgFormName: true,
			IncludeFormLogo: (type === "Confirmation"),
			Sender: new Cognito.NotificationAddress(),
			// Automatically include an admin link for new Notifications
			Body: type == "Notification" ? "<p>&nbsp;<a href=\"[Entry.AdminLink]\" target=\"_blank\">" + Cognito.resources["entry-email-view-details-text"] + "</a>&nbsp;</p>" : "",
			SendWhenSubmitted: "true",
			SendWhenUpdated: "false"
		});
		form.get_Notifications().add(emailNotification);

		// Remove the notification if not supported for the current plan
		if ((type == "Notification" && form.meta.getCondition(emailNotificationWarning)) || (type == "Confirmation" && form.meta.getCondition(emailConfirmationWarning)))
			form.get_Notifications().remove(emailNotification);

		// Otherwise, open the editor if the email notification was successfully added
		else {
			notificationBeingAdded = emailNotification;
			editEmailNotification(emailNotification);
		}
	}

	// Delete email notification
	function deleteEmailNotification(notification) {
		var form = Cognito.Forms.model.currentForm;
		var type = notification.get_Type().get_Name();
		form.get_Notifications().remove(notification);
		if (type == "Notification" && form.get_emailNotificationCount() == 0)
			form.set_EnableEmailNotifications(false);
		if (type == "Confirmation" && form.get_emailConfirmationCount() == 0)
			form.set_EnableEmailConfirmations(false);
		Cognito.Forms.model.currentForm.set_HasChanges(true);
	}

	// Edit email notification
	var currentNotification;
	function editEmailNotification(notification, showErrors) {
		currentNotification = notification;
		Cognito.Forms.model.currentForm.set_emailNotification(notification);
		var type = notification.get_Type().get_Name();
		editNotification._dialog.find(".c-modal-title").text((type == "SaveAndResume" ? "Save & Resume Email" : type == "SharedEntry" ? "Link Sharing Email Template" : type));

		if (type == "SaveAndResume") {
			editNotification._options.width = 400;
			editNotification._options.height = 650;
			$("#edit-notification-dialog").removeClass("c-span-2");
			$("#edit-notification-dialog").addClass("c-span-1");
			editNotification._dialog.find(".c-modal-buttons-left").hide();
		}
		else {
			editNotification._options.width = 800;
			$("#edit-notification-dialog").removeClass("c-span-1");
			$("#edit-notification-dialog").addClass("c-span-2");
			editNotification._dialog.find(".c-modal-buttons-left").show();
		}

		$("#edit-notification-dialog div").get(0).control.refresh();
		Cognito.initializeHtmlEditors();

		if (showErrors)
			$("#edit-notification-dialog .c-validation").show();

		editNotification.open();
	}

	function showHideEmailNotifications() {
		var hasNotificationConditions, hasConfirmationConditions = false;
		var notifications = Cognito.Forms.model.currentForm.get_Notifications();
		for (var i = 0; i < notifications.length; i++) {
			var notification = notifications[i];
			if (notification.get_hasErrors()) {
				if (notification.get_Type().get_Name() == "Notification")
					hasNotificationConditions = true;
				else
					hasConfirmationConditions = true;
			}
			if (hasNotificationConditions && hasConfirmationConditions)
				break;
		}

		if (hasNotificationConditions) {
			var $section = $(".c-forms-settings-notifications-section");
			$section.next().slideDown(500);
			$section.removeClass("c-collapsed");
		}

		if (hasConfirmationConditions) {
			var $section = $(".c-forms-settings-confirmations-section");
			$section.next().slideDown(500);
			$section.removeClass("c-collapsed");
		}
	}

	//#endregion

	// #region Submission Settings

	Cognito.Forms.getIsMultiPageForm = function (form) {
		return $(form.get_Views()[0].get_Definition()).find("pagebreak").length > 1;
	};

	Cognito.Forms.getIsPaymentForm = function (form) {
		return form && visitFields(form, function (field) { return field.get_IncludeOnInvoice(); });
	};

	$(function () {

		$(document.documentElement)
			.on("beforeSerializeModel", function (event) {
				if (event.modelNames.some(function (n) { return /^currentForm($|\.)/.test(n); })) {
					Cognito.Forms.updateViewDefinition();
				}
			})

			// Manage Document Templates
			.on("click", "a.c-forms-documents-manage", function (event) {

				event.stopPropagation();

				var currentForm = Cognito.Forms.model.currentForm;

				var isMultiPageForm = Cognito.Forms.getIsMultiPageForm(currentForm);
				var isPaymentForm = Cognito.Forms.getIsPaymentForm(currentForm);

				Cognito.Forms.manageDocumentTemplates({
					autoSave: false,
					usePersistedData: false,
					isMultiPageForm: isMultiPageForm,
					isPaymentForm: isPaymentForm
				});
			});

	});

	// #endregion

	// #region Forms Navigation

	// Performs any additional logic before the form is saved
	function prepareForSave(callback) {
		var form = Cognito.Forms.model.currentForm;

		// Raise change on the InternalName property to force the property changed event handler to execute and correct
		// any incorrect ChildType.Name(s).
		// TODO: Remove temporary fix until a permanent fix can be implemented and tested (Refactor code to no longer require the renaming of ChildType.InternalName)
		var form = Cognito.Forms.model.currentForm;
		form.meta.property("InternalName").raiseChanged(form);

		Cognito.Forms.updateViewDefinition(true);

		// Ensure that all additional fees have a label
		var ndx = 1;
		Array.forEach(Cognito.Forms.model.currentForm.get_TransactionFees(), function (fee) {
			if (fee.get_FixedAmount() || fee.get_PercentageAmount()) {
				if (!fee.get_Description()) {
					fee.set_Description(Cognito.resources["additional-fee-default-label"] + " " + ndx);
				}
			}
			ndx++;
		});

		// Show a warning message if features have been disabled due to a plan downgrade
		if (featureWarnings.conditions.length > 0) {
			Cognito.showUnavailableFeatureWarning();
		}

		// Clear billing fields if "Map Billing Fields" is off
		if (!form.get_mapBillingFields()) {
			form.set_BillingNameField(null);
			form.set_BillingAddressField(null);
			form.set_BillingPhoneField(null);
			form.set_BillingEmailField(null);
		}

		var doPreparation = $.Deferred().resolve().promise();

		// Update SharePoint Notification
		if (form.get_EnableSendToSharePoint() || form.get_sharePointNotification())
			doPreparation = updateSharePointCredentials();	// returns a promise

		doPreparation
			.then(promptForFolderIfNeeded)
			.then(callback);
	}

	function promptForFolderIfNeeded() {
		var deferred = $.Deferred();
		if (!!Cognito.Forms.model.currentForm.get_Id())
			return deferred.resolve().promise();

		// get accessible folders from server, list in dialog for selection
		Cognito.Forms.getFolders(true, true, function (folders) {
			if (folders.length < 2) {
				if (folders.length === 1 && folders[0].get_Id() != 0)
					Cognito.Forms.model.currentForm.set_folderId(folders[0].get_Id());
				deferred.resolve();
			}
			else {
				// open dialog and save when it is closed
				Cognito.Forms.model.folders = folders;

				$.fn.dialog({
					title: "Save Location",
					templateName: "forms-folders-dialog",
					instance: "Cognito.Forms.model.folders",
					width: 450,
					height: 400,
					includeCloseButton: false,
					closeOnOverlayClick: false,
					closeOnEscape: false,
					buttons: [{
						label: "Done",
						click: function () {
							this.close(false);
							var folderId = $(this._dialog).find("select").val();
							if (folderId != 0)
								Cognito.Forms.model.currentForm.set_folderId(folderId);
							deferred.resolve();
						}
					}]
				}).open();
			}
		});

		return deferred.promise();
	}

	var saveErrorDialog;
	ExoWeb.Observer.setValue(Cognito.Forms.model, "saveStatus", {});

	var tosViolationConditionType = createSecurityAlert("Terms of Service Voilation", "Possible terms of service voilation.", "tosviolation");
	var passwordViolationConditionType = createSecurityAlert("Terms of Service Voilation (Password)", "Possible terms of service voilation.", "passwordviolation");
	var ccViolationConditionType = createSecurityAlert("Terms of Service Voilation (Credit Card)", "Possible terms of service voilation.", "ccviolation");

	function saveForm(form, callback) {
		prepareForSave(function () {
			Cognito.Forms.saveForm(form, Cognito.Forms.model.currentForm.get_folderId(), function (data) {
				window.setTimeout(function () {
					var internalName = data.InternalName.toLowerCase();

					if (data.Status.Code.toLowerCase() === "refresh") {
						Cognito.Forms.model.currentForm.set_HasChanges(false);
						document.location.href = Cognito.config.baseUrl + "forms/admin/view/" + internalName + "/build";

						return;
					}

					if (data.Status.Code.toLowerCase() === "tosviolation") {
						if (Cognito.Forms.model.currentForm.meta.getCondition(tosViolationConditionType))
							Cognito.Forms.model.currentForm.meta.getCondition(tosViolationConditionType).condition.destroy();

						// Add the connection error
						new ExoWeb.Model.Condition(tosViolationConditionType, "Cannot connect: invalid settings.", Cognito.Forms.model.currentForm, ["sharePointPassword"], "client");
					}
					else if (data.Status.Code.toLowerCase() === "passwordviolation") {
						if (Cognito.Forms.model.currentForm.meta.getCondition(passwordViolationConditionType))
							Cognito.Forms.model.currentForm.meta.getCondition(passwordViolationConditionType).condition.destroy();

						// Add the connection error
						new ExoWeb.Model.Condition(passwordViolationConditionType, "Cannot connect: invalid settings.", Cognito.Forms.model.currentForm, ["sharePointPassword"], "client");
					}
					else if (data.Status.Code.toLowerCase() === "ccviolation") {
						if (Cognito.Forms.model.currentForm.meta.getCondition(ccViolationConditionType))
							Cognito.Forms.model.currentForm.meta.getCondition(ccViolationConditionType).condition.destroy();

						// Add the connection error
						new ExoWeb.Model.Condition(ccViolationConditionType, "Cannot connect: invalid settings.", Cognito.Forms.model.currentForm, ["sharePointPassword"], "client");
					}

					var oldName = form.get_InternalName();

					// Including the slashes in the regex to prevent matching parts of the domain name
					var regex = new RegExp("\/" + oldName + "\/", "gi");

					// Update the URL if the form's internal name was changed on the server or if this
					// is a new form being saved therefore the current route does not contain the form's internal name
					if (oldName !== data.InternalName || !regex.test(decodeURI(location.href))) {

						// Update the form's internal name
						form.set_InternalName(data.InternalName);

						// Set the id, if this is a new form
						if (!form.get_Id()) {
							form.set_Id(data.Id);
							form.get_AllowedStatuses().clear();
							form.get_AllowedStatuses().addRange(data.AllowedStatuses);
						}

						// Update the navigation to reflect the new form name
						var nav = Cognito.config.navigation;
						nav.url = "/forms/" + internalName + "/build";
						nav.primary[0].url = "/forms/" + internalName + "/dashboard";
						nav.primary[0].title = form.get_Name();
						for (var p = 0; p < nav.secondary.length; p++)
							nav.secondary[p].url = "/forms/" + internalName + nav.secondary[p].url.substr(nav.secondary[p].url.lastIndexOf('/'));

						Cognito.Messaging.trigger({ event: "navigate", data: nav });
					}

					// Update version
					Cognito.Forms.model.currentForm.set_Version(data.Version);

					Cognito.Forms.model.currentForm.set_HasChanges(false);

					// Update the last saved template number
					Cognito.Forms.model.lastTemplateNumber = Cognito.Forms.model.currentForm.get_LastTemplateNumber();

					// Force Choice's Types to rebind to prevent the type from being changed when there are existing entries
					var field = Cognito.Forms.model.currentElement.get_field();
					if (field && field.get_FieldType().get_Name() === "Choice") {
						var $subTypes = $(".c-forms-sub-types");
						if ($subTypes.length > 0)
							$subTypes.parents(".c-field").get(0).control.refresh();
					}


					// Execute the success callback if necessary
					if (callback)
						callback();
				},
					function () {
						$("#c-forms-save i").remove();
						Cognito.Forms.model.currentForm.set_HasChanges(false);
					}, 100);
			}, function (jqXHR, textStatus, errorThrown) {
				Cognito.Forms.model.saveStatus = JSON.parse(jqXHR.responseText);

				if (!saveErrorDialog) {
					saveErrorDialog = $.fn.dialog({
						title: "Error Saving Form",
						templateName: "form-builder-error",
						instance: "Cognito.Forms.model.saveStatus",
						width: 490,
						height: 300,
						buttons: [
							{
								label: "Close",
								autoClose: true
							}
						]
					});
				}

				saveErrorDialog.open();

				if (callback && $.isFunction(callback)) {
					callback();
				}
			});

			// Clear the folder id once the request has been sent
			Cognito.Forms.model.currentForm.set_folderId(null);
		});
	}

	Cognito.Forms.copyDialog = $.fn.dialog({
		title: "Form Copied",
		contentSelector: "#copy-confirmation-dialog",
		height: 340,
		width: 490
	});

	// Saves the current form (used by save changes dialog)
	function saveCurrentForm(callback) {
		saveForm(Cognito.Forms.model.currentForm, callback);
	}
	Cognito.Forms.saveCurrentForm = saveCurrentForm;

	var previewDialog;
	function previewForm() {

		// Hide the preview callout
		Cognito.hideCallout("#c-callout-preview");

		if (!previewDialog) {
			previewDialog = $.fn.dialog({
				width: 800,
				height: "90%",
				buttons: [
					{
						label: "Close",
						autoClose: true
					}
				],
				onClose: function () {
					// Show the submission settings callout
					window.setTimeout(function () {
						Cognito.showCallout("#c-callout-submission-settings", "#c-forms-submission-settings");
					}, 400);
				}
			});
			previewDialog._dialog.find(".c-modal-content").remove();
			previewDialog._dialog.find(".c-modal-content-container").append("<iframe name='preview' style='width: 100%; height: 100%; overflow-x: hidden; overflow-y: hidden; -ms-overflow-style: scrollbar'></iframe>");
			previewDialog._dialog.find(".c-modal-buttons-left").append("<div class='c-label c-collapsed'><div class='c-preview-form-validation'>Form Validation</div><div class='toggleSwitch' style='display: inline-block; vertical-align: middle; padding: 8px;'><input id='enable-preview-validation' type='checkbox' checked='checked'><label for='enable-preview-validation'></label></div></div>").parent().css('background-color', '#aed136');
		}

		Cognito.Forms.updateViewDefinition();

		var jsonStr = JSON.stringify(Cognito.serialize(Cognito.Forms.model.currentForm));

		// Remove non-printable characters
		jsonStr = jsonStr.replace(/([\u0000-\u0008\u000b\u000c\u000e\u000f\u0010-\u001f\u007f-\u009f\u2028-\u2029\ud800-\udfff\uffff]|&#x0{0,3}([0-8BCEF]|1[\dA-F]|7F|[89][\dA-F]|D[89A-F][\dA-F]{2}|202[89]|FFFF);)/g, "");

		var orgcode = "";
		if (document.location.search && document.location.search.indexOf("template=") > -1) {
			var querystring = document.location.search.substring(1);
			var qsParams = querystring.split("&");
			var paramArray = {};
			$.each(qsParams, function (idx, item) {
				var pair = item.split("=");
				paramArray[pair[0]] = decodeURIComponent(pair[1]);
			});

			var templateParam = paramArray["template"];
			if (templateParam.indexOf("-") > -1) {
				orgcode = templateParam.substring(0, templateParam.indexOf("-"));
			}
		}

		$("#preview-form-def").val(encodeURIComponent(jsonStr));
		$("#preview-form-orgcode").val(orgcode);

		$("#preview-post-form").attr("action", "/forms/" + Cognito.config.mode + "/preview");
		$("#preview-post-form").submit();
		previewDialog.open();
	}

	// Preview Form
	$("#c-forms-preview").on("click", function (e) {
		if ($(e.target).is("#c-forms-preview")) {
			previewForm();
		}
	});

	function saveFormEvent() {
		if (Cognito.Forms.model.isAnonymous) {
			enableSaveForm();
			Cognito.navigate();
		} else {
			var isNew = !Cognito.Forms.model.currentForm.get_Id();

			saveCurrentForm(function () {
				enableSaveForm();

				$("#c-forms-save").trigger("progress-finished", "successful");

				if (isNew) {
					$("#c-forms-form-users").fadeIn(500);
				}
			});
		}
	}

	function enableSaveForm() {
		// Save Form
		$("#c-forms-save").one("click", function () {
			saveFormEvent();
		});
	}

	enableSaveForm();
	// #endregion

});