
Cognito.ready('register-templates-forms-folders-dialog', 'ExoWeb.dom', function ($) {
	var tmpl = $('#cognito-templates').length ? $('#cognito-templates') : $('<div id="cognito-templates" />').hide().appendTo('body');
	tmpl.append("\u003cdiv class=\"sys-template\" sys:attach=\"template\" template:name=\"forms-folders-dialog\" template:islist=\"true\"\u003e\r\n    \u003ch2\u003eSelect a folder in which to save this form.\u003c/h2\u003e\r\n    \u003cselect class=\"sys-template\" sys:attach=\"dataview\" dataview:data=\"{~}\"\u003e\r\n        \u003coption sys:value=\"{# Id}\"\u003e{# Name}\u003c/option\u003e\r\n    \u003c/select\u003e\r\n\u003c/div\u003e\r\n");
});
