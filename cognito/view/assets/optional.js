
Cognito.ready('libraryScripts', function($) { var jQuery = $; 
;(function() { if (Cognito.config.scripts.indexOf('fileupload') >= 0) return; else Cognito.config.scripts.push('fileupload');; (function ($) {

	var uploadInProgress;

	// Extend the FileDataRef type to support file upload user interface properties
	$extend('Cognito.FileDataRef', function (type) {

		uploadInProgress = new ExoWeb.Model.ConditionType.Error("Cognito.UploadInProgress", Cognito.resources["fileupload-upload-inprogress-message"], null, "client");

		// Progress
		type.meta.addProperty({
			name: "Progress",
			type: String
		});

		// Url
		type.meta.addProperty({
			name: "Url",
			type: String,
		})
		.calculated({
			fn: function () {
				var extension = this.get_Name().split('.');
				extension = extension[extension.length - 1].toLowerCase();
				var downloadUrl = this.get_DownloadUrl();
				switch (extension) {
					case 'doc':
					case 'docx':
					case 'ppt':
					case 'pptx':
						if (this.get_Size() / 1048576 < 10)
							return "http://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(downloadUrl);
						else
							return downloadUrl;
					case 'xls':
					case 'xlsx':
						if (this.get_Size() / 1048576 < 5)
							return "http://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(downloadUrl);
						else
							return downloadUrl;
					case 'png':
					case 'gif':
					case 'jpg':
					case 'jpeg':
					case 'tif':
					case 'tiff':
					case 'bmp':
					case 'pdf':
						return downloadUrl + "&at=0";
					default:
						return downloadUrl;
				}
			}
		});

		// Url
		type.meta.addProperty({
			name: "DownloadUrl",
			type: String,
		})
		.calculated({
			fn: function () {
				return Cognito.config.baseUrl + "forms/" + Cognito.config.mode + "/file?id=" + this.get_Id() + "&ct=" + encodeURIComponent(this.get_ContentType()) + "&token=" + encodeURIComponent(Cognito.config.sessionToken);
			}
		});

		// ThumbnailUrl
		type.meta.addProperty({
			name: "ThumbnailUrl",
			type: String,
		})
		.calculated({
			fn: function () {
				var extension = this.get_Name().split('.');
				extension = extension[extension.length - 1].toLowerCase();
				switch (extension) {
					case 'png':
					case 'gif':
					case 'jpg':
					case 'jpeg':
					case 'tif':
					case 'tiff':
					case 'bmp':
						// Cannot view thumbnails for images that have not been uploaded yet
						if (!this.get_Id())
							return Cognito.config.baseUrl + "content/images/file-type-icon-default.png";
						return Cognito.config.baseUrl + "forms/" + Cognito.config.mode + "/thumbnail?id=" + this.get_Id() + "&token=" + encodeURIComponent(Cognito.config.sessionToken);
					case 'doc':
					case 'docx':
						return Cognito.config.baseUrl + "content/images/file-type-icon-doc.png";
					case 'xls':
					case 'xlsx':
						return Cognito.config.baseUrl + "content/images/file-type-icon-xls.png";
					case 'ppt':
					case 'pptx':
						return Cognito.config.baseUrl + "content/images/file-type-icon-ppt.png";
					case 'pdf':
						return Cognito.config.baseUrl + "content/images/file-type-icon-pdf.png";
					case 'zip':
						return Cognito.config.baseUrl + "content/images/file-type-icon-zip.png";
					default:
						return Cognito.config.baseUrl + "content/images/file-type-icon-default.png";
				}
			},
			onChangeOf: ["Name"]
		});

		// Description
		type.meta.addProperty({
			name: "Description",
			type: String,
		})
		.calculated({
			fn: function () {
				if (this.get_Progress()) {
					return Cognito.resources["fileupload-desc-progress-message"].replace("{progress}", this.get_Progress());
				}
				else {
					var size = this.get_Size();
					if (size < 1024)
						return Cognito.resources["fileupload-desc-size-in-bytes-message"].replace("{size}", size);
					if (size < 1048576)
						return (size / 1024).toFixed(2) + " KB";
					if (size < 1073741824)
						return (size / 1048576).toFixed(2) + " MB";
					else
						return (size / 1073741824).toFixed(2) + " GB";
				}
			},
			onChangeOf: ["Progress", "Size"]
		});

	});

	// Check for File API support
	var supportsFileApi = $("<input type='file'/>").get(0).files !== undefined;

	// Check for image paste support
	var supportsPaste = !!navigator.userAgent && !!navigator.userAgent.match(/Chrome\/[1][4-9]|Chrome\/[2-9][0-9]/);

	// Gets the file upload control that triggered the specified event, also extracting options from data attributes
	function getFileUpload(e) {

		var eventTarget = e.target || e.srcElement;

		var editor = $(eventTarget).closest('.c-fileupload').first();

		var input;
		var inputs = editor.find("input");
		if (inputs.length > 1) {
			if ($(eventTarget).is("input")) {
				input = eventTarget;
			} else {
				input = editor.find("input:visible")[0];
			}
		} else {
			input = inputs[0];
		}

		return {
			input: input,
			editor: editor,
			form: editor.find("form"),
			adapter: $parentContextData(input),
			validation: editor.find(".c-validation"),
			allowedTypes: editor.attr('data-allowed-types') ? (editor.attr('data-allowed-types') || '').toLowerCase().split(",") : null,
			excludedTypes: ((editor.attr('data-excluded-types') || '') + ',action,apk,app,bat,bin,cmd,com,command,cpl,csh,dll,exe,gadget,inf1,ins,inx,ipa,isu,job,js,jse,ksh,lnk,msc,msi,msp,mst,osx,out,paf,pif,prg,ps1,reg,rgs,run,sct,shb,shs,u3p,vb,vbe,vbs,vbscript,workflow,ws,wsf').toLowerCase().split(","),
			maxSize: parseFloat(editor.attr('data-max-file-size')),
			maxFileCount: parseInt(editor.attr('data-max-file-count'))
		}
	}

	// Validates the file being uploaded
	function validate(fileUpload, file) {

		// Validate the file type
		var extension = file.get_Name().split('.').pop().toLowerCase();
		if (fileUpload.allowedTypes && !fileUpload.allowedTypes.contains(extension)) {
			showError(fileUpload, Cognito.resources["fileupload-invalid-file-type-message"].replace("{allowedTypes}", fileUpload.allowedTypes.join(", ")));
			return false;
		}
		else if (fileUpload.excludedTypes && fileUpload.excludedTypes.contains(extension)) {
			showError(fileUpload, Cognito.resources["fileupload-excluded-file-type-message"]);
			return false;
		}

		// Validate file count
		if (!file.get_Id() && fileUpload.maxFileCount && fileUpload.adapter.get_isEntityList() && (fileUpload.adapter.get_rawValue().length) >= fileUpload.maxFileCount) {
			showError(fileUpload, Cognito.resources["fileupload-max-file-count-exceeded-message"].replace("{maxFileCount}", fileUpload.maxFileCount));
			return false;
		}

		// Validate file size
		if (file.get_Size() === 0) {
			showError(fileUpload, Cognito.resources["fileupload-zero-byte-file-message"]);
			return false;
		}
		if (fileUpload.maxSize && file.get_Size() && file.get_Size() / 1024 / 1024 > fileUpload.maxSize) {
			showError(fileUpload, Cognito.resources["fileupload-max-size-exceeded-message"].replace("{maxSize}", fileUpload.maxSize));
			return false;
		}

		// Return true to indicate that the file passes validation
		return true;
	}

	// Initiates the upload of the specified files
	function upload(fileUpload, files) {

		// Clear any validation warnings
		if (fileUpload.validation.children().length > 0)
			fileUpload.validation.slideUp().empty();

		// Initiate the upload
		var pendingFiles = [];
		for (var i = 0; i < files.length; i++) {

			var file = files[i];

			// Create the new FileDataRef
			var fileData = new Cognito.FileDataRef({ Name: file.name, Size: file.size || 0, Progress: "0%" });

			// Perform initial file validation
			if (!validate(fileUpload, fileData))
				continue;

			// Add the pending file upload to the model
			if (fileUpload.adapter.get_isEntityList()) {
				fileUpload.adapter.get_rawValue().add(fileData);
			}
			else
				fileUpload.adapter.get_propertyChain().value(fileUpload.adapter.get_target(), fileData);
			
			// Track the files to upload an initial after updating the model
			pendingFiles.push([fileUpload, file, fileData]);
		}

		// Show any validation warnings
		fileUpload.validation.slideDown();

		// Animate the opacity to highlight the newly added files
		if (fileUpload.adapter.get_isEntityList()) {
			var newFiles = fileUpload.editor.find(".c-fileupload-file :gt(" + (fileUpload.adapter.get_rawValue().length - 1) + ")");
			newFiles.css({ opacity: 0 }).animate({ opacity: 1 }, 500);
		}

		// Upload the newly added files
		for (var i = 0; i < pendingFiles.length; i++)
			uploadFile.apply(this, pendingFiles[i]);
	}

	// Adds an error message to the validation region if not already there
	function showError(fileUpload, message) {
		if (fileUpload.validation.html().indexOf(message) < 0)
			fileUpload.validation.append("<div>" + message + "</div>");
	}

	// Upload a single file
	function uploadFile(fileUpload, file, fileData) {

		// Create an error reflecting the fact that the file is being uploaded
		var uploadError = new ExoWeb.Model.Condition(uploadInProgress, null, fileUpload.adapter.get_target(), [fileUpload.adapter.get_propertyPath()]);

		// Create success function to update the model when the file upload is complete
		var success = function (data) {

			// Deserialize the successfully uploaded file data reference
			var newFileData = Cognito.deserialize(Cognito.FileDataRef, data);

			// Validate the file one more time
			if (!validate(fileUpload, newFileData)) {
				deleteFile(fileUpload, fileData);
				return;
			}

			// Find the existing file entry to update
			if (fileUpload.adapter.get_isEntityList()) {
				var fileList = fileUpload.adapter.get_rawValue();
				var index = fileList.indexOf(fileData);
				fileList.beginUpdate();
				fileList.removeAt(index);
				fileList.insert(index, newFileData);
				fileList.endUpdate();
			}

			// Or set the file data property
			else {
				fileUpload.adapter.get_propertyChain().value(fileUpload.adapter.get_target(), newFileData);
			}

			// Destroy the upload in progress error
			uploadError.destroy();

			// Optionally hide the upload button if this is a single file upload
			if (fileUpload.maxFileCount == 1 || !fileUpload.adapter.get_isEntityList()) {
				fileUpload.editor.find(".c-fileupload-dropzone:not(.c-fileupload-dropzone-replace)").hide();
				fileUpload.editor.find(".c-fileupload-dropzone.c-fileupload-dropzone-replace").show();
			}

			var jqEvent = Cognito.fire("uploadFile.cognito", { data: { file: { name: newFileData.get_Name(), id: newFileData.get_Id(), size: newFileData.get_Size() } } });
		}

		// Create error function to remove files from the model that fail to upload
		var error = function (jqXHR) {

			// If the session has timed out, renew the session token
			if (jqXHR.status === 401 && Cognito.renewToken) {
				Cognito.renewToken(function () { uploadFile(fileUpload, file, fileData); });
				return;
			}

			// Remove the file that failed to upload
			if (fileUpload.adapter.get_isEntityList()) {
				var fileList = fileUpload.adapter.get_rawValue();
				var index = fileList.indexOf(fileData);
				fileList.removeAt(index);
			}
			else
				fileUpload.adapter.get_propertyChain().value(fileUpload.adapter.get_target(), null);

			// Destroy the upload in progress error
			uploadError.destroy();

			// Display an error message
			showError(fileUpload, Cognito.resources["fileupload-failed-upload-message"].replace("{fileName}", file.name));
			if (fileUpload.validation.height() == 0)
				fileUpload.validation.slideDown();
		}

		// Initiate the file upload
		if (window.FormData) {
			var formData = new FormData();
			formData.append("file", file);

			// Asynchronously post the file to the server
			Cognito.serviceRequest({
				endpoint: "forms/" + Cognito.config.mode + "/file" + (Cognito.config.encryptUploads ? "?encrypt=" : ""),
				method: "POST",
				data: formData,
				processData: false,
				contentType: false,
				overrideContentType: true,

				// Update the progress bar during the upload
				uploadProgress: function (event, position, total, percentComplete) {
					fileData.set_Progress((percentComplete > 98 ? 98 : percentComplete) + "%");
				},

				// Replace the pending file data reference with the file returned from the server
				success: success,

				// Display an error informing the user that the upload failed
				error: error
			});
		}
		else {
			// Create a form element to post the file and move the file upload field into that form element
			var $form = $("<form>").appendTo(fileUpload.editor.find((".c-upload-button")));
			fileUpload.editor.find("input").appendTo($form);
			fileUpload.form = $form;

			// Create a unique id to represent the file upload
			var fileId = "c-file-" + (new Date().getTime());
			var filePostUrl = Cognito.config.baseUrl + "forms/" + Cognito.config.mode + "/file?token=" + encodeURIComponent(Cognito.config.sessionToken);

			// Create an iframe that is positioned outside the viewing area
			var iframe = $("<iframe class='c-fileupload-frame' name='" + fileId + "' />")
				.css({ position: 'absolute', top: '-1000px', left: '-1000px' })
				.appendTo(window.document.body);

			// Set the form action and target
			fileUpload.form.attr("method", "post");
			fileUpload.form.attr("enctype", "multipart/form-data");
			fileUpload.form.attr("action", filePostUrl);
			fileUpload.form.attr("target", fileId);

			// Subscribe to the frame load event to be notified when the file is uploaded
			iframe.bind("load", function () {
				// Defer execution to ensure correct timing in IE9
				window.setTimeout(function () {

					// By this point the file should have been successfully deserialized
					for (var i = 0; i < uploadedFiles.length; i++) {
						var uploadedFile = uploadedFiles[i];
						if (file.name.toLowerCase().endsWith(uploadedFile.Name.toLowerCase())) {
							success(uploadedFile);
							return;
						}
					}

					error();

				}, 100);
			});

			// Submit the form
			fileUpload.form[0].submit();
		}
	}

	// Deletes the specified file
	function deleteFile(fileUpload, fileData) {

		// Clear any validation warnings
		if (fileUpload.validation.children().length > 0)
			fileUpload.validation.slideUp().empty();

		// List of files
		if (fileUpload.adapter.get_isEntityList()) {
			fileUpload.adapter.get_rawValue().remove(fileData);
		}

		// Single file
		else
			fileUpload.adapter.get_propertyChain().value(fileUpload.adapter.get_target(), null);

		// Ensure the upload button is visible
		if (fileUpload.maxFileCount == 1 || !fileUpload.adapter.get_isEntityList()) {
			fileUpload.editor.find(".c-fileupload-dropzone:not(.c-fileupload-dropzone-replace)").show();
			fileUpload.editor.find(".c-fileupload-dropzone.c-fileupload-dropzone-replace").hide();
		}
	}

	// Register to receive window messages if iframe posting will be required
	var uploadedFiles = [];
	if (!window.FormData) {

		function onFileUpload(fileInfo) {
			// Ensure event originated from cognito
			if (this.origin + "/" === Cognito.config.baseUrl)
				uploadedFiles.push(fileInfo);
		}

		Cognito.Messaging.addHandler("file-posting", onFileUpload);
	}

	Cognito.ready("register-fileupload-events", "ExoWeb.dom", function ($) {
		// Subscribe to the change event on the file input control to initiate uploads
		$('.cognito').on('change', '.c-fileupload input', function(e) {

			// Get the file upload control
			var fileUpload = getFileUpload(e);

			// Upload the specified files
			if (supportsFileApi)
				upload(fileUpload, fileUpload.input.files);
			else
				upload(fileUpload, [{ name: $(fileUpload.input).val(), size: -1 }]);

			// Reset the upload control
			var dropzone = fileUpload.editor.find('.c-fileupload-dropzone');
			dropzone.html(dropzone.html());
		});

		// Subscribe to the click event to handle file deletions
		$('.cognito').on('click', '.c-fileupload-delete', function(e) {

			// Get the file upload control
			var fileUpload = getFileUpload(e);

			// Get the delete div that was clicked
			var file = $(e.target || e.srcElement).parents('.c-fileupload-file');

			// Hide the parent file div being deleted
			file.animate({ opacity: 0 }, 500, function() {

				// List of files
				if (fileUpload.adapter.get_isEntityList()) {

					// Remove the file from the model
					//var fileDataList = fileUpload.adapter.get_rawValue();
					//var index = parseInt(file.attr("data-index"));
					deleteFile(fileUpload, $parentContextData(file[0]));
				}
				// Single file
				else
					deleteFile(fileUpload, fileUpload.adapter.get_propertyChain().value(fileUpload.adapter.get_target()));

				// Ensure the upload button is visible
				if (fileUpload.maxFileCount == 1 || !fileUpload.adapter.get_isEntityList()) {
					fileUpload.editor.find(".c-fileupload-dropzone:not(.c-fileupload-dropzone-replace)").show();
					fileUpload.editor.find(".c-fileupload-dropzone.c-fileupload-dropzone-replace").hide();
				}
			});
		});

		// Tracks the current paste target
		var pasteTarget;

		// Subscribe to paste events (if supported) to initiate uploads
		if (supportsPaste) {

			$('.cognito')

				// Set focus to the dropzone to support paste operations
				.on('mouseenter click', '.c-fileupload', function(e) {
					var fileUpload = getFileUpload(e);
					if (!fileUpload.allowedTypes || fileUpload.allowedTypes.contains('png') || fileUpload.allowedTypes.contains('jpg')) {
						//if (pasteTarget != null)
						//	pasteTarget.editor.find(".c-fileupload-dropzone-message").text("or drag files here.");
						pasteTarget = fileUpload;
						//pasteTarget.editor.find(".c-fileupload-dropzone-message").text("paste images, or drag files here.");
					}
				})

				// Pasting into dropzone
				.on('paste', function(e) {

					// Exit immediately if there is not a current paste target
					if (!pasteTarget)
						return;

					// Otherwise, attempt to upload the pasted image
					clipboardData = e.originalEvent.clipboardData;
					for (var i = 0; i < clipboardData.items.length; i++) {
						var item = clipboardData.items[i];

						if (item.type.match(/image.*/) && item.kind === "file") {
							file = item.getAsFile();
							file.name = item.type.replace('/', '.');

							// Upload the pasted image
							upload(pasteTarget, [file]);

							// Prevent cascading paste operations
							e.preventDefault();
							e.stopPropagation();

							// Immediately exit
							return;
						}
					}
				})
		}

		// Subscribe to drag-drop events (if supported) to initiate uploads
		if (supportsFileApi) {

			$('.cognito')

				// Dragging into dropzone
				.on('dragenter', '.c-fileupload-dropzone', function (e) {
					e.stopPropagation();
					e.preventDefault();

					// Add the dropzone active class
					$(this).addClass("c-fileupload-dropzone-active");
				})

				.on('dragenter dragover dragleave', '.c-fileupload-dropzone .c-upload-button, .c-fileupload-dropzone .c-fileupload-dropzone-message', function (e) {
					$(this).closest('.c-fileupload-dropzone').addClass("c-fileupload-dropzone-active");

					e.stopPropagation();
					e.preventDefault();
				})

				// Dragging over dropzone
				.on('dragover', '.c-fileupload-dropzone', function(e) {
					e.stopPropagation();
					e.preventDefault();
				})

				// Dragging out of dropzone
				.on('dragleave', '.c-fileupload-dropzone', function (e) {
					e.stopPropagation();
					e.preventDefault();

					// Remove the dropzone active class
					$(this).removeClass("c-fileupload-dropzone-active");
				})

				// Dropping into dropzone
				.on('drop', '.c-fileupload-dropzone', function(e) {
					e.stopPropagation();
					e.preventDefault();

					// Remove the dropzone active class
					$(this).removeClass("c-fileupload-dropzone-active");

					// Get the file upload corresponding to the current drop event
					var fileUpload = getFileUpload(e);

					// Upload the files
					upload(fileUpload, e.originalEvent.dataTransfer.files);
				});

			// Suppress the default behavior of drop events for the document to avoid accidental navigation
			$(document)
				.on('dragenter', function (e) {
					e.stopPropagation();
					e.preventDefault();
				})
				.on('dragover', function(e) {
					e.stopPropagation();
					e.preventDefault();
				})
				.on('drop', function(e) {
					e.stopPropagation();
					e.preventDefault();
				});
		}
		// Otherwise, hide the dropzone
		else
			$('.cognito').addClass("c-fileupload-dropzone-hidden");
	});

})(ExoJQuery);})();
;(function() { if (Cognito.config.scripts.indexOf('tinymce/tinymce.min') >= 0) return; else Cognito.config.scripts.push('tinymce/tinymce.min');// 4.0.29 (2014-06-xx)
/**
 * Compiled inline version. (Library mode)
 *//*jshint smarttabs:true, undef:true, latedef:true, curly:true, bitwise:true, camelcase:true *//*globals $code */(function(e,t){"use strict";function r(e,t){var r,i=[];for(var s=0;s<e.length;++s){r=n[e[s]]||o(e[s]);if(!r)throw"module definition dependecy not found: "+e[s];i.push(r)}t.apply(null,i)}function i(e,i,s){if(typeof e!="string")throw"invalid module definition, module id must be defined and be a string";if(i===t)throw"invalid module definition, dependencies must be specified";if(s===t)throw"invalid module definition, definition function must be specified";r(i,function(){n[e]=s.apply(null,arguments)})}function s(e){return!!n[e]}function o(t){var n=e,r=t.split(/[.\/]/);for(var i=0;i<r.length;++i){if(!n[r[i]])return;n=n[r[i]]}return n}function u(r){for(var i=0;i<r.length;i++){var s=e,o=r[i],u=o.split(/[.\/]/);for(var a=0;a<u.length-1;++a)s[u[a]]===t&&(s[u[a]]={}),s=s[u[a]];s[u[u.length-1]]=n[o]}}var n={};i("tinymce/dom/EventUtils",[],function(){function r(e,t,n,r){e.addEventListener?e.addEventListener(t,n,r||!1):e.attachEvent&&e.attachEvent("on"+t,n)}function i(e,t,n,r){e.removeEventListener?e.removeEventListener(t,n,r||!1):e.detachEvent&&e.detachEvent("on"+t,n)}function s(e,r){function u(){return!1}function a(){return!0}var i,s=r||{},o;for(i in e)n[i]||(s[i]=e[i]);s.target||(s.target=s.srcElement||document);if(e&&t.test(e.type)&&e.pageX===o&&e.clientX!==o){var f=s.target.ownerDocument||document,l=f.documentElement,c=f.body;s.pageX=e.clientX+(l&&l.scrollLeft||c&&c.scrollLeft||0)-(l&&l.clientLeft||c&&c.clientLeft||0),s.pageY=e.clientY+(l&&l.scrollTop||c&&c.scrollTop||0)-(l&&l.clientTop||c&&c.clientTop||0)}return s.preventDefault=function(){s.isDefaultPrevented=a,e&&(e.preventDefault?e.preventDefault():e.returnValue=!1)},s.stopPropagation=function(){s.isPropagationStopped=a,e&&(e.stopPropagation?e.stopPropagation():e.cancelBubble=!0)},s.stopImmediatePropagation=function(){s.isImmediatePropagationStopped=a,s.stopPropagation()},s.isDefaultPrevented||(s.isDefaultPrevented=u,s.isPropagationStopped=u,s.isImmediatePropagationStopped=u),s}function o(e,t,n){function u(){n.domLoaded||(n.domLoaded=!0,t(o))}function a(){if(s.readyState==="complete"||s.readyState==="interactive"&&s.body)i(s,"readystatechange",a),u()}function f(){try{s.documentElement.doScroll("left")}catch(e){setTimeout(f,0);return}u()}var s=e.document,o={type:"ready"};if(n.domLoaded){t(o);return}s.addEventListener?s.readyState==="complete"?u():r(e,"DOMContentLoaded",u):(r(s,"readystatechange",a),s.documentElement.doScroll&&e.self===e.top&&f()),r(e,"load",u)}function u(){function h(e,t){var r,i,s,o,u=n[t];r=u&&u[e.type];if(r)for(i=0,s=r.length;i<s;i++){o=r[i],o&&o.func.call(o.scope,e)===!1&&e.preventDefault();if(e.isImmediatePropagationStopped())return}}var t=this,n={},u,a,f,l,c;a=e+(+(new Date)).toString(32),l="onmouseenter"in document.documentElement,f="onfocusin"in document.documentElement,c={mouseenter:"mouseover",mouseleave:"mouseout"},u=1,t.domLoaded=!1,t.events=n,t.bind=function(e,i,p,d){function x(e){h(s(e||S.event),v)}var v,m,g,y,b,w,E,S=window;if(!e||e.nodeType===3||e.nodeType===8)return;e[a]?v=e[a]:(v=u++,e[a]=v,n[v]={}),d=d||e,i=i.split(" "),g=i.length;while(g--){y=i[g],w=x,b=E=!1,y==="DOMContentLoaded"&&(y="ready");if(t.domLoaded&&y==="ready"&&e.readyState=="complete"){p.call(d,s({type:y}));continue}l||(b=c[y],b&&(w=function(e){var t,n;t=e.currentTarget,n=e.relatedTarget;if(n&&t.contains)n=t.contains(n);else while(n&&n!==t)n=n.parentNode;n||(e=s(e||S.event),e.type=e.type==="mouseout"?"mouseleave":"mouseenter",e.target=t,h(e,v))})),!f&&(y==="focusin"||y==="focusout")&&(E=!0,b=y==="focusin"?"focus":"blur",w=function(e){e=s(e||S.event),e.type=e.type==="focus"?"focusin":"focusout",h(e,v)}),m=n[v][y],m?y==="ready"&&t.domLoaded?p({type:y}):m.push({func:p,scope:d}):(n[v][y]=m=[{func:p,scope:d}],m.fakeName=b,m.capture=E,m.nativeHandler=w,y==="ready"?o(e,w,t):r(e,b||y,w,E))}return e=m=0,p},t.unbind=function(e,r,s){var o,u,f,l,c,h;if(!e||e.nodeType===3||e.nodeType===8)return t;o=e[a];if(o){h=n[o];if(r){r=r.split(" "),f=r.length;while(f--){c=r[f],u=h[c];if(u){if(s){l=u.length;while(l--)if(u[l].func===s){var p=u.nativeHandler,d=u.fakeName,v=u.capture;u=u.slice(0,l).concat(u.slice(l+1)),u.nativeHandler=p,u.fakeName=d,u.capture=v,h[c]=u}}if(!s||u.length===0)delete h[c],i(e,u.fakeName||c,u.nativeHandler,u.capture)}}}else{for(c in h)u=h[c],i(e,u.fakeName||c,u.nativeHandler,u.capture);h={}}for(c in h)return t;delete n[o];try{delete e[a]}catch(m){e[a]=null}}return t},t.fire=function(e,n,r){var i;if(!e||e.nodeType===3||e.nodeType===8)return t;r=s(null,r),r.type=n,r.target=e;do i=e[a],i&&h(r,i),e=e.parentNode||e.ownerDocument||e.defaultView||e.parentWindow;while(e&&!r.isPropagationStopped());return t},t.clean=function(e){var n,r,i=t.unbind;if(!e||e.nodeType===3||e.nodeType===8)return t;e[a]&&i(e),e.getElementsByTagName||(e=e.document);if(e&&e.getElementsByTagName){i(e),r=e.getElementsByTagName("*"),n=r.length;while(n--)e=r[n],e[a]&&i(e)}return t},t.destroy=function(){n={}},t.cancel=function(e){return e&&(e.preventDefault(),e.stopImmediatePropagation()),!1}}var e="mce-data-",t=/^(?:mouse|contextmenu)|click/,n={keyLocation:1,layerX:1,layerY:1,returnValue:1};return u.Event=new u,u.Event.bind(window,"ready",function(){}),u}),i("tinymce/dom/Sizzle",[],function(){function it(e){return K.test(e+"")}function st(){var e,t=[];return e=function(n,i){return t.push(n+=" ")>r.cacheLength&&delete e[t.shift()],e[n]=i,i},e}function ot(e){return e[y]=!0,e}function ut(e){var t=c.createElement("div");try{return!!e(t)}catch(n){return!1}finally{t=null}}function at(e,t,n,r){var i,s,o,u,a,f,h,v,m,E;(t?t.ownerDocument||t:b)!==c&&l(t),t=t||c,n=n||[];if(!e||typeof e!="string")return n;if((u=t.nodeType)!==1&&u!==9)return[];if(p&&!r){if(i=Q.exec(e))if(o=i[1]){if(u===9){s=t.getElementById(o);if(!s||!s.parentNode)return n;if(s.id===o)return n.push(s),n}else if(t.ownerDocument&&(s=t.ownerDocument.getElementById(o))&&g(t,s)&&s.id===o)return n.push(s),n}else{if(i[2])return D.apply(n,t.getElementsByTagName(e)),n;if((o=i[3])&&w.getElementsByClassName&&t.getElementsByClassName)return D.apply(n,t.getElementsByClassName(o)),n}if(w.qsa&&!d.test(e)){h=!0,v=y,m=t,E=u===9&&e;if(u===1&&t.nodeName.toLowerCase()!=="object"){f=pt(e),(h=t.getAttribute("id"))?v=h.replace(Z,"\\$&"):t.setAttribute("id",v),v="[id='"+v+"'] ",a=f.length;while(a--)f[a]=v+dt(f[a]);m=J.test(e)&&t.parentNode||t,E=f.join(",")}if(E)try{return D.apply(n,m.querySelectorAll(E)),n}catch(S){}finally{h||t.removeAttribute("id")}}}return St(e.replace(U,"$1"),t,n,r)}function ft(e,t){var n=t&&e,r=n&&(~t.sourceIndex||A)-(~e.sourceIndex||A);if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function lt(e){return function(t){var n=t.nodeName.toLowerCase();return n==="input"&&t.type===e}}function ct(e){return function(t){var n=t.nodeName.toLowerCase();return(n==="input"||n==="button")&&t.type===e}}function ht(e){return ot(function(t){return t=+t,ot(function(n,r){var i,s=e([],n.length,t),o=s.length;while(o--)n[i=s[o]]&&(n[i]=!(r[i]=n[i]))})})}function pt(e,t){var n,i,s,o,u,a,f,l=T[e+" "];if(l)return t?0:l.slice(0);u=e,a=[],f=r.preFilter;while(u){if(!n||(i=z.exec(u)))i&&(u=u.slice(i[0].length)||u),a.push(s=[]);n=!1;if(i=W.exec(u))n=i.shift(),s.push({value:n,type:i[0].replace(U," ")}),u=u.slice(n.length);for(o in r.filter)(i=$[o].exec(u))&&(!f[o]||(i=f[o](i)))&&(n=i.shift(),s.push({value:n,type:o,matches:i}),u=u.slice(n.length));if(!n)break}return t?u.length:u?at.error(e):T(e,a).slice(0)}function dt(e){var t=0,n=e.length,r="";for(;t<n;t++)r+=e[t].value;return r}function vt(e,t,r){var i=t.dir,s=r&&i==="parentNode",o=S++;return t.first?function(t,n,r){while(t=t[i])if(t.nodeType===1||s)return e(t,n,r)}:function(t,r,u){var a,f,l,c=E+" "+o;if(u){while(t=t[i])if(t.nodeType===1||s)if(e(t,r,u))return!0}else while(t=t[i])if(t.nodeType===1||s){l=t[y]||(t[y]={});if((f=l[i])&&f[0]===c){if((a=f[1])===!0||a===n)return a===!0}else{f=l[i]=[c],f[1]=e(t,r,u)||n;if(f[1]===!0)return!0}}}}function mt(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function gt(e,t,n,r,i){var s,o=[],u=0,a=e.length,f=t!=null;for(;u<a;u++)if(s=e[u])if(!n||n(s,r,i))o.push(s),f&&t.push(u);return o}function yt(e,t,n,r,i,s){return r&&!r[y]&&(r=yt(r)),i&&!i[y]&&(i=yt(i,s)),ot(function(s,o,u,a){var f,l,c,h=[],p=[],d=o.length,v=s||Et(t||"*",u.nodeType?[u]:u,[]),m=e&&(s||!t)?gt(v,h,e,u,a):v,g=n?i||(s?e:d||r)?[]:o:m;n&&n(m,g,u,a);if(r){f=gt(g,p),r(f,[],u,a),l=f.length;while(l--)if(c=f[l])g[p[l]]=!(m[p[l]]=c)}if(s){if(i||e){if(i){f=[],l=g.length;while(l--)(c=g[l])&&f.push(m[l]=c);i(null,g=[],f,a)}l=g.length;while(l--)(c=g[l])&&(f=i?H.call(s,c):h[l])>-1&&(s[f]=!(o[f]=c))}}else g=gt(g===o?g.splice(d,g.length):g),i?i(null,o,g,a):D.apply(o,g)})}function bt(e){var t,n,i,s=e.length,o=r.relative[e[0].type],a=o||r.relative[" "],f=o?1:0,l=vt(function(e){return e===t},a,!0),c=vt(function(e){return H.call(t,e)>-1},a,!0),h=[function(e,n,r){return!o&&(r||n!==u)||((t=n).nodeType?l(e,n,r):c(e,n,r))}];for(;f<s;f++)if(n=r.relative[e[f].type])h=[vt(mt(h),n)];else{n=r.filter[e[f].type].apply(null,e[f].matches);if(n[y]){i=++f;for(;i<s;i++)if(r.relative[e[i].type])break;return yt(f>1&&mt(h),f>1&&dt(e.slice(0,f-1)).replace(U,"$1"),n,f<i&&bt(e.slice(f,i)),i<s&&bt(e=e.slice(i)),i<s&&dt(e))}h.push(n)}return mt(h)}function wt(e,t){var i=0,s=t.length>0,o=e.length>0,a=function(a,f,l,h,p){var d,v,m,g=[],y=0,b="0",w=a&&[],S=p!=null,x=u,T=a||o&&r.find.TAG("*",p&&f.parentNode||f),N=E+=x==null?1:Math.random()||.1;S&&(u=f!==c&&f,n=i);for(;(d=T[b])!=null;b++){if(o&&d){v=0;while(m=e[v++])if(m(d,f,l)){h.push(d);break}S&&(E=N,n=++i)}s&&((d=!m&&d)&&y--,a&&w.push(d))}y+=b;if(s&&b!==y){v=0;while(m=t[v++])m(w,g,f,l);if(a){if(y>0)while(b--)!w[b]&&!g[b]&&(g[b]=M.call(h));g=gt(g)}D.apply(h,g),S&&!a&&g.length>0&&y+t.length>1&&at.uniqueSort(h)}return S&&(E=N,u=x),w};return s?ot(a):a}function Et(e,t,n){var r=0,i=t.length;for(;r<i;r++)at(e,t[r],n);return n}function St(e,t,n,i){var s,u,a,f,l,c=pt(e);if(!i&&c.length===1){u=c[0]=c[0].slice(0);if(u.length>2&&(a=u[0]).type==="ID"&&t.nodeType===9&&p&&r.relative[u[1].type]){t=(r.find.ID(a.matches[0].replace(tt,nt),t)||[])[0];if(!t)return n;e=e.slice(u.shift().value.length)}s=$.needsContext.test(e)?0:u.length;while(s--){a=u[s];if(r.relative[f=a.type])break;if(l=r.find[f])if(i=l(a.matches[0].replace(tt,nt),J.test(u[0].type)&&t.parentNode||t)){u.splice(s,1),e=i.length&&dt(u);if(!e)return D.apply(n,i),n;break}}}return o(e,c)(i,t,!p,n,J.test(e)),n}function xt(){}var e,n,r,i,s,o,u,a,f,l,c,h,p,d,v,m,g,y="sizzle"+ -(new Date),b=window.document,w={},E=0,S=0,x=st(),T=st(),N=st(),C=!1,k=function(){return 0},L=typeof t,A=1<<31,O=[],M=O.pop,_=O.push,D=O.push,P=O.slice,H=O.indexOf||function(e){var t=0,n=this.length;for(;t<n;t++)if(this[t]===e)return t;return-1},B="[\\x20\\t\\r\\n\\f]",j="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",F=j.replace("w","w#"),I="([*^$|!~]?=)",q="\\["+B+"*("+j+")"+B+"*(?:"+I+B+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+F+")|)|)"+B+"*\\]",R=":("+j+")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+q.replace(3,8)+")*)|.*)\\)|)",U=new RegExp("^"+B+"+|((?:^|[^\\\\])(?:\\\\.)*)"+B+"+$","g"),z=new RegExp("^"+B+"*,"+B+"*"),W=new RegExp("^"+B+"*([\\x20\\t\\r\\n\\f>+~])"+B+"*"),X=new RegExp(R),V=new RegExp("^"+F+"$"),$={ID:new RegExp("^#("+j+")"),CLASS:new RegExp("^\\.("+j+")"),NAME:new RegExp("^\\[name=['\"]?("+j+")['\"]?\\]"),TAG:new RegExp("^("+j.replace("w","w*")+")"),ATTR:new RegExp("^"+q),PSEUDO:new RegExp("^"+R),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+B+"*(even|odd|(([+-]|)(\\d*)n|)"+B+"*(?:([+-]|)"+B+"*(\\d+)|))"+B+"*\\)|)","i"),needsContext:new RegExp("^"+B+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+B+"*((?:-\\d)?\\d*)"+B+"*\\)|)(?=[^-]|$)","i")},J=/[\x20\t\r\n\f]*[+~]/,K=/^[^{]+\{\s*\[native code/,Q=/^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,G=/^(?:input|select|textarea|button)$/i,Y=/^h\d$/i,Z=/'|\\/g,et=/\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,tt=/\\([\da-fA-F]{1,6}[\x20\t\r\n\f]?|.)/g,nt=function(e,t){var n="0x"+t-65536;return n!==n?t:n<0?String.fromCharCode(n+65536):String.fromCharCode(n>>10|55296,n&1023|56320)};try{D.apply(O=P.call(b.childNodes),b.childNodes),O[b.childNodes.length].nodeType}catch(rt){D={apply:O.length?function(e,t){_.apply(e,P.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}s=at.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?t.nodeName!=="HTML":!1},l=at.setDocument=function(e){var n=e?e.ownerDocument||e:b;if(n===c||n.nodeType!==9||!n.documentElement)return c;c=n,h=n.documentElement,p=!s(n),w.getElementsByTagName=ut(function(e){return e.appendChild(n.createComment("")),!e.getElementsByTagName("*").length}),w.attributes=ut(function(e){e.innerHTML="<select></select>";var t=typeof e.lastChild.getAttribute("multiple");return t!=="boolean"&&t!=="string"}),w.getElementsByClassName=ut(function(e){return e.innerHTML="<div class='hidden e'></div><div class='hidden'></div>",!e.getElementsByClassName||!e.getElementsByClassName("e").length?!1:(e.lastChild.className="e",e.getElementsByClassName("e").length===2)}),w.getByName=ut(function(e){e.id=y+0,e.appendChild(c.createElement("a")).setAttribute("name",y),e.appendChild(c.createElement("i")).setAttribute("name",y),h.appendChild(e);var t=n.getElementsByName&&n.getElementsByName(y).length===2+n.getElementsByName(y+0).length;return h.removeChild(e),t}),w.sortDetached=ut(function(e){return e.compareDocumentPosition&&e.compareDocumentPosition(c.createElement("div"))&1}),r.attrHandle=ut(function(e){return e.innerHTML="<a href='#'></a>",e.firstChild&&typeof e.firstChild.getAttribute!==L&&e.firstChild.getAttribute("href")==="#"})?{}:{href:function(e){return e.getAttribute("href",2)},type:function(e){return e.getAttribute("type")}},w.getByName?(r.find.ID=function(e,t){if(typeof t.getElementById!==L&&p){var n=t.getElementById(e);return n&&n.parentNode?[n]:[]}},r.filter.ID=function(e){var t=e.replace(tt,nt);return function(e){return e.getAttribute("id")===t}}):(r.find.ID=function(e,n){if(typeof n.getElementById!==L&&p){var r=n.getElementById(e);return r?r.id===e||typeof r.getAttributeNode!==L&&r.getAttributeNode("id").value===e?[r]:t:[]}},r.filter.ID=function(e){var t=e.replace(tt,nt);return function(e){var n=typeof e.getAttributeNode!==L&&e.getAttributeNode("id");return n&&n.value===t}}),r.find.TAG=w.getElementsByTagName?function(e,t){if(typeof t.getElementsByTagName!==L)return t.getElementsByTagName(e)}:function(e,t){var n,r=[],i=0,s=t.getElementsByTagName(e);if(e==="*"){while(n=s[i++])n.nodeType===1&&r.push(n);return r}return s},r.find.NAME=w.getByName&&function(e,t){if(typeof t.getElementsByName!==L)return t.getElementsByName(name)},r.find.CLASS=w.getElementsByClassName&&function(e,t){if(typeof t.getElementsByClassName!==L&&p)return t.getElementsByClassName(e)},v=[],d=[":focus"];if(w.qsa=it(n.querySelectorAll))ut(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||d.push("\\["+B+"*(?:checked|disabled|ismap|multiple|readonly|selected|value)"),e.querySelectorAll(":checked").length||d.push(":checked")}),ut(function(e){e.innerHTML="<input type='hidden' i=''/>",e.querySelectorAll("[i^='']").length&&d.push("[*^$]="+B+"*(?:\"\"|'')"),e.querySelectorAll(":enabled").length||d.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),d.push(",.*:")});return(w.matchesSelector=it(m=h.matchesSelector||h.mozMatchesSelector||h.webkitMatchesSelector||h.oMatchesSelector||h.msMatchesSelector))&&ut(function(e){w.disconnectedMatch=m.call(e,"div"),m.call(e,"[s!='']:x"),v.push("!=",R)}),d=new RegExp(d.join("|")),v=v.length&&new RegExp(v.join("|")),g=it(h.contains)||h.compareDocumentPosition?function(e,t){var n=e.nodeType===9?e.documentElement:e,r=t&&t.parentNode;return e===r||!!r&&r.nodeType===1&&!!(n.contains?n.contains(r):e.compareDocumentPosition&&e.compareDocumentPosition(r)&16)}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},k=h.compareDocumentPosition?function(e,t){if(e===t)return C=!0,0;var r=t.compareDocumentPosition&&e.compareDocumentPosition&&e.compareDocumentPosition(t);if(r)return r&1||a&&t.compareDocumentPosition(e)===r?e===n||g(b,e)?-1:t===n||g(b,t)?1:f?H.call(f,e)-H.call(f,t):0:r&4?-1:1;return e.compareDocumentPosition?-1:1}:function(e,t){var r,i=0,s=e.parentNode,o=t.parentNode,u=[e],a=[t];if(e===t)return C=!0,0;if(!s||!o)return e===n?-1:t===n?1:s?-1:o?1:0;if(s===o)return ft(e,t);r=e;while(r=r.parentNode)u.unshift(r);r=t;while(r=r.parentNode)a.unshift(r);while(u[i]===a[i])i++;return i?ft(u[i],a[i]):u[i]===b?-1:a[i]===b?1:0},c},at.matches=function(e,t){return at(e,null,null,t)},at.matchesSelector=function(e,t){(e.ownerDocument||e)!==c&&l(e),t=t.replace(et,"='$1']");if(w.matchesSelector&&p&&(!v||!v.test(t))&&!d.test(t))try{var n=m.call(e,t);if(n||w.disconnectedMatch||e.document&&e.document.nodeType!==11)return n}catch(r){}return at(t,c,null,[e]).length>0},at.contains=function(e,t){return(e.ownerDocument||e)!==c&&l(e),g(e,t)},at.attr=function(e,t){var n;return(e.ownerDocument||e)!==c&&l(e),p&&(t=t.toLowerCase()),(n=r.attrHandle[t])?n(e):!p||w.attributes?e.getAttribute(t):((n=e.getAttributeNode(t))||e.getAttribute(t))&&e[t]===!0?t:n&&n.specified?n.value:null},at.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},at.uniqueSort=function(e){var t,n=[],r=0,i=0;C=!w.detectDuplicates,a=!w.sortDetached,f=!w.sortStable&&e.slice(0),e.sort(k);if(C){while(t=e[i++])t===e[i]&&(r=n.push(i));while(r--)e.splice(n[r],1)}return e},i=at.getText=function(e){var t,n="",r=0,s=e.nodeType;if(!s)for(;t=e[r];r++)n+=i(t);else if(s===1||s===9||s===11){if(typeof e.textContent=="string")return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=i(e)}else if(s===3||s===4)return e.nodeValue;return n},r=at.selectors={cacheLength:50,createPseudo:ot,match:$,find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(tt,nt),e[3]=(e[4]||e[5]||"").replace(tt,nt),e[2]==="~="&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),e[1].slice(0,3)==="nth"?(e[3]||at.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*(e[3]==="even"||e[3]==="odd")),e[5]=+(e[7]+e[8]||e[3]==="odd")):e[3]&&at.error(e[0]),e},PSEUDO:function(e){var t,n=!e[5]&&e[2];return $.CHILD.test(e[0])?null:(e[4]?e[2]=e[4]:n&&X.test(n)&&(t=pt(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){return e==="*"?function(){return!0}:(e=e.replace(tt,nt).toLowerCase(),function(t){return t.nodeName&&t.nodeName.toLowerCase()===e})},CLASS:function(e){var t=x[e+" "];return t||(t=new RegExp("(^|"+B+")"+e+"("+B+"|$)"))&&x(e,function(e){return t.test(e.className||typeof e.getAttribute!==L&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=at.attr(r,e);return i==null?t==="!=":t?(i+="",t==="="?i===n:t==="!="?i!==n:t==="^="?n&&i.indexOf(n)===0:t==="*="?n&&i.indexOf(n)>-1:t==="$="?n&&i.slice(-n.length)===n:t==="~="?(" "+i+" ").indexOf(n)>-1:t==="|="?i===n||i.slice(0,n.length+1)===n+"-":!1):!0}},CHILD:function(e,t,n,r,i){var s=e.slice(0,3)!=="nth",o=e.slice(-4)!=="last",u=t==="of-type";return r===1&&i===0?function(e){return!!e.parentNode}:function(t,n,a){var f,l,c,h,p,d,v=s!==o?"nextSibling":"previousSibling",m=t.parentNode,g=u&&t.nodeName.toLowerCase(),b=!a&&!u;if(m){if(s){while(v){c=t;while(c=c[v])if(u?c.nodeName.toLowerCase()===g:c.nodeType===1)return!1;d=v=e==="only"&&!d&&"nextSibling"}return!0}d=[o?m.firstChild:m.lastChild];if(o&&b){l=m[y]||(m[y]={}),f=l[e]||[],p=f[0]===E&&f[1],h=f[0]===E&&f[2],c=p&&m.childNodes[p];while(c=++p&&c&&c[v]||(h=p=0)||d.pop())if(c.nodeType===1&&++h&&c===t){l[e]=[E,p,h];break}}else if(b&&(f=(t[y]||(t[y]={}))[e])&&f[0]===E)h=f[1];else while(c=++p&&c&&c[v]||(h=p=0)||d.pop())if((u?c.nodeName.toLowerCase()===g:c.nodeType===1)&&++h){b&&((c[y]||(c[y]={}))[e]=[E,h]);if(c===t)break}return h-=i,h===r||h%r===0&&h/r>=0}}},PSEUDO:function(e,t){var n,i=r.pseudos[e]||r.setFilters[e.toLowerCase()]||at.error("unsupported pseudo: "+e);return i[y]?i(t):i.length>1?(n=[e,e,"",t],r.setFilters.hasOwnProperty(e.toLowerCase())?ot(function(e,n){var r,s=i(e,t),o=s.length;while(o--)r=H.call(e,s[o]),e[r]=!(n[r]=s[o])}):function(e){return i(e,0,n)}):i}},pseudos:{not:ot(function(e){var t=[],n=[],r=o(e.replace(U,"$1"));return r[y]?ot(function(e,t,n,i){var s,o=r(e,null,i,[]),u=e.length;while(u--)if(s=o[u])e[u]=!(t[u]=s)}):function(e,i,s){return t[0]=e,r(t,null,s,n),!n.pop()}}),has:ot(function(e){return function(t){return at(e,t).length>0}}),contains:ot(function(e){return function(t){return(t.textContent||t.innerText||i(t)).indexOf(e)>-1}}),lang:ot(function(e){return V.test(e||"")||at.error("unsupported lang: "+e),e=e.replace(tt,nt).toLowerCase(),function(t){var n;do if(n=p?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return n=n.toLowerCase(),n===e||n.indexOf(e+"-")===0;while((t=t.parentNode)&&t.nodeType===1);return!1}}),target:function(e){var t=window.location&&window.location.hash;return t&&t.slice(1)===e.id},root:function(e){return e===h},focus:function(e){return e===c.activeElement&&(!c.hasFocus||c.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return e.disabled===!1},disabled:function(e){return e.disabled===!0},checked:function(e){var t=e.nodeName.toLowerCase();return t==="input"&&!!e.checked||t==="option"&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeName>"@"||e.nodeType===3||e.nodeType===4)return!1;return!0},parent:function(e){return!r.pseudos.empty(e)},header:function(e){return Y.test(e.nodeName)},input:function(e){return G.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return t==="input"&&e.type==="button"||t==="button"},text:function(e){var t;return e.nodeName.toLowerCase()==="input"&&e.type==="text"&&((t=e.getAttribute("type"))==null||t.toLowerCase()===e.type)},first:ht(function(){return[0]}),last:ht(function(e,t){return[t-1]}),eq:ht(function(e,t,n){return[n<0?n+t:n]}),even:ht(function(e,t){var n=0;for(;n<t;n+=2)e.push(n);return e}),odd:ht(function(e,t){var n=1;for(;n<t;n+=2)e.push(n);return e}),lt:ht(function(e,t,n){var r=n<0?n+t:n;for(;--r>=0;)e.push(r);return e}),gt:ht(function(e,t,n){var r=n<0?n+t:n;for(;++r<t;)e.push(r);return e})}};for(e in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})r.pseudos[e]=lt(e);for(e in{submit:!0,reset:!0})r.pseudos[e]=ct(e);return o=at.compile=function(e,t){var n,r=[],i=[],s=N[e+" "];if(!s){t||(t=pt(e)),n=t.length;while(n--)s=bt(t[n]),s[y]?r.push(s):i.push(s);s=N(e,wt(i,r))}return s},r.pseudos.nth=r.pseudos.eq,xt.prototype=r.filters=r.pseudos,r.setFilters=new xt,w.sortStable=y.split("").sort(k).join("")===y,l(),[0,0].sort(k),w.detectDuplicates=C,at}),i("tinymce/dom/DomQuery",["tinymce/dom/EventUtils","tinymce/dom/Sizzle"],function(e,n){function a(e){return typeof e!="undefined"}function f(e){return typeof e=="string"}function l(e){var t,n,i;i=r.createElement("div"),t=r.createDocumentFragment(),i.innerHTML=e;while(n=i.firstChild)t.appendChild(n);return t}function c(e,t,n){var r;if(typeof t=="string")t=l(t);else if(t.length){for(r=0;r<t.length;r++)c(e,t[r],n);return e}r=e.length;while(r--)n.call(e[r],t.parentNode?t:t);return e}function h(e,t){return e&&t&&(" "+e.className+" ").indexOf(" "+t+" ")!==-1}function p(e,t){var n;e=e||[],typeof e=="string"&&(e=e.split(" ")),t=t||{},n=e.length;while(n--)t[e[n]]={};return t}function v(e,t){return new v.fn.init(e,t)}function m(e){var t=arguments,n,r,i;for(r=1;r<t.length;r++){n=t[r];for(i in n)e[i]=n[i]}return e}function g(e){var t=[],n,r;for(n=0,r=e.length;n<r;n++)t[n]=e[n];return t}function y(e,t){var n;if(t.indexOf)return t.indexOf(e);n=t.length;while(n--)if(t[n]===e)return n;return-1}function E(e){return e===null||e===t?"":(""+e).replace(w,"")}function S(e,t){var n,r,i,s,o;if(e){n=e.length;if(n===s){for(r in e)if(e.hasOwnProperty(r)){o=e[r];if(t.call(o,o,r)===!1)break}}else for(i=0;i<n;i++){o=e[i];if(t.call(o,o,r)===!1)break}}return e}function x(e,n,r){var i=[],s=e[n];while(s&&s.nodeType!==9&&(r===t||s.nodeType!==1||!v(s).is(r)))s.nodeType===1&&i.push(s),s=s[n];return i}function T(e,t,n,r){var i=[];for(;e;e=e[n])(!r||e.nodeType===r)&&e!==t&&i.push(e);return i}var r=document,i=Array.prototype.push,s=Array.prototype.slice,o=/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,u=e.Event,d=p("fillOpacity fontWeight lineHeight opacity orphans widows zIndex zoom"),b=Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"},w=/^\s*|\s*$/g;return v.fn=v.prototype={constructor:v,selector:"",length:0,init:function(e,t){var n=this,i,s;if(!e)return n;if(e.nodeType)return n.context=n[0]=e,n.length=1,n;if(f(e)){e.charAt(0)==="<"&&e.charAt(e.length-1)===">"&&e.length>=3?i=[null,e,null]:i=o.exec(e);if(!i)return v(t||document).find(e);if(i[1]){s=l(e).firstChild;while(s)this.add(s),s=s.nextSibling}else{s=r.getElementById(i[2]);if(s.id!==i[2])return n.find(e);n.length=1,n[0]=s}}else this.add(e);return n},toArray:function(){return g(this)},add:function(e){var t=this;return b(e)?i.apply(t,e):e instanceof v?t.add(e.toArray()):i.call(t,e),t},attr:function(e,n){var r=this;if(typeof e=="object")S(e,function(e,t){r.attr(t,e)});else{if(!a(n))return r[0]&&r[0].nodeType===1?r[0].getAttribute(e):t;this.each(function(){this.nodeType===1&&this.setAttribute(e,n)})}return r},css:function(e,n){var r=this;if(typeof e=="object")S(e,function(e,t){r.css(t,e)});else{e=e.replace(/-(\D)/g,function(e,t){return t.toUpperCase()});if(!a(n))return r[0]?r[0].style[e]:t;typeof n=="number"&&!d[e]&&(n+="px"),r.each(function(){var t=this.style;e==="opacity"&&this.runtimeStyle&&typeof this.runtimeStyle.opacity=="undefined"&&(t.filter=n===""?"":"alpha(opacity="+n*100+")");try{t[e]=n}catch(r){}})}return r},remove:function(){var e=this,t,n=this.length;while(n--)t=e[n],u.clean(t),t.parentNode&&t.parentNode.removeChild(t);return this},empty:function(){var e=this,t,n=this.length;while(n--){t=e[n];while(t.firstChild)t.removeChild(t.firstChild)}return this},html:function(e){var t=this,n;if(a(e)){n=t.length;while(n--)t[n].innerHTML=e;return t}return t[0]?t[0].innerHTML:""},text:function(e){var t=this,n;if(a(e)){n=t.length;while(n--)t[n].innerText=t[0].textContent=e;return t}return t[0]?t[0].innerText||t[0].textContent:""},append:function(){return c(this,arguments,function(e){this.nodeType===1&&this.appendChild(e)})},prepend:function(){return c(this,arguments,function(e){this.nodeType===1&&this.insertBefore(e,this.firstChild)})},before:function(){var e=this;return e[0]&&e[0].parentNode?c(e,arguments,function(e){this.parentNode.insertBefore(e,this.nextSibling)}):e},after:function(){var e=this;return e[0]&&e[0].parentNode?c(e,arguments,function(e){this.parentNode.insertBefore(e,this)}):e},appendTo:function(e){return v(e).append(this),this},addClass:function(e){return this.toggleClass(e,!0)},removeClass:function(e){return this.toggleClass(e,!1)},toggleClass:function(e,t){var n=this;return e.indexOf(" ")!==-1?S(e.split(" "),function(){n.toggleClass(this,t)}):n.each(function(n){var r;h(n,e)!==t&&(r=n.className,t?n.className+=r?" "+e:e:n.className=E((" "+r+" ").replace(" "+e+" "," ")))}),n},hasClass:function(e){return h(this[0],e)},each:function(e){return S(this,e)},on:function(e,t){return this.each(function(){u.bind(this,e,t)})},off:function(e,t){return this.each(function(){u.unbind(this,e,t)})},show:function(){return this.css("display","")},hide:function(){return this.css("display","none")},slice:function(){return new v(s.apply(this,arguments))},eq:function(e){return e===-1?this.slice(e):this.slice(e,+e+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},replaceWith:function(e){var t=this;return t[0]&&t[0].parentNode.replaceChild(v(e)[0],t[0]),t},wrap:function(e){return e=v(e)[0],this.each(function(){var t=this,n=e.cloneNode(!1);t.parentNode.insertBefore(n,t),n.appendChild(t)})},unwrap:function(){return this.each(function(){var e=this,t=e.firstChild,n;while(t)n=t,t=t.nextSibling,e.parentNode.insertBefore(n,e)})},clone:function(){var e=[];return this.each(function(){e.push(this.cloneNode(!0))}),v(e)},find:function(e){var t,n,r=[];for(t=0,n=this.length;t<n;t++)v.find(e,this[t],r);return v(r)},push:i,sort:[].sort,splice:[].splice},m(v,{extend:m,toArray:g,inArray:y,isArray:b,each:S,trim:E,makeMap:p,find:n,expr:n.selectors,unique:n.uniqueSort,text:n.getText,isXMLDoc:n.isXML,contains:n.contains,filter:function(e,t,n){return n&&(e=":not("+e+")"),t.length===1?t=v.find.matchesSelector(t[0],e)?[t[0]]:[]:t=v.find.matches(e,t),t}}),S({parent:function(e){var t=e.parentNode;return t&&t.nodeType!==11?t:null},parents:function(e){return x(e,"parentNode")},parentsUntil:function(e,t){return x(e,"parentNode",t)},next:function(e){return T(e,"nextSibling",1)},prev:function(e){return T(e,"previousSibling",1)},nextNodes:function(e){return T(e,"nextSibling")},prevNodes:function(e){return T(e,"previousSibling")},children:function(e){return T(e.firstChild,"nextSibling",1)},contents:function(e){return g((e.nodeName==="iframe"?e.contentDocument||e.contentWindow.document:e).childNodes)}},function(e,t){v.fn[e]=function(n){var r=this,i;if(r.length>1)throw new Error("DomQuery only supports traverse functions on a single node.");return r[0]&&(i=t(r[0],n)),i=v(i),n&&e!=="parentsUntil"?i.filter(n):i}}),v.fn.filter=function(e){return v.filter(e)},v.fn.is=function(e){return!!e&&this.filter(e).length>0},v.fn.init.prototype=v.fn,v}),i("tinymce/html/Styles",[],function(){return function(e,t){function p(e,t,n,r){function i(e){return e=parseInt(e,10).toString(16),e.length>1?e:"0"+e}return"#"+i(t)+i(n)+i(r)}var n=/rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/gi,r=/(?:url(?:(?:\(\s*\"([^\"]+)\"\s*\))|(?:\(\s*\'([^\']+)\'\s*\))|(?:\(\s*([^)\s]+)\s*\))))|(?:\'([^\']+)\')|(?:\"([^\"]+)\")/gi,i=/\s*([^:]+):\s*([^;]+);?/g,s=/\s+$/,o,u,a={},f,l,c,h="﻿";e=e||{},t&&(l=t.getValidStyles(),c=t.getInvalidStyles()),f=("\\\" \\' \\; \\: ; : "+h).split(" ");for(u=0;u<f.length;u++)a[f[u]]=h+u,a[h+u]=f[u];return{toHex:function(e){return e.replace(n,p)},parse:function(t){function m(e,t,n){var r,i,s,a;r=o[e+"-top"+t];if(!r)return;i=o[e+"-right"+t];if(!i)return;s=o[e+"-bottom"+t];if(!s)return;a=o[e+"-left"+t];if(!a)return;var f=[r,i,s,a];u=f.length-1;while(u--)if(f[u]!==f[u+1])break;if(u>-1&&n)return;o[e+t]=u==-1?f[0]:f.join(" "),delete o[e+"-top"+t],delete o[e+"-right"+t],delete o[e+"-bottom"+t],delete o[e+"-left"+t]}function g(e){var t=o[e],n;if(!t)return;t=t.split(" "),n=t.length;while(n--)if(t[n]!==t[0])return!1;return o[e]=t[0],!0}function y(e,t,n,r){if(!g(t))return;if(!g(n))return;if(!g(r))return;o[e]=o[t]+" "+o[n]+" "+o[r],delete o[t],delete o[n],delete o[r]}function b(e){return h=!0,a[e]}function w(e,t){return h&&(e=e.replace(/\uFEFF[0-9]/g,function(e){return a[e]})),t||(e=e.replace(/\\([\'\";:])/g,"$1")),e}function E(t,n,r,i,s,o){s=s||o;if(s)return s=w(s),"'"+s.replace(/\'/g,"\\'")+"'";n=w(n||r||i);if(!e.allow_script_urls){var u=n.replace(/[\s\r\n]+/,"");if(/(java|vb)script:/i.test(u))return"";if(!e.allow_svg_data_urls&&/^data:image\/svg/i.test(u))return""}return d&&(n=d.call(v,n,"style")),"url('"+n.replace(/\'/g,"\\'")+"')"}var o={},f,l,c,h,d=e.url_converter,v=e.url_converter_scope||this;if(t){t=t.replace(/[\u0000-\u001F]/g,""),t=t.replace(/\\[\"\';:\uFEFF]/g,b).replace(/\"[^\"]+\"|\'[^\']+\'/g,function(e){return e.replace(/[;:]/g,b)});while(f=i.exec(t)){l=f[1].replace(s,"").toLowerCase(),c=f[2].replace(s,""),c=c.replace(/\\[0-9a-f]+/g,function(e){return String.fromCharCode(parseInt(e.substr(1),16))});if(l&&c.length>0){if(!e.allow_script_urls&&(l=="behavior"||/expression\s*\(|\/\*|\*\//.test(c)))continue;if(l==="font-weight"&&c==="700")c="bold";else if(l==="color"||l==="background-color")c=c.toLowerCase();c=c.replace(n,p),c=c.replace(r,E),o[l]=h?w(c,!0):c}i.lastIndex=f.index+f[0].length}m("border","",!0),m("border","-width"),m("border","-color"),m("border","-style"),m("padding",""),m("margin",""),y("border","border-width","border-style","border-color"),o.border==="medium none"&&delete o.border,o["border-image"]==="none"&&delete o["border-image"]}return o},serialize:function(e,t){function s(t){var r,i,s,u;r=l[t];if(r)for(i=0,s=r.length;i<s;i++)t=r[i],u=e[t],u!==o&&u.length>0&&(n+=(n.length>0?" ":"")+t+": "+u+";")}function u(e,t){var n;return n=c["*"],n&&n[e]?!1:(n=c[t],n&&n[e]?!1:!0)}var n="",r,i;if(t&&l)s("*"),s(t);else for(r in e)i=e[r],i!==o&&i.length>0&&(!c||u(r,t))&&(n+=(
n.length>0?" ":"")+r+": "+i+";");return n}}}}),i("tinymce/dom/TreeWalker",[],function(){return function(e,t){function r(e,n,r,i){var s,o;if(e){if(!i&&e[n])return e[n];if(e!=t){s=e[r];if(s)return s;for(o=e.parentNode;o&&o!=t;o=o.parentNode){s=o[r];if(s)return s}}}}var n=e;this.current=function(){return n},this.next=function(e){return n=r(n,"firstChild","nextSibling",e),n},this.prev=function(e){return n=r(n,"lastChild","previousSibling",e),n}}}),i("tinymce/util/Tools",[],function(){function n(n){return n===null||n===t?"":(""+n).replace(e,"")}function i(e,n){return n?n=="array"&&r(e)?!0:typeof e==n:e!==t}function s(e){var t=[],n,r;for(n=0,r=e.length;n<r;n++)t[n]=e[n];return t}function o(e,t,n){var r;e=e||[],t=t||",",typeof e=="string"&&(e=e.split(t)),n=n||{},r=e.length;while(r--)n[e[r]]={};return n}function u(e,n,r){var i,s;if(!e)return 0;r=r||e;if(e.length!==t){for(i=0,s=e.length;i<s;i++)if(n.call(r,e[i],i,e)===!1)return 0}else for(i in e)if(e.hasOwnProperty(i)&&n.call(r,e[i],i,e)===!1)return 0;return 1}function a(e,t){var n=[];return u(e,function(e){n.push(t(e))}),n}function f(e,t){var n=[];return u(e,function(e){(!t||t(e))&&n.push(e)}),n}function l(e,t,n){var r=this,i,s,o,u,a,f=0;e=/^((static) )?([\w.]+)(:([\w.]+))?/.exec(e),o=e[3].match(/(^|\.)(\w+)$/i)[2],s=r.createNS(e[3].replace(/\.\w+$/,""),n);if(s[o])return;if(e[2]=="static"){s[o]=t,this.onCreate&&this.onCreate(e[2],e[3],s[o]);return}t[o]||(t[o]=function(){},f=1),s[o]=t[o],r.extend(s[o].prototype,t),e[5]&&(i=r.resolve(e[5]).prototype,u=e[5].match(/\.(\w+)$/i)[1],a=s[o],f?s[o]=function(){return i[u].apply(this,arguments)}:s[o]=function(){return this.parent=i[u],a.apply(this,arguments)},s[o].prototype[o]=s[o],r.each(i,function(e,t){s[o].prototype[t]=i[t]}),r.each(t,function(e,t){i[t]?s[o].prototype[t]=function(){return this.parent=i[t],e.apply(this,arguments)}:t!=o&&(s[o].prototype[t]=e)})),r.each(t["static"],function(e,t){s[o][t]=e})}function c(e,t){var n,r;if(e)for(n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1}function h(e,n){var r,i,s,o=arguments,u;for(r=1,i=o.length;r<i;r++){n=o[r];for(s in n)n.hasOwnProperty(s)&&(u=n[s],u!==t&&(e[s]=u))}return e}function p(e,t,n,r){r=r||this,e&&(n&&(e=e[n]),u(e,function(e,i){if(t.call(r,e,i,n)===!1)return!1;p(e,t,n,r)}))}function d(e,t){var n,r;t=t||window,e=e.split(".");for(n=0;n<e.length;n++)r=e[n],t[r]||(t[r]={}),t=t[r];return t}function v(e,t){var n,r;t=t||window,e=e.split(".");for(n=0,r=e.length;n<r;n++){t=t[e[n]];if(!t)break}return t}function m(e,t){return!e||i(e,"array")?e:a(e.split(t||","),n)}var e=/^\s*|\s*$/g,r=Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"};return{trim:n,isArray:r,is:i,toArray:s,makeMap:o,each:u,map:a,grep:f,inArray:c,extend:h,create:l,walk:p,createNS:d,resolve:v,explode:m}}),i("tinymce/dom/Range",["tinymce/util/Tools"],function(e){function t(n){function m(){return i.createDocumentFragment()}function g(e,t){B(a,e,t)}function y(e,t){B(f,e,t)}function b(e){g(e.parentNode,v(e))}function w(e){g(e.parentNode,v(e)+1)}function E(e){y(e.parentNode,v(e))}function S(e){y(e.parentNode,v(e)+1)}function x(e){e?(r[h]=r[c],r[p]=r[l]):(r[c]=r[h],r[l]=r[p]),r.collapsed=a}function T(e){b(e),S(e)}function N(e){g(e,0),y(e,e.nodeType===1?e.childNodes.length:e.nodeValue.length)}function C(e,t){var n=r[c],i=r[l],s=r[h],o=r[p],u=t.startContainer,a=t.startOffset,f=t.endContainer,d=t.endOffset;if(e===0)return H(n,i,u,a);if(e===1)return H(s,o,u,a);if(e===2)return H(s,o,f,d);if(e===3)return H(n,i,f,d)}function k(){j(u)}function L(){return j(s)}function A(){return j(o)}function O(e){var t=this[c],r=this[l],i,s;t.nodeType!==3&&t.nodeType!==4||!t.nodeValue?(t.childNodes.length>0&&(s=t.childNodes[r]),s?t.insertBefore(e,s):t.nodeType==3?n.insertAfter(e,t):t.appendChild(e)):r?r>=t.nodeValue.length?n.insertAfter(e,t):(i=t.splitText(r),t.parentNode.insertBefore(e,i)):t.parentNode.insertBefore(e,t)}function M(e){var t=r.extractContents();r.insertNode(e),e.appendChild(t),r.selectNode(e)}function _(){return d(new t(n),{startContainer:r[c],startOffset:r[l],endContainer:r[h],endOffset:r[p],collapsed:r.collapsed,commonAncestorContainer:r.commonAncestorContainer})}function D(e,t){var n;if(e.nodeType==3)return e;if(t<0)return e;n=e.firstChild;while(n&&t>0)--t,n=n.nextSibling;return n?n:e}function P(){return r[c]==r[h]&&r[l]==r[p]}function H(e,t,r,i){var s,o,u,a,f,l;if(e==r)return t==i?0:t<i?-1:1;s=r;while(s&&s.parentNode!=e)s=s.parentNode;if(s){o=0,u=e.firstChild;while(u!=s&&o<t)o++,u=u.nextSibling;return t<=o?-1:1}s=e;while(s&&s.parentNode!=r)s=s.parentNode;if(s){o=0,u=r.firstChild;while(u!=s&&o<i)o++,u=u.nextSibling;return o<i?-1:1}a=n.findCommonAncestor(e,r),f=e;while(f&&f.parentNode!=a)f=f.parentNode;f||(f=a),l=r;while(l&&l.parentNode!=a)l=l.parentNode;l||(l=a);if(f==l)return 0;u=a.firstChild;while(u){if(u==f)return-1;if(u==l)return 1;u=u.nextSibling}}function B(e,t,i){var s,o;e?(r[c]=t,r[l]=i):(r[h]=t,r[p]=i),s=r[h];while(s.parentNode)s=s.parentNode;o=r[c];while(o.parentNode)o=o.parentNode;o==s?H(r[c],r[l],r[h],r[p])>0&&r.collapse(e):r.collapse(e),r.collapsed=P(),r.commonAncestorContainer=n.findCommonAncestor(r[c],r[h])}function j(e){var t,n=0,i=0,s,o,u,a,f,l;if(r[c]==r[h])return F(e);for(t=r[h],s=t.parentNode;s;t=s,s=s.parentNode){if(s==r[c])return I(t,e);++n}for(t=r[c],s=t.parentNode;s;t=s,s=s.parentNode){if(s==r[h])return q(t,e);++i}o=i-n,u=r[c];while(o>0)u=u.parentNode,o--;a=r[h];while(o<0)a=a.parentNode,o++;for(f=u.parentNode,l=a.parentNode;f!=l;f=f.parentNode,l=l.parentNode)u=f,a=l;return R(u,a,e)}function F(e){var t,n,s,f,h,d,v,g,y;e!=u&&(t=m());if(r[l]==r[p])return t;if(r[c].nodeType==3){n=r[c].nodeValue,s=n.substring(r[l],r[p]),e!=o&&(f=r[c],g=r[l],y=r[p]-r[l],g===0&&y>=f.nodeValue.length-1?f.parentNode.removeChild(f):f.deleteData(g,y),r.collapse(a));if(e==u)return;return s.length>0&&t.appendChild(i.createTextNode(s)),t}f=D(r[c],r[l]),h=r[p]-r[l];while(f&&h>0)d=f.nextSibling,v=X(f,e),t&&t.appendChild(v),--h,f=d;return e!=o&&r.collapse(a),t}function I(e,t){var n,i,s,a,c,h;t!=u&&(n=m()),i=U(e,t),n&&n.appendChild(i),s=v(e),a=s-r[l];if(a<=0)return t!=o&&(r.setEndBefore(e),r.collapse(f)),n;i=e.previousSibling;while(a>0)c=i.previousSibling,h=X(i,t),n&&n.insertBefore(h,n.firstChild),--a,i=c;return t!=o&&(r.setEndBefore(e),r.collapse(f)),n}function q(e,t){var n,i,s,f,l,c;t!=u&&(n=m()),s=z(e,t),n&&n.appendChild(s),i=v(e),++i,f=r[p]-i,s=e.nextSibling;while(s&&f>0)l=s.nextSibling,c=X(s,t),n&&n.appendChild(c),--f,s=l;return t!=o&&(r.setStartAfter(e),r.collapse(a)),n}function R(e,t,n){var i,s,f,l,c,h,p;n!=u&&(s=m()),i=z(e,n),s&&s.appendChild(i),f=v(e),l=v(t),++f,c=l-f,h=e.nextSibling;while(c>0)p=h.nextSibling,i=X(h,n),s&&s.appendChild(i),h=p,--c;return i=U(t,n),s&&s.appendChild(i),n!=o&&(r.setStartAfter(e),r.collapse(a)),s}function U(e,t){var n=D(r[h],r[p]-1),i,s,o,l,c,d=n!=r[h];if(n==e)return W(n,d,f,t);i=n.parentNode,s=W(i,f,f,t);while(i){while(n)o=n.previousSibling,l=W(n,d,f,t),t!=u&&s.insertBefore(l,s.firstChild),d=a,n=o;if(i==e)return s;n=i.previousSibling,i=i.parentNode,c=W(i,f,f,t),t!=u&&c.appendChild(s),s=c}}function z(e,t){var n=D(r[c],r[l]),i=n!=r[c],s,o,h,p,d;if(n==e)return W(n,i,a,t);s=n.parentNode,o=W(s,f,a,t);while(s){while(n)h=n.nextSibling,p=W(n,i,a,t),t!=u&&o.appendChild(p),i=a,n=h;if(s==e)return o;n=s.nextSibling,s=s.parentNode,d=W(s,f,a,t),t!=u&&d.appendChild(o),o=d}}function W(e,t,i,s){var a,c,h,d,v;if(t)return X(e,s);if(e.nodeType==3){a=e.nodeValue,i?(d=r[l],c=a.substring(d),h=a.substring(0,d)):(d=r[p],c=a.substring(0,d),h=a.substring(d)),s!=o&&(e.nodeValue=h);if(s==u)return;return v=n.clone(e,f),v.nodeValue=c,v}if(s==u)return;return n.clone(e,f)}function X(e,t){if(t!=u)return t==o?n.clone(e,a):e;e.parentNode.removeChild(e)}function V(){return n.create("body",null,A()).outerText}var r=this,i=n.doc,s=0,o=1,u=2,a=!0,f=!1,l="startOffset",c="startContainer",h="endContainer",p="endOffset",d=e.extend,v=n.nodeIndex;return d(r,{startContainer:i,startOffset:0,endContainer:i,endOffset:0,collapsed:a,commonAncestorContainer:i,START_TO_START:0,START_TO_END:1,END_TO_END:2,END_TO_START:3,setStart:g,setEnd:y,setStartBefore:b,setStartAfter:w,setEndBefore:E,setEndAfter:S,collapse:x,selectNode:T,selectNodeContents:N,compareBoundaryPoints:C,deleteContents:k,extractContents:L,cloneContents:A,insertNode:O,surroundContents:M,cloneRange:_,toStringIE:V}),r}return t.prototype.toString=function(){return this.toStringIE()},t}),i("tinymce/html/Entities",["tinymce/util/Tools"],function(e){function l(e){var t;return t=document.createElement("div"),t.innerHTML=e,t.textContent||t.innerText||e}function c(e,t){var n,i,s,o={};if(e){e=e.split(","),t=t||10;for(n=0;n<e.length;n+=2)i=String.fromCharCode(parseInt(e[n],t)),r[i]||(s="&"+e[n+1]+";",o[i]=s,o[s]=i);return o}}var t=e.makeMap,n,r,i,s=/[&<>\"\u0060\u007E-\uD7FF\uE000-\uFFEF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,o=/[<>&\u007E-\uD7FF\uE000-\uFFEF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,u=/[<>&\"\']/g,a=/&(#x|#)?([\w]+);/g,f={128:"€",130:"‚",131:"ƒ",132:"„",133:"…",134:"†",135:"‡",136:"ˆ",137:"‰",138:"Š",139:"‹",140:"Œ",142:"Ž",145:"‘",146:"’",147:"“",148:"”",149:"•",150:"–",151:"—",152:"˜",153:"™",154:"š",155:"›",156:"œ",158:"ž",159:"Ÿ"};r={'"':"&quot;","'":"&#39;","<":"&lt;",">":"&gt;","&":"&amp;","`":"&#96;"},i={"&lt;":"<","&gt;":">","&amp;":"&","&quot;":'"',"&apos;":"'"},n=c("50,nbsp,51,iexcl,52,cent,53,pound,54,curren,55,yen,56,brvbar,57,sect,58,uml,59,copy,5a,ordf,5b,laquo,5c,not,5d,shy,5e,reg,5f,macr,5g,deg,5h,plusmn,5i,sup2,5j,sup3,5k,acute,5l,micro,5m,para,5n,middot,5o,cedil,5p,sup1,5q,ordm,5r,raquo,5s,frac14,5t,frac12,5u,frac34,5v,iquest,60,Agrave,61,Aacute,62,Acirc,63,Atilde,64,Auml,65,Aring,66,AElig,67,Ccedil,68,Egrave,69,Eacute,6a,Ecirc,6b,Euml,6c,Igrave,6d,Iacute,6e,Icirc,6f,Iuml,6g,ETH,6h,Ntilde,6i,Ograve,6j,Oacute,6k,Ocirc,6l,Otilde,6m,Ouml,6n,times,6o,Oslash,6p,Ugrave,6q,Uacute,6r,Ucirc,6s,Uuml,6t,Yacute,6u,THORN,6v,szlig,70,agrave,71,aacute,72,acirc,73,atilde,74,auml,75,aring,76,aelig,77,ccedil,78,egrave,79,eacute,7a,ecirc,7b,euml,7c,igrave,7d,iacute,7e,icirc,7f,iuml,7g,eth,7h,ntilde,7i,ograve,7j,oacute,7k,ocirc,7l,otilde,7m,ouml,7n,divide,7o,oslash,7p,ugrave,7q,uacute,7r,ucirc,7s,uuml,7t,yacute,7u,thorn,7v,yuml,ci,fnof,sh,Alpha,si,Beta,sj,Gamma,sk,Delta,sl,Epsilon,sm,Zeta,sn,Eta,so,Theta,sp,Iota,sq,Kappa,sr,Lambda,ss,Mu,st,Nu,su,Xi,sv,Omicron,t0,Pi,t1,Rho,t3,Sigma,t4,Tau,t5,Upsilon,t6,Phi,t7,Chi,t8,Psi,t9,Omega,th,alpha,ti,beta,tj,gamma,tk,delta,tl,epsilon,tm,zeta,tn,eta,to,theta,tp,iota,tq,kappa,tr,lambda,ts,mu,tt,nu,tu,xi,tv,omicron,u0,pi,u1,rho,u2,sigmaf,u3,sigma,u4,tau,u5,upsilon,u6,phi,u7,chi,u8,psi,u9,omega,uh,thetasym,ui,upsih,um,piv,812,bull,816,hellip,81i,prime,81j,Prime,81u,oline,824,frasl,88o,weierp,88h,image,88s,real,892,trade,89l,alefsym,8cg,larr,8ch,uarr,8ci,rarr,8cj,darr,8ck,harr,8dl,crarr,8eg,lArr,8eh,uArr,8ei,rArr,8ej,dArr,8ek,hArr,8g0,forall,8g2,part,8g3,exist,8g5,empty,8g7,nabla,8g8,isin,8g9,notin,8gb,ni,8gf,prod,8gh,sum,8gi,minus,8gn,lowast,8gq,radic,8gt,prop,8gu,infin,8h0,ang,8h7,and,8h8,or,8h9,cap,8ha,cup,8hb,int,8hk,there4,8hs,sim,8i5,cong,8i8,asymp,8j0,ne,8j1,equiv,8j4,le,8j5,ge,8k2,sub,8k3,sup,8k4,nsub,8k6,sube,8k7,supe,8kl,oplus,8kn,otimes,8l5,perp,8m5,sdot,8o8,lceil,8o9,rceil,8oa,lfloor,8ob,rfloor,8p9,lang,8pa,rang,9ea,loz,9j0,spades,9j3,clubs,9j5,hearts,9j6,diams,ai,OElig,aj,oelig,b0,Scaron,b1,scaron,bo,Yuml,m6,circ,ms,tilde,802,ensp,803,emsp,809,thinsp,80c,zwnj,80d,zwj,80e,lrm,80f,rlm,80j,ndash,80k,mdash,80o,lsquo,80p,rsquo,80q,sbquo,80s,ldquo,80t,rdquo,80u,bdquo,810,dagger,811,Dagger,81g,permil,81p,lsaquo,81q,rsaquo,85c,euro",32);var h={encodeRaw:function(e,t){return e.replace(t?s:o,function(e){return r[e]||e})},encodeAllRaw:function(e){return(""+e).replace(u,function(e){return r[e]||e})},encodeNumeric:function(e,t){return e.replace(t?s:o,function(e){return e.length>1?"&#"+((e.charCodeAt(0)-55296)*1024+(e.charCodeAt(1)-56320)+65536)+";":r[e]||"&#"+e.charCodeAt(0)+";"})},encodeNamed:function(e,t,i){return i=i||n,e.replace(t?s:o,function(e){return r[e]||i[e]||e})},getEncodeFunc:function(e,i){function u(e,t){return e.replace(t?s:o,function(e){return r[e]||i[e]||"&#"+e.charCodeAt(0)+";"||e})}function a(e,t){return h.encodeNamed(e,t,i)}return i=c(i)||n,e=t(e.replace(/\+/g,",")),e.named&&e.numeric?u:e.named?i?a:h.encodeNamed:e.numeric?h.encodeNumeric:h.encodeRaw},decode:function(e){return e.replace(a,function(e,t,r){return t?(r=parseInt(r,t.length===2?16:10),r>65535?(r-=65536,String.fromCharCode(55296+(r>>10),56320+(r&1023))):f[r]||String.fromCharCode(r)):i[e]||n[e]||l(e)})}};return h}),i("tinymce/Env",[],function(){var e=navigator,t=e.userAgent,n,r,i,s,o,u,a;n=window.opera&&window.opera.buildNumber,r=/WebKit/.test(t),i=!r&&!n&&/MSIE/gi.test(t)&&/Explorer/gi.test(e.appName),i=i&&/MSIE (\w+)\./.exec(t)[1],s=t.indexOf("Trident/")==-1||t.indexOf("rv:")==-1&&e.appName.indexOf("Netscape")==-1?!1:11,i=i||s,o=!r&&!s&&/Gecko/.test(t),u=t.indexOf("Mac")!=-1,a=/(iPad|iPhone)/.test(t);var f=!a||t.match(/AppleWebKit\/(\d*)/)[1]>=534;return{opera:n,webkit:r,ie:i,gecko:o,mac:u,iOS:a,contentEditable:f,transparentSrc:"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",caretAfter:i!=8,range:window.getSelection&&"Range"in window,documentMode:i?document.documentMode||7:10}}),i("tinymce/dom/StyleSheetLoader",[],function(){return function(e,t){function s(t){e.getElementsByTagName("head")[0].appendChild(t)}function o(t,o,u){function h(){var e=c.passed,t=e.length;while(t--)e[t]();c.status=2,c.passed=[],c.failed=[]}function p(){var e=c.failed,t=e.length;while(t--)e[t]();c.status=3,c.passed=[],c.failed=[]}function d(){var e=navigator.userAgent.match(/WebKit\/(\d*)/);return!!(e&&e[1]<536)}function v(e,t){e()||((new Date).getTime()-l<i?window.setTimeout(t,0):p())}function m(){v(function(){var t=e.styleSheets,n,r=t.length,i;while(r--){n=t[r],i=n.ownerNode?n.ownerNode:n.owningElement;if(i&&i.id===a.id)return h(),!0}},m)}function g(){v(function(){try{var e=f.sheet.cssRules;return h(),!!e}catch(t){}},g)}var a,f,l,c;r[t]?c=r[t]:(c={passed:[],failed:[]},r[t]=c),o&&c.passed.push(o),u&&c.failed.push(u);if(c.status==1)return;if(c.status==2){h();return}if(c.status==3){p();return}c.status=1,a=e.createElement("link"),a.rel="stylesheet",a.type="text/css",a.id="u"+n++,a.async=!1,a.defer=!1,l=(new Date).getTime();if("onload"in a&&!d())a.onload=m,a.onerror=p;else{if(navigator.userAgent.indexOf("Firefox")>0){f=e.createElement("style"),f.textContent='@import "'+t+'"',g(),s(f);return}m()}s(a),a.href=t}var n=0,r={},i;t=t||{},i=t.maxLoadTime||5e3,this.load=o}}),i("tinymce/dom/DOMUtils",["tinymce/dom/Sizzle","tinymce/html/Styles","tinymce/dom/EventUtils","tinymce/dom/TreeWalker","tinymce/dom/Range","tinymce/html/Entities","tinymce/Env","tinymce/util/Tools","tinymce/dom/StyleSheetLoader"],function(e,n,r,i,s,o,u,a,f){function w(e,t){var i=this,s;i.doc=e,i.win=window,i.files={},i.counter=0,i.stdMode=!m||e.documentMode>=8,i.boxModel=!m||e.compatMode=="CSS1Compat"||i.stdMode,i.hasOuterHTML="outerHTML"in e.createElement("a"),i.styleSheetLoader=new f(e),this.boundEvents=[],i.settings=t=d({keep_values:!1,hex_colors:1},t),i.schema=t.schema,i.styles=new n({url_converter:t.url_converter,url_converter_scope:t.url_converter_scope},t.schema),i.fixDoc(e),i.events=t.ownEvents?new r(t.proxy):r.Event,s=t.schema?t.schema.getBlockElements():{},i.isBlock=function(e){if(!e)return!1;var t=e.nodeType;return t?t===1&&!!s[e.nodeName]:!!s[e]}}var l=a.each,c=a.is,h=a.grep,p=a.trim,d=a.extend,v=u.webkit,m=u.ie,g=/^([a-z0-9],?)+$/i,y=/^[ \t\r\n]*$/,b=a.makeMap("fillOpacity fontWeight lineHeight opacity orphans widows zIndex zoom"," ");return w.prototype={root:null,props:{"for":"htmlFor","class":"className",className:"className",checked:"checked",disabled:"disabled",maxlength:"maxLength",readonly:"readOnly",selected:"selected",value:"value",id:"id",name:"name",type:"type"},fixDoc:function(e){var t=this.settings,n;if(m&&t.schema){"abbr article aside audio canvas details figcaption figure footer header hgroup mark menu meter nav output progress section summary time video".replace(/\w+/g,function(t){e.createElement(t)});for(n in t.schema.getCustomElements())e.createElement(n)}},clone:function(e,t){var n=this,r,i;return!m||e.nodeType!==1||t?e.cloneNode(t):(i=n.doc,t?r.firstChild:(r=i.createElement(e.nodeName),l(n.getAttribs(e),function(t){n.setAttrib(r,t.nodeName,n.getAttrib(e,t.nodeName))}),r))},getRoot:function(){var e=this;return e.get(e.settings.root_element)||e.doc.body},getViewPort:function(e){var t,n;return e=e?e:this.win,t=e.document,n=this.boxModel?t.documentElement:t.body,{x:e.pageXOffset||n.scrollLeft,y:e.pageYOffset||n.scrollTop,w:e.innerWidth||n.clientWidth,h:e.innerHeight||n.clientHeight}},getRect:function(e){var t=this,n,r;return e=t.get(e),n=t.getPos(e),r=t.getSize(e),{x:n.x,y:n.y,w:r.w,h:r.h}},getSize:function(e){var t=this,n,r;return e=t.get(e),n=t.getStyle(e,"width"),r=t.getStyle(e,"height"),n.indexOf("px")===-1&&(n=0),r.indexOf("px")===-1&&(r=0),{w:parseInt(n,10)||e.offsetWidth||e.clientWidth,h:parseInt(r,10)||e.offsetHeight||e.clientHeight}},getParent:function(e,t,n){return this.getParents(e,t,n,!1)},getParents:function(e,n,r,i){var s=this,o,u=[];e=s.get(e),i=i===t,r=r||(s.getRoot().nodeName!="BODY"?s.getRoot().parentNode:null),c(n,"string")&&(o=n,n==="*"?n=function(e){return e.nodeType==1}:n=function(e){return s.is(e,o)});while(e){if(e==r||!e.nodeType||e.nodeType===9)break;if(!n||n(e)){if(!i)return e;u.push(e)}e=e.parentNode}return i?u:null},get:function(e){var t;if(e&&this.doc&&typeof e=="string"){t=e,e=this.doc.getElementById(e);if(e&&e.id!==t)return this.doc.getElementsByName(t)[1]}return e},getNext:function(e,t){return this._findSib(e,t,"nextSibling")},getPrev:function(e,t){return this._findSib(e,t,"previousSibling")},select:function(t,n){var r=this;return e(t,r.get(n)||r.get(r.settings.root_element)||r.doc,[])},is:function(n,r){var i;if(n.length===t){if(r==="*")return n.nodeType==1;if(g.test(r)){r=r.toLowerCase().split(/,/),n=n.nodeName.toLowerCase();for(i=r.length-1;i>=0;i--)if(r[i]==n)return!0;return!1}}if(n.nodeType&&n.nodeType!=1)return!1;var s=n.nodeType?[n]:n;return e(r,s[0].ownerDocument||s[0],null,s).length>0},add:function(e,t,n,r,i){var s=this;return this.run(e,function(e){var o;return o=c(t,"string")?s.doc.createElement(t):t,s.setAttribs(o,n),r&&(r.nodeType?o.appendChild(r):s.setHTML(o,r)),i?o:e.appendChild(o)})},create:function(e,t,n){return this.add(this.doc.createElement(e),e,t,n,1)},createHTML:function(e,t,n){var r="",i;r+="<"+e;for(i in t)t.hasOwnProperty(i)&&t[i]!==null&&typeof t[i]!="undefined"&&(r+=" "+i+'="'+this.encode(t[i])+'"');return typeof n!="undefined"?r+">"+n+"</"+e+">":r+" />"},createFragment:function(e){var t,n,r=this.doc,i;i=r.createElement("div"),t=r.createDocumentFragment(),e&&(i.innerHTML=e);while(n=i.firstChild)t.appendChild(n);return t},remove:function(e,t){return this.run(e,function(e){var n,r=e.parentNode;if(!r)return null;if(t)while(n=e.firstChild)!m||n.nodeType!==3||n.nodeValue?r.insertBefore(n,e):e.removeChild(n);return r.removeChild(e)})},setStyle:function(e,t,n){return this.run(e,function(e){var r=this,i,s;if(t)if(typeof t=="string"){i=e.style,t=t.replace(/-(\D)/g,function(e,t){return t.toUpperCase()}),(typeof n=="number"||/^[\-0-9\.]+$/.test(n))&&!b[t]&&(n+="px"),t==="opacity"&&e.runtimeStyle&&typeof e.runtimeStyle.opacity=="undefined"&&(i.filter=n===""?"":"alpha(opacity="+n*100+")"),t=="float"&&(t="cssFloat"in e.style?"cssFloat":"styleFloat");try{i[t]=n}catch(o){}r.settings.update_styles&&e.removeAttribute("data-mce-style")}else for(s in t)r.setStyle(e,s,t[s])})},getStyle:function(e,n,r){e=this.get(e);if(!e)return;if(this.doc.defaultView&&r){n=n.replace(/[A-Z]/g,function(e){return"-"+e});try{return this.doc.defaultView.getComputedStyle(e,null).getPropertyValue(n)}catch(i){return null}}return n=n.replace(/-(\D)/g,function(e,t){return t.toUpperCase()}),n=="float"&&(n=m?"styleFloat":"cssFloat"),e.currentStyle&&r?e.currentStyle[n]:e.style?e.style[n]:t},setStyles:function(e,t){this.setStyle(e,t)},css:function(e,t,n){this.setStyle(e,t,n)},removeAllAttribs:function(e){return this.run(e,function(e){var t,n=e.attributes;for(t=n.length-1;t>=0;t--)e.removeAttributeNode(n.item(t))})},setAttrib:function(e,t,n){var r=this;if(!e||!t)return;return this.run(e,function(e){var i=r.settings,s=e.getAttribute(t);if(n!==null)switch(t){case"style":if(!c(n,"string")){l(n,function(t,n){r.setStyle(e,n,t)});return}i.keep_values&&(n?e.setAttribute("data-mce-style",n,2):e.removeAttribute("data-mce-style",2)),e.style.cssText=n;break;case"class":e.className=n||"";break;case"src":case"href":i.keep_values&&(i.url_converter&&(n=i.url_converter.call(i.url_converter_scope||r,n,t,e)),r.setAttrib(e,"data-mce-"+t,n,2));break;case"shape":e.setAttribute("data-mce-style",n)}c(n)&&n!==null&&n.length!==0?e.setAttribute(t,""+n,2):e.removeAttribute(t,2),s!=n&&i.onSetAttrib&&i.onSetAttrib({attrElm:e,attrName:t,attrValue:n})})},setAttribs:function(e,t){var n=this;return this.run(e,function(e){l(t,function(t,r){n.setAttrib(e,r,t)})})},getAttrib:function(e,t,n){var r,i=this,s;e=i.get(e);if(!e||e.nodeType!==1)return n===s?!1:n;c(n)||(n="");if(/^(src|href|style|coords|shape)$/.test(t)){r=e.getAttribute("data-mce-"+t);if(r)return r}m&&i.props[t]&&(r=e[i.props[t]],r=r&&r.nodeValue?r.nodeValue:r),r||(r=e.getAttribute(t,2));if(/^(checked|compact|declare|defer|disabled|ismap|multiple|nohref|noshade|nowrap|readonly|selected)$/.test(t))return e[i.props[t]]===!0&&r===""?t:r?t:"";if(e.nodeName==="FORM"&&e.getAttributeNode(t))return e.getAttributeNode(t).nodeValue;t==="style"&&(r=r||e.style.cssText,r&&(r=i.serializeStyle(i.parseStyle(r),e.nodeName),i.settings.keep_values&&e.setAttribute("data-mce-style",r))),v&&t==="class"&&r&&(r=r.replace(/(apple|webkit)\-[a-z\-]+/gi,""));if(m)switch(t){case"rowspan":case"colspan":r===1&&(r="");break;case"size":if(r==="+0"||r===20||r===0)r="";break;case"width":case"height":case"vspace":case"checked":case"disabled":case"readonly":r===0&&(r="");break;case"hspace":r===-1&&(r="");break;case"maxlength":case"tabindex":if(r===32768||r===2147483647||r==="32768")r="";break;case"multiple":case"compact":case"noshade":case"nowrap":if(r===65535)return t;return n;case"shape":r=r.toLowerCase();break;default:t.indexOf("on")===0&&r&&(r=(""+r).replace(/^function\s+\w+\(\)\s+\{\s+(.*)\s+\}$/,"$1"))}return r!==s&&r!==null&&r!==""?""+r:n},getPos:function(e,t){var n=this,r=0,i=0,s,o=n.doc,u;e=n.get(e),t=t||o.body;if(e){if(t===o.body&&e.getBoundingClientRect)return u=e.getBoundingClientRect(),t=n.boxModel?o.documentElement:o.body,r=u.left+(o.documentElement.scrollLeft||o.body.scrollLeft)-t.clientLeft,i=u.top+(o.documentElement.scrollTop||o.body.scrollTop)-t.clientTop,{x:r,y:i};s=e;while(s&&s!=t&&s.nodeType)r+=s.offsetLeft||0,i+=s.offsetTop||0,s=s.offsetParent;s=e.parentNode;while(s&&s!=t&&s.nodeType)r-=s.scrollLeft||0,i-=s.scrollTop||0,s=s.parentNode}return{x:r,y:i}},parseStyle:function(e){return this.styles.parse(e)},serializeStyle:function(e,t){return this.styles.serialize(e,t)},addStyle:function(e){var t=this,n=t.doc,r,i;if(t!==w.DOM&&n===document){var s=w.DOM.addedStyles;s=s||[];if(s[e])return;s[e]=!0,w.DOM.addedStyles=s}i=n.getElementById("mceDefaultStyles"),i||(i=n.createElement("style"),i.id="mceDefaultStyles",i.type="text/css",r=n.getElementsByTagName("head")[0],r.firstChild?r.insertBefore(i,r.firstChild):r.appendChild(i)),i.styleSheet?i.styleSheet.cssText+=e:i.appendChild(n.createTextNode(e))},loadCSS:function(e){var t=this,n=t.doc,r;if(t!==w.DOM&&n===document){w.DOM.loadCSS(e);return}e||(e=""),r=n.getElementsByTagName("head")[0],l(e.split(","),function(e){var i;if(t.files[e])return;t.files[e]=!0,i=t.create("link",{rel:"stylesheet",href:e}),m&&n.documentMode&&n.recalc&&(i.onload=function(){n.recalc&&n.recalc(),i.onload=null}),r.appendChild(i)})},addClass:function(e,t){return this.run(e,function(e){var n;return t?this.hasClass(e,t)?e.className:(n=this.removeClass(e,t),e.className=n=(n!==""?n+" ":"")+t,n):0})},removeClass:function(e,t){var n=this,r;return n.run(e,function(e){var i;return n.hasClass(e,t)?(r||(r=new RegExp("(^|\\s+)"+t+"(\\s+|$)","g")),i=e.className.replace(r," "),i=p(i!=" "?i:""),e.className=i,i||(e.removeAttribute("class"),e.removeAttribute("className")),i):e.className})},hasClass:function(e,t){return e=this.get(e),!e||!t?!1:(" "+e.className+" ").indexOf(" "+t+" ")!==-1},toggleClass:function(e,n,r){r=r===t?!this.hasClass(e,n):r,this.hasClass(e,n)!==r&&(r?this.addClass(e,n):this.removeClass(e,n))},show:function(e){return this.setStyle(e,"display","block")},hide:function(e){return this.setStyle(e,"display","none")},isHidden:function(e){return e=this.get(e),!e||e.style.display=="none"||this.getStyle(e,"display")=="none"},uniqueId:function(e){return(e?e:"mce_")+this.counter++},setHTML:function(e,t){var n=this;return n.run(e,function(e){if(m){while(e.firstChild)e.removeChild(e.firstChild);try{e.innerHTML="<br />"+t,e.removeChild(e.firstChild)}catch(r){var i=n.create("div");i.innerHTML="<br />"+t,l(h(i.childNodes),function(t,n){n&&e.canHaveHTML&&e.appendChild(t)})}}else e.innerHTML=t;return t})},getOuterHTML:function(e){var t,n=this;return e=n.get(e),e?e.nodeType===1&&n.hasOuterHTML?e.outerHTML:(t=(e.ownerDocument||n.doc).createElement("body"),t.appendChild(e.cloneNode(!0)),t.innerHTML):null},setOuterHTML:function(e,t,n){var r=this;return r.run(e,function(e){function i(){var i,s;s=n.createElement("body"),s.innerHTML=t,i=s.lastChild;while(i)r.insertAfter(i.cloneNode(!0),e),i=i.previousSibling;r.remove(e)}if(e.nodeType==1){n=n||e.ownerDocument||r.doc;if(m)try{e.nodeType==1&&r.hasOuterHTML?e.outerHTML=t:i()}catch(s){i()}else i()}})},decode:o.decode,encode:o.encodeAllRaw,insertAfter:function(e,t){return t=this.get(t),this.run(e,function(e){var n,r;return n=t.parentNode,r=t.nextSibling,r?n.insertBefore(e,r):n.appendChild(e),e})},replace:function(e,t,n){var r=this;return r.run(t,function(t){return c(t,"array")&&(e=e.cloneNode(!0)),n&&l(h(t.childNodes),function(t){e.appendChild(t)}),t.parentNode.replaceChild(e,t)})},rename:function(e,t){var n=this,r;return e.nodeName!=t.toUpperCase()&&(r=n.create(t),l(n.getAttribs(e),function(t){n.setAttrib(r,t.nodeName,n.getAttrib(e,t.nodeName))}),n.replace(r,e,1)),r||e},findCommonAncestor:function(e,t){var n=e,r;while(n){r=t;while(r&&n!=r)r=r.parentNode;if(n==r)break;n=n.parentNode}return!n&&e.ownerDocument?e.ownerDocument.documentElement:n},toHex:function(e){return this.styles.toHex(a.trim(e))},run:function(e,t,n){var r=this,i;return typeof e=="string"&&(e=r.get(e)),e?(n=n||this,!e.nodeType&&(e.length||e.length===0)?(i=[],l(e,function(e,s){e&&(typeof e=="string"&&(e=r.get(e)),i.push(t.call(n,e,s)))}),i):t.call(n,e)):!1},getAttribs:function(e){var t;e=this.get(e);if(!e)return[];if(m){t=[];if(e.nodeName=="OBJECT")return e.attributes;e.nodeName==="OPTION"&&this.getAttrib(e,"selected")&&t.push({specified:1,nodeName:"selected"});var n=/<\/?[\w:\-]+ ?|=[\"][^\"]+\"|=\'[^\']+\'|=[\w\-]+|>/gi;return e.cloneNode(!1).outerHTML.replace(n,"").replace(/[\w:\-]+/gi,function(e){t.push({specified:1,nodeName:e})}),t}return e.attributes},isEmpty:function(e,t){var n=this,r,s,o,u,a,f=0;e=e.firstChild;if(e){u=new i(e,e.parentNode),t=t||n.schema?n.schema.getNonEmptyElements():null;do{o=e.nodeType;if(o===1){if(e.getAttribute("data-mce-bogus"))continue;a=e.nodeName.toLowerCase();if(t&&t[a]){if(a==="br"){f++;continue}return!1}s=n.getAttribs(e),r=s.length;while(r--){a=s[r].nodeName;if(a==="name"||a==="data-mce-bookmark")return!1}}if(o==8)return!1;if(o===3&&!y.test(e.nodeValue))return!1}while(e=u.next())}return f<=1},createRng:function(){var e=this.doc;return e.createRange?e.createRange():new s(this)},nodeIndex:function(e,t){var n=0,r,i;if(e)for(r=e.nodeType,e=e.previousSibling;e;e=e.previousSibling){i=e.nodeType;if(t&&i==3)if(i==r||!e.nodeValue.length)continue;n++,r=i}return n},split:function(e,t,n){function a(e){function s(e){var t=e.previousSibling&&e.previousSibling.nodeName=="SPAN",n=e.nextSibling&&e.nextSibling.nodeName=="SPAN";return t&&n}var t,n=e.childNodes,i=e.nodeType;if(i==1&&e.getAttribute("data-mce-type")=="bookmark")return;for(t=n.length-1;t>=0;t--)a(n[t]);if(i!=9){if(i==3&&e.nodeValue.length>0){var o=p(e.nodeValue).length;if(!r.isBlock(e.parentNode)||o>0||o===0&&s(e))return}else if(i==1){n=e.childNodes,n.length==1&&n[0]&&n[0].nodeType==1&&n[0].getAttribute("data-mce-type")=="bookmark"&&e.parentNode.insertBefore(n[0],e);if(n.length||/^(br|hr|input|img)$/i.test(e.nodeName))return}r.remove(e)}return e}var r=this,i=r.createRng(),s,o,u;if(e&&t)return i.setStart(e.parentNode,r.nodeIndex(e)),i.setEnd(t.parentNode,r.nodeIndex(t)),s=i.extractContents(),i=r.createRng(),i.setStart(t.parentNode,r.nodeIndex(t)+1),i.setEnd(e.parentNode,r.nodeIndex(e)+1),o=i.extractContents(),u=e.parentNode,u.insertBefore(a(s),e),n?u.replaceChild(n,t):u.insertBefore(t,e),u.insertBefore(a(o),e),r.remove(e),n||t},bind:function(e,t,n,r){var i=this;if(a.isArray(e)){var s=e.length;while(s--)e[s]=i.bind(e[s],t,n,r);return e}return i.settings.collect&&(e===i.doc||e===i.win)&&i.boundEvents.push([e,t,n,r]),i.events.bind(e,t,n,r||i)},unbind:function(e,t,n){var r=this,i;if(a.isArray(e)){i=e.length;while(i--)e[i]=r.unbind(e[i],t,n);return e}if(r.boundEvents&&(e===r.doc||e===r.win)){i=r.boundEvents.length;while(i--){var s=r.boundEvents[i];e==s[0]&&(!t||t==s[1])&&(!n||n==s[2])&&this.events.unbind(s[0],s[1],s[2])}}return this.events.unbind(e,t,n)},fire:function(e,t,n){return this.events.fire(e,t,n)},getContentEditable:function(e){var t;return!e||e.nodeType!=1?null:(t=e.getAttribute("data-mce-contenteditable"),t&&t!=="inherit"?t:e.contentEditable!=="inherit"?e.contentEditable:null)},getContentEditableParent:function(e){var t=this.getRoot(),n=null;for(;e&&e!==t;e=e.parentNode){n=this.getContentEditable(e);if(n!==null)break}return n},destroy:function(){var t=this;if(t.boundEvents){var n=t.boundEvents.length;while(n--){var r=t.boundEvents[n];this.events.unbind(r[0],r[1],r[2])}t.boundEvents=null}e.setDocument&&e.setDocument(),t.win=t.doc=t.root=t.events=t.frag=null},isChildOf:function(e,t){while(e){if(t===e)return!0;e=e.parentNode}return!1},dumpRng:function(e){return"startContainer: "+e.startContainer.nodeName+", startOffset: "+e.startOffset+", endContainer: "+e.endContainer.nodeName+", endOffset: "+e.endOffset},_findSib:function(e,t,n){var r=this,i=t;if(e){typeof i=="string"&&(i=function(e){return r.is(e,t)});for(e=e[n];e;e=e[n])if(i(e))return e}return null}},w.DOM=new w(document),w}),i("tinymce/dom/ScriptLoader",["tinymce/dom/DOMUtils","tinymce/util/Tools"],function(e,t){function s(){function h(e,t){function o(){r.remove(s),i&&(i.onreadystatechange=i.onload=i=null),t()}function u(){typeof console!="undefined"&&console.log&&console.log("Failed to load: "+e)}var r=n,i,s;s=r.uniqueId(),i=document.createElement("script"),i.id=s,i.type="text/javascript",i.src=e,"onreadystatechange"in i?i.onreadystatechange=function(){/loaded|complete/.test(i.readyState)&&o()}:i.onload=o,i.onerror=u,(document.getElementsByTagName("head")[0]||document.body).appendChild(i)}var e=0,t=1,s=2,o={},u=[],a={},f=[],l=0,c;this.isDone=function(e){return o[e]==s},this.markDone=function(e){o[e]=s},this.add=this.load=function(t,n,r){var i=o[t];i==c&&(u.push(t),o[t]=e),n&&(a[t]||(a[t]=[]),a[t].push({func:n,scope:r||this}))},this.loadQueue=function(e,t){this.loadScripts(u,e,t)},this.loadScripts=function(e,n,u){function d(e){r(a[e],function(e){e.func.call(e.scope)}),a[e]=c}var p;f.push({func:n,scope:u||this}),p=function(){var n=i(e);e.length=0,r(n,function(e){if(o[e]==s){d(e);return}o[e]!=t&&(o[e]=t,l++,h(e,function(){o[e]=s,l--,d(e),p()}))}),l||(r(f,function(e){e.func.call(e.scope)}),f.length=0)},p()}}var n=e.DOM,r=t.each,i=t.grep;return s.ScriptLoader=new s,s}),i("tinymce/AddOnManager",["tinymce/dom/ScriptLoader","tinymce/util/Tools"],function(e,n){function i(){var e=this;e.items=[],e.urls={},e.lookup={}}var r=n.each;return i.prototype={get:function(e){return this.lookup[e]?this.lookup[e].instance:t},dependencies:function(e){var t;return this.lookup[e]&&(t=this.lookup[e].dependencies),t||[]},requireLangPack:function(t,n){var r=i.language;if(r&&i.languageLoad!==!1){if(n){n=","+n+",";if(n.indexOf(","+r.substr(0,2)+",")!=-1)r=r.substr(0,2);else if(n.indexOf(","+r+",")==-1)return}e.ScriptLoader.add(this.urls[t]+"/langs/"+r+".js")}},add:function(e,t,n){return this.items.push(t),this.lookup[e]={instance:t,dependencies:n},t},createUrl:function(e,t){return typeof t=="object"?t:{prefix:e.prefix,resource:t,suffix:e.suffix}},addComponents:function(t,n){var i=this.urls[t];r(n,function(t){e.ScriptLoader.add(i+"/"+t)})},load:function(n,s,o,u){function l(){var i=a.dependencies(n);r(i,function(e){var n=a.createUrl(s,e);a.load(n.resource,n,t,t)}),o&&(u?o.call(u):o.call(e))}var a=this,f=s;if(a.urls[n])return;typeof s=="object"&&(f=s.prefix+s
.resource+s.suffix),f.indexOf("/")!==0&&f.indexOf("://")==-1&&(f=i.baseURL+"/"+f),a.urls[n]=f.substring(0,f.lastIndexOf("/")),a.lookup[n]?l():e.ScriptLoader.add(f,l,u)}},i.PluginManager=new i,i.ThemeManager=new i,i}),i("tinymce/html/Node",[],function(){function n(e,t,n){var r,i,s=n?"lastChild":"firstChild",o=n?"prev":"next";if(e[s])return e[s];if(e!==t){r=e[o];if(r)return r;for(i=e.parent;i&&i!==t;i=i.parent){r=i[o];if(r)return r}}}function r(e,t){this.name=e,this.type=t,t===1&&(this.attributes=[],this.attributes.map={})}var e=/^[ \t\r\n]*$/,t={"#text":3,"#comment":8,"#cdata":4,"#pi":7,"#doctype":10,"#document-fragment":11};return r.prototype={replace:function(e){var t=this;return e.parent&&e.remove(),t.insert(e,t),t.remove(),t},attr:function(e,t){var n=this,r,i,s;if(typeof e!="string"){for(i in e)n.attr(i,e[i]);return n}if(r=n.attributes){if(t!==s){if(t===null){if(e in r.map){delete r.map[e],i=r.length;while(i--)if(r[i].name===e)return r=r.splice(i,1),n}return n}if(e in r.map){i=r.length;while(i--)if(r[i].name===e){r[i].value=t;break}}else r.push({name:e,value:t});return r.map[e]=t,n}return r.map[e]}},clone:function(){var e=this,t=new r(e.name,e.type),n,i,s,o,u;if(s=e.attributes){u=[],u.map={};for(n=0,i=s.length;n<i;n++)o=s[n],o.name!=="id"&&(u[u.length]={name:o.name,value:o.value},u.map[o.name]=o.value);t.attributes=u}return t.value=e.value,t.shortEnded=e.shortEnded,t},wrap:function(e){var t=this;return t.parent.insert(e,t),e.append(t),t},unwrap:function(){var e=this,t,n;for(t=e.firstChild;t;)n=t.next,e.insert(t,e,!0),t=n;e.remove()},remove:function(){var e=this,t=e.parent,n=e.next,r=e.prev;return t&&(t.firstChild===e?(t.firstChild=n,n&&(n.prev=null)):r.next=n,t.lastChild===e?(t.lastChild=r,r&&(r.next=null)):n.prev=r,e.parent=e.next=e.prev=null),e},append:function(e){var t=this,n;return e.parent&&e.remove(),n=t.lastChild,n?(n.next=e,e.prev=n,t.lastChild=e):t.lastChild=t.firstChild=e,e.parent=t,e},insert:function(e,t,n){var r;return e.parent&&e.remove(),r=t.parent||this,n?(t===r.firstChild?r.firstChild=e:t.prev.next=e,e.prev=t.prev,e.next=t,t.prev=e):(t===r.lastChild?r.lastChild=e:t.next.prev=e,e.next=t.next,e.prev=t,t.next=e),e.parent=r,e},getAll:function(e){var t=this,r,i=[];for(r=t.firstChild;r;r=n(r,t))r.name===e&&i.push(r);return i},empty:function(){var e=this,t,r,i;if(e.firstChild){t=[];for(i=e.firstChild;i;i=n(i,e))t.push(i);r=t.length;while(r--)i=t[r],i.parent=i.firstChild=i.lastChild=i.next=i.prev=null}return e.firstChild=e.lastChild=null,e},isEmpty:function(t){var r=this,i=r.firstChild,s,o;if(i)do{if(i.type===1){if(i.attributes.map["data-mce-bogus"])continue;if(t[i.name])return!1;s=i.attributes.length;while(s--){o=i.attributes[s].name;if(o==="name"||o.indexOf("data-mce-")===0)return!1}}if(i.type===8)return!1;if(i.type===3&&!e.test(i.value))return!1}while(i=n(i,r));return!0},walk:function(e){return n(this,null,e)}},r.create=function(e,n){var i,s;i=new r(e,t[e]||1);if(n)for(s in n)i.attr(s,n[s]);return i},r}),i("tinymce/html/Schema",["tinymce/util/Tools"],function(e){function u(e,t){return e?e.split(t||" "):[]}function a(e){function c(e,t,r){function l(e){var t={},n,r;for(n=0,r=e.length;n<r;n++)t[e[n]]={};return t}var s,o,a,f=arguments;r=r||[],t=t||"",typeof r=="string"&&(r=u(r));for(o=3;o<f.length;o++)typeof f[o]=="string"&&(f[o]=u(f[o])),r.push.apply(r,f[o]);e=u(e),s=e.length;while(s--)a=[].concat(i,u(t)),n[e[s]]={attributes:l(a),attributesOrder:a,children:l(r)}}function h(e,t){var r,i,s,o;e=u(e),r=e.length,t=u(t);while(r--){i=n[e[r]];for(s=0,o=t.length;s<o;s++)i.attributes[t[s]]={},i.attributesOrder.push(t[s])}}var n={},i,s,o,a,f,l;return t[e]?t[e]:(i=u("id accesskey class dir lang style tabindex title"),s=u("address blockquote div dl fieldset form h1 h2 h3 h4 h5 h6 hr menu ol p pre table ul"),o=u("a abbr b bdo br button cite code del dfn em embed i iframe img input ins kbd label map noscript object q s samp script select small span strong sub sup textarea u var #text #comment"),e!="html4"&&(i.push.apply(i,u("contenteditable contextmenu draggable dropzone hidden spellcheck translate")),s.push.apply(s,u("article aside details dialog figure header footer hgroup section nav")),o.push.apply(o,u("audio canvas command datalist mark meter output progress time wbr video ruby bdi keygen"))),e!="html5-strict"&&(i.push("xml:lang"),l=u("acronym applet basefont big font strike tt"),o.push.apply(o,l),r(l,function(e){c(e,"",o)}),f=u("center dir isindex noframes"),s.push.apply(s,f),a=[].concat(s,o),r(f,function(e){c(e,"",a)})),a=a||[].concat(s,o),c("html","manifest","head body"),c("head","","base command link meta noscript script style title"),c("title hr noscript br"),c("base","href target"),c("link","href rel media hreflang type sizes hreflang"),c("meta","name http-equiv content charset"),c("style","media type scoped"),c("script","src async defer type charset"),c("body","onafterprint onbeforeprint onbeforeunload onblur onerror onfocus onhashchange onload onmessage onoffline ononline onpagehide onpageshow onpopstate onresize onscroll onstorage onunload",a),c("address dt dd div caption","",a),c("h1 h2 h3 h4 h5 h6 pre p abbr code var samp kbd sub sup i b u bdo span legend em strong small s cite dfn","",o),c("blockquote","cite",a),c("ol","reversed start type","li"),c("ul","","li"),c("li","value",a),c("dl","","dt dd"),c("a","href target rel media hreflang type",o),c("q","cite",o),c("ins del","cite datetime",a),c("img","src alt usemap ismap width height"),c("iframe","src name width height",a),c("embed","src type width height"),c("object","data type typemustmatch name usemap form width height",a,"param"),c("param","name value"),c("map","name",a,"area"),c("area","alt coords shape href target rel media hreflang type"),c("table","border","caption colgroup thead tfoot tbody tr"+(e=="html4"?" col":"")),c("colgroup","span","col"),c("col","span"),c("tbody thead tfoot","","tr"),c("tr","","td th"),c("td","colspan rowspan headers",a),c("th","colspan rowspan headers scope abbr",a),c("form","accept-charset action autocomplete enctype method name novalidate target",a),c("fieldset","disabled form name",a,"legend"),c("label","form for",o),c("input","accept alt autocomplete checked dirname disabled form formaction formenctype formmethod formnovalidate formtarget height list max maxlength min multiple name pattern readonly required size src step type value width"),c("button","disabled form formaction formenctype formmethod formnovalidate formtarget name type value",e=="html4"?a:o),c("select","disabled form multiple name required size","option optgroup"),c("optgroup","disabled label","option"),c("option","disabled label selected value"),c("textarea","cols dirname disabled form maxlength name readonly required rows wrap"),c("menu","type label",a,"li"),c("noscript","",a),e!="html4"&&(c("wbr"),c("ruby","",o,"rt rp"),c("figcaption","",a),c("mark rt rp summary bdi","",o),c("canvas","width height",a),c("video","src crossorigin poster preload autoplay mediagroup loop muted controls width height buffered",a,"track source"),c("audio","src crossorigin preload autoplay mediagroup loop muted controls buffered volume",a,"track source"),c("source","src type media"),c("track","kind src srclang label default"),c("datalist","",o,"option"),c("article section nav aside header footer","",a),c("hgroup","","h1 h2 h3 h4 h5 h6"),c("figure","",a,"figcaption"),c("time","datetime",o),c("dialog","open",a),c("command","type label icon disabled checked radiogroup command"),c("output","for form name",o),c("progress","value max",o),c("meter","value min max low high optimum",o),c("details","open",a,"summary"),c("keygen","autofocus challenge disabled form keytype name")),e!="html5-strict"&&(h("script","language xml:space"),h("style","xml:space"),h("object","declare classid code codebase codetype archive standby align border hspace vspace"),h("embed","align name hspace vspace"),h("param","valuetype type"),h("a","charset name rev shape coords"),h("br","clear"),h("applet","codebase archive code object alt name width height align hspace vspace"),h("img","name longdesc align border hspace vspace"),h("iframe","longdesc frameborder marginwidth marginheight scrolling align"),h("font basefont","size color face"),h("input","usemap align"),h("select","onchange"),h("textarea"),h("h1 h2 h3 h4 h5 h6 div p legend caption","align"),h("ul","type compact"),h("li","type"),h("ol dl menu dir","compact"),h("pre","width xml:space"),h("hr","align noshade size width"),h("isindex","prompt"),h("table","summary width frame rules cellspacing cellpadding align bgcolor"),h("col","width align char charoff valign"),h("colgroup","width align char charoff valign"),h("thead","align char charoff valign"),h("tr","align char charoff valign bgcolor"),h("th","axis align char charoff valign nowrap bgcolor width height"),h("form","accept"),h("td","abbr axis scope align char charoff valign nowrap bgcolor width height"),h("tfoot","align char charoff valign"),h("tbody","align char charoff valign"),h("area","nohref"),h("body","background bgcolor text link vlink alink")),e!="html4"&&(h("input button select textarea","autofocus"),h("input textarea","placeholder"),h("a","download"),h("link script img","crossorigin"),h("iframe","sandbox seamless allowfullscreen")),r(u("a form meter progress dfn"),function(e){n[e]&&delete n[e].children[e]}),delete n.caption.children.table,t[e]=n,n)}function f(e,t){var i;return e&&(i={},typeof e=="string"&&(e={"*":e}),r(e,function(e,r){i[r]=t=="map"?n(e,/[, ]/):s(e,/[, ]/)})),i}var t={},n=e.makeMap,r=e.each,i=e.extend,s=e.explode,o=e.inArray;return function(e){function L(r,s,o){var u=e[r];return u?u=n(u,/[, ]/,n(u.toUpperCase(),/[, ]/)):(u=t[r],u||(u=n(s," ",n(s.toUpperCase()," ")),u=i(u,o),t[r]=u)),u}function A(e){return new RegExp("^"+e.replace(/([?+*])/g,".$1")+"$")}function O(e){var t,r,i,s,a,f,l,h,d,v,m,g,y,b,w,E,S,x,T,N=/^([#+\-])?([^\[!\/]+)(?:\/([^\[!]+))?(?:(!?)\[([^\]]+)\])?$/,C=/^([!\-])?(\w+::\w+|[^=:<]+)?(?:([=:<])(.*))?$/,k=/[*?+]/;if(e){e=u(e,","),c["@"]&&(E=c["@"].attributes,S=c["@"].attributesOrder);for(t=0,r=e.length;t<r;t++){a=N.exec(e[t]);if(a){b=a[1],d=a[2],w=a[3],h=a[5],g={},y=[],f={attributes:g,attributesOrder:y},b==="#"&&(f.paddEmpty=!0),b==="-"&&(f.removeEmpty=!0),a[4]==="!"&&(f.removeEmptyAttrs=!0);if(E){for(x in E)g[x]=E[x];y.push.apply(y,S)}if(h){h=u(h,"|");for(i=0,s=h.length;i<s;i++){a=C.exec(h[i]);if(a){l={},m=a[1],v=a[2].replace(/::/g,":"),b=a[3],T=a[4],m==="!"&&(f.attributesRequired=f.attributesRequired||[],f.attributesRequired.push(v),l.required=!0);if(m==="-"){delete g[v],y.splice(o(y,v),1);continue}b&&(b==="="&&(f.attributesDefault=f.attributesDefault||[],f.attributesDefault.push({name:v,value:T}),l.defaultValue=T),b===":"&&(f.attributesForced=f.attributesForced||[],f.attributesForced.push({name:v,value:T}),l.forcedValue=T),b==="<"&&(l.validValues=n(T,"?"))),k.test(v)?(f.attributePatterns=f.attributePatterns||[],l.pattern=A(v),f.attributePatterns.push(l)):(g[v]||y.push(v),g[v]=l)}}}!E&&d=="@"&&(E=g,S=y),w&&(f.outputName=d,c[w]=f),k.test(d)?(f.pattern=A(d),p.push(f)):c[d]=f}}}}function M(e){c={},p=[],O(e),r(m,function(e,t){h[t]=e.children})}function _(e){var n=/^(~)?(.+)$/;e&&(t.text_block_elements=t.block_elements=null,r(u(e,","),function(e){var t=n.exec(e),s=t[1]==="~",o=s?"span":"div",u=t[2];h[u]=h[o],C[u]=o,s||(S[u.toUpperCase()]={},S[u]={});if(!c[u]){var a=c[o];a=i({},a),delete a.removeEmptyAttrs,delete a.removeEmpty,c[u]=a}r(h,function(e,t){e[o]&&(h[t]=e=i({},h[t]),e[u]=e[o])})}))}function D(e){var t=/^([+\-]?)(\w+)\[([^\]]+)\]$/;e&&r(u(e,","),function(e){var n=t.exec(e),s,o;n&&(o=n[1],o?s=h[n[2]]:s=h[n[2]]={"#comment":{}},s=h[n[2]],r(u(n[3],"|"),function(e){o==="-"?(h[n[2]]=s=i({},h[n[2]]),delete s[e]):s[e]={}}))})}function P(e){var t=c[e],n;if(t)return t;n=p.length;while(n--){t=p[n];if(t.pattern.test(e))return t}}var l=this,c={},h={},p=[],d,v,m,g,y,b,w,E,S,x,T,N,C={},k={};e=e||{},m=a(e.schema),e.verify_html===!1&&(e.valid_elements="*[*]"),d=f(e.valid_styles),v=f(e.invalid_styles,"map"),E=f(e.valid_classes,"map"),g=L("whitespace_elements","pre script noscript style textarea video audio iframe object"),y=L("self_closing_elements","colgroup dd dt li option p td tfoot th thead tr"),b=L("short_ended_elements","area base basefont br col frame hr img input isindex link meta param embed source wbr track"),w=L("boolean_attributes","checked compact declare defer disabled ismap multiple nohref noresize noshade nowrap readonly selected autoplay loop controls"),x=L("non_empty_elements","td th iframe video audio object script",b),T=L("text_block_elements","h1 h2 h3 h4 h5 h6 p div address pre form blockquote center dir fieldset header footer article section hgroup aside nav figure"),S=L("block_elements","hr table tbody thead tfoot th tr td li ol ul caption dl dt dd noscript menu isindex option datalist select optgroup",T),N=L("text_inline_elements","span strong b em i font strike u var cite dfn code mark q sup sub samp"),r((e.special||"script noscript style textarea").split(" "),function(e){k[e]=new RegExp("</"+e+"[^>]*>","gi")}),e.valid_elements?M(e.valid_elements):(r(m,function(e,t){c[t]={attributes:e.attributes,attributesOrder:e.attributesOrder},h[t]=e.children}),e.schema!="html5"&&r(u("strong/b em/i"),function(e){e=u(e,"/"),c[e[1]].outputName=e[0]}),c.img.attributesDefault=[{name:"alt",value:""}],r(u("ol ul sub sup blockquote span font a table tbody tr strong em b i"),function(e){c[e]&&(c[e].removeEmpty=!0)}),r(u("p h1 h2 h3 h4 h5 h6 th td pre div address caption"),function(e){c[e].paddEmpty=!0}),r(u("span"),function(e){c[e].removeEmptyAttrs=!0})),_(e.custom_elements),D(e.valid_children),O(e.extended_valid_elements),D("+ol[ul|ol],+ul[ul|ol]"),e.invalid_elements&&r(s(e.invalid_elements),function(e){c[e]&&delete c[e]}),P("span")||O("span[!data-mce-type|*]"),l.children=h,l.getValidStyles=function(){return d},l.getInvalidStyles=function(){return v},l.getValidClasses=function(){return E},l.getBoolAttrs=function(){return w},l.getBlockElements=function(){return S},l.getTextBlockElements=function(){return T},l.getTextInlineElements=function(){return N},l.getShortEndedElements=function(){return b},l.getSelfClosingElements=function(){return y},l.getNonEmptyElements=function(){return x},l.getWhiteSpaceElements=function(){return g},l.getSpecialElements=function(){return k},l.isValidChild=function(e,t){var n=h[e];return!!n&&!!n[t]},l.isValid=function(e,t){var n,r,i=P(e);if(i){if(!t)return!0;if(i.attributes[t])return!0;n=i.attributePatterns;if(n){r=n.length;while(r--)if(n[r].pattern.test(e))return!0}}return!1},l.getElementRule=P,l.getCustomElements=function(){return C},l.addValidElements=O,l.setValidElements=M,l.addCustomElements=_,l.addValidChildren=D,l.elements=c}}),i("tinymce/html/SaxParser",["tinymce/html/Schema","tinymce/html/Entities","tinymce/util/Tools"],function(e,t,n){function i(e,t,n){var r=1,i,s,o;o=e.getShortEndedElements(),s=/<([!?\/])?([A-Za-z0-9\-\:\.]+)((?:\s+[^"\'>]+(?:(?:"[^"]*")|(?:\'[^\']*\')|[^>]*))*|\/|\s+)>/g,s.lastIndex=n;while(i=s.exec(t)){if(i[1]==="/")r--;else if(!i[1]){if(i[2]in o)continue;r++}if(r===0)break}return s.lastIndex}var r=n.each;return function(s,o){function a(){}var u=this;s=s||{},u.schema=o=o||new e,s.fix_self_closing!==!1&&(s.fix_self_closing=!0),r("comment cdata text start end pi doctype".split(" "),function(e){e&&(u[e]=s[e]||a)}),u.parse=function(e){function z(e){var t,n;t=c.length;while(t--)if(c[t].name===e)break;if(t>=0){for(n=c.length-1;n>=t;n--)e=c[n],e.valid&&r.end(e.name);c.length=t}}function W(e,t,n,r,i){var o,u,a=/[\s\u0000-\u001F]+/g;t=t.toLowerCase(),n=t in b?t:F(n||r||i||"");if(E&&!m&&t.indexOf("data-")!==0){o=C[t];if(!o&&k){u=k.length;while(u--){o=k[u];if(o.pattern.test(t))break}u===-1&&(o=null)}if(!o)return;if(o.validValues&&!(n in o.validValues))return}if(q[t]&&!s.allow_script_urls){var f=n.replace(a,"");try{f=decodeURIComponent(f)}catch(l){f=unescape(f)}if(R.test(f))return;if(!s.allow_html_data_urls&&U.test(f)&&!/^data:image\//i.test(f))return}h.map[t]=n,h.push({name:t,value:n})}var r=this,u,a=0,f,l,c=[],h,p,d,v,m,g,y,b,w,E,S,x,T,N,C,k,L,A,O,M,_,D,P,H,B,j=0,F=t.decode,I,q=n.makeMap("src,href,data,background,formaction,poster"),R=/((java|vb)script|mhtml):/i,U=/^data:/i;D=new RegExp("<(?:(?:!--([\\w\\W]*?)-->)|(?:!\\[CDATA\\[([\\w\\W]*?)\\]\\]>)|(?:!DOCTYPE([\\w\\W]*?)>)|(?:\\?([^\\s\\/<>]+) ?([\\w\\W]*?)[?/]>)|(?:\\/([^>]+)>)|(?:([A-Za-z0-9\\-\\:\\.]+)((?:\\s+[^\"'>]+(?:(?:\"[^\"]*\")|(?:'[^']*')|[^>]*))*|\\/|\\s+)>))","g"),P=/([\w:\-]+)(?:\s*=\s*(?:(?:\"((?:[^\"])*)\")|(?:\'((?:[^\'])*)\')|([^>\s]+)))?/g,y=o.getShortEndedElements(),_=s.self_closing_elements||o.getSelfClosingElements(),b=o.getBoolAttrs(),E=s.validate,g=s.remove_internals,I=s.fix_self_closing,H=o.getSpecialElements();while(u=D.exec(e)){a<u.index&&r.text(F(e.substr(a,u.index-a)));if(f=u[6])f=f.toLowerCase(),f.charAt(0)===":"&&(f=f.substr(1)),z(f);else if(f=u[7]){f=f.toLowerCase(),f.charAt(0)===":"&&(f=f.substr(1)),w=f in y,I&&_[f]&&c.length>0&&c[c.length-1].name===f&&z(f);if(!E||(S=o.getElementRule(f))){x=!0,E&&(C=S.attributes,k=S.attributePatterns),(N=u[8])?(m=N.indexOf("data-mce-type")!==-1,m&&g&&(x=!1),h=[],h.map={},N.replace(P,W)):(h=[],h.map={});if(E&&!m){L=S.attributesRequired,A=S.attributesDefault,O=S.attributesForced,M=S.removeEmptyAttrs,M&&!h.length&&(x=!1);if(O){p=O.length;while(p--)T=O[p],v=T.name,B=T.value,B==="{$uid}"&&(B="mce_"+j++),h.map[v]=B,h.push({name:v,value:B})}if(A){p=A.length;while(p--)T=A[p],v=T.name,v in h.map||(B=T.value,B==="{$uid}"&&(B="mce_"+j++),h.map[v]=B,h.push({name:v,value:B}))}if(L){p=L.length;while(p--)if(L[p]in h.map)break;p===-1&&(x=!1)}if(T=h.map["data-mce-bogus"]){if(T==="all"){a=i(o,e,D.lastIndex),D.lastIndex=a;continue}x=!1}}x&&r.start(f,h,w)}else x=!1;if(l=H[f]){l.lastIndex=a=u.index+u[0].length,(u=l.exec(e))?(x&&(d=e.substr(a,u.index-a)),a=u.index+u[0].length):(d=e.substr(a),a=e.length),x&&(d.length>0&&r.text(d,!0),r.end(f)),D.lastIndex=a;continue}w||(!N||N.indexOf("/")!=N.length-1?c.push({name:f,valid:x}):x&&r.end(f))}else(f=u[1])?(f.charAt(0)===">"&&(f=" "+f),!s.allow_conditional_comments&&f.substr(0,3)==="[if"&&(f=" "+f),r.comment(f)):(f=u[2])?r.cdata(f):(f=u[3])?r.doctype(f):(f=u[4])&&r.pi(f,u[5]);a=u.index+u[0].length}a<e.length&&r.text(F(e.substr(a)));for(p=c.length-1;p>=0;p--)f=c[p],f.valid&&r.end(f.name)}}}),i("tinymce/html/DomParser",["tinymce/html/Node","tinymce/html/Schema","tinymce/html/SaxParser","tinymce/util/Tools"],function(e,t,n,r){var i=r.makeMap,s=r.each,o=r.explode,u=r.extend;return function(r,a){function d(t){var n,r,s,o,u,l,c,h,p,d,v,m,g,y;v=i("tr,td,th,tbody,thead,tfoot,table"),d=a.getNonEmptyElements(),m=a.getTextBlockElements();for(n=0;n<t.length;n++){r=t[n];if(!r.parent||r.fixed)continue;if(m[r.name]&&r.parent.name=="li"){g=r.next;while(g){if(!m[g.name])break;g.name="li",g.fixed=!0,r.parent.insert(g,r.parent),g=g.next}r.unwrap(r);continue}o=[r];for(s=r.parent;s&&!a.isValidChild(s.name,r.name)&&!v[s.name];s=s.parent)o.push(s);if(s&&o.length>1){o.reverse(),u=l=f.filterNode(o[0].clone());for(p=0;p<o.length-1;p++){a.isValidChild(l.name,o[p].name)?(c=f.filterNode(o[p].clone()),l.append(c)):c=l;for(h=o[p].firstChild;h&&h!=o[p+1];)y=h.next,c.append(h),h=y;l=c}u.isEmpty(d)?s.insert(r,o[0],!0):(s.insert(u,o[0],!0),s.insert(r,u)),s=o[0],(s.isEmpty(d)||s.firstChild===s.lastChild&&s.firstChild.name==="br")&&s.empty().remove()}else if(r.parent){if(r.name==="li"){g=r.prev;if(!g||g.name!=="ul"&&g.name!=="ul"){g=r.next;if(!g||g.name!=="ul"&&g.name!=="ul"){r.wrap(f.filterNode(new e("ul",1)));continue}g.insert(r,g.firstChild,!0);continue}g.append(r);continue}a.isValidChild(r.parent.name,"div")&&a.isValidChild("div",r.name)?r.wrap(f.filterNode(new e("div",1))):r.name==="style"||r.name==="script"?r.empty().remove():r.unwrap()}}}var f=this,l={},c=[],h={},p={};r=r||{},r.validate="validate"in r?r.validate:!0,r.root_name=r.root_name||"body",f.schema=a=a||new t,f.filterNode=function(e){var t,n,r;n in l&&(r=h[n],r?r.push(e):h[n]=[e]),t=c.length;while(t--)n=c[t].name,n in e.attributes.map&&(r=p[n],r?r.push(e):p[n]=[e]);return e},f.addNodeFilter=function(e,t){s(o(e),function(e){var n=l[e];n||(l[e]=n=[]),n.push(t)})},f.addAttributeFilter=function(e,t){s(o(e),function(e){var n;for(n=0;n<c.length;n++)if(c[n].name===e){c[n].callbacks.push(t);return}c.push({name:e,callbacks:[t]})})},f.parse=function(t,s){function H(){function i(t){t&&(e=t.firstChild,e&&e.type==3&&(e.value=e.value.replace(N,"")),e=t.lastChild,e&&e.type==3&&(e.value=e.value.replace(L,"")))}var e=f.firstChild,t,n;if(!a.isValidChild(f.name,P.toLowerCase()))return;while(e)t=e.next,e.type==3||e.type==1&&e.name!=="p"&&!T[e.name]&&!e.attr("data-mce-type")?n?n.append(e):(n=B(P,1),n.attr(r.forced_root_block_attrs),f.insert(n,e),n.append(e)):(i(n),n=null),e=t;i(n)}function B(t,n){var r=new e(t,n),i;return t in l&&(i=h[t],i?i.push(r):h[t]=[r]),r}function j(e){var t,n,r;for(t=e.prev;t&&t.type===3;)n=t.value.replace(L,""),n.length>0?(t.value=n,t=t.prev):(r=t.prev,t.remove(),t=r)}function F(e){var t,n={};for(t in e)t!=="li"&&t!="p"&&(n[t]=e[t]);return n}var o,f,v,m,g,y,b,w,E,S,x,T,N,C=[],k,L,A,O,M,_,D,P;s=s||{},h={},p={},T=u(i("script,style,head,html,body,title,meta,param"),a.getBlockElements()),D=a.getNonEmptyElements(),_=a.children,x=r.validate,P="forced_root_block"in s?s.forced_root_block:r.forced_root_block,M=a.getWhiteSpaceElements(),N=/^[ \t\r\n]+/,L=/[ \t\r\n]+$/,A=/[ \t\r\n]+/g,O=/^[ \t\r\n]+$/,o=new n({validate:x,allow_script_urls:r.allow_script_urls,allow_conditional_comments:r.allow_conditional_comments,self_closing_elements:F(a.getSelfClosingElements()),cdata:function(e){v.append(B("#cdata",4)).value=e},text:function(e,t){var n;k||(e=e.replace(A," "),v.lastChild&&T[v.lastChild.name]&&(e=e.replace(N,""))),e.length!==0&&(n=B("#text",3),n.raw=!!t,v.append(n).value=e)},comment:function(e){v.append(B("#comment",8)).value=e},pi:function(e,t){v.append(B(e,7)).value=t,j(v)},doctype:function(e){var t;t=v.append(B("#doctype",10)),t.value=e,j(v)},start:function(e,t,n){var r,i,s,o,u;s=x?a.getElementRule(e):{};if(s){r=B(s.outputName||e,1),r.attributes=t,r.shortEnded=n,v.append(r),u=_[v.name],u&&_[r.name]&&!u[r.name]&&C.push(r),i=c.length;while(i--)o=c[i].name,o in t.map&&(E=p[o],E?E.push(r):p[o]=[r]);T[e]&&j(r),n||(v=r),!k&&M[e]&&(k=!0)}},end:function(t){var n,r,i,s,o;r=x?a.getElementRule(t):{};if(r){if(T[t]&&!k){n=v.firstChild;if(n&&n.type===3){i=n.value.replace(N,"");if(i.length>0)n.value=i,n=n.next;else{s=n.next,n.remove(),n=s;while(n&&n.type===3){i=n.value,s=n.next;if(i.length===0||O.test(i))n.remove(),n=s;n=s}}}n=v.lastChild;if(n&&n.type===3){i=n.value.replace(L,"");if(i.length>0)n.value=i,n=n.prev;else{s=n.prev,n.remove(),n=s;while(n&&n.type===3){i=n.value,s=n.prev;if(i.length===0||O.test(i))n.remove(),n=s;n=s}}}}k&&M[t]&&(k=!1);if(r.removeEmpty||r.paddEmpty)if(v.isEmpty(D))if(r.paddEmpty)v.empty().append(new e("#text","3")).value=" ";else if(!v.attributes.map.name&&!v.attributes.map.id){o=v.parent,v.unwrap(),v=o;return}v=v.parent}}},a),f=v=new e(s.context||r.root_name,11),o.parse(t),x&&C.length&&(s.context?s.invalid=!0:d(C)),P&&(f.name=="body"||s.isRootContent)&&H();if(!s.invalid){for(S in h){E=l[S],m=h[S],b=m.length;while(b--)m[b].parent||m.splice(b,1);for(g=0,y=E.length;g<y;g++)E[g](m,S,s)}for(g=0,y=c.length;g<y;g++){E=c[g];if(E.name in p){m=p[E.name],b=m.length;while(b--)m[b].parent||m.splice(b,1);for(b=0,w=E.callbacks.length;b<w;b++)E.callbacks[b](m,E.name,s)}}}return f},r.remove_trailing_brs&&f.addNodeFilter("br",function(t){var n,r=t.length,i,s=u({},a.getBlockElements()),o=a.getNonEmptyElements(),f,l,c,h,p,d;s.body=1;for(n=0;n<r;n++){i=t[n],f=i.parent;if(s[i.parent.name]&&i===f.lastChild){c=i.prev;while(c){h=c.name;if(h!=="span"||c.attr("data-mce-type")!=="bookmark"){if(h!=="br")break;if(h==="br"){i=null;break}}c=c.prev}i&&(i.remove(),f.isEmpty(o)&&(p=a.getElementRule(f.name),p&&(p.removeEmpty?f.remove():p.paddEmpty&&(f.empty().append(new e("#text",3)).value=" "))))}else{l=i;while(f&&f.firstChild===l&&f.lastChild===l){l=f;if(s[f.name])break;f=f.parent}l===f&&(d=new e("#text",3),d.value=" ",i.replace(d))}}}),r.allow_html_in_named_anchor||f.addAttributeFilter("id,name",function(e){var t=e.length,n,r,i,s;while(t--){s=e[t];if(s.name==="a"&&s.firstChild&&!s.attr("href")){i=s.parent,n=s.lastChild;do r=n.prev,i.insert(n,s),n=r;while(n)}}}),r.validate&&a.getValidClasses()&&f.addAttributeFilter("class",function(e){var t=e.length,n,r,i,s,o,u=a.getValidClasses(),f,l;while(t--){n=e[t],r=n.attr("class").split(" "),o="";for(i=0;i<r.length;i++)s=r[i],l=!1,f=u["*"],f&&f[s]&&(l=!0),f=u[n.name],!l&&f&&!f[s]&&(l=!0),l&&(o&&(o+=" "),o+=s);o.length||(o=null),n.attr("class",o)}})}}),i("tinymce/html/Writer",["tinymce/html/Entities","tinymce/util/Tools"],function(e,t){var n=t.makeMap;return function(t){var r=[],i,s,o,u,a;return t=t||{},i=t.indent,s=n(t.indent_before||""),o=n(t.indent_after||""),u=e.getEncodeFunc(t.entity_encoding||"raw",t.entities),a=t.element_format=="html",{start:function(e,t,n){var f,l,c,h;i&&s[e]&&r.length>0&&(h=r[r.length-1],h.length>0&&h!=="\n"&&r.push("\n")),r.push("<",e);if(t)for(f=0,l=t.length;f<l;f++)c=t[f],r.push(" ",c.name,'="',u(c.value,!0),'"');!n||a?r[r.length]=">":r[r.length]=" />",n&&i&&o[e]&&r.length>0&&(h=r[r.length-1],h.length>0&&h!=="\n"&&r.push("\n"))},end:function(e){var t;r.push("</",e,">"),i&&o[e]&&r.length>0&&(t=r[r.length-1],t.length>0&&t!=="\n"&&r.push("\n"))},text:function(e,t){e.length>0&&(r[r.length]=t?e:u(e))},cdata:function(e){r.push("<![CDATA[",e,"]]>")},comment:function(e){r.push("<!--",e,"-->")},pi:function(e,t){t?r.push("<?",e," ",t,"?>"):r.push("<?",e,"?>"),i&&r.push("\n")},doctype:function(e){r.push("<!DOCTYPE",e,">",i?"\n":"")},reset:function(){r.length=0},getContent:function(){return r.join("").replace(/\n$/,"")}}}}),i("tinymce/html/Serializer",["tinymce/html/Writer","tinymce/html/Schema"],function(e,t){return function(n,r){var i=this,s=new e(n);n=n||{},n.validate="validate"in n?n.validate:!0,i.schema=r=r||new t,i.writer=s,i.serialize=function(e){function o(e){var n=t[e.type],u,a,f,l,c,h,p,d,v;if(!n){u=e.name,a=e.shortEnded,f=e.attributes;if(i&&f&&f.length>1){h=[],h.map={},v=r.getElementRule(e.name);for(p=0,d=v.attributesOrder.length;p<d;p++)l=v.attributesOrder[p],l in f.map&&(c=f.map[l],h.map[l]=c,h.push({name:l,value:c}));for(p=0,d=f.length;p<d;p++)l=f[p].name,l in h.map||(c=f.map[l],h.map[l]=c,h.push({name:l,value:c}));f=h}s.start(e.name,f,a);if(!a){if(e=e.firstChild)do o(e);while(e=e.next);s.end(u)}}else n(e)}var t,i;return i=n.validate,t={3:function(e){s.text(e.value,e.raw)},8:function(e){s.comment(e.value)},7:function(e){s.pi(e.name,e.value)},10:function(e){s.doctype(e.value)},4:function(e){s.cdata(e.value)},11:function(e){if(e=e.firstChild)do o(e);while(e=e.next)}},s.reset(),e.type==1&&!n.inner?o(e):t[11](e),s.getContent()}}}),i("tinymce/dom/Serializer",["tinymce/dom/DOMUtils","tinymce/html/DomParser","tinymce/html/Entities","tinymce/html/Serializer","tinymce/html/Node","tinymce/html/Schema","tinymce/Env","tinymce/util/Tools"],function(e,t,n,r,i,s,o,u){var a=u.each,f=u.trim,l=e.DOM;return function(e,i){var u,c,h;return i&&(u=i.dom,c=i.schema),u=u||l,c=c||new s(e),e.entity_encoding=e.entity_encoding||"named",e.remove_trailing_brs="remove_trailing_brs"in e?e.remove_trailing_brs:!0,h=new t(e,c),h.addAttributeFilter("data-mce-tabindex",function(e,t){var n=e.length,r;while(n--)r=e[n],r.attr("tabindex",r.attributes.map["data-mce-tabindex"]),r.attr(t,null)}),h.addAttributeFilter("src,href,style",function(t,n){var r=t.length,i,s,o="data-mce-"+n,a=e.url_converter,f=e.url_converter_scope,l;while(r--)i=t[r],s=i.attributes.map[o],s!==l?(i.attr(n,s.length>0?s:null),i.attr(o,null)):(s=i.attributes.map[n],n==="style"?s=u.serializeStyle(u.parseStyle(s),i.name):a&&(s=a.call(f,s,n,i.name)),i.attr(n,s.length>0?s:null))}),h.addAttributeFilter("class",function(e){var t=e.length,n,r;while(t--)n=e[t],r=n.attr("class").replace(/(?:^|\s)mce-item-\w+(?!\S)/g,""),n.attr("class",r.length>0?r:null)}),h.addAttributeFilter("data-mce-type",function(e,t,n){var r=e.length,i;while(r--)i=e[r],i.attributes.map["data-mce-type"]==="bookmark"&&!n.cleanup&&i.remove()}),h.addNodeFilter("noscript",function(e){var t=e.length,r;while(t--)r=e[t].firstChild,r&&(r.value=n.decode(r.value))}),h.addNodeFilter("script,style",function(e,t){function o(e){return e.replace(/(<!--\[CDATA\[|\]\]-->)/g,"\n").replace(/^[\r\n]*|[\r\n]*$/g,"").replace(/^\s*((<!--)?(\s*\/\/)?\s*<!\[CDATA\[|(<!--\s*)?\/\*\s*<!\[CDATA\[\s*\*\/|(\/\/)?\s*<!--|\/\*\s*<!--\s*\*\/)\s*[\r\n]*/gi,"").replace(/\s*(\/\*\s*\]\]>\s*\*\/(-->)?|\s*\/\/\s*\]\]>(-->)?|\/\/\s*(-->)?|\]\]>|\/\*\s*-->\s*\*\/|\s*-->\s*)\s*$/g,"")}var n=e.length,r,i,s;while(n--)r=e[n],i=r.firstChild?r.firstChild.value:"",t==="script"?(s=r.attr("type"),s&&r.attr("type",s=="mce-no/type"?null:s.replace(/^mce\-/,"")),i.length>0&&(r.firstChild.value="// <![CDATA[\n"+o(i)+"\n// ]]>")):i.length>0&&(r.firstChild.value="<!--\n"+o(i)+"\n-->")}),h.addNodeFilter("#comment",function(e){var t=e.length,n;while(t--)n=e[t],n.value.indexOf("[CDATA[")===0?(n.name="#cdata",n.type=4,n.value=n.value.replace(/^\[CDATA\[|\]\]$/g,"")):n.value.indexOf("mce:protected ")===0&&(n.name="#text",n.type=3,n.raw=!0,n.value=unescape(n.value).substr(14))}),h.addNodeFilter("xml:namespace,input",function(e,t){var n=e.length,r;while(n--)r=e[n],r.type===7?r.remove():r.type===1&&t==="input"&&!("type"in r.attributes.map)&&r.attr("type","text")}),e.fix_list_elements&&h.addNodeFilter("ul,ol",function(e){var t=e.length,n,r;while(t--)n=e[t],r=n.parent,(r.name==="ul"||r.name==="ol")&&n.prev&&n.prev.name==="li"&&n.prev.append(n)}),h.addAttributeFilter("data-mce-src,data-mce-href,data-mce-style,data-mce-selected,data-mce-expando,data-mce-type,data-mce-resize",function(e,t){var n=e.length;while(n--)e[n].attr(t,null)}),{schema:c,addNodeFilter:h.addNodeFilter,addAttributeFilter:h.addAttributeFilter,serialize:function(t,n){var i=this,s,l,p,d,v;return o.ie&&u.select("script,style,select,map").length>0?(v=t.innerHTML,t=t.cloneNode(!1),u.setHTML(t,v)):t=t.cloneNode(!0),s=t.ownerDocument.implementation,s.createHTMLDocument&&(l=s.createHTMLDocument(""),a(t.nodeName=="BODY"?t.childNodes:[t],function(e){l.body.appendChild(l.importNode(e,!0))}),t.nodeName!="BODY"?t=l.body.firstChild:t=l.body,p=u.doc,u.doc=l),n=n||{},n.format=n.format||"html",n.selection&&(n.forced_root_block=""),n.no_events||(n.node=t,i.onPreProcess(n)),d=new r(e,c),n.content=d.serialize(h.parse(f(n.getInner?t.innerHTML:u.getOuterHTML(t)),n)),n.cleanup||(n.content=n.content.replace(/\uFEFF/g,"")),n.no_events||i.onPostProcess(n),p&&(u.doc=p),n.node=null,n.content},addRules:function(e){c.addValidElements(e)},setRules:function(e){c.setValidElements(e)},onPreProcess:function(e){i&&i.fire("PreProcess",e)},onPostProcess:function(e){i&&i.fire("PostProcess",e)}}}}),i("tinymce/dom/TridentSelection",[],function(){function e(e){function i(t,n){var r,i=0,s,o,u,a,f,l,c=-1,h;r=t.duplicate(),r.collapse(n),h=r.parentElement();if(h.ownerDocument!==e.dom.doc)return;while(h.contentEditable==="false")h=h.parentNode;if(!h.hasChildNodes())return{node:h,inside:1};u=h.children,s=u.length-1;while(i<=s){l=Math.floor((i+s)/2),a=u[l],r.moveToElementText(a),c=r.compareEndPoints(n?"StartToStart":"EndToEnd",t);if(c>0)s=l-1;else{if(!(c<0))return{node:a};i=l+1}}if(c<0){a?r.collapse(!1):(r.moveToElementText(h),r.collapse(!0),a=h,o=!0),f=0;while(r.compareEndPoints(n?"StartToStart":"StartToEnd",t)!==0){if(r.move("character",1)===0||h!=r.parentElement())break;f++}}else{r.collapse(!0),f=0;while(r.compareEndPoints(n?"StartToStart":"StartToEnd",t)!==0){if(r.move("character",-1)===0||h!=r.parentElement())break;f++}}return{node:a,position:c,offset:f,inside:o}}function s(){function c(e){var t=i(r,e),n,o,u=0,a,f,l;n=t.node,o=t.offset;if(t.inside&&!n.hasChildNodes()){s[e?"setStart":"setEnd"](n,0);return}if(o===f){s[e?"setStartBefore":"setEndAfter"](n);return}if(t.position<0){a=t.inside?n.firstChild:n.nextSibling;if(!a){s[e?"setStartAfter":"setEndAfter"](n);return}if(!o){a.nodeType==3?s[e?"setStart":"setEnd"](a,0):s[e?"setStartBefore":"setEndBefore"](a);return}while(a){if(a.nodeType==3){l=a.nodeValue,u+=l.length;if(u>=o){n=a,u-=o,u=l.length-u;break}}a=a.nextSibling}}else{a=n.previousSibling;if(!a)return s[e?"setStartBefore":"setEndBefore"](n);if(!o){n.nodeType==3?s[e?"setStart":"setEnd"](a,n.nodeValue.length):s[e?"setStartAfter":"setEndAfter"](a);return}while(a){if(a.nodeType==3){u+=a.nodeValue.length;if(u>=o){n=a,u-=o;break}}a=a.previousSibling}}s[e?"setStart":"setEnd"](n,u)}var r=e.getRng(),s=n.createRng(),o,u,a,f,l;o=r.item?r.item(0):r.parentElement();if(o.ownerDocument!=n.doc)return s;u=e.isCollapsed();if(r.item)return s.setStart(o.parentNode,n.nodeIndex(o)),s.setEnd(s.startContainer,s.startOffset+1),s;try{c(!0),u||c()}catch(h){if(h.number!=-2147024809)throw h;l=t.getBookmark(2),a=
r.duplicate(),a.collapse(!0),o=a.parentElement(),u||(a=r.duplicate(),a.collapse(!1),f=a.parentElement(),f.innerHTML=f.innerHTML),o.innerHTML=o.innerHTML,t.moveToBookmark(l),r=e.getRng(),c(!0),u||c()}return s}var t=this,n=e.dom,r=!1;this.getBookmark=function(t){function o(e){var t,r,i,s,o=[];t=e.parentNode,r=n.getRoot().parentNode;while(t!=r&&t.nodeType!==9){i=t.children,s=i.length;while(s--)if(e===i[s]){o.push(s);break}e=t,t=t.parentNode}return o}function u(e){var t;t=i(r,e);if(t)return{position:t.position,offset:t.offset,indexes:o(t.node),inside:t.inside}}var r=e.getRng(),s={};return t===2&&(r.item?s.start={ctrl:!0,indexes:o(r.item(0))}:(s.start=u(!0),e.isCollapsed()||(s.end=u()))),s},this.moveToBookmark=function(e){function i(e){var t,r,i,s;t=n.getRoot();for(r=e.length-1;r>=0;r--)s=t.children,i=e[r],i<=s.length-1&&(t=s[i]);return t}function s(n){var s=e[n?"start":"end"],o,u,a,f;s&&(o=s.position>0,u=r.createTextRange(),u.moveToElementText(i(s.indexes)),f=s.offset,f!==a?(u.collapse(s.inside||o),u.moveStart("character",o?-f:f)):u.collapse(n),t.setEndPoint(n?"StartToStart":"EndToStart",u),n&&t.collapse(!0))}var t,r=n.doc.body;e.start&&(e.start.ctrl?(t=r.createControlRange(),t.addElement(i(e.start.indexes)),t.select()):(t=r.createTextRange(),s(!0),s(),t.select()))},this.addRange=function(t){function v(e){var t,s,l,p,d;l=n.create("a"),t=e?o:a,s=e?u:f,p=i.duplicate();if(t==c||t==c.documentElement)t=h,s=0;t.nodeType==3?(t.parentNode.insertBefore(l,t),p.moveToElementText(l),p.moveStart("character",s),n.remove(l),i.setEndPoint(e?"StartToStart":"EndToEnd",p)):(d=t.childNodes,d.length?(s>=d.length?n.insertAfter(l,d[d.length-1]):t.insertBefore(l,d[s]),p.moveToElementText(l)):t.canHaveHTML&&(t.innerHTML="<span>&#xFEFF;</span>",l=t.firstChild,p.moveToElementText(l),p.collapse(r)),i.setEndPoint(e?"StartToStart":"EndToEnd",p),n.remove(l))}var i,s,o,u,a,f,l,c=e.dom.doc,h=c.body,p,d;o=t.startContainer,u=t.startOffset,a=t.endContainer,f=t.endOffset,i=h.createTextRange();if(o==a&&o.nodeType==1){if(u==f&&!o.hasChildNodes()){if(o.canHaveHTML){l=o.previousSibling,l&&!l.hasChildNodes()&&n.isBlock(l)?l.innerHTML="&#xFEFF;":l=null,o.innerHTML="<span>&#xFEFF;</span><span>&#xFEFF;</span>",i.moveToElementText(o.lastChild),i.select(),n.doc.selection.clear(),o.innerHTML="",l&&(l.innerHTML="");return}u=n.nodeIndex(o),o=o.parentNode}if(u==f-1)try{d=o.childNodes[u],s=h.createControlRange(),s.addElement(d),s.select(),p=e.getRng();if(p.item&&d===p.item(0))return}catch(m){}}v(!0),v(),i.select()},this.getRangeAt=s}return e}),i("tinymce/util/VK",["tinymce/Env"],function(e){return{BACKSPACE:8,DELETE:46,DOWN:40,ENTER:13,LEFT:37,RIGHT:39,SPACEBAR:32,TAB:9,UP:38,modifierPressed:function(e){return e.shiftKey||e.ctrlKey||e.altKey},metaKeyPressed:function(t){return e.mac?t.metaKey:t.ctrlKey&&!t.altKey}}}),i("tinymce/dom/ControlSelection",["tinymce/util/VK","tinymce/util/Tools","tinymce/Env"],function(e,t,n){return function(r,i){function _(e){var t=i.settings.object_resizing;return t===!1||n.iOS?!1:(typeof t!="string"&&(t="table,img,div"),e.getAttribute("data-mce-resize")==="false"?!1:i.dom.is(e,t))}function D(t){var n,r,o,l,h;n=t.screenX-p,r=t.screenY-d,E=n*c[2]+g,S=r*c[3]+y,E=E<5?5:E,S=S<5?5:S,u.nodeName=="IMG"&&i.settings.resize_img_proportional!==!1?o=!e.modifierPressed(t):o=e.modifierPressed(t)||u.nodeName=="IMG"&&c[2]*c[3]!==0,o&&(C(n)>C(r)?(S=k(E*b),E=k(S/b)):(E=k(S/b),S=k(E*b))),s.setStyles(a,{width:E,height:S}),l=c.startPos.x+n,h=c.startPos.y+r,l=l>0?l:0,h=h>0?h:0,s.setStyles(f,{left:l,top:h,display:"block"}),f.innerHTML=E+" &times; "+S,c[2]<0&&a.clientWidth<=E&&s.setStyle(a,"left",v+(g-E)),c[3]<0&&a.clientHeight<=S&&s.setStyle(a,"top",m+(y-S)),n=L.scrollWidth-A,r=L.scrollHeight-O,n+r!==0&&s.setStyles(f,{left:l-n,top:h-r}),w||(i.fire("ObjectResizeStart",{target:u,width:g,height:y}),w=!0)}function P(){function e(e,t){t&&(u.style[e]||!i.schema.isValid(u.nodeName.toLowerCase(),e)?s.setStyle(u,e,t):s.setAttrib(u,e,t))}w=!1,e("width",E),e("height",S),s.unbind(x,"mousemove",D),s.unbind(x,"mouseup",P),T!=x&&(s.unbind(T,"mousemove",D),s.unbind(T,"mouseup",P)),s.remove(a),s.remove(f),(!N||u.nodeName=="TABLE")&&H(u),i.fire("ObjectResized",{target:u,width:E,height:S}),i.nodeChanged()}function H(e,t,r){var h,w,N,C,k;z(),h=s.getPos(e,L),v=h.x,m=h.y,k=e.getBoundingClientRect(),w=k.width||k.right-k.left,N=k.height||k.bottom-k.top,u!=e&&(U(),u=e,E=S=0),C=i.fire("ObjectSelected",{target:e}),_(e)&&!C.isDefaultPrevented()?o(l,function(e,i){function h(t){p=t.screenX,d=t.screenY,g=u.clientWidth,y=u.clientHeight,b=y/g,c=e,e.startPos=s.getPos(e.elm,L),A=L.scrollWidth,O=L.scrollHeight,a=u.cloneNode(!0),s.addClass(a,"mce-clonedresizable"),a.contentEditable=!1,a.unSelectabe=!0,s.setStyles(a,{left:v,top:m,margin:0}),a.removeAttribute("data-mce-selected"),L.appendChild(a),s.bind(x,"mousemove",D),s.bind(x,"mouseup",P),T!=x&&(s.bind(T,"mousemove",D),s.bind(T,"mouseup",P)),f=s.add(L,"div",{"class":"mce-resize-helper","data-mce-bogus":"all"},g+" &times; "+y)}var o,l;if(t){i==t&&h(r);return}o=s.get("mceResizeHandle"+i),o?s.show(o):(l=L,o=s.add(l,"div",{id:"mceResizeHandle"+i,"data-mce-bogus":!0,"class":"mce-resizehandle",unselectable:!0,style:"cursor:"+i+"-resize; margin:0; padding:0"}),n.ie&&(o.contentEditable=!1)),e.elm||(s.bind(o,"mousedown",function(e){e.stopImmediatePropagation(),e.preventDefault(),h(e)}),e.elm=o),s.setStyles(o,{left:w*e[0]+v-o.offsetWidth/2,top:N*e[1]+m-o.offsetHeight/2})}):B(),u.setAttribute("data-mce-selected","1")}function B(){var e,t;z(),u&&u.removeAttribute("data-mce-selected");for(e in l)t=s.get("mceResizeHandle"+e),t&&(s.unbind(t),s.remove(t))}function j(e){function n(e,t){if(e)do if(e===t)return!0;while(e=e.parentNode)}var t;o(s.select("img[data-mce-selected],hr[data-mce-selected]"),function(e){e.removeAttribute("data-mce-selected")}),t=e.type=="mousedown"?e.target:r.getNode(),t=s.getParent(t,N?"table":"table,img,hr");if(n(t,L)){W();if(n(r.getStart(),t)&&n(r.getEnd(),t))if(!N||t!=r.getStart()&&r.getStart().nodeName!=="IMG"){H(t);return}}B()}function F(e,t,n){e&&e.attachEvent&&e.attachEvent("on"+t,n)}function I(e,t,n){e&&e.detachEvent&&e.detachEvent("on"+t,n)}function q(e){var t=e.srcElement,n,r,s,o,u,a,f;n=t.getBoundingClientRect(),a=h.clientX-n.left,f=h.clientY-n.top;for(r in l){s=l[r],o=t.offsetWidth*s[0],u=t.offsetHeight*s[1];if(C(o-a)<8&&C(u-f)<8){c=s;break}}w=!0,i.getDoc().selection.empty(),H(t,r,h)}function R(e){var t=e.srcElement;if(t!=u){U();if(t.id.indexOf("mceResizeHandle")===0){e.returnValue=!1;return}if(t.nodeName=="IMG"||t.nodeName=="TABLE")B(),u=t,F(t,"resizestart",q)}}function U(){I(u,"resizestart",q)}function z(){for(var e in l){var t=l[e];t.elm&&(s.unbind(t.elm),delete t.elm)}}function W(){try{i.getDoc().execCommand("enableObjectResizing",!1,!1)}catch(e){}}function X(e){var t;if(!N)return;t=x.body.createControlRange();try{return t.addElement(e),t.select(),!0}catch(n){}}function V(){u=a=null,N&&(U(),I(L,"controlselect",R))}var s=i.dom,o=t.each,u,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S,x=i.getDoc(),T=document,N=n.ie&&n.ie<11,C=Math.abs,k=Math.round,L=i.getBody(),A,O;l={n:[.5,0,0,-1],e:[1,.5,1,0],s:[.5,1,0,1],w:[0,.5,-1,0],nw:[0,0,-1,-1],ne:[1,0,1,-1],se:[1,1,1,1],sw:[0,1,-1,1]};var M=".mce-content-body";return i.contentStyles.push(M+" div.mce-resizehandle {"+"position: absolute;"+"border: 1px solid black;"+"background: #FFF;"+"width: 5px;"+"height: 5px;"+"z-index: 10000"+"}"+M+" .mce-resizehandle:hover {"+"background: #000"+"}"+M+" img[data-mce-selected], hr[data-mce-selected] {"+"outline: 1px solid black;"+"resize: none"+"}"+M+" .mce-clonedresizable {"+"position: absolute;"+(n.gecko?"":"outline: 1px dashed black;")+"opacity: .5;"+"filter: alpha(opacity=50);"+"z-index: 10000"+"}"+M+" .mce-resize-helper {"+"background-color: #555;"+"background-color: rgba(0,0,0,0.75);"+"border-radius: 3px;"+"border: 1px;"+"color: white;"+"display: none;"+"font-family: sans-serif;"+"font-size: 12px;"+"white-space: nowrap;"+"line-height: 14px;"+"margin: 5px 10px;"+"padding: 5px;"+"position: absolute;"+"}"),i.on("init",function(){N?(i.on("ObjectResized",function(e){e.target.nodeName!="TABLE"&&(B(),X(e.target))}),F(L,"controlselect",R),i.on("mousedown",function(e){h=e})):(W(),n.ie>=11&&(i.on("mouseup",function(e){var t=e.target.nodeName;/^(TABLE|IMG|HR)$/.test(t)&&(i.selection.select(e.target,t=="TABLE"),i.nodeChanged())}),i.dom.bind(L,"mscontrolselect",function(e){/^(TABLE|IMG|HR)$/.test(e.target.nodeName)&&(e.preventDefault(),e.target.tagName=="IMG"&&window.setTimeout(function(){i.selection.select(e.target)},0))}))),i.on("nodechange mousedown mouseup ResizeEditor",j),i.on("keydown keyup",function(e){u&&u.nodeName=="TABLE"&&j(e)}),i.on("hide",B)}),i.on("remove",z),{isResizable:_,showResizeRect:H,hideResizeRect:B,updateResizeRect:j,controlSelect:X,destroy:V}}}),i("tinymce/dom/RangeUtils",["tinymce/util/Tools","tinymce/dom/TreeWalker"],function(e,t){function r(e,t){var n=e.childNodes;return t--,t>n.length-1?t=n.length-1:t<0&&(t=0),n[t]||e}function i(e){this.walk=function(t,i){function m(e){var t;return t=e[0],t.nodeType===3&&t===s&&o>=t.nodeValue.length&&e.splice(0,1),t=e[e.length-1],a===0&&e.length>0&&t===u&&t.nodeType===3&&e.splice(e.length-1,1),e}function g(e,t,n){var r=[];for(;e&&e!=n;e=e[t])r.push(e);return r}function y(e,t){do{if(e.parentNode==t)return e;e=e.parentNode}while(e)}function b(e,t,n){var r=n?"nextSibling":"previousSibling";for(h=e,p=h.parentNode;h&&h!=t;h=p)p=h.parentNode,d=g(h==e?h:h[r],r),d.length&&(n||d.reverse(),i(m(d)))}var s=t.startContainer,o=t.startOffset,u=t.endContainer,a=t.endOffset,f,l,c,h,p,d,v;v=e.select("td.mce-item-selected,th.mce-item-selected");if(v.length>0){n(v,function(e){i([e])});return}s.nodeType==1&&s.hasChildNodes()&&(s=s.childNodes[o]),u.nodeType==1&&u.hasChildNodes()&&(u=r(u,a));if(s==u)return i(m([s]));f=e.findCommonAncestor(s,u);for(h=s;h;h=h.parentNode){if(h===u)return b(s,f,!0);if(h===f)break}for(h=u;h;h=h.parentNode){if(h===s)return b(u,f);if(h===f)break}l=y(s,f)||s,c=y(u,f)||u,b(s,l,!0),d=g(l==s?l:l.nextSibling,"nextSibling",c==u?c.nextSibling:c),d.length&&i(m(d)),b(u,c)},this.split=function(e){function s(e,t){return e.splitText(t)}var t=e.startContainer,n=e.startOffset,r=e.endContainer,i=e.endOffset;return t==r&&t.nodeType==3?n>0&&n<t.nodeValue.length&&(r=s(t,n),t=r.previousSibling,i>n?(i-=n,t=r=s(r,i).previousSibling,i=r.nodeValue.length,n=0):i=0):(t.nodeType==3&&n>0&&n<t.nodeValue.length&&(t=s(t,n),n=0),r.nodeType==3&&i>0&&i<r.nodeValue.length&&(r=s(r,i).previousSibling,i=r.nodeValue.length)),{startContainer:t,startOffset:n,endContainer:r,endOffset:i}},this.normalize=function(n){function s(s){function d(n,r){var i=new t(n,e.getParent(n.parentNode,e.isBlock)||f);while(n=i[r?"prev":"next"]())if(n.nodeName==="BR")return!0}function v(e,t){return e.previousSibling&&e.previousSibling.nodeName==t}function m(n,s){var a,h,d;s=s||o,d=e.getParent(s.parentNode,e.isBlock)||f;if(n&&s.nodeName=="BR"&&p&&e.isEmpty(d)){o=s.parentNode,u=e.nodeIndex(s),r=!0;return}a=new t(s,d);while(l=a[n?"prev":"next"]()){if(e.getContentEditableParent(l)==="false")return;if(l.nodeType===3&&l.nodeValue.length>0){o=l,u=n?l.nodeValue.length:0,r=!0;return}if(e.isBlock(l)||c[l.nodeName.toLowerCase()])return;h=l}i&&h&&(o=h,r=!0,u=0)}var o,u,a,f=e.getRoot(),l,c,h,p;o=n[(s?"start":"end")+"Container"],u=n[(s?"start":"end")+"Offset"],p=o.nodeType==1&&u===o.childNodes.length,c=e.schema.getNonEmptyElements(),h=s,o.nodeType==1&&u>o.childNodes.length-1&&(h=!1),o.nodeType===9&&(o=e.getRoot(),u=0);if(o===f){if(h){l=o.childNodes[u>0?u-1:0];if(l)if(c[l.nodeName]||l.nodeName=="TABLE")return}if(o.hasChildNodes()){u=Math.min(!h&&u>0?u-1:u,o.childNodes.length-1),o=o.childNodes[u],u=0;if(o.hasChildNodes()&&!/TABLE/.test(o.nodeName)){l=o,a=new t(o,f);do{if(l.nodeType===3&&l.nodeValue.length>0){u=h?0:l.nodeValue.length,o=l,r=!0;break}if(c[l.nodeName.toLowerCase()]){u=e.nodeIndex(l),o=l.parentNode,l.nodeName=="IMG"&&!h&&u++,r=!0;break}}while(l=h?a.next():a.prev())}}}i&&(o.nodeType===3&&u===0&&m(!0),o.nodeType===1&&(l=o.childNodes[u],l||(l=o.childNodes[u-1]),l&&l.nodeName==="BR"&&!v(l,"A")&&!d(l)&&!d(l,!0)&&m(!0,l))),h&&!i&&o.nodeType===3&&u===o.nodeValue.length&&m(!1),r&&n["set"+(s?"Start":"End")](o,u)}var r,i;return i=n.collapsed,s(!0),i||s(),r&&i&&n.collapse(!0),r}}var n=e.each;return i.compareRanges=function(e,t){if(e&&t){if(!e.item&&!e.duplicate)return e.startContainer==t.startContainer&&e.startOffset==t.startOffset;if(e.item&&t.item&&e.item(0)===t.item(0))return!0;if(e.isEqual&&t.isEqual&&t.isEqual(e))return!0}return!1},i}),i("tinymce/dom/BookmarkManager",["tinymce/Env","tinymce/util/Tools"],function(e,t){function n(n){var r=n.dom;this.getBookmark=function(e,i){function p(e,n){var i=0;return t.each(r.select(e),function(e,t){e==n&&(i=t)}),i}function d(e){function t(t){var n,r,i,s=t?"start":"end";n=e[s+"Container"],r=e[s+"Offset"],n.nodeType==1&&n.nodeName=="TR"&&(i=n.childNodes,n=i[Math.min(t?r:r-1,i.length-1)],n&&(r=t?0:n.childNodes.length,e["set"+(t?"Start":"End")](n,r)))}return t(!0),t(),e}function v(){function o(e,n){var s=e[n?"startContainer":"endContainer"],o=e[n?"startOffset":"endOffset"],u=[],a,f,l=0;if(s.nodeType==3){if(i)for(a=s.previousSibling;a&&a.nodeType==3;a=a.previousSibling)o+=a.nodeValue.length;u.push(o)}else f=s.childNodes,o>=f.length&&f.length&&(l=1,o=Math.max(0,f.length-1)),u.push(r.nodeIndex(f[o],i)+l);for(;s&&s!=t;s=s.parentNode)u.push(r.nodeIndex(s,i));return u}var e=n.getRng(!0),t=r.getRoot(),s={};return s.start=o(e,!0),n.isCollapsed()||(s.end=o(e)),s}var s,o,u,a,f,l,c="&#xFEFF;",h;if(e==2)return l=n.getNode(),f=l?l.nodeName:null,f=="IMG"?{name:f,index:p(f,l)}:n.tridentSel?n.tridentSel.getBookmark(e):v();if(e)return{rng:n.getRng()};s=n.getRng(),u=r.uniqueId(),a=n.isCollapsed(),h="overflow:hidden;line-height:0px";if(s.duplicate||s.item){if(!!s.item)return l=s.item(0),f=l.nodeName,{name:f,index:p(f,l)};o=s.duplicate();try{s.collapse(),s.pasteHTML('<span data-mce-type="bookmark" id="'+u+'_start" style="'+h+'">'+c+"</span>"),a||(o.collapse(!1),s.moveToElementText(o.parentElement()),s.compareEndPoints("StartToEnd",o)===0&&o.move("character",-1),o.pasteHTML('<span data-mce-type="bookmark" id="'+u+'_end" style="'+h+'">'+c+"</span>"))}catch(m){return null}}else{l=n.getNode(),f=l.nodeName;if(f=="IMG")return{name:f,index:p(f,l)};o=d(s.cloneRange()),a||(o.collapse(!1),o.insertNode(r.create("span",{"data-mce-type":"bookmark",id:u+"_end",style:h},c))),s=d(s),s.collapse(!0),s.insertNode(r.create("span",{"data-mce-type":"bookmark",id:u+"_start",style:h},c))}return n.moveToBookmark({id:u,keep:1}),{id:u}},this.moveToBookmark=function(i){function c(e){var t=i[e?"start":"end"],n,r,u,a;if(t){u=t[0];for(r=o,n=t.length-1;n>=1;n--){a=r.childNodes;if(t[n]>a.length-1)return;r=a[t[n]]}r.nodeType===3&&(u=Math.min(t[0],r.nodeValue.length)),r.nodeType===1&&(u=Math.min(t[0],r.childNodes.length)),e?s.setStart(r,u):s.setEnd(r,u)}return!0}function h(n){var s=r.get(i.id+"_"+n),o,c,h,p,d=i.keep;if(s){o=s.parentNode,n=="start"?(d?(o=s.firstChild,c=1):c=r.nodeIndex(s),u=a=o,f=l=c):(d?(o=s.firstChild,c=1):c=r.nodeIndex(s),a=o,l=c);if(!d){p=s.previousSibling,h=s.nextSibling,t.each(t.grep(s.childNodes),function(e){e.nodeType==3&&(e.nodeValue=e.nodeValue.replace(/\uFEFF/g,""))});while(s=r.get(i.id+"_"+n))r.remove(s,1);p&&h&&p.nodeType==h.nodeType&&p.nodeType==3&&!e.opera&&(c=p.nodeValue.length,p.appendData(h.nodeValue),r.remove(h),n=="start"?(u=a=p,f=l=c):(a=p,l=c))}}}function p(t){return r.isBlock(t)&&!t.innerHTML&&!e.ie&&(t.innerHTML='<br data-mce-bogus="1" />'),t}var s,o,u,a,f,l;if(i)if(i.start){s=r.createRng(),o=r.getRoot();if(n.tridentSel)return n.tridentSel.moveToBookmark(i);c(!0)&&c()&&n.setRng(s)}else i.id?(h("start"),h("end"),u&&(s=r.createRng(),s.setStart(p(u),f),s.setEnd(p(a),l),n.setRng(s))):i.name?n.select(r.select(i.name)[i.index]):i.rng&&n.setRng(i.rng)}}return n.isBookmarkNode=function(e){return e&&e.tagName==="SPAN"&&e.getAttribute("data-mce-type")==="bookmark"},n}),i("tinymce/dom/Selection",["tinymce/dom/TreeWalker","tinymce/dom/TridentSelection","tinymce/dom/ControlSelection","tinymce/dom/RangeUtils","tinymce/dom/BookmarkManager","tinymce/Env","tinymce/util/Tools"],function(e,n,r,i,s,o,u){function c(e,t,i,o){var u=this;u.dom=e,u.win=t,u.serializer=i,u.editor=o,u.bookmarkManager=new s(u),u.controlSelection=new r(u,o),u.win.getSelection||(u.tridentSel=new n(u))}var a=u.each,f=u.trim,l=o.ie;return c.prototype={setCursorLocation:function(e,t){var n=this,r=n.dom.createRng();e?(r.setStart(e,t),r.setEnd(e,t),n.setRng(r),n.collapse(!1)):(n._moveEndPoint(r,n.editor.getBody(),!0),n.setRng(r))},getContent:function(e){var n=this,r=n.getRng(),i=n.dom.create("body"),s=n.getSel(),o,u,a;return e=e||{},o=u="",e.get=!0,e.format=e.format||"html",e.selection=!0,n.editor.fire("BeforeGetContent",e),e.format=="text"?n.isCollapsed()?"":r.text||(s.toString?s.toString():""):(r.cloneContents?(a=r.cloneContents(),a&&i.appendChild(a)):r.item!==t||r.htmlText!==t?(i.innerHTML="<br>"+(r.item?r.item(0).outerHTML:r.htmlText),i.removeChild(i.firstChild)):i.innerHTML=r.toString(),/^\s/.test(i.innerHTML)&&(o=" "),/\s+$/.test(i.innerHTML)&&(u=" "),e.getInner=!0,e.content=n.isCollapsed()?"":o+n.serializer.serialize(i,e)+u,n.editor.fire("GetContent",e),e.content)},setContent:function(e,t){var n=this,r=n.getRng(),i,s=n.win.document,o,u;t=t||{format:"html"},t.set=!0,t.selection=!0,e=t.content=e,t.no_events||n.editor.fire("BeforeSetContent",t),e=t.content;if(r.insertNode){e+='<span id="__caret">_</span>',r.startContainer==s&&r.endContainer==s?s.body.innerHTML=e:(r.deleteContents(),s.body.childNodes.length===0?s.body.innerHTML=e:r.createContextualFragment?r.insertNode(r.createContextualFragment(e)):(o=s.createDocumentFragment(),u=s.createElement("div"),o.appendChild(u),u.outerHTML=e,r.insertNode(o))),i=n.dom.get("__caret"),r=s.createRange(),r.setStartBefore(i),r.setEndBefore(i),n.setRng(r),n.dom.remove("__caret");try{n.setRng(r)}catch(a){}}else r.item&&(s.execCommand("Delete",!1,null),r=n.getRng()),/^\s+/.test(e)?(r.pasteHTML('<span id="__mce_tmp">_</span>'+e),n.dom.remove("__mce_tmp")):r.pasteHTML(e);t.no_events||n.editor.fire("SetContent",t)},getStart:function(){var e=this,t=e.getRng(),n,r,i,s;if(t.duplicate||t.item){if(t.item)return t.item(0);i=t.duplicate(),i.collapse(1),n=i.parentElement(),n.ownerDocument!==e.dom.doc&&(n=e.dom.getRoot()),r=s=t.parentElement();while(s=s.parentNode)if(s==n){n=r;break}return n}return n=t.startContainer,n.nodeType==1&&n.hasChildNodes()&&(n=n.childNodes[Math.min(n.childNodes.length-1,t.startOffset)]),n&&n.nodeType==3?n.parentNode:n},getEnd:function(){var e=this,t=e.getRng(),n,r;return t.duplicate||t.item?t.item?t.item(0):(t=t.duplicate(),t.collapse(0),n=t.parentElement(),n.ownerDocument!==e.dom.doc&&(n=e.dom.getRoot()),n&&n.nodeName=="BODY"?n.lastChild||n:n):(n=t.endContainer,r=t.endOffset,n.nodeType==1&&n.hasChildNodes()&&(n=n.childNodes[r>0?r-1:r]),n&&n.nodeType==3?n.parentNode:n)},getBookmark:function(e,t){return this.bookmarkManager.getBookmark(e,t)},moveToBookmark:function(e){return this.bookmarkManager.moveToBookmark(e)},select:function(e,t){var n=this,r=n.dom,i=r.createRng(),s;n.lastFocusBookmark=null;if(e){if(!t&&n.controlSelection.controlSelect(e))return;s=r.nodeIndex(e),i.setStart(e.parentNode,s),i.setEnd(e.parentNode,s+1),t&&(n._moveEndPoint(i,e,!0),n._moveEndPoint(i,e)),n.setRng(i)}return e},isCollapsed:function(){var e=this,t=e.getRng(),n=e.getSel();return!t||t.item?!1:t.compareEndPoints?t.compareEndPoints("StartToEnd",t)===0:!n||t.collapsed},collapse:function(e){var t=this,n=t.getRng(),r;n.item&&(r=n.item(0),n=t.win.document.body.createTextRange(),n.moveToElementText(r)),n.collapse(!!e),t.setRng(n)},getSel:function(){var e=this.win;return e.getSelection?e.getSelection():e.document.selection},getRng:function(e){function u(e,t,n){try{return t.compareBoundaryPoints(e,n)}catch(r){return-1}}var t=this,n,r,i,s=t.win.document,o;if(!e&&t.lastFocusBookmark){var a=t.lastFocusBookmark;return a.startContainer?(r=s.createRange(),r.setStart(a.startContainer,a.startOffset),r.setEnd(a.endContainer,a.endOffset)):r=a,r}if(e&&t.tridentSel)return t.tridentSel.getRangeAt(0);try{if(n=t.getSel())n.rangeCount>0?r=n.getRangeAt(0):r=n.createRange?n.createRange():s.createRange()}catch(f){}if(l&&r&&r.setStart&&s.selection){try{o=s.selection.createRange()}catch(f){}o&&o.item&&(i=o.item(0),r=s.createRange(),r.setStartBefore(i),r.setEndAfter(i))}return r||(r=s.createRange?s.createRange():s.body.createTextRange()),r.setStart&&r.startContainer.nodeType===9&&r.collapsed&&(i=t.dom.getRoot(),r.setStart(i,0),r.setEnd(i,0)),t.selectedRange&&t.explicitRange&&(u(r.START_TO_START,r,t.selectedRange)===0&&u(r.END_TO_END,r,t.selectedRange)===0?r=t.explicitRange:(t.selectedRange=null,t.explicitRange=null)),r},setRng:function(e,t){var n=this,r;if(e.select){try{e.select()}catch(i){}return}if(!n.tridentSel){r=n.getSel();if(r){n.explicitRange=e;try{r.removeAllRanges(),r.addRange(e)}catch(i){}t===!1&&r.extend&&(r.collapse(e.endContainer,e.endOffset),r.extend(e.startContainer,e.startOffset)),n.selectedRange=r.rangeCount>0?r.getRangeAt(0):null}}else if(e.cloneRange)try{n.tridentSel.addRange(e);return}catch(i){}},setNode:function(e){var t=this;return t.setContent(t.dom.getOuterHTML(e)),e},getNode:function(){function a(e,t){var n=e;while(e&&e.nodeType===3&&e.length===0)e=t?e.nextSibling:e.previousSibling;return e||n}var e=this,t=e.getRng(),n,r=t.startContainer,i=t.endContainer,s=t.startOffset,o=t.endOffset,u=e.dom.getRoot();if(!t)return u;if(t.setStart){n=t.commonAncestorContainer;if(!t.collapsed){r==i&&o-s<2&&r.hasChildNodes()&&(n=r.childNodes[s]);if(r.nodeType===3&&i.nodeType===3){r.length===s?r=a(r.nextSibling,!0):r=r.parentNode,o===0?i=a(i.previousSibling,!1):i=i.parentNode;if(r&&r===i)return r}}return n&&n.nodeType==3?n.parentNode:n}return n=t.item?t.item(0):t.parentElement(),n.ownerDocument!==e.win.document&&(n=u),n},getSelectedBlocks:function(t,n){var r=this,i=r.dom,s,o,u=[];o=i.getRoot(),t=i.getParent(t||r.getStart(),i.isBlock),n=i.getParent(n||r.getEnd(),i.isBlock),t&&t!=o&&u.push(t);if(t&&n&&t!=n){s=t;var a=new e(t,o);while((s=a.next())&&s!=n)i.isBlock(s)&&u.push(s)}return n&&t!=n&&n!=o&&u.push(n),u},isForward:function(){var e=this.dom,t=this.getSel(),n,r;return!t||!t.anchorNode||!t.focusNode?!0:(n=e.createRng(),n.setStart(t.anchorNode,t.anchorOffset),n.collapse(!0),r=e.createRng(),r.setStart(t.focusNode,t.focusOffset),r.collapse(!0),n.compareBoundaryPoints(n.START_TO_START,r)<=0)},normalize:function(){var e=this,t=e.getRng();return!l&&(new i(e.dom)).normalize(t)&&e.setRng(t,e.isForward()),t},selectorChanged:function(e,t){var n=this,r;return n.selectorChangedData||(n.selectorChangedData={},r={},n.editor.on("NodeChange",function(e){var t=e.element,i=n.dom,s=i.getParents(t,null,i.getRoot()),o={};a(n.selectorChangedData,function(e,t){a(s,function(n){if(i.is(n,t))return r[t]||(a(e,function(e){e(!0,{node:n,selector:t,parents:s})}),r[t]=e),o[t]=e,!1})}),a(r,function(e,n){o[n]||(delete r[n],a(e,function(e){e(!1,{node:t,selector:n,parents:s})}))})})),n.selectorChangedData[e]||(n.selectorChangedData[e]=[]),n.selectorChangedData[e].push(t),n},getScrollContainer:function(){var e,t=this.dom.getRoot();while(t&&t.nodeName!="BODY"){if(t.scrollHeight>t.clientHeight){e=t;break}t=t.parentNode}return e},scrollIntoView:function(e){function a(e){var t=0,n=0,r=e;while(r&&r.nodeType)t+=r.offsetLeft||0,n+=r.offsetTop||0,r=r.offsetParent;return{x:t,y:n}}var t,n,r=this,i=r.dom,s=i.getRoot(),o,u;if(s.nodeName!="BODY"){var f=r.getScrollContainer();if(f){t=a(e).y-a(f).y,u=f.clientHeight,o=f.scrollTop;if(t<o||t+25>o+u)f.scrollTop=t<o?t:t-u+25;return}}n=i.getViewPort(r.editor.getWin()),t=i.getPos(e).y,o=n.y,u=n.h,(t<n.y||t+25>o+u)&&r.editor.getWin().scrollTo(0,t<o?t:t-u+25)},_moveEndPoint:function(t,n,r){var i=n,s=new e(n,i),u=this.dom.schema.getNonEmptyElements();do{if(n.nodeType==3&&f(n.nodeValue).length!==0){r?t.setStart(n,0):t.setEnd(n,n.nodeValue.length);return}if(u[n.nodeName]){r?t.setStartBefore(n):n.nodeName=="BR"?t.setEndBefore(n):t.setEndAfter(n);return}if(o.ie&&o.ie<11&&this.dom.isBlock(n)&&this.dom.isEmpty(n)){r?t.setStart(n,0):t.setEnd(n,0);return}}while(n=r?s.next():s.prev());i.nodeName=="BODY"&&(r?t.setStart(i,0):t.setEnd(i,i.childNodes.length))},destroy:function(){this.win=null,this.controlSelection.destroy()}},c}),i("tinymce/dom/ElementUtils",["tinymce/dom/BookmarkManager","tinymce/util/Tools"],function(e,t){function r(t){this.compare=function(r,i){function s(e){var r={};return n(t.getAttribs(e),function(n){var i=n.nodeName.toLowerCase();i.indexOf("_")!==0&&i!=="style"&&i!=="data-mce-style"&&(r[i]=t.getAttrib(e,i))}),r}function o(e,t){var n,r;for(r in e)if(e.hasOwnProperty(r)){n=t[r];if(typeof n=="undefined")return!1;if(e[r]!=n)return!1;delete t[r]}for(r in t)if(t.hasOwnProperty(r))return!1;return!0}return r.nodeName!=i.nodeName?!1:o(s(r),s(i))?o(t.parseStyle(t.getAttrib(r,"style")),t.parseStyle(t.getAttrib(i,"style")))?!e.isBookmarkNode(r)&&!e.isBookmarkNode(i):!1:!1}}var n=t.each;return r}),i("tinymce/fmt/Preview",["tinymce/util/Tools"],function(e){function n(e,n){function f(e){return e.replace(/%(\w+)/g,"")}var r,i,s=e.dom,o="",u,a;a=e.settings.preview_styles;if(a===!1)return"";a||(a="font-family font-size font-weight font-style text-decoration text-transform color background-color border border-radius outline text-shadow");if(typeof n=="string"){n=e.formatter.get(n);if(!n)return;n=n[0]}return r=n.block||n.inline||"span",i=s.create(r),t(n.styles,function(e,t){e=f(e),e&&s.setStyle(i,t,e)}),t(n.attributes,function(e,t){e=f(e),e&&s.setAttrib(i,t,e)}),t(n.classes,function(e){e=f(e),s.hasClass(i,e)||s.addClass(i,e)}),e.fire("PreviewFormats"),s.setStyles(i,{position:"absolute",left:-65535}),e.getBody().appendChild(i),u=s.getStyle(e.getBody(),"fontSize",!0),u=/px$/.test(u)?parseInt(u,10):0,t(a.split(" "),function(t){var n=s.getStyle(i,t,!0);if(t=="background-color"&&/transparent|rgba\s*\([^)]+,\s*0\)/.test(n)){n=s.getStyle(e.getBody(),t,!0);if(s.toHex(n).toLowerCase()=="#ffffff")return}if(t=="color"&&s.toHex(n).toLowerCase()=="#000000")return;if(t=="font-size"&&/em|%$/.test(n)){if(u===0)return;n=parseFloat(n,10)/(/%$/.test(n)?100:1),n=n*u+"px"}t=="border"&&n&&(o+="padding:0 2px;"),o+=t+":"+n+";"}),e.fire("AfterPreviewFormats"),s.remove(i),o}var t=e.each;return{getCssText:n}}),i("tinymce/Formatter",["tinymce/dom/TreeWalker","tinymce/dom/RangeUtils","tinymce/dom/BookmarkManager","tinymce/dom/ElementUtils","tinymce/util/Tools","tinymce/fmt/Preview"],function(e,t,n,r,i,s){return function(o){function A(e){return e.nodeType&&(e=e.nodeName),!!o.schema.getTextBlockElements()[e.toLowerCase()]}function O(e,t){return a.getParents(e,t,a.getRoot())}function M(e){return e.nodeType===1&&e.id==="_mce_caret"}function _(){H({valigntop:[{selector:"td,th",styles:{verticalAlign:"top"}}],valignmiddle:[{selector:"td,th",styles:{verticalAlign:"middle"}}],valignbottom:[{selector:"td,th",styles:{verticalAlign:"bottom"}}],alignleft:[{selector:"figure,p,h1,h2,h3,h4,h5,h6,td,th,tr,div,ul,ol,li",styles:{textAlign:"left"},defaultBlock:"div"},{selector:"img,table",collapsed:!1,styles:{"float":"left"}}],aligncenter:[{selector:"figure,p,h1,h2,h3,h4,h5,h6,td,th,tr,div,ul,ol,li",styles:{textAlign:"center"},defaultBlock:"div"},{selector:"img",collapsed:!1,styles:{display:"block",marginLeft:"auto",marginRight:"auto"}},{selector:"table",collapsed:!1,styles:{marginLeft:"auto",marginRight:"auto"}}],alignright:[{selector:"figure,p,h1,h2,h3,h4,h5,h6,td,th,tr,div,ul,ol,li",styles:{textAlign:"right"},defaultBlock:"div"},{selector:"img,table",collapsed:!1,styles:{"float":"right"}}],alignjustify:[{selector:"figure,p,h1,h2,h3,h4,h5,h6,td,th,tr,div,ul,ol,li",styles:{textAlign:"justify"},defaultBlock:"div"}],bold:[{inline:"strong",remove:"all"},{inline:"span",styles:{fontWeight:"bold"}},{inline:"b",remove:"all"}],italic:[{inline:"em",remove:"all"},{inline:"span",styles:{fontStyle:"italic"}},{inline:"i",remove:"all"}],underline:[{inline:"span",styles:{textDecoration:"underline"},exact:!0},{inline:"u",remove:"all"}],strikethrough:[{inline:"span",styles:{textDecoration:"line-through"},exact:!0},{inline:"strike",remove:"all"}],forecolor:{inline:"span",styles:{color:"%value"},wrap_links:!1},hilitecolor:{inline:"span",styles:{backgroundColor:"%value"},wrap_links:!1},fontname:{inline:"span",styles:{fontFamily:"%value"}},fontsize:{inline:"span",styles:{fontSize:"%value"}},fontsize_class:{inline:"span",attributes:{"class":"%value"}},blockquote:{block:"blockquote",wrapper:1,remove:"all"},subscript:{inline:"sub"},superscript:{inline:"sup"},code:{inline:"code"},link:{inline:"a",selector:"a",remove:"all",split:!0,deep:!0,onmatch:function(){return!0},onformat:function(e,t,n){N(n,function(t,n){a.setAttrib(e,n,t)})}},removeformat:[{selector:"b,strong,em,i,font,u,strike,sub,sup,dfn,code,samp,kbd,var,cite,mark,q",remove:"all",split:!0,expand:!1,block_expand:!0,deep:!0},{selector:"span",attributes:["style","class"],remove:"empty",split:!0,expand:!1,deep:!0},{selector:"*",attributes:["style","class"],split:!1,expand:!1,deep:!0}]}),N("p h1 h2 h3 h4 h5 h6 div address pre div dt dd samp".split(/\s/),function(e){H(e,{block:e,remove:"all"})}),H(o.settings.formats)}function D(){o.addShortcut("ctrl+b","bold_desc","Bold"),o.addShortcut("ctrl+i","italic_desc","Italic"),o.addShortcut("ctrl+u","underline_desc","Underline");for(var e=1;e<=6;e++)o.addShortcut("ctrl+"+e,"",["FormatBlock",!1,"h"+e]);o.addShortcut("ctrl+7","",["FormatBlock",!1,"p"]),o.addShortcut("ctrl+8","",["FormatBlock",!1,"div"]),o.addShortcut("ctrl+9","",["FormatBlock",!1,"address"])}function P(e){return e?u[e]:u}function H(e,t){e&&(typeof e!="string"?N(e,function(e,t){H(t,e)}):(t=t.length?t:[t],N(t,function(e){e.deep===w&&(e.deep=!e.selector),e.split===w&&(e.split=!e.selector||e.inline),e.remove===w&&e.selector&&!e.inline&&(e.remove="none"),e.selector&&e.inline&&(e.mixed=!0,e.block_expand=!0),typeof e.classes=="string"&&(e.classes=e.classes.split(/\s+/))}),u[e]=t))}function B(e){var t;return o.dom.getParent(e,function(e){return t=o.dom.getStyle(e,"text-decoration"),t&&t!=="none"}),t}function j(e){var t;e.nodeType===1&&e.parentNode&&e.parentNode.nodeType===1&&(t=B(e.parentNode),o.dom.getStyle(e,"color")&&t?o.dom.setStyle(e,"text-decoration",t):o.dom.getStyle(e,"textdecoration")===t&&o.dom.setStyle(e,"text-decoration",null))}function F(t,n,r){function m(e,t){t=t||s;if(e){t.onformat&&t.onformat(e,t,n,r),N(t.styles,function(t,r){a.setStyle(e,r,G(t,n))});if(t.styles){var i=a.getAttrib(e,"style");i&&e.setAttribute("data-mce-style",i)}N(t.attributes,function(t,r){a.setAttrib(e,r,G(t,n))}),N(t.classes,function(t){t=G(t,n),a.hasClass(e,t)||a.addClass(e,t)})}}function b(){function t(t,n){var i=new e(n);for(r=i.current();r;r=i.prev())if(r.childNodes.length>1||r==t||r.tagName=="BR")return r}var n=o.selection.getRng(),i=n.startContainer,s=n.endContainer;if(i!=s&&n.endOffset===0){var u=t(i,s),a=u.nodeType==3?u.length:u.childNodes.length;n.setEnd(u,a)}return n}function w(e,t,n,r,i){var s=[],o=-1,u,f=-1,l=-1,c;return N(e.childNodes,function(e,t){if(e.nodeName==="UL"||e.nodeName==="OL")return o=t,u=e,!1}),N(e.childNodes,function(e,n){T(e)&&(e.id==t.id+"_start"?f=n:e.id==t.id+"_end"&&(l=n))}),o<=0||f<o&&l>o?(N(C(e.childNodes),i),0):(c=a.clone(n,g),N(C(e.childNodes),function(e,t){if(f<o&&t<o||f>o&&t>o)s.push(e),e.parentNode.removeChild(e)}),f<o?e.insertBefore(c,u):f>o&&e.insertBefore(c,u.nextSibling),r.push(c),N(s,function(e){c.appendChild(e)}),c)}function E(e,r,o){var u=[],f,p,d=!0;f=s.inline||s.block,p=a.create(f),m(p),l.walk(e,function(e){function y(e){var b,E,S,x,T;T=d,b=e.nodeName.toLowerCase(),E=e.parentNode.nodeName.toLowerCase();if(J(b,"br")){l=0,s.block&&a.remove(e);return}if(s.wrapper&&R(e,t,n)){l=0;return}if(d&&!x&&s.block&&!s.wrapper&&A(b)&&c(E,f)){e=a.rename(e,f),m(e),u.push(e),l=0;return}if(s.selector){N(i,function(t){if("collapsed"in t&&t.collapsed!==v)return;a.is(e,t.selector)&&!M(e)&&(m(e,t),S=!0)});if(!s.inline||S){l=0;return}}d&&!x&&c(f,b)&&c(E,f)&&(!!o||e.nodeType!==3||e.nodeValue.length!==1||e.nodeValue.charCodeAt(0)!==65279)&&!M(e)&&(!s.inline||!h(e))?(l||(l=a.clone(p,g),e.parentNode.insertBefore(l,e),u.push(l)),l.appendChild(e)):b=="li"&&r?l=w(e,r,p,u,y):(l=0,N(C(e.childNodes),y),x&&(d=T),l=0)}var l;N(e,y)}),s.wrap_links===!1&&N(u,function(e){function t(e){var n,r,i;if(e.nodeName==="A"){r=a.clone(p,g),u.push(r),i=C(e.childNodes);for(n=0;n<i.length;n++)r.appendChild(i[n]);e.appendChild(r)}N(C(e.childNodes),t)}t(e)}),N(u,function(e){function o(e){var t=0;return N(e.childNodes,function(e){!Y(e)&&!T(e)&&t++}),t}function f(e){var t,n;return N(e.childNodes,function(e){if(e.nodeType==1&&!T(e)&&!M(e))return t=e,g}),t&&!T(t)&&$(t,s)&&(n=a.clone(t,g),m(n),a.replace(n,e,y),a.remove(t,1)),n||e}var r;r=o(e);if((u.length>1||!h(e))&&r===0){a.remove(e,1);return}if(s.inline||
s.wrapper){!s.exact&&r===1&&(e=f(e)),N(i,function(t){N(a.select(t.inline,e),function(e){var r;if(T(e))return;if(t.wrap_links===!1){r=e.parentNode;do if(r.nodeName==="A")return;while(r=r.parentNode)}tt(t,n,e,t.exact?e:null)})});if(R(e.parentNode,t,n))return a.remove(e,1),e=0,y;s.merge_with_parents&&a.getParent(e.parentNode,function(r){if(R(r,t,n))return a.remove(e,1),e=0,y}),e&&s.merge_siblings!==!1&&(e=it(rt(e),e),e=it(e,rt(e,y)))}})}var i=P(t),s=i[0],u,d,v=!r&&f.isCollapsed();if(s)if(r)r.nodeType?(d=a.createRng(),d.setStartBefore(r),d.setEndAfter(r),E(et(d,i),null,!0)):E(r,null,!0);else if(!v||!s.inline||a.select("td.mce-item-selected,th.mce-item-selected").length){var S=o.selection.getNode();!p&&i[0].defaultBlock&&!a.getParent(S,a.isBlock)&&F(i[0].defaultBlock),o.selection.setRng(b()),u=f.getBookmark(),E(et(f.getRng(y),i),u),s.styles&&(s.styles.color||s.styles.textDecoration)&&(k(S,j,"childNodes"),j(S)),f.moveToBookmark(u),ut(f.getRng(y)),o.nodeChanged()}else ot("apply",t,n)}function I(e,t,n){function p(e){var n,s,o,u,a;e.nodeType===1&&E(e)&&(u=c,c=E(e)==="true",a=!0),n=C(e.childNodes);if(c&&!a)for(s=0,o=r.length;s<o;s++)if(tt(r[s],t,e,e))break;if(i.deep&&n.length){for(s=0,o=n.length;s<o;s++)p(n[s]);a&&(c=u)}}function v(n){var r;return N(O(n.parentNode).reverse(),function(n){var i;!r&&n.id!="_start"&&n.id!="_end"&&(i=R(n,e,t),i&&i.split!==!1&&(r=n))}),r}function m(e,n,s,o){var u,f,l,c,p,d;if(e){d=e.parentNode;for(u=n.parentNode;u&&u!=d;u=u.parentNode){f=a.clone(u,g);for(p=0;p<r.length;p++)if(tt(r[p],t,f,f)){f=0;break}f&&(l&&f.appendChild(l),c||(c=f),l=f)}o&&(!i.mixed||!h(e))&&(n=a.split(e,n)),l&&(s.parentNode.insertBefore(l,s),c.appendChild(s))}return n}function b(e){return m(v(e),e,e,!0)}function w(e){var t=a.get(e?"_start":"_end"),n=t[e?"firstChild":"lastChild"];return T(n)&&(n=n[e?"firstChild":"lastChild"]),a.remove(t,!0),n}function S(e){var t,n,s=e.commonAncestorContainer;e=et(e,r,y),i.split&&(t=st(e,y),n=st(e),t!=n?(/^(TR|TH|TD)$/.test(t.nodeName)&&t.firstChild&&(t.nodeName=="TR"?t=t.firstChild.firstChild||t:t=t.firstChild||t),s&&/^T(HEAD|BODY|FOOT|R)$/.test(s.nodeName)&&/^(TH|TD)$/.test(n.nodeName)&&n.firstChild&&(n=n.firstChild||n),t=Z(t,"span",{id:"_start","data-mce-type":"bookmark"}),n=Z(n,"span",{id:"_end","data-mce-type":"bookmark"}),b(t),b(n),t=w(y),n=w()):t=n=b(t),e.startContainer=t.parentNode,e.startOffset=d(t),e.endContainer=n.parentNode,e.endOffset=d(n)+1),l.walk(e,function(e){N(e,function(e){p(e),e.nodeType===1&&o.dom.getStyle(e,"text-decoration")==="underline"&&e.parentNode&&B(e.parentNode)==="underline"&&tt({deep:!1,exact:!0,inline:"span",styles:{textDecoration:"underline"}},null,e)})})}var r=P(e),i=r[0],s,u,c=!0;if(n){n.nodeType?(u=a.createRng(),u.setStartBefore(n),u.setEndAfter(n),S(u)):S(n);return}!f.isCollapsed()||!i.inline||a.select("td.mce-item-selected,th.mce-item-selected").length?(s=f.getBookmark(),S(f.getRng(y)),f.moveToBookmark(s),i.inline&&U(e,t,f.getStart())&&ut(f.getRng(!0)),o.nodeChanged()):ot("remove",e,t)}function q(e,t,n){var r=P(e);!U(e,t,n)||"toggle"in r[0]&&!r[0].toggle?F(e,t,n):I(e,t,n)}function R(e,t,n,r){function f(e,t,i){var s,o,u=t[i],f;if(t.onmatch)return t.onmatch(e,t,i);if(u)if(u.length===w){for(s in u)if(u.hasOwnProperty(s)){i==="attributes"?o=a.getAttrib(e,s):o=K(e,s);if(r&&!o&&!t.exact)return;if((!r||t.exact)&&!J(o,Q(G(u[s],n),s)))return}}else for(f=0;f<u.length;f++)if(i==="attributes"?a.getAttrib(e,u[f]):K(e,u[f]))return t;return t}var i=P(t),s,o,u;if(i&&e)for(o=0;o<i.length;o++){s=i[o];if($(e,s)&&f(e,s,"attributes")&&f(e,s,"styles")){if(u=s.classes)for(o=0;o<u.length;o++)if(!a.hasClass(e,u[o]))return;return s}}}function U(e,t,n){function i(n){var r=a.getRoot();return n===r?!1:(n=a.getParent(n,function(n){return n.parentNode===r||!!R(n,e,t,!0)}),R(n,e,t))}var r;return n?i(n):(n=f.getNode(),i(n)?y:(r=f.getStart(),r!=n&&i(r)?y:g))}function z(e,t){var n,r=[],i={};return n=f.getStart(),a.getParent(n,function(n){var s,o;for(s=0;s<e.length;s++)o=e[s],!i[o]&&R(n,o,t)&&(i[o]=!0,r.push(o))},a.getRoot()),r}function W(e){var t=P(e),n,r,i,s,o;if(t){n=f.getStart(),r=O(n);for(s=t.length-1;s>=0;s--){o=t[s].selector;if(!o||t[s].defaultBlock)return y;for(i=r.length-1;i>=0;i--)if(a.is(r[i],o))return y}}return g}function X(e,t,n){var r;return b||(b={},r={},o.on("NodeChange",function(e){var t=O(e.element),n={};N(b,function(e,i){N(t,function(s){if(R(s,i,{},e.similar))return r[i]||(N(e,function(e){e(!0,{node:s,format:i,parents:t})}),r[i]=e),n[i]=e,!1})}),N(r,function(i,s){n[s]||(delete r[s],N(i,function(n){n(!1,{node:e.element,format:s,parents:t})}))})})),N(e.split(","),function(e){b[e]||(b[e]=[],b[e].similar=n),b[e].push(t)}),this}function V(e){return s.getCssText(o,e)}function $(e,t){if(J(e,t.inline))return y;if(J(e,t.block))return y;if(t.selector)return e.nodeType==1&&a.is(e,t.selector)}function J(e,t){return e=e||"",t=t||"",e=""+(e.nodeName||e),t=""+(t.nodeName||t),e.toLowerCase()==t.toLowerCase()}function K(e,t){return Q(a.getStyle(e,t),t)}function Q(e,t){if(t=="color"||t=="backgroundColor")e=a.toHex(e);return t=="fontWeight"&&e==700&&(e="bold"),t=="fontFamily"&&(e=e.replace(/[\'\"]/g,"").replace(/,\s+/g,",")),""+e}function G(e,t){return typeof e!="string"?e=e(t):t&&(e=e.replace(/%(\w+)/g,function(e,n){return t[n]||e})),e}function Y(e){return e&&e.nodeType===3&&/^([\t \r\n]+|)$/.test(e.nodeValue)}function Z(e,t,n){var r=a.create(t,n);return e.parentNode.insertBefore(r,e),r.appendChild(e),r}function et(t,n,r){function v(e){function u(e){return e.nodeName=="BR"&&e.getAttribute("data-mce-bogus")&&!e.nextSibling}var t,r,i,s,o;t=r=e?f:c,s=e?"previousSibling":"nextSibling",o=a.getRoot();if(t.nodeType==3&&!Y(t))if(e?l>0:p<t.nodeValue.length)return t;for(;;){if(!n[0].block_expand&&h(r))return r;for(i=r[s];i;i=i[s])if(!T(i)&&!Y(i)&&!u(i))return r;if(r.parentNode==o){t=r;break}r=r.parentNode}return t}function m(e,t){t===w&&(t=e.nodeType===3?e.length:e.childNodes.length);while(e&&e.hasChildNodes())e=e.childNodes[t],e&&(t=e.nodeType===3?e.length:e.childNodes.length);return{node:e,offset:t}}function y(e){var t=e;while(t){if(t.nodeType===1&&E(t))return E(t)==="false"?t:e;t=t.parentNode}return e}function b(t,n,i){function c(e,t){var n,s,o=e.nodeValue;return typeof t=="undefined"&&(t=i?o.length:0),i?(n=o.lastIndexOf(" ",t),s=o.lastIndexOf(" ",t),n=n>s?n:s,n!==-1&&!r&&n++):(n=o.indexOf(" ",t),s=o.indexOf(" ",t),n=n!==-1&&(s===-1||n<s)?n:s),n}var s,u,f,l;if(t.nodeType===3){f=c(t,n);if(f!==-1)return{container:t,offset:f};l=t}s=new e(t,a.getParent(t,h)||o.getBody());while(u=s[i?"prev":"next"]())if(u.nodeType===3){l=u,f=c(u);if(f!==-1)return{container:u,offset:f}}else if(h(u))break;if(l)return i?n=0:n=l.length,{container:l,offset:n}}function S(e,r){var i,s,o,u;e.nodeType==3&&e.nodeValue.length===0&&e[r]&&(e=e[r]),i=O(e);for(s=0;s<i.length;s++)for(o=0;o<n.length;o++){u=n[o];if("collapsed"in u&&u.collapsed!==t.collapsed)continue;if(a.is(i[s],u.selector))return i[s]}return e}function x(e,t){var r,i=a.getRoot();n[0].wrapper||(r=a.getParent(e,n[0].block,i)),r||(r=a.getParent(e.nodeType==3?e.parentNode:e,function(e){return e!=i&&A(e)})),r&&n[0].wrapper&&(r=O(r,"ul,ol").reverse()[0]||r);if(!r){r=e;while(r[t]&&!h(r[t])){r=r[t];if(J(r,"br"))break}}return r||e}var i,s,u,f=t.startContainer,l=t.startOffset,c=t.endContainer,p=t.endOffset;f.nodeType==1&&f.hasChildNodes()&&(i=f.childNodes.length-1,f=f.childNodes[l>i?i:l],f.nodeType==3&&(l=0)),c.nodeType==1&&c.hasChildNodes()&&(i=c.childNodes.length-1,c=c.childNodes[p>i?i:p-1],c.nodeType==3&&(p=c.nodeValue.length)),f=y(f),c=y(c);if(T(f.parentNode)||T(f))f=T(f)?f:f.parentNode,f=f.nextSibling||f,f.nodeType==3&&(l=0);if(T(c.parentNode)||T(c))c=T(c)?c:c.parentNode,c=c.previousSibling||c,c.nodeType==3&&(p=c.length);if(n[0].inline){t.collapsed&&(u=b(f,l,!0),u&&(f=u.container,l=u.offset),u=b(c,p),u&&(c=u.container,p=u.offset)),s=m(c,p);if(s.node){while(s.node&&s.offset===0&&s.node.previousSibling)s=m(s.node.previousSibling);s.node&&s.offset>0&&s.node.nodeType===3&&s.node.nodeValue.charAt(s.offset-1)===" "&&s.offset>1&&(c=s.node,c.splitText(s.offset-1))}}if(n[0].inline||n[0].block_expand){if(!n[0].inline||f.nodeType!=3||l===0)f=v(!0);if(!n[0].inline||c.nodeType!=3||p===c.nodeValue.length)c=v()}n[0].selector&&n[0].expand!==g&&!n[0].inline&&(f=S(f,"previousSibling"),c=S(c,"nextSibling"));if(n[0].block||n[0].selector)f=x(f,"previousSibling"),c=x(c,"nextSibling"),n[0].block&&(h(f)||(f=v(!0)),h(c)||(c=v()));return f.nodeType==1&&(l=d(f),f=f.parentNode),c.nodeType==1&&(p=d(c)+1,c=c.parentNode),{startContainer:f,startOffset:l,endContainer:c,endOffset:p}}function tt(e,t,n,r){var i,s,o;if(!$(n,e))return g;if(e.remove!="all"){N(e.styles,function(e,i){e=Q(G(e,t),i),typeof i=="number"&&(i=e,r=0),(!r||J(K(r,i),e))&&a.setStyle(n,i,""),o=1}),o&&a.getAttrib(n,"style")===""&&(n.removeAttribute("style"),n.removeAttribute("data-mce-style")),N(e.attributes,function(e,i){var s;e=G(e,t),typeof i=="number"&&(i=e,r=0);if(!r||J(a.getAttrib(r,i),e)){if(i=="class"){e=a.getAttrib(n,i);if(e){s="",N(e.split(/\s+/),function(e){/mce\w+/.test(e)&&(s+=(s?" ":"")+e)});if(s){a.setAttrib(n,i,s);return}}}i=="class"&&n.removeAttribute("className"),m.test(i)&&n.removeAttribute("data-mce-"+i),n.removeAttribute(i)}}),N(e.classes,function(e){e=G(e,t),(!r||a.hasClass(r,e))&&a.removeClass(n,e)}),s=a.getAttribs(n);for(i=0;i<s.length;i++)if(s[i].nodeName.indexOf("_")!==0)return g}if(e.remove!="none")return nt(n,e),y}function nt(e,t){function i(e,t,n){return e=rt(e,t,n),!e||e.nodeName=="BR"||h(e)}var n=e.parentNode,r;t.block&&(p?n==a.getRoot()&&(!t.list_block||!J(e,t.list_block))&&N(C(e.childNodes),function(e){c(p,e.nodeName.toLowerCase())?r?r.appendChild(e):(r=Z(e,p),a.setAttribs(r,o.settings.forced_root_block_attrs)):r=0}):h(e)&&!h(n)&&(!i(e,g)&&!i(e.firstChild,y,1)&&e.insertBefore(a.create("br"),e.firstChild),!i(e,y)&&!i(e.lastChild,g,1)&&e.appendChild(a.create("br"))));if(t.selector&&t.inline&&!J(t.inline,e))return;a.remove(e,1)}function rt(e,t,n){if(e){t=t?"nextSibling":"previousSibling";for(e=n?e:e[t];e;e=e[t])if(e.nodeType==1||!Y(e))return e}}function it(e,t){function o(e,t){for(n=e;n;n=n[t]){if(n.nodeType==3&&n.nodeValue.length!==0)return e;if(n.nodeType==1&&!T(n))return n}return e}var n,i,s=new r(a);if(e&&t){e=o(e,"previousSibling"),t=o(t,"nextSibling");if(s.compare(e,t)){for(n=e.nextSibling;n&&n!=t;)i=n,n=n.nextSibling,e.appendChild(i);return a.remove(t),N(C(t.childNodes),function(t){e.appendChild(t)}),e}}return t}function st(t,n){var r,i,s;return r=t[n?"startContainer":"endContainer"],i=t[n?"startOffset":"endOffset"],r.nodeType==1&&(s=r.childNodes.length-1,!n&&i&&i--,r=r.childNodes[i>s?s:i]),r.nodeType===3&&n&&i>=r.nodeValue.length&&(r=(new e(r,o.getBody())).next()||r),r.nodeType===3&&!n&&i===0&&(r=(new e(r,o.getBody())).prev()||r),r}function ot(t,n,r){function u(e){var t=a.create("span",{id:i,"data-mce-bogus":!0,style:s?"color:red":""});return e&&t.appendChild(o.getDoc().createTextNode(v)),t}function c(e,t){while(e){if(e.nodeType===3&&e.nodeValue!==v||e.childNodes.length>1)return!1;t&&e.nodeType===1&&t.push(e),e=e.firstChild}return!0}function h(e){while(e){if(e.id===i)return e;e=e.parentNode}}function p(t){var n;if(t){n=new e(t,t);for(t=n.current();t;t=n.next())if(t.nodeType===3)return t}}function d(e,t){var n,r;if(!e){e=h(f.getStart());if(!e)while(e=a.get(i))d(e,!1)}else r=f.getRng(!0),c(e)?(t!==!1&&(r.setStartBefore(e),r.setEndBefore(e)),a.remove(e)):(n=p(e),n.nodeValue.charAt(0)===v&&(n=n.deleteData(0,1)),a.remove(e,1)),f.setRng(r)}function m(){var e,t,i,s,o,a,c;e=f.getRng(!0),s=e.startOffset,a=e.startContainer,c=a.nodeValue,t=h(f.getStart()),t&&(i=p(t)),c&&s>0&&s<c.length&&/\w/.test(c.charAt(s))&&/\w/.test(c.charAt(s-1))?(o=f.getBookmark(),e.collapse(!0),e=et(e,P(n)),e=l.split(e),F(n,r,e),f.moveToBookmark(o)):(!t||i.nodeValue!==v?(t=u(!0),i=t.firstChild,e.insertNode(t),s=1,F(n,r,t)):F(n,r,t),f.setCursorLocation(i,s))}function g(){var e=f.getRng(!0),t,i,s,o,c,h,p=[],d,m;t=e.startContainer,i=e.startOffset,c=t,t.nodeType==3&&(i!=t.nodeValue.length&&(o=!0),c=c.parentNode);while(c){if(R(c,n,r)){h=c;break}c.nextSibling&&(o=!0),p.push(c),c=c.parentNode}if(!h)return;if(o)s=f.getBookmark(),e.collapse(!0),e=et(e,P(n),!0),e=l.split(e),I(n,r,e),f.moveToBookmark(s);else{m=u(),c=m;for(d=p.length-1;d>=0;d--)c.appendChild(a.clone(p[d],!1)),c=c.firstChild;c.appendChild(a.doc.createTextNode(v)),c=c.firstChild;var g=a.getParent(h,A);g&&a.isEmpty(g)?h.parentNode.replaceChild(m,h):a.insertAfter(m,h),f.setCursorLocation(c,1),a.isEmpty(h)&&a.remove(h)}}function y(){var e;e=h(f.getStart()),e&&!a.isEmpty(e)&&k(e,function(e){e.nodeType==1&&e.id!==i&&!a.isEmpty(e)&&a.setAttrib(e,"data-mce-bogus",null)},"childNodes")}var i="_mce_caret",s=o.settings.caret_debug;o._hasCaretEvents||(x=function(){var e=[],t;if(c(h(f.getStart()),e)){t=e.length;while(t--)a.setAttrib(e[t],"data-mce-bogus","1")}},S=function(e){var t=e.keyCode;d(),(t==8||t==37||t==39)&&d(h(f.getStart())),y()},o.on("SetContent",function(e){e.selection&&y()}),o._hasCaretEvents=!0),t=="apply"?m():g()}function ut(t){var n=t.startContainer,r=t.startOffset,i,s,o,u,l;n.nodeType==3&&r>=n.nodeValue.length&&(r=d(n),n=n.parentNode,i=!0);if(n.nodeType==1){u=n.childNodes,n=u[Math.min(r,u.length-1)],s=new e(n,a.getParent(n,a.isBlock)),(r>u.length-1||i)&&s.next();for(o=s.current();o;o=s.next())if(o.nodeType==3&&!Y(o)){l=a.create("a",null,v),o.parentNode.insertBefore(l,o),t.setStart(o,0),f.setRng(t),a.remove(l);return}}}var u={},a=o.dom,f=o.selection,l=new t(a),c=o.schema.isValidChild,h=a.isBlock,p=o.settings.forced_root_block,d=a.nodeIndex,v="﻿",m=/^(src|href|style)$/,g=!1,y=!0,b,w,E=a.getContentEditable,S,x,T=n.isBookmarkNode,N=i.each,C=i.grep,k=i.walk,L=i.extend;L(this,{get:P,register:H,apply:F,remove:I,toggle:q,match:U,matchAll:z,matchNode:R,canApply:W,formatChanged:X,getCssText:V}),_(),D(),o.on("BeforeGetContent",function(){x&&x()}),o.on("mouseup keydown",function(e){S&&S(e)})}}),i("tinymce/UndoManager",["tinymce/Env","tinymce/util/Tools"],function(e,t){var n=t.trim,r;return r=new RegExp(["<span[^>]+data-mce-bogus[^>]+>[​﻿]+<\\/span>","<div[^>]+data-mce-bogus[^>]+>[^>]*<\\/div>",'\\s?data-mce-selected="[^"]+"'].join("|"),"gi"),function(t){function l(){return n(t.getContent({format:"raw",no_events:1}).replace(r,""))}function c(e){i.typing=!1,i.add({},e)}var i=this,s=0,o=[],u,a,f=0;return t.on("init",function(){i.add()}),t.on("BeforeExecCommand",function(e){var t=e.command;t!="Undo"&&t!="Redo"&&t!="mceRepaint"&&i.beforeChange()}),t.on("ExecCommand",function(e){var t=e.command;t!="Undo"&&t!="Redo"&&t!="mceRepaint"&&c(e)}),t.on("ObjectResizeStart",function(){i.beforeChange()}),t.on("SaveContent ObjectResized blur",c),t.on("DragEnd",c),t.on("KeyUp",function(n){var r=n.keyCode;if(r>=33&&r<=36||r>=37&&r<=40||r==45||r==13||n.ctrlKey)c(),t.nodeChanged();(r==46||r==8||e.mac&&(r==91||r==93))&&t.nodeChanged(),a&&i.typing&&(t.isDirty()||(t.isNotDirty=!o[0]||l()==o[0].content,t.isNotDirty||t.fire("change",{level:o[0],lastLevel:null})),t.fire("TypingUndo"),a=!1,t.nodeChanged())}),t.on("KeyDown",function(e){var t=e.keyCode;if(t>=33&&t<=36||t>=37&&t<=40||t==45){i.typing&&c(e);return}(t<16||t>20)&&t!=224&&t!=91&&!i.typing&&(i.beforeChange(),i.typing=!0,i.add({},e),a=!0)}),t.on("MouseDown",function(e){i.typing&&c(e)}),t.addShortcut("ctrl+z","","Undo"),t.addShortcut("ctrl+y,ctrl+shift+z","","Redo"),t.on("AddUndo Undo Redo ClearUndos MouseUp",function(e){e.isDefaultPrevented()||t.nodeChanged()}),t.on("Click",function(n){n.isDefaultPrevented()||(e.ie&&t.once("SelectionChange",function(){t.nodeChanged()}),setTimeout(function(){t.nodeChanged()},0))}),i={data:o,typing:!1,beforeChange:function(){f||(u=t.selection.getBookmark(2,!0))},add:function(e,n){var r,i=t.settings,a;e=e||{},e.content=l();if(f||t.removed)return null;a=o[s];if(t.fire("BeforeAddUndo",{level:e,lastLevel:a,originalEvent:n}).isDefaultPrevented())return null;if(a&&a.content==e.content)return null;o[s]&&(o[s].beforeBookmark=u);if(i.custom_undo_redo_levels&&o.length>i.custom_undo_redo_levels){for(r=0;r<o.length-1;r++)o[r]=o[r+1];o.length--,s=o.length}e.bookmark=t.selection.getBookmark(2,!0),s<o.length-1&&(o.length=s+1),o.push(e),s=o.length-1;var c={level:e,lastLevel:a,originalEvent:n};return t.fire("AddUndo",c),s>0&&(t.isNotDirty=!1,t.fire("change",c)),e},undo:function(){var e;return i.typing&&(i.add(),i.typing=!1),s>0&&(e=o[--s],s===0&&(t.isNotDirty=!0),t.setContent(e.content,{format:"raw"}),t.selection.moveToBookmark(e.beforeBookmark),t.fire("undo",{level:e})),e},redo:function(){var e;return s<o.length-1&&(e=o[++s],t.setContent(e.content,{format:"raw"}),t.selection.moveToBookmark(e.bookmark),t.fire("redo",{level:e})),e},clear:function(){o=[],s=0,i.typing=!1,t.fire("ClearUndos")},hasUndo:function(){return s>0||i.typing&&o[0]&&l()!=o[0].content},hasRedo:function(){return s<o.length-1&&!this.typing},transact:function(e){i.beforeChange();try{f++,e()}finally{f--}i.add()}},i}}),i("tinymce/EnterKey",["tinymce/dom/TreeWalker","tinymce/dom/RangeUtils","tinymce/Env"],function(e,t,n){var r=n.ie&&n.ie<11;return function(i){function c(c){function k(e){return e&&s.isBlock(e)&&!/^(TD|TH|CAPTION|FORM)$/.test(e.nodeName)&&!/^(fixed|absolute)/i.test(e.style.position)&&s.getContentEditable(e)!=="true"}function L(e){var t;s.isBlock(e)&&(t=o.getRng(),e.appendChild(s.create("span",null," ")),o.select(e),e.lastChild.outerHTML="",o.setRng(t))}function A(e){var t=e,n=[],r;if(!t)return;while(t=t.firstChild){if(s.isBlock(t))return;t.nodeType==1&&!l[t.nodeName.toLowerCase()]&&n.push(t)}r=n.length;while(r--)t=n[r],!t.hasChildNodes()||t.firstChild==t.lastChild&&t.firstChild.nodeValue===""?s.remove(t):t.nodeName=="A"&&(t.innerText||t.textContent)===" "&&s.remove(t)}function O(t){function c(e){while(e){if(e.nodeType==1||e.nodeType==3&&e.data&&/[\r\n\s]/.test(e.data))return e;e=e.nextSibling}}var r,i,u,a=t,f;if(!t)return;n.ie&&n.ie<9&&g&&g.firstChild&&g.firstChild==g.lastChild&&g.firstChild.tagName=="BR"&&s.remove(g.firstChild);if(/^(LI|DT|DD)$/.test(t.nodeName)){var h=c(t.firstChild);h&&/^(UL|OL|DL)$/.test(h.nodeName)&&t.insertBefore(s.doc.createTextNode(" "),t.firstChild)}u=s.createRng(),n.ie||t.normalize();if(t.hasChildNodes()){r=new e(t,t);while(i=r.current()){if(i.nodeType==3){u.setStart(i,0),u.setEnd(i,0);break}if(l[i.nodeName.toLowerCase()]){u.setStartBefore(i),u.setEndBefore(i);break}a=i,i=r.next()}i||(u.setStart(a,0),u.setEnd(a,0))}else if(t.nodeName=="BR")if(t.nextSibling&&s.isBlock(t.nextSibling)){if(!y||y<9)f=s.create("br"),t.parentNode.insertBefore(f,t);u.setStartBefore(t),u.setEndBefore(t)}else u.setStartAfter(t),u.setEndAfter(t);else u.setStart(t,0),u.setEnd(t,0);o.setRng(u),s.remove(f),o.scrollIntoView(t)}function M(e){var t=u.forced_root_block;t&&t.toLowerCase()===e.tagName.toLowerCase()&&s.setAttribs(e,u.forced_root_block_attrs)}function _(e){var t=v,n,i,o,a=f.getTextInlineElements();e||x=="TABLE"?(n=s.create(e||N),M(n)):n=g.cloneNode(!1),o=n;if(u.keep_styles!==!1)do if(a[t.nodeName]){if(t.id=="_mce_caret")continue;i=t.cloneNode(!1),s.setAttrib(i,"id",""),n.hasChildNodes()?(i.appendChild(n.firstChild),n.appendChild(i)):(o=i,n.appendChild(i))}while(t=t.parentNode);return r||(o.innerHTML='<br data-mce-bogus="1">'),n}function D(t){var n,r,i;if(v.nodeType==3&&(t?m>0:m<v.nodeValue.length))return!1;if(v.parentNode==g&&C&&!t)return!0;if(t&&v.nodeType==1&&v==g.firstChild)return!0;if(v.nodeName==="TABLE"||v.previousSibling&&v.previousSibling.nodeName=="TABLE")return C&&!t||!C&&t;n=new e(v,g),v.nodeType==3&&(t&&m===0?n.prev():!t&&m==v.nodeValue.length&&n.next());while(r=n.current()){if(r.nodeType===1){if(!r.getAttribute("data-mce-bogus")){i=r.nodeName.toLowerCase();if(l[i]&&i!=="br")return!1}}else if(r.nodeType===3&&!/^[ \t\r\n]*$/.test(r.nodeValue))return!1;t?n.prev():n.next()}return!0}function P(e,t){var n,r,o,u,a,l,c=N||"P";r=s.getParent(e,s.isBlock),l=i.getBody().nodeName.toLowerCase();if(!r||!k(r)){r=r||d;if(!r.hasChildNodes())return n=s.create(c),M(n),r.appendChild(n),h.setStart(n,0),h.setEnd(n,0),n;u=e;while(u.parentNode!=r)u=u.parentNode;while(u&&!s.isBlock(u))o=u,u=u.previousSibling;if(o&&f.isValidChild(l,c.toLowerCase())){n=s.create(c),M(n),o.parentNode.insertBefore(n,o),u=o;while(u&&!s.isBlock(u))a=u.nextSibling,n.appendChild(u),u=a;h.setStart(e,t),h.setEnd(e,t)}}return e}function H(){function e(e){var t=S[e?"firstChild":"lastChild"];while(t){if(t.nodeType==1)break;t=t[e?"nextSibling":"previousSibling"]}return t===g}function t(){var e=S.parentNode;return/^(LI|DT|DD)$/.test(e.nodeName)?e:S}var n=S.parentNode.nodeName;/^(OL|UL|LI)$/.test(n)&&(N="LI"),w=N?_(N):s.create("BR"),e(!0)&&e()?n=="LI"?s.insertAfter(w,t()):s.replace(w,S):e(!0)?n=="LI"?(s.insertAfter(w,t()),w.appendChild(s.doc.createTextNode(" ")),w.appendChild(S)):S.parentNode.insertBefore(w,S):e()?(s.insertAfter(w,t()),L(w)):(S=t(),p=h.cloneRange(),p.setStartAfter(g),p.setEndAfter(S),E=p.extractContents(),N=="LI"&&E.firstChild.nodeName=="LI"?(w=E.firstChild,s.insertAfter(E,S)):(s.insertAfter(E,S),s.insertAfter(w,S))),s.remove(g),O(w),a.add()}function B(){i.execCommand("InsertLineBreak",!1,c)}function j(e){do e.nodeType===3&&(e.nodeValue=e.nodeValue.replace(/^[\r\n]+/,"")),e=e.firstChild;while(e)}function F(e){var t=s.getRoot(),n,r;n=e;while(n!==t&&s.getContentEditable(n)!=="false")s.getContentEditable(n)==="true"&&(r=n),n=n.parentNode;return n!==t?r:t}function I(e){var t;r||(e.normalize(),t=e.lastChild,(!t||/^(left|right)$/gi.test(s.getStyle(t,"float",!0)))&&s.add(e,"br"))}var h,p,d,v,m,g,y,b,w,E,S,x,T,N,C;h=o.getRng(!0);if(c.isDefaultPrevented())return;if(!h.collapsed){i.execCommand("Delete");return}(new t(s)).normalize(h),v=h.startContainer,m=h.startOffset,N=(u.force_p_newlines?"p":"")||u.forced_root_block,N=N?N.toUpperCase():"",y=s.doc.documentMode,b=c.shiftKey,v.nodeType==1&&v.hasChildNodes()&&(C=m>v.childNodes.length-1,v=v.childNodes[Math.min(m,v.childNodes.length-1)]||v,C&&v.nodeType==3?m=v.nodeValue.length:m=0),d=F(v);if(!d)return;a.beforeChange();if(!s.isBlock(d)&&d!=s.getRoot()){(!N||b)&&B();return}if(N&&!b||!N&&b)v=P(v,m);g=s.getParent(v,s.isBlock),S=g?s.getParent(g.parentNode,s.isBlock):null,x=g?g.nodeName.toUpperCase():"",T=S?S.nodeName.toUpperCase():"",T=="LI"&&!c.ctrlKey&&(g=S,x=T);if(/^(LI|DT|DD)$/.test(x)){if(!N&&b){B();return}if(s.isEmpty(g)){H();return}}if(x=="PRE"&&u.br_in_pre!==!1){if(!b){B();return}}else if(!N&&!b&&x!="LI"||N&&b){B();return}if(N&&g===i.getBody())return;N=N||"P",D()?(/^(H[1-6]|PRE|FIGURE)$/.test(x)&&T!="HGROUP"?w=_(N):w=_(),u.end_container_on_empty_block&&k(S)&&s.isEmpty(g)?w=s.split(S,g):s.insertAfter(w,g),O(w)):D(!0)?(w=g.parentNode.insertBefore(_(),g),L(w),O(g)):(p=h.cloneRange(),p.setEndAfter(g),E=p.extractContents(),j(E),w=E.firstChild,s.insertAfter(E,g),A(w),I(g),O(w)),s.setAttrib(w,"id",""),i.fire("NewBlock",{newBlock:w}),a.add()}var s=i.dom,o=i.selection,u=i.settings,a=i.undoManager,f=i.schema,l=f.getNonEmptyElements();i.on("keydown",function(e){e.keyCode==13&&c(e)!==!1&&e.preventDefault()})}}),i("tinymce/ForceBlocks",[],function(){return function(e){function o(){var o=r.getStart(),u=e.getBody(),a,f,l,c,h,p,d,v=-16777215,m,g,y,b,w;w=t.forced_root_block;if(!o||o.nodeType!==1||!w)return;while(o&&o!=u){if(s[o.nodeName])return;o=o.parentNode}a=r.getRng();if(a.setStart){f=a.startContainer,l=a.startOffset,c=a.endContainer,h=a.endOffset;try{g=e.getDoc().activeElement===u}catch(E){}}else a.item&&(o=a.item(0),a=e.getDoc().body.createTextRange(),a.moveToElementText(o)),g=a.parentElement().ownerDocument===e.getDoc(),y=a.duplicate(),y.collapse(!0),l=y.move("character",v)*-1,y.collapsed||(y=a.duplicate(),y.collapse(!1),h=y.move("character",v)*-1-l);o=u.firstChild,b=u.nodeName.toLowerCase();while(o)if((o.nodeType===3||o.nodeType==1&&!s[o.nodeName])&&i.isValidChild(b,w.toLowerCase())){if(o.nodeType===3&&o.nodeValue.length===0){d=o,o=o.nextSibling,n.remove(d);continue}p||(p=n.create(w,e.settings.forced_root_block_attrs),o.parentNode.insertBefore(p,o),m=!0),d=o,o=o.nextSibling,p.appendChild(d)}else p=null,o=o.nextSibling;if(m&&g){if(a.setStart)a.setStart(f,l),a.setEnd(c,h),r.setRng(a);else try{a=e.getDoc().body.createTextRange(),a.moveToElementText(u),a.collapse(!0),a.moveStart("character",l),h>0&&a.moveEnd("character",h),a.select()}catch(E){}e.nodeChanged()}}var t=e.settings,n=e.dom,r=e.selection,i=e.schema,s=i.getBlockElements();t.forced_root_block&&e.on("NodeChange",o)}}),i("tinymce/EditorCommands",["tinymce/html/Serializer","tinymce/Env","tinymce/util/Tools","tinymce/dom/ElementUtils","tinymce/dom/RangeUtils","tinymce/dom/TreeWalker"],function(e,n,r,i,s,o){var u=r.each,a=r.extend,f=r.map,l=r.inArray,c=r.explode,h=n.gecko,p=n.ie,d=n.ie&&n.ie<11,v=!0,m=!1;return function(r){function x(e,t,n){var r;return e=e.toLowerCase(),(r=b.exec[e])?(r(e,t,n),v):m}function T(e){var t;return e=e.toLowerCase(),(t=b.state[e])?t(e):-1}function N(e){var t;return e=e.toLowerCase(),(t=b.value[e])?t(e):m}function C(e,t){t=t||"exec",u(e,function(e,n){u(n.toLowerCase().split(","),function(n){b[t][n]=e})})}function k(e,n,i){return n===t&&(n=m),i===t&&(i=null),r.getDoc().execCommand(e,n,i)}function L(e){return E.match(e)}function A(e,n){E.toggle(e,n?{value:n}:t),r.nodeChanged()}function O(e){S=y.getBookmark(e)}function M(){y.moveToBookmark(S)}var g=r.dom,y=r.selection,b={state:{},exec:{},value:{}},w=r.settings,E=r.formatter,S;a(this,{execCommand:x,queryCommandState:T,queryCommandValue:N,addCommands:C}),C({"mceResetDesignMode,mceBeginUndoLevel":function(){},"mceEndUndoLevel,mceAddUndoLevel":function(){r.undoManager.add()},"Cut,Copy,Paste":function(e){var t=r.getDoc(),i;try{k(e)}catch(s){i=v}if(i||!t.queryCommandSupported(e)){var o=r.translate("Your browser doesn't support direct access to the clipboard. Please use the Ctrl+X/C/V keyboard shortcuts instead.");n.mac&&(o=o.replace(/Ctrl\+/g,"⌘+")),r.windowManager.alert(o)}},unlink:function(){if(y.isCollapsed()){var e=y.getNode();e.tagName=="A"&&r.dom.remove(e,!0);return}E.remove("link")},"JustifyLeft,JustifyCenter,JustifyRight,JustifyFull":function(e){var t=e.substring(7);t=="full"&&(t="justify"),u("left,center,right,justify".split(","),function(e){t!=e&&E.remove("align"+e)}),A("align"+t),x("mceRepaint")},"InsertUnorderedList,InsertOrderedList":function(e){var t,n;k(e),t=g.getParent(y.getNode(),"ol,ul"),t&&(n=t.parentNode,/^(H[1-6]|P|ADDRESS|PRE)$/.test(n.nodeName)&&(O(),g.split(n,t),M()))},"Bold,Italic,Underline,Strikethrough,Superscript,Subscript":function(e){A(e)},"ForeColor,HiliteColor,FontName":function(e,t,n){A(e,n)},FontSize:function(e,t,n){var r,i;n>=1&&n<=7&&(i=c(w.font_size_style_values),r=c(w.font_size_classes),r?n=r[n-1]||n:n=i[n-1]||n),A(e,n)},RemoveFormat:function(e){E.remove(e)},mceBlockQuote:function(){A("blockquote")},FormatBlock:function(e,t,n){return A(n||"p")},mceCleanup:function(){var e=y.getBookmark();r.setContent(r.getContent({cleanup:v}),{cleanup:v}),y.moveToBookmark(e)},mceRemoveNode:function(e,t,n){var i=n||y.getNode();i!=r.getBody()&&(O(),r.dom.remove(i,v),M())},mceSelectNodeDepth:function(e,t,n){var i=0;g.getParent(y.getNode(),function(e){if(e.nodeType==1&&i++==n)return y.select(e),m},r.getBody())},mceSelectNode:function(e,t,n){y.select(n)},mceInsertContent:function(t,n,s){function x(e){function i(e){return n[e]&&n[e].nodeType==3}var t,n,r;return t=y.getRng(!0),n=t.startContainer,r=t.startOffset,n.nodeType==3&&(r>0?e=e.replace(/^&nbsp;/," "):i("previousSibling")||(e=e.replace(/^ /,"&nbsp;")),r<n.length?e=e.replace(/&nbsp;(<br>|)$/," "):i("nextSibling")||(e=e.replace(/(&nbsp;| )(<br>|)$/,"&nbsp;"))),e}function T(e){if(E)for(m=e.firstChild;m;m=m.walk(!0))S[m.name]&&m.attr("data-mce-new","true")}function N(){if(E){var e=r.getBody(),t=new i(g);u(g.select("*[data-mce-new]"),function(n){n.removeAttribute("data-mce-new");for(var r=n.parentNode;r&&r!=e;r=r.parentNode)t.compare(r,n)&&g.remove(n,!0)})}}var o,a,f,l,c,h,d,v,m,b,w,E,S=r.schema.getTextInlineElements();typeof s!="string"&&(E=s.merge,s=s.content),/^ | $/.test(s)&&(s=x(s)),o=r.parser,a=new e({},r.schema),w='<span id="mce_marker" data-mce-type="bookmark">&#xFEFF;&#200B;</span>',h={content:s,format:"html",selection:!0},r.fire("BeforeSetContent",h),s=h.content,s.indexOf("{$caret}")==-1&&(s+="{$caret}"),s=s.replace(/\{\$caret\}/,w),v=y.getRng();var C=v.startContainer||(v.parentElement?v.parentElement():null),k=r.getBody();C===k&&y.isCollapsed()&&g.isBlock(k.firstChild)&&g.isEmpty(k.firstChild)&&(v=g.createRng(),v.setStart(k.firstChild,0),v.setEnd(k.firstChild,0),y.setRng(v)),y.isCollapsed()||r.getDoc().execCommand("Delete",!1,null),f=y.getNode();var L={context:f.nodeName.toLowerCase()};c=o.parse(s,L),T(c),m=c.lastChild;if(m.attr("id")=="mce_marker"){d=m;for(m=m.prev;m;m=m.walk(!0))if(m.type==3||!g.isBlock(m.name)){m.parent.insert(d,m,m.name==="br");break}}if(!L.invalid)s=a.serialize(c),m=f.firstChild,b=f.lastChild,!m||m===b&&m.nodeName==="BR"?g.setHTML(f,s):y.setContent(s);else{y.setContent(w),f=y.getNode(),l=r.getBody(),f.nodeType==9?f=m=l:m=f;while(m!==l)f=m,m=m.parentNode;s=f==l?l.innerHTML:g.getOuterHTML(f),s=a.serialize(o.parse(s.replace(/<span (id="mce_marker"|id=mce_marker).+?<\/span>/i,function(){return a.serialize(c)}))),f==l?g.setHTML(l,s):g.setOuterHTML(f,s)}N(),d=g.get("mce_marker"),y.scrollIntoView(d),v=g.createRng(),m=d.previousSibling,m&&m.nodeType==3?(v.setStart(m,m.nodeValue.length),p||(b=d.nextSibling,b&&b.nodeType==3&&(m.appendData(b.data),b.parentNode.removeChild(b)))):(v.setStartBefore(d),v.setEndBefore(d)),g.remove(d),y.setRng(v),r.fire("SetContent",h),r.addVisual()},mceInsertRawHTML:function(e,t,n){y.setContent("tiny_mce_marker"),r.setContent(r.getContent().replace(/tiny_mce_marker/g,function(){return n}))},mceToggleFormat:function(e,t,n){A(n)},mceSetContent:function(e,t,n){r.setContent(n)},"Indent,Outdent":function(e){var t,n,i;t=w.indentation,n=/[a-z%]+$/i.exec(t),t=parseInt(t,10),!T("InsertUnorderedList")&&!T("InsertOrderedList")?(!w.forced_root_block&&!g.getParent(y.getNode(),g.isBlock)&&E.apply("div"),u(y.getSelectedBlocks(),function(s){if(s.nodeName!="LI"){var o=r.getParam("indent_use_margin",!1)?"margin":"padding";o+=g.getStyle(s,"direction",true)=="rtl"?"Right":"Left",e=="outdent"?(i=Math.max(0,parseInt(s.style[o]||0,10)-t),g.setStyle(s,o,i?i+n:"")):(i=parseInt(s.style[o]||0,10)+t+n,g.setStyle(s,o,i))}})):k(e)},mceRepaint:function(){if(h)try{O(v),y.getSel()&&y.getSel().selectAllChildren(r.getBody()),y.collapse(v),M()}catch(e){}},InsertHorizontalRule:function(){r.execCommand("mceInsertContent",!1,"<hr />")},mceToggleVisualAid:function(){r.hasVisual=!r.hasVisual,r.addVisual()},mceReplaceContent:function(e,t,n){r.execCommand("mceInsertContent",!1,n.replace(/\{\$selection\}/g,y.getContent({format:"text"})))},mceInsertLink:function(e,t,n){var r;typeof n=="string"&&(n={href:n}),r=g.getParent(y.getNode(),"a"),n.href=n.href.replace(" ","%20"),(!r||!n.href)&&E.remove("link"),n.href&&E.apply("link",n,r)},selectAll:function(){var e=g.getRoot(),t;y.getRng().setStart?(t=g.createRng(),t.setStart(e,0),t.setEnd(e,e.childNodes.length),y.setRng(t)):(t=y.getRng(),t.item||(t.moveToElementText(e),t.select()))},"delete":function(){k("Delete");var e=r.getBody();g.isEmpty(e)&&(r.setContent(""),e.firstChild&&g.isBlock(e.firstChild)?r.selection.setCursorLocation(e.firstChild,0):r.selection.setCursorLocation(e,0))},mceNewDocument:function(){r.setContent("")},InsertLineBreak:function(e,t,n){function x(){var e=new o(h,m),t,n=r.schema.getNonEmptyElements();while(t=e.next())if(n[t.nodeName.toLowerCase()]||t.length>0)return!0}var i=n,u,a,f,l=y.getRng(!0);(new s(g)).normalize(l);var c=l.startOffset,h=l.startContainer;if(h.nodeType==1&&h.hasChildNodes()){var p=c>h.childNodes.length-1;h=h.childNodes[Math.min(c,h.childNodes.length-1)]||h,p&&h.nodeType==3?c=h.nodeValue.length:c=0}var m=g.getParent(h,g.isBlock),b=m?m.nodeName.toUpperCase():"",w=m?g.getParent(m.parentNode,g.isBlock):null,E=w?w.nodeName.toUpperCase():"",S=i&&i.ctrlKey;E=="LI"&&!S&&(m=w,b=E),h&&h.nodeType==3&&c>=h.nodeValue.length&&!d&&!x()&&(u=g.create("br"),l.insertNode(u),l.setStartAfter(u),l.setEndAfter(u),a=!0),u=g.create("br"),l.insertNode(u);var T=g.doc.documentMode;return d&&b=="PRE"&&(!T||T<8)&&u.parentNode.insertBefore(g.doc.createTextNode("\r"),u),f=g.create("span",{},"&nbsp;"),u.parentNode.insertBefore(f,u),y.scrollIntoView(f),g.remove(f),a?(l.setStartBefore(u),l.setEndBefore(u)):(l.setStartAfter(u),l.setEndAfter(u)),y.setRng(l),r.undoManager.add(),v}}),C({"JustifyLeft,JustifyCenter,JustifyRight,JustifyFull":function(e){var t="align"+e.substring(7),n=y.isCollapsed()?[g.getParent(y.getNode(),g.isBlock)]:y.getSelectedBlocks(),r=f(n,function(e){return!!E.matchNode(e,t)});return l(r,v)!==-1},"Bold,Italic,Underline,Strikethrough,Superscript,Subscript":function(e){return L(e)},mceBlockQuote:function(){return L("blockquote")},Outdent:function(){var e;if(w.inline_styles){if((e=g.getParent(y.getStart(),g.isBlock))&&parseInt(e.style.paddingLeft
,10)>0)return v;if((e=g.getParent(y.getEnd(),g.isBlock))&&parseInt(e.style.paddingLeft,10)>0)return v}return T("InsertUnorderedList")||T("InsertOrderedList")||!w.inline_styles&&!!g.getParent(y.getNode(),"BLOCKQUOTE")},"InsertUnorderedList,InsertOrderedList":function(e){var t=g.getParent(y.getNode(),"ul,ol");return t&&(e==="insertunorderedlist"&&t.tagName==="UL"||e==="insertorderedlist"&&t.tagName==="OL")}},"state"),C({"FontSize,FontName":function(e){var t=0,n;if(n=g.getParent(y.getNode(),"span"))e=="fontsize"?t=n.style.fontSize:t=n.style.fontFamily.replace(/, /g,",").replace(/[\'\"]/g,"").toLowerCase();return t}},"value"),C({Undo:function(){r.undoManager.undo()},Redo:function(){r.undoManager.redo()}})}}),i("tinymce/util/URI",["tinymce/util/Tools"],function(e){function i(e,r){var s=this,o,u;e=n(e),r=s.settings=r||{},o=r.base_uri;if(/^([\w\-]+):([^\/]{2})/i.test(e)||/^\s*#/.test(e)){s.source=e;return}var a=e.indexOf("//")===0;e.indexOf("/")===0&&!a&&(e=(o?o.protocol||"http":"http")+"://mce_host"+e),/^[\w\-]*:?\/\//.test(e)||(u=r.base_uri?r.base_uri.path:(new i(location.href)).directory,r.base_uri.protocol===""?e="//mce_host"+s.toAbsPath(u,e):(e=/([^#?]*)([#?]?.*)/.exec(e),e=(o&&o.protocol||"http")+"://mce_host"+s.toAbsPath(u,e[1])+e[2])),e=e.replace(/@@/g,"(mce_at)"),e=/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/.exec(e),t(["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],function(t,n){var r=e[n];r&&(r=r.replace(/\(mce_at\)/g,"@@")),s[t]=r});if(o){s.protocol||(s.protocol=o.protocol),s.userInfo||(s.userInfo=o.userInfo),!s.port&&s.host==="mce_host"&&(s.port=o.port);if(!s.host||s.host==="mce_host")s.host=o.host;s.source=""}a&&(s.protocol="")}var t=e.each,n=e.trim,r={ftp:21,http:80,https:443,mailto:25};return i.prototype={setPath:function(e){var t=this;e=/^(.*?)\/?(\w+)?$/.exec(e),t.path=e[0],t.directory=e[1],t.file=e[2],t.source="",t.getURI()},toRelative:function(e){var t=this,n;if(e==="./")return e;e=new i(e,{base_uri:t});if(e.host!="mce_host"&&t.host!=e.host&&e.host||t.port!=e.port||t.protocol!=e.protocol&&e.protocol!=="")return e.getURI();var r=t.getURI(),s=e.getURI();return r==s||r.charAt(r.length-1)=="/"&&r.substr(0,r.length-1)==s?r:(n=t.toRelPath(t.path,e.path),e.query&&(n+="?"+e.query),e.anchor&&(n+="#"+e.anchor),n)},toAbsolute:function(e,t){return e=new i(e,{base_uri:this}),e.getURI(t&&this.isSameOrigin(e))},isSameOrigin:function(e){if(this.host==e.host&&this.protocol==e.protocol){if(this.port==e.port)return!0;var t=r[this.protocol];if(t&&(this.port||t)==(e.port||t))return!0}return!1},toRelPath:function(e,t){var n,r=0,i="",s,o;e=e.substring(0,e.lastIndexOf("/")),e=e.split("/"),n=t.split("/");if(e.length>=n.length)for(s=0,o=e.length;s<o;s++)if(s>=n.length||e[s]!=n[s]){r=s+1;break}if(e.length<n.length)for(s=0,o=n.length;s<o;s++)if(s>=e.length||e[s]!=n[s]){r=s+1;break}if(r===1)return t;for(s=0,o=e.length-(r-1);s<o;s++)i+="../";for(s=r-1,o=n.length;s<o;s++)s!=r-1?i+="/"+n[s]:i+=n[s];return i},toAbsPath:function(e,n){var r,i=0,s=[],o,u;o=/\/$/.test(n)?"/":"",e=e.split("/"),n=n.split("/"),t(e,function(e){e&&s.push(e)}),e=s;for(r=n.length-1,s=[];r>=0;r--){if(n[r].length===0||n[r]===".")continue;if(n[r]===".."){i++;continue}if(i>0){i--;continue}s.push(n[r])}return r=e.length-i,r<=0?u=s.reverse().join("/"):u=e.slice(0,r).join("/")+"/"+s.reverse().join("/"),u.indexOf("/")!==0&&(u="/"+u),o&&u.lastIndexOf("/")!==u.length-1&&(u+=o),u},getURI:function(e){var t,n=this;if(!n.source||e)t="",e||(n.protocol?t+=n.protocol+"://":t+="//",n.userInfo&&(t+=n.userInfo+"@"),n.host&&(t+=n.host),n.port&&(t+=":"+n.port)),n.path&&(t+=n.path),n.query&&(t+="?"+n.query),n.anchor&&(t+="#"+n.anchor),n.source=t;return n.source}},i}),i("tinymce/util/Class",["tinymce/util/Tools"],function(e){function s(){}var t=e.each,n=e.extend,r,i;return s.extend=r=function(e){function l(){var e,t,n,r=this;if(!i){r.init&&r.init.apply(r,arguments),t=r.Mixins;if(t){e=t.length;while(e--)n=t[e],n.init&&n.init.apply(r,arguments)}}}function c(){return this}function h(e,t){return function(){var n=this,r=n._super,i;return n._super=o[e],i=t.apply(n,arguments),n._super=r,i}}var s=this,o=s.prototype,u,a,f;i=!0,u=new s,i=!1,e.Mixins&&(t(e.Mixins,function(t){t=t;for(var n in t)n!=="init"&&(e[n]=t[n])}),o.Mixins&&(e.Mixins=o.Mixins.concat(e.Mixins))),e.Methods&&t(e.Methods.split(","),function(t){e[t]=c}),e.Properties&&t(e.Properties.split(","),function(t){var n="_"+t;e[t]=function(e){var t=this,r;return e!==r?(t[n]=e,t):t[n]}}),e.Statics&&t(e.Statics,function(e,t){l[t]=e}),e.Defaults&&o.Defaults&&(e.Defaults=n({},o.Defaults,e.Defaults));for(a in e)f=e[a],typeof f=="function"&&o[a]?u[a]=h(a,f):u[a]=f;return l.prototype=u,l.constructor=l,l.extend=r,l},s}),i("tinymce/util/EventDispatcher",["tinymce/util/Tools"],function(e){function n(e){function s(){return!1}function o(){return!0}function u(t,i){var u,a,l,c;t=t.toLowerCase(),i=i||{},i.type=t,i.target||(i.target=n),i.preventDefault||(i.preventDefault=function(){i.isDefaultPrevented=o},i.stopPropagation=function(){i.isPropagationStopped=o},i.stopImmediatePropagation=function(){i.isImmediatePropagationStopped=o},i.isDefaultPrevented=s,i.isPropagationStopped=s,i.isImmediatePropagationStopped=s),e.beforeFire&&e.beforeFire(i),u=r[t];if(u)for(a=0,l=u.length;a<l;a++){u[a]=c=u[a],c.once&&f(t,c);if(i.isImmediatePropagationStopped())return i.stopPropagation(),i;if(c.call(n,i)===!1)return i.preventDefault(),i}return i}function a(e,n,o){var u,a,f;n===!1&&(n=s);if(n){a=e.toLowerCase().split(" "),f=a.length;while(f--)e=a[f],u=r[e],u||(u=r[e]=[],i(e,!0)),o?u.unshift(n):u.push(n)}return t}function f(e,n){var s,o,u,a,f;if(e){a=e.toLowerCase().split(" "),s=a.length;while(s--){e=a[s],o=r[e];if(!e){for(u in r)i(u,!1),delete r[u];return t}if(o){if(!n)o.length=0;else{f=o.length;while(f--)o[f]===n&&(o=o.slice(0,f).concat(o.slice(f+1)),r[e]=o)}o.length||(i(e,!1),delete r[e])}}}else{for(e in r)i(e,!1);r={}}return t}function l(e,t,n){return t.once=!0,a(e,t,n)}function c(e){return e=e.toLowerCase(),!!r[e]&&r[e].length!==0}var t=this,n,r={},i;e=e||{},n=e.scope||t,i=e.toggleEvent||s,t.fire=u,t.on=a,t.off=f,t.once=l,t.has=c}var t=e.makeMap("focus blur focusin focusout click dblclick mousedown mouseup mousemove mouseover beforepaste paste cut copy selectionchange mouseout mouseenter mouseleave wheel keydown keypress keyup input contextmenu dragstart dragend dragover draggesture dragdrop drop drag submit compositionstart compositionend compositionupdate"," ");return n.isNative=function(e){return!!t[e.toLowerCase()]},n}),i("tinymce/ui/Selector",["tinymce/util/Class"],function(e){function t(e){var t=[],n=e.length,r;while(n--)r=e[n],r.__checked||(t.push(r),r.__checked=1);n=t.length;while(n--)delete t[n].__checked;return t}var n=/^([\w\\*]+)?(?:#([\w\\]+))?(?:\.([\w\\\.]+))?(?:\[\@?([\w\\]+)([\^\$\*!~]?=)([\w\\]+)\])?(?:\:(.+))?/i,r=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,i=/^\s*|\s*$/g,s,o=e.extend({init:function(e){function s(e){if(e)return e=e.toLowerCase(),function(t){return e==="*"||t.type===e}}function o(e){if(e)return function(t){return t._name===e}}function u(e){if(e)return e=e.split("."),function(t){var n=e.length;while(n--)if(!t.hasClass(e[n]))return!1;return!0}}function a(e,t,n){if(e)return function(r){var i=r[e]?r[e]():"";return t?t==="="?i===n:t==="*="?i.indexOf(n)>=0:t==="~="?(" "+i+" ").indexOf(" "+n+" ")>=0:t==="!="?i!=n:t==="^="?i.indexOf(n)===0:t==="$="?i.substr(i.length-n.length)===n:!1:!!n}}function f(e){var n;if(e)return e=/(?:not\((.+)\))|(.+)/i.exec(e),e[1]?(n=c(e[1],[]),function(e){return!t(e,n)}):(e=e[2],function(t,n,r){return e==="first"?n===0:e==="last"?n===r-1:e==="even"?n%2===0:e==="odd"?n%2===1:t[e]?t[e]():!1})}function l(e,t,r){function c(e){e&&t.push(e)}var l;return l=n.exec(e.replace(i,"")),c(s(l[1])),c(o(l[2])),c(u(l[3])),c(a(l[4],l[5],l[6])),c(f(l[7])),t.psuedo=!!l[7],t.direct=r,t}function c(e,t){var n=[],i,s,o;do{r.exec(""),s=r.exec(e);if(s){e=s[3],n.push(s[1]);if(s[2]){i=s[3];break}}}while(s);i&&c(i,t),e=[];for(o=0;o<n.length;o++)n[o]!=">"&&e.push(l(n[o],[],n[o-1]===">"));return t.push(e),t}var t=this.match;this._selectors=c(e,[])},match:function(e,t){var n,r,i,s,o,u,a,f,l,c,h,p,d;t=t||this._selectors;for(n=0,r=t.length;n<r;n++){o=t[n],s=o.length,d=e,p=0;for(i=s-1;i>=0;i--){f=o[i];while(d){if(f.psuedo){h=d.parent().items(),l=c=h.length;while(l--)if(h[l]===d)break}for(u=0,a=f.length;u<a;u++)if(!f[u](d,l,c)){u=a+1;break}if(u===a){p++;break}if(i===s-1)break;d=d.parent()}}if(p===s)return!0}return!1},find:function(e){function a(e,t,r){var i,s,o,u,f,l=t[r];for(i=0,s=e.length;i<s;i++){f=e[i];for(o=0,u=l.length;o<u;o++)if(!l[o](f,i,s)){o=u+1;break}if(o===u)r==t.length-1?n.push(f):f.items&&a(f.items(),t,r+1);else if(l.direct)return;f.items&&a(f.items(),t,r)}}var n=[],r,i,u=this._selectors;if(e.items){for(r=0,i=u.length;r<i;r++)a(e.items(),u[r],0);i>1&&(n=t(n))}return s||(s=o.Collection),new s(n)}});return o}),i("tinymce/ui/Collection",["tinymce/util/Tools","tinymce/ui/Selector","tinymce/util/Class"],function(e,t,n){var r,i,s=Array.prototype.push,o=Array.prototype.slice;return i={length:0,init:function(e){e&&this.add(e)},add:function(t){var n=this;return e.isArray(t)?s.apply(n,t):t instanceof r?n.add(t.toArray()):s.call(n,t),n},set:function(e){var t=this,n=t.length,r;t.length=0,t.add(e);for(r=t.length;r<n;r++)delete t[r];return t},filter:function(e){var n=this,i,s,o=[],u,a;typeof e=="string"?(e=new t(e),a=function(t){return e.match(t)}):a=e;for(i=0,s=n.length;i<s;i++)u=n[i],a(u)&&o.push(u);return new r(o)},slice:function(){return new r(o.apply(this,arguments))},eq:function(e){return e===-1?this.slice(e):this.slice(e,+e+1)},each:function(t){return e.each(this,t),this},toArray:function(){return e.toArray(this)},indexOf:function(e){var t=this,n=t.length;while(n--)if(t[n]===e)break;return n},reverse:function(){return new r(e.toArray(this).reverse())},hasClass:function(e){return this[0]?this[0].hasClass(e):!1},prop:function(e,t){var n=this,r,i;if(t!==r)return n.each(function(n){n[e]&&n[e](t)}),n;i=n[0];if(i&&i[e])return i[e]()},exec:function(t){var n=this,r=e.toArray(arguments).slice(1);return n.each(function(e){e[t]&&e[t].apply(e,r)}),n},remove:function(){var e=this.length;while(e--)this[e].remove();return this}},e.each("fire on off show hide addClass removeClass append prepend before after reflow".split(" "),function(t){i[t]=function(){var n=e.toArray(arguments);return this.each(function(e){t in e&&e[t].apply(e,n)}),this}}),e.each("text name disabled active selected checked visible parent value data".split(" "),function(e){i[e]=function(t){return this.prop(e,t)}}),r=n.extend(i),t.Collection=r,r}),i("tinymce/ui/DomUtils",["tinymce/util/Tools","tinymce/dom/DOMUtils"],function(e,t){var n=0;return{id:function(){return"mceu_"+n++},createFragment:function(e){return t.DOM.createFragment(e)},getWindowSize:function(){return t.DOM.getViewPort()},getSize:function(e){var t,n;if(e.getBoundingClientRect){var r=e.getBoundingClientRect();t=Math.max(r.width||r.right-r.left,e.offsetWidth),n=Math.max(r.height||r.bottom-r.bottom,e.offsetHeight)}else t=e.offsetWidth,n=e.offsetHeight;return{width:t,height:n}},getPos:function(e,n){return t.DOM.getPos(e,n)},getViewPort:function(e){return t.DOM.getViewPort(e)},get:function(e){return document.getElementById(e)},addClass:function(e,n){return t.DOM.addClass(e,n)},removeClass:function(e,n){return t.DOM.removeClass(e,n)},hasClass:function(e,n){return t.DOM.hasClass(e,n)},toggleClass:function(e,n,r){return t.DOM.toggleClass(e,n,r)},css:function(e,n,r){return t.DOM.setStyle(e,n,r)},on:function(e,n,r,i){return t.DOM.bind(e,n,r,i)},off:function(e,n,r){return t.DOM.unbind(e,n,r)},fire:function(e,n,r){return t.DOM.fire(e,n,r)},innerHtml:function(e,n){t.DOM.setHTML(e,n)}}}),i("tinymce/ui/Control",["tinymce/util/Class","tinymce/util/Tools","tinymce/util/EventDispatcher","tinymce/ui/Collection","tinymce/ui/DomUtils"],function(e,t,n,r,i){function f(e){return e._eventDispatcher||(e._eventDispatcher=new n({scope:e,toggleEvent:function(t,r){r&&n.isNative(t)&&(e._nativeEvents||(e._nativeEvents={}),e._nativeEvents[t]=!0,e._rendered&&e.bindPendingEvents())}})),e._eventDispatcher}var s={},o="onmousewheel"in document,u=!1,a="mce-",l=e.extend({Statics:{elementIdCache:s,classPrefix:a},isRtl:function(){return l.rtl},classPrefix:a,init:function(e){var n=this,r,s;n.settings=e=t.extend({},n.Defaults,e),n._id=e.id||i.id(),n._text=n._name="",n._width=n._height=0,n._aria={role:e.role},r=e.classes;if(r){r=r.split(" "),r.map={},s=r.length;while(s--)r.map[r[s]]=!0}n._classes=r||[],n.visible(!0),t.each("title text width height name classes visible disabled active value".split(" "),function(t){var r=e[t],i;r!==i?n[t](r):n["_"+t]===i&&(n["_"+t]=!1)}),n.on("click",function(){if(n.disabled())return!1}),e.classes&&t.each(e.classes.split(" "),function(e){n.addClass(e)}),n.settings=e,n._borderBox=n.parseBox(e.border),n._paddingBox=n.parseBox(e.padding),n._marginBox=n.parseBox(e.margin),e.hidden&&n.hide()},Properties:"parent,title,text,width,height,disabled,active,name,value",Methods:"renderHtml",getContainerElm:function(){return document.body},getParentCtrl:function(e){var t,n=this.getRoot().controlIdLookup;while(e&&n){t=n[e.id];if(t)break;e=e.parentNode}return t},parseBox:function(e){var t,n=10;if(!e)return;return typeof e=="number"?(e=e||0,{top:e,left:e,bottom:e,right:e}):(e=e.split(" "),t=e.length,t===1?e[1]=e[2]=e[3]=e[0]:t===2?(e[2]=e[0],e[3]=e[1]):t===3&&(e[3]=e[1]),{top:parseInt(e[0],n)||0,right:parseInt(e[1],n)||0,bottom:parseInt(e[2],n)||0,left:parseInt(e[3],n)||0})},borderBox:function(){return this._borderBox},paddingBox:function(){return this._paddingBox},marginBox:function(){return this._marginBox},measureBox:function(e,t){function n(t){var n=document.defaultView;return n?(t=t.replace(/[A-Z]/g,function(e){return"-"+e}),n.getComputedStyle(e,null).getPropertyValue(t)):e.currentStyle[t]}function r(e){var t=parseFloat(n(e),10);return isNaN(t)?0:t}return{top:r(t+"TopWidth"),right:r(t+"RightWidth"),bottom:r(t+"BottomWidth"),left:r(t+"LeftWidth")}},initLayoutRect:function(){var e=this,t=e.settings,n,r,s=e.getEl(),o,u,a,f,l,c,h,p;n=e._borderBox=e._borderBox||e.measureBox(s,"border"),e._paddingBox=e._paddingBox||e.measureBox(s,"padding"),e._marginBox=e._marginBox||e.measureBox(s,"margin"),p=i.getSize(s),c=t.minWidth,h=t.minHeight,a=c||p.width,f=h||p.height,o=t.width,u=t.height,l=t.autoResize,l=typeof l!="undefined"?l:!o&&!u,o=o||a,u=u||f;var d=n.left+n.right,v=n.top+n.bottom,m=t.maxWidth||65535,g=t.maxHeight||65535;return e._layoutRect=r={x:t.x||0,y:t.y||0,w:o,h:u,deltaW:d,deltaH:v,contentW:o-d,contentH:u-v,innerW:o-d,innerH:u-v,startMinWidth:c||0,startMinHeight:h||0,minW:Math.min(a,m),minH:Math.min(f,g),maxW:m,maxH:g,autoResize:l,scrollW:0},e._lastLayoutRect={},r},layoutRect:function(e){var t=this,n=t._layoutRect,r,i,s,o,u,a;n||(n=t.initLayoutRect());if(e){s=n.deltaW,o=n.deltaH,e.x!==u&&(n.x=e.x),e.y!==u&&(n.y=e.y),e.minW!==u&&(n.minW=e.minW),e.minH!==u&&(n.minH=e.minH),i=e.w,i!==u&&(i=i<n.minW?n.minW:i,i=i>n.maxW?n.maxW:i,n.w=i,n.innerW=i-s),i=e.h,i!==u&&(i=i<n.minH?n.minH:i,i=i>n.maxH?n.maxH:i,n.h=i,n.innerH=i-o),i=e.innerW,i!==u&&(i=i<n.minW-s?n.minW-s:i,i=i>n.maxW-s?n.maxW-s:i,n.innerW=i,n.w=i+s),i=e.innerH,i!==u&&(i=i<n.minH-o?n.minH-o:i,i=i>n.maxH-o?n.maxH-o:i,n.innerH=i,n.h=i+o),e.contentW!==u&&(n.contentW=e.contentW),e.contentH!==u&&(n.contentH=e.contentH),r=t._lastLayoutRect;if(r.x!==n.x||r.y!==n.y||r.w!==n.w||r.h!==n.h)a=l.repaintControls,a&&a.map&&!a.map[t._id]&&(a.push(t),a.map[t._id]=!0),r.x=n.x,r.y=n.y,r.w=n.w,r.h=n.h;return t}return n},repaint:function(){var e=this,t,n,r,i,s=0,o=0,u,a;a=document.createRange?function(e){return e}:Math.round,t=e.getEl().style,r=e._layoutRect,u=e._lastRepaintRect||{},i=e._borderBox,s=i.left+i.right,o=i.top+i.bottom,r.x!==u.x&&(t.left=a(r.x)+"px",u.x=r.x),r.y!==u.y&&(t.top=a(r.y)+"px",u.y=r.y),r.w!==u.w&&(t.width=a(r.w-s)+"px",u.w=r.w),r.h!==u.h&&(t.height=a(r.h-o)+"px",u.h=r.h),e._hasBody&&r.innerW!==u.innerW&&(n=e.getEl("body").style,n.width=a(r.innerW)+"px",u.innerW=r.innerW),e._hasBody&&r.innerH!==u.innerH&&(n=n||e.getEl("body").style,n.height=a(r.innerH)+"px",u.innerH=r.innerH),e._lastRepaintRect=u,e.fire("repaint",{},!1)},on:function(e,t){function r(e){var t,r;return typeof e!="string"?e:function(i){return t||n.parentsAndSelf().each(function(n){var i=n.settings.callbacks;if(i&&(t=i[e]))return r=n,!1}),t.call(r,i)}}var n=this;return f(n).on(e,r(t)),n},off:function(e,t){return f(this).off(e,t),this},fire:function(e,t,n){var r=this;t=t||{},t.control||(t.control=r),t=f(r).fire(e,t);if(n!==!1&&r.parent){var i=r.parent();while(i&&!t.isPropagationStopped())i.fire(e,t,!1),i=i.parent()}return t},hasEventListeners:function(e){return f(this).has(e)},parents:function(e){var t=this,n,i=new r;for(n=t.parent();n;n=n.parent())i.add(n);return e&&(i=i.filter(e)),i},parentsAndSelf:function(e){return(new r(this)).add(this.parents(e))},next:function(){var e=this.parent().items();return e[e.indexOf(this)+1]},prev:function(){var e=this.parent().items();return e[e.indexOf(this)-1]},findCommonAncestor:function(e,t){var n;while(e){n=t;while(n&&e!=n)n=n.parent();if(e==n)break;e=e.parent()}return e},hasClass:function(e,t){var n=this._classes[t||"control"];return e=this.classPrefix+e,n&&!!n.map[e]},addClass:function(e,t){var n=this,r,i;return e=this.classPrefix+e,r=n._classes[t||"control"],r||(r=[],r.map={},n._classes[t||"control"]=r),r.map[e]||(r.map[e]=e,r.push(e),n._rendered&&(i=n.getEl(t),i&&(i.className=r.join(" ")))),n},removeClass:function(e,t){var n=this,r,i,s;e=this.classPrefix+e,r=n._classes[t||"control"];if(r&&r.map[e]){delete r.map[e],i=r.length;while(i--)r[i]===e&&r.splice(i,1)}return n._rendered&&(s=n.getEl(t),s&&(s.className=r.join(" "))),n},toggleClass:function(e,t,n){var r=this;return t?r.addClass(e,n):r.removeClass(e,n),r},classes:function(e){var t=this._classes[e||"control"];return t?t.join(" "):""},innerHtml:function(e){return i.innerHtml(this.getEl(),e),this},getEl:function(e,t){var n,r=e?this._id+"-"+e:this._id;return n=s[r]=(t===!0?null:s[r])||i.get(r),n},visible:function(e){var t=this,n;return typeof e!="undefined"?(t._visible!==e&&(t._rendered&&(t.getEl().style.display=e?"":"none"),t._visible=e,n=t.parent(),n&&(n._lastRect=null),t.fire(e?"show":"hide")),t):t._visible},show:function(){return this.visible(!0)},hide:function(){return this.visible(!1)},focus:function(){try{this.getEl().focus()}catch(e){}return this},blur:function(){return this.getEl().blur(),this},aria:function(e,t){var n=this,r=n.getEl(n.ariaTarget);return typeof t=="undefined"?n._aria[e]:(n._aria[e]=t,n._rendered&&r.setAttribute(e=="role"?e:"aria-"+e,t),n)},encode:function(e,t){return t!==!1&&(e=this.translate(e)),(e||"").replace(/[&<>"]/g,function(e){return"&#"+e.charCodeAt(0)+";"})},translate:function(e){return l.translate?l.translate(e):e},before:function(e){var t=this,n=t.parent();return n&&n.insert(e,n.items().indexOf(t),!0),t},after:function(e){var t=this,n=t.parent();return n&&n.insert(e,n.items().indexOf(t)),t},remove:function(){var e=this,t=e.getEl(),n=e.parent(),r,o;if(e.items){var u=e.items().toArray();o=u.length;while(o--)u[o].remove()}n&&n.items&&(r=[],n.items().each(function(t){t!==e&&r.push(t)}),n.items().set(r),n._lastRect=null),e._eventsRoot&&e._eventsRoot==e&&i.off(t);var a=e.getRoot().controlIdLookup;a&&delete a[e._id],delete s[e._id];if(t&&t.parentNode){var f=t.getElementsByTagName("*");o=f.length;while(o--)delete s[f[o].id];t.parentNode.removeChild(t)}return e._rendered=!1,e},renderBefore:function(e){var t=this;return e.parentNode.insertBefore(i.createFragment(t.renderHtml()),e),t.postRender(),t},renderTo:function(e){var t=this;return e=e||t.getContainerElm(),e.appendChild(i.createFragment(t.renderHtml())),t.postRender(),t},postRender:function(){var e=this,t=e.settings,n,r,s,o,u;for(o in t)o.indexOf("on")===0&&e.on(o.substr(2),t[o]);if(e._eventsRoot){for(s=e.parent();!u&&s;s=s.parent())u=s._eventsRoot;if(u)for(o in u._nativeEvents)e._nativeEvents[o]=!0}e.bindPendingEvents(),t.style&&(n=e.getEl(),n&&(n.setAttribute("style",t.style),n.style.cssText=t.style)),e._visible||i.css(e.getEl(),"display","none"),e.settings.border&&(r=e.borderBox(),i.css(e.getEl(),{"border-top-width":r.top,"border-right-width":r.right,"border-bottom-width":r.bottom,"border-left-width":r.left}));var a=e.getRoot();a.controlIdLookup||(a.controlIdLookup={}),a.controlIdLookup[e._id]=e;for(var f in e._aria)e.aria(f,e._aria[f]);e.fire("postrender",{},!1)},scrollIntoView:function(e){function t(e,t){var n,r,i=e;n=r=0;while(i&&i!=t&&i.nodeType)n+=i.offsetLeft||0,r+=i.offsetTop||0,i=i.offsetParent;return{x:n,y:r}}var n=this.getEl(),r=n.parentNode,i,s,o,u,a,f,l=t(n,r);return i=l.x,s=l.y,o=n.offsetWidth,u=n.offsetHeight,a=r.clientWidth,f=r.clientHeight,e=="end"?(i-=a-o,s-=f-u):e=="center"&&(i-=a/2-o/2,s-=f/2-u/2),r.scrollLeft=i,r.scrollTop=s,this},bindPendingEvents:function(){function l(t){var n=e.getParentCtrl(t.target);n&&n.fire(t.type,t)}function c(){var e=s._lastHoverCtrl;e&&(e.fire("mouseleave",{target:e.getEl()}),e.parents().each(function(e){e.fire("mouseleave",{target:e.getEl()})}),s._lastHoverCtrl=null)}function h(t){var n=e.getParentCtrl(t.target),r=s._lastHoverCtrl,i=0,o,u,a;if(n!==r){s._lastHoverCtrl=n,u=n.parents().toArray().reverse(),u.push(n);if(r){a=r.parents().toArray().reverse(),a.push(r);for(i=0;i<a.length;i++)if(u[i]!==a[i])break;for(o=a.length-1;o>=i;o--)r=a[o],r.fire("mouseleave",{target:r.getEl()})}for(o=i;o<u.length;o++)n=u[o],n.fire("mouseenter",{target:n.getEl()})}}function p(t){t.preventDefault(),t.type=="mousewheel"?(t.deltaY=-1/40*t.wheelDelta,t.wheelDeltaX&&(t.deltaX=-1/40*t.wheelDeltaX)):(t.deltaX=0,t.deltaY=t.detail),t=e.fire("wheel",t)}var e=this,t,n,r,s,a,f;e._rendered=!0,a=e._nativeEvents;if(a){r=e.parents().toArray(),r.unshift(e);for(t=0,n=r.length;!s&&t<n;t++)s=r[t]._eventsRoot;s||(s=r[r.length-1]||e),e._eventsRoot=s;for(n=t,t=0;t<n;t++)r[t]._eventsRoot=s;var d=s._delegates;d||(d=s._delegates={});for(f in a){if(!a)return!1;if(f==="wheel"&&!u){o?i.on(e.getEl(),"mousewheel",p):i.on(e.getEl(),"DOMMouseScroll",p);continue}f==="mouseenter"||f==="mouseleave"?s._hasMouseEnter||(i.on(s.getEl(),"mouseleave",c),i.on(s.getEl(),"mouseover",h),s._hasMouseEnter=1):d[f]||(i.on(s.getEl(),f,l),d[f]=!0),a[f]=!1}}},getRoot:function(){var e=this,t,n=[];while(e){if(e.rootControl){t=e.rootControl;break}n.push(e),t=e,e=e.parent()}t||(t=this);var r=n.length;while(r--)n[r].rootControl=t;return t},reflow:function(){return this.repaint(),this}});return l}),i("tinymce/ui/Factory",[],function(){var e={},t;return{add:function(t,n){e[t.toLowerCase()]=n},has:function(t){return!!e[t.toLowerCase()]},create:function(n,r){var i,s,o;if(!t){o=tinymce.ui;for(s in o)e[s.toLowerCase()]=o[s];t=!0}typeof n=="string"?(r=r||{},r.type=n):(r=n,n=r.type),n=n.toLowerCase(),i=e[n];if(!i)throw new Error("Could not find control by type: "+n);return i=new i(r),i.type=n,i}}}),i("tinymce/ui/KeyboardNavigation",[],function(){return function(e){function i(e){return e=e||n,e&&e.getAttribute("role")}function s(e){var t,r=e||n;while(r=r.parentNode)if(t=i(r))return t}function o(e){var t=n;if(t)return t.getAttribute("aria-"+e)}function u(e){var t=e.tagName.toUpperCase();return t=="INPUT"||t=="TEXTAREA"}function a(e){return u(e)&&!e.hidden?!0:/^(button|menuitem|checkbox|tab|menuitemcheckbox|option|gridcell)$/.test(i(e))?!0:!1}function f(e){function r(e){if(e.nodeType!=1||e.style.display=="none")return;a(e)&&n.push(e);for(var t=0;t<e.childNodes.length;t++)r(e.childNodes[t])}var n=[];return r(e||t.getEl()),n}function l(e){var t,n;e=e||r,n=e.parents().toArray(),n.unshift(e);for(var i=0;i<n.length;i++){t=n[i];if(t.settings.ariaRoot)break}return t}function c(e){var t=l(e),n=f(t.getEl());t.settings.ariaRemember&&"lastAriaIndex"in t?h(t.lastAriaIndex,n):h(0,n)}function h(e,t){return e<0?e=t.length-1:e>=t.length&&(e=0),t[e]&&t[e].focus(),e}function p(e,t){var r=-1,i=l();t=t||f(i.getEl());for(var s=0;s<t.length;s++)t[s]===n&&(r=s);r+=e,i.lastAriaIndex=h(r,t)}function d(){var e=s();e=="tablist"?p(-1,f(n.parentNode)):r.parent().submenu?b():p(-1)}function v(){var e=i(),t=s();t=="tablist"?p(1,f(n.parentNode)):e=="menuitem"&&t=="menu"&&o("haspopup")?w():p(1)}function m(){p(-1)}function g(){var e=i(),t=s();e=="menuitem"&&t=="menubar"?w():e=="button"&&o("haspopup")?w({key:"down"}):p(1)}function y(e){var t=s();if(t=="tablist"){var n=f(r.getEl("body"))[0];n&&n.focus()}else p(e.shiftKey?-1:1)}function b(){r.fire("cancel")}function w(e){e=e||{},r.fire("click",{target:n,aria:e})}var t=e.root,n,r;return n=document.activeElement,r=t.getParentCtrl(n),t.on("keydown",function(e){function t(e,t){if(u(n))return;t(e)!==!1&&e.preventDefault()}if(e.isDefaultPrevented())return;switch(e.keyCode){case 37:t(e,d);break;case 39:t(e,v);break;case 38:t(e,m);break;case 40:t(e,g);break;case 27:b();break;case 14:case 13:case 32:t(e,w);break;case 9:y(e)!==!1&&e.preventDefault()}}),t.on("focusin",function(e){n=e.target,r=e.control}),{focusFirst:c}}}),i("tinymce/ui/Container",["tinymce/ui/Control","tinymce/ui/Collection","tinymce/ui/Selector","tinymce/ui/Factory","tinymce/ui/KeyboardNavigation","tinymce/util/Tools","tinymce/ui/DomUtils"],function(e,t,n,r,i,s,o){var u={};return e.extend({layout:"",innerClass:"container-inner",init:function(e){var n=this;n._super(e),e=n.settings,n._fixed=e.fixed,n._items=new t,n.isRtl()&&n.addClass("rtl"),n.addClass("container"),n.addClass("container-body","body"),e.containerCls&&n.addClass(e.containerCls),n._layout=r.create((e.layout||n.layout)+"layout"),n.settings.items&&n.add(n.settings.items),n._hasBody=!0},items:function(){return this._items},find:function(e){return e=u[e]=u[e]||new n(e),e.find(this)},add:function(e){var t=this;return t.items().add(t.create(e)).parent(t),t},focus:function(e){var t=this,n,r,i;if(e){r=t.keyboardNav||t.parents().eq(-1)[0].keyboardNav;if(r){r.focusFirst(t);return}}return i=t.find("*"),t.statusbar&&i.add(t.statusbar.items()),i.each(function(e){if(e.settings.autofocus)return n=null,!1;e.canFocus&&(n=n||e)}),n&&n.focus(),t},replace:function(e,t){var n,r=this.items(),i=r.length;while(i--)if(r[i]===e){r[i]=t;break}i>=0&&(n=t.getEl(),n&&n.parentNode.removeChild(n),n=e.getEl(),n&&n.parentNode.removeChild(n)),t.parent(this)},create:function(t){var n=this,i,o=[];return s.isArray(t)||(t=[t]),s.each(t,function(t){t&&(t instanceof e||(typeof t=="string"&&(t={type:t}),i=s.extend({},n.settings.defaults,t),t.type=i.type=i.type||t.type||n.settings.defaultType||(i.defaults?i.defaults.type:null),t=r.create(i)),o.push(t))}),o},renderNew:function(){var e=this;return e.items().each(function(t,n){var r,i;t.parent(e),t._rendered||(r=e.getEl("body"),i=o.createFragment(t.renderHtml()),r.hasChildNodes()&&n<=r.childNodes.length-1?r.insertBefore(i,r.childNodes[n]):r.appendChild(i),t.postRender())}),e._layout.applyClasses(e),e._lastRect=null,e},append:function(e){return this.add(e).renderNew()},prepend:function(e){var t=this;return t.items().set(t.create(e).concat(t.items().toArray())),t.renderNew()},insert:function(e,t,n){var r=this,i,s,o;return e=r.create(e),i=r.items(),!n&&t<i.length-1&&(t+=1),t>=0&&t<i.length&&(s=i.slice(0,t).toArray(),o=i.slice(t).toArray(),i.set(s.concat(e,o))),r.renderNew()},fromJSON:function(e){var t=this;for(var n in e)t.find("#"+n).value(e[n]);return t},toJSON:function(){var e=this,t={};return e.find("*").each(function(e){var n=e.name(),r=e.value();n&&typeof r!="undefined"&&(t[n]=r)}),t},preRender:function(){},renderHtml:function(){var e=this,t=e._layout,n=this.settings.role;return e.preRender(),t.preRender(e),'<div id="'+e._id+'" class="'+e.classes()+'"'+(n?' role="'+this.settings.role+'"':"")+">"+'<div id="'+e._id+'-body" class="'+e.classes("body")+'">'+(e.settings.html||"")+t.renderHtml(e)+"</div>"+"</div>"},postRender:function(){var e=this,t;return e.items().exec("postRender"),e._super(),e._layout.postRender(e),e._rendered=!0,e.settings.style&&o.css(e.getEl(),e.settings.style),e.settings.border&&(t=e.borderBox(),o.css(e.getEl(),{"border-top-width":t.top,"border-right-width":t.right,"border-bottom-width":t.bottom,"border-left-width":t.left})),e.parent()||(e.keyboardNav=new i({root:e})),e},initLayoutRect:function(){var e=this,t=e._super();return e._layout.recalc(e),t},recalc:function(){var e=this,t=e._layoutRect,n=e._lastRect;if(!n||n.w!=t.w||n.h!=t.h)return e._layout.recalc(e),t=e.layoutRect(),e._lastRect={x:t.x,y:t.y,w:t.w,h:t.h},!0},reflow:function(){var t;if(this.visible()){e.repaintControls=[],e.repaintControls.map={},this.recalc(),t=e.repaintControls.length;while(t--)e.repaintControls[t].repaint();this.settings.layout!=="flow"&&this.settings.layout!=="stack"&&this.repaint(),e.repaintControls=[]}return this}})}),i("tinymce/ui/DragHelper",["tinymce/ui/DomUtils"],function(e){function t(){var e=document,t,n,r,i,s,o,u,a,f=Math.max;return t=e.documentElement,n=e.body,r=f(t.scrollWidth,n.scrollWidth),i=f(t.clientWidth,n.clientWidth),s=f(t.offsetWidth,n.offsetWidth),o=f(t.scrollHeight,n.scrollHeight),u=f(t.clientHeight,n.clientHeight),a=f(t.offsetHeight,n.offsetHeight),{width:r<s?i:r,height:o<a?u:o}}return function(n,r){function h(){return s.getElementById(r.handle||n)}var i,s=document,o,u,a,f,l,c;r=r||{},u=function(n){var u=t(),p,d;n.preventDefault(),o=n.button,p=h(),l=n.screenX,c=n.screenY,window.getComputedStyle?d=window.getComputedStyle(p,null).getPropertyValue("cursor"):d=p.runtimeStyle.cursor,i=s.createElement("div"),e.css(i,{position:"absolute",top:0,left:0,width:u.width,height:u.height,zIndex:2147483647,opacity:1e-4,cursor:d}),s.body.appendChild(i),e.on(s,"mousemove",f),e.on(s,"mouseup",a),r.start(n)},f=function(e){if(e.button!==o)return a(e);e.deltaX=e.screenX-l,e.deltaY=e.screenY-c,e.preventDefault(),r.drag(e)},a=function(t){e.off(s,"mousemove",f),e.off(s,"mouseup",a),i.parentNode.removeChild(i),r.stop&&r.stop(t)},this.destroy=function(){e.off(h())},e.on(h(),"mousedown",u)}}),i("tinymce/ui/Scrollable",["tinymce/ui/DomUtils","tinymce/ui/DragHelper"],function(e,t){return{init:function(){var e=this;e.on("repaint",e.renderScroll)},renderScroll:function(){function i(){function o(s,o,u,a,f,l){var c,h,p,d,v,m,g,y,b;h=n.getEl("scroll"+s);if(h){y=o.toLowerCase(),b=u.toLowerCase(),n.getEl("absend")&&e.css(n.getEl("absend"),y,n.layoutRect()[a]-1);if(!f){e.css(h,"display","none");return}e.css(h,"display","block"),c=n.getEl("body"),p=n.getEl("scroll"+s+"t"),d=c["client"+u]-r*2,d-=t&&i?h["client"+l]:0,v=c["scroll"+u],m=d/v,g={},g[y]=c["offset"+o]+r,g[b]=d,e.css(h,g),g={},g[y]=c["scroll"+o]*m,g[b]=d*m,e.css(p,g)}}var t,i,s;s=n.getEl("body"),t=s.scrollWidth>s.clientWidth,i=s.scrollHeight>s.clientHeight,o("h","Left","Width","contentW",t,"Height"),o("v","Top","Height","contentH",i,"Width")}function s(){function i(i,s,o,u,a){var f,l=n._id+"-scroll"+i,c=n.classPrefix;n.getEl().appendChild(e.createFragment('<div id="'+l+'" class="'+c+"scrollbar "+c+"scrollbar-"+i+'">'+'<div id="'+l+'t" class="'+c+'scrollbar-thumb"></div>'+"</div>")),n.draghelper=new t(l+"t",{start:function(){f=n.getEl("body")["scroll"+s],e.addClass(e.get(l),c+"active")},drag:function(e){var t,l,c,h,p=n.layoutRect();l=p.contentW>p.innerW,c=p.contentH>p.innerH,h=n.getEl("body")["client"+o]-r*2,h-=l&&c?n.getEl("scroll"+i)["client"+a]:0,t=h/n.getEl("body")["scroll"+o],n.getEl("body")["scroll"+s]=f+e["delta"+u]/t},stop:function(){e.removeClass(e.get(l),c+"active")}})}n.addClass("scroll"),i("v","Top","Height","Y","Width"),i("h","Left","Width","X","Height")}var n=this,r=2;n.settings.autoScroll&&(n._hasScroll||(n._hasScroll=!0,s(),n.on("wheel",function(e){var t=n.getEl("body");t.scrollLeft+=(e.deltaX||0)*10,t.scrollTop+=e.deltaY*10,i()}),e.on(n.getEl("body"),"scroll",i)),i())}}}),i("tinymce/ui/Panel",["tinymce/ui/Container","tinymce/ui/Scrollable"],function(e,t){return e.extend({Defaults:{layout:"fit",containerCls:"panel"},Mixins:[t],renderHtml:function(){var e=this,t=e._layout,n=e.settings.html;return e.preRender(),t.preRender(e),typeof n=="undefined"?n='<div id="'+e._id+'-body" class="'+e.classes("body")+'">'+t.renderHtml(e)+"</div>":(typeof n=="function"&&(n=n.call(e)),e._hasBody=!1),'<div id="'+e._id+'" class="'+e.classes()+'" hidefocus="1" tabindex="-1" role="group">'+(e._preBodyHtml||"")+n+"</div>"}})}),i("tinymce/ui/Movable",["tinymce/ui/DomUtils"],function(e){function t(t,n,r){var i,s,o,u,a,f,l,c,h,p;return h=e.getViewPort(),s=e.getPos(n),o=s.x,u=s.y,t._fixed&&(o-=h.x,u-=h.y),i=t.getEl(),p=e.getSize(i),a=p.width,f=p.height,p=e.getSize(n),l=p.width,c=p.height,r=(r||"").split(""),r[0]==="b"&&(u+=c),r[1]==="r"&&(o+=l),
r[0]==="c"&&(u+=Math.round(c/2)),r[1]==="c"&&(o+=Math.round(l/2)),r[3]==="b"&&(u-=f),r[4]==="r"&&(o-=a),r[3]==="c"&&(u-=Math.round(f/2)),r[4]==="c"&&(o-=Math.round(a/2)),{x:o,y:u,w:a,h:f}}return{testMoveRel:function(n,r){var i=e.getViewPort();for(var s=0;s<r.length;s++){var o=t(this,n,r[s]);if(this._fixed){if(o.x>0&&o.x+o.w<i.w&&o.y>0&&o.y+o.h<i.h)return r[s]}else if(o.x>i.x&&o.x+o.w<i.w+i.x&&o.y>i.y&&o.y+o.h<i.h+i.y)return r[s]}return r[0]},moveRel:function(e,n){typeof n!="string"&&(n=this.testMoveRel(e,n));var r=t(this,e,n);return this.moveTo(r.x,r.y)},moveBy:function(e,t){var n=this,r=n.layoutRect();return n.moveTo(r.x+e,r.y+t),n},moveTo:function(t,n){function i(e,t,n){return e<0?0:e+n>t?(e=t-n,e<0?0:e):e}var r=this;if(r.settings.constrainToViewport){var s=e.getViewPort(window),o=r.layoutRect();t=i(t,s.w+s.x,o.w),n=i(n,s.h+s.y,o.h)}return r._rendered?r.layoutRect({x:t,y:n}).repaint():(r.settings.x=t,r.settings.y=n),r.fire("move",{x:t,y:n}),r}}}),i("tinymce/ui/Resizable",["tinymce/ui/DomUtils"],function(e){return{resizeToContent:function(){this._layoutRect.autoResize=!0,this._lastRect=null,this.reflow()},resizeTo:function(t,n){if(t<=1||n<=1){var r=e.getWindowSize();t=t<=1?t*r.w:t,n=n<=1?n*r.h:n}return this._layoutRect.autoResize=!1,this.layoutRect({minW:t,minH:n,w:t,h:n}).reflow()},resizeBy:function(e,t){var n=this,r=n.layoutRect();return n.resizeTo(r.w+e,r.h+t)}}}),i("tinymce/ui/FloatPanel",["tinymce/ui/Panel","tinymce/ui/Movable","tinymce/ui/Resizable","tinymce/ui/DomUtils"],function(e,t,n,r){function l(){function e(e,t){while(e){if(e==t)return!0;e=e.parent()}}i||(i=function(t){if(t.button==2)return;var n=u.length;while(n--){var r=u[n],i=r.getParentCtrl(t.target);if(r.settings.autohide){if(i)if(e(i,r)||r.parent()===i)continue;t=r.fire("autohide",{target:t.target}),t.isDefaultPrevented()||r.hide()}}},r.on(document,"click",i))}function c(){s||(s=function(){var e;e=u.length;while(e--)p(u[e])},r.on(window,"scroll",s))}function h(){o||(o=function(){d.hideAll()},r.on(window,"resize",o))}function p(e){function n(t,n){var r;for(var i=0;i<u.length;i++)if(u[i]!=e){r=u[i].parent();while(r&&(r=r.parent()))r==e&&u[i].fixed(t).moveBy(0,n).repaint()}}var t=r.getViewPort().y;e.settings.autofix&&(e._fixed?e._autoFixY>t&&(e.fixed(!1).layoutRect({y:e._autoFixY}).repaint(),n(!1,e._autoFixY-t)):(e._autoFixY=e.layoutRect().y,e._autoFixY<t&&(e.fixed(!0).layoutRect({y:0}).repaint(),n(!0,t-e._autoFixY))))}function v(e){var t;t=u.length;while(t--)u[t]===e&&u.splice(t,1);t=a.length;while(t--)a[t]===e&&a.splice(t,1)}var i,s,o,u=[],a=[],f,d=e.extend({Mixins:[t,n],init:function(e){function n(){var e,n=d.zIndex||65535,i;if(a.length)for(e=0;e<a.length;e++)a[e].modal&&(n++,i=a[e]),a[e].getEl().style.zIndex=n,a[e].zIndex=n,n++;var s=document.getElementById(t.classPrefix+"modal-block");i?r.css(s,"z-index",i.zIndex-1):s&&(s.parentNode.removeChild(s),f=!1),d.currentZIndex=n}var t=this;t._super(e),t._eventsRoot=t,t.addClass("floatpanel"),e.autohide&&(l(),h(),u.push(t)),e.autofix&&(c(),t.on("move",function(){p(this)})),t.on("postrender show",function(e){if(e.control==t){var i,s=t.classPrefix;t.modal&&!f&&(i=r.createFragment('<div id="'+s+'modal-block" class="'+s+"reset "+s+'fade"></div>'),i=i.firstChild,t.getContainerElm().appendChild(i),setTimeout(function(){r.addClass(i,s+"in"),r.addClass(t.getEl(),s+"in")},0),f=!0),a.push(t),n()}}),t.on("close hide",function(e){if(e.control==t){var r=a.length;while(r--)a[r]===t&&a.splice(r,1);n()}}),t.on("show",function(){t.parents().each(function(e){if(e._fixed)return t.fixed(!0),!1})}),e.popover&&(t._preBodyHtml='<div class="'+t.classPrefix+'arrow"></div>',t.addClass("popover").addClass("bottom").addClass(t.isRtl()?"end":"start"))},fixed:function(e){var t=this;if(t._fixed!=e){if(t._rendered){var n=r.getViewPort();e?t.layoutRect().y-=n.y:t.layoutRect().y+=n.y}t.toggleClass("fixed",e),t._fixed=e}return t},show:function(){var e=this,t,n=e._super();t=u.length;while(t--)if(u[t]===e)break;return t===-1&&u.push(e),n},hide:function(){return v(this),this._super()},hideAll:function(){d.hideAll()},close:function(){var e=this;return e.fire("close"),e.remove()},remove:function(){v(this),this._super()},postRender:function(){var e=this;return e.settings.bodyRole&&this.getEl("body").setAttribute("role",e.settings.bodyRole),e._super()}});return d.hideAll=function(){var e=u.length;while(e--){var t=u[e];t&&t.settings.autohide&&(t.hide(),u.splice(e,1))}},d}),i("tinymce/ui/Window",["tinymce/ui/FloatPanel","tinymce/ui/Panel","tinymce/ui/DomUtils","tinymce/ui/DragHelper"],function(e,t,n,r){var i=e.extend({modal:!0,Defaults:{border:1,layout:"flex",containerCls:"panel",role:"dialog",callbacks:{submit:function(){this.fire("submit",{data:this.toJSON()})},close:function(){this.close()}}},init:function(e){var n=this;n._super(e),n.isRtl()&&n.addClass("rtl"),n.addClass("window"),n._fixed=!0,e.buttons&&(n.statusbar=new t({layout:"flex",border:"1 0 0 0",spacing:3,padding:10,align:"center",pack:n.isRtl()?"start":"end",defaults:{type:"button"},items:e.buttons}),n.statusbar.addClass("foot"),n.statusbar.parent(n)),n.on("click",function(e){e.target.className.indexOf(n.classPrefix+"close")!=-1&&n.close()}),n.on("cancel",function(){n.close()}),n.aria("describedby",n.describedBy||n._id+"-none"),n.aria("label",e.title),n._fullscreen=!1},recalc:function(){var e=this,t=e.statusbar,r,i,s,o;e._fullscreen&&(e.layoutRect(n.getWindowSize()),e.layoutRect().contentH=e.layoutRect().innerH),e._super(),r=e.layoutRect(),e.settings.title&&!e._fullscreen&&(i=r.headerW,i>r.w&&(s=r.x-Math.max(0,i/2),e.layoutRect({w:i,x:s}),o=!0)),t&&(t.layoutRect({w:e.layoutRect().innerW}).recalc(),i=t.layoutRect().minW+r.deltaW,i>r.w&&(s=r.x-Math.max(0,i-r.w),e.layoutRect({w:i,x:s}),o=!0)),o&&e.recalc()},initLayoutRect:function(){var e=this,t=e._super(),r=0,i;if(e.settings.title&&!e._fullscreen){i=e.getEl("head");var s=n.getSize(i);t.headerW=s.width,t.headerH=s.height,r+=t.headerH}e.statusbar&&(r+=e.statusbar.layoutRect().h),t.deltaH+=r,t.minH+=r,t.h+=r;var o=n.getWindowSize();return t.x=Math.max(0,o.w/2-t.w/2),t.y=Math.max(0,o.h/2-t.h/2),t},renderHtml:function(){var e=this,t=e._layout,n=e._id,r=e.classPrefix,i=e.settings,s="",o="",u=i.html;return e.preRender(),t.preRender(e),i.title&&(s='<div id="'+n+'-head" class="'+r+'window-head">'+'<div id="'+n+'-title" class="'+r+'title">'+e.encode(i.title)+"</div>"+'<button type="button" class="'+r+'close" aria-hidden="true">×</button>'+'<div id="'+n+'-dragh" class="'+r+'dragh"></div>'+"</div>"),i.url&&(u='<iframe src="'+i.url+'" tabindex="-1"></iframe>'),typeof u=="undefined"&&(u=t.renderHtml(e)),e.statusbar&&(o=e.statusbar.renderHtml()),'<div id="'+n+'" class="'+e.classes()+'" hidefocus="1">'+'<div class="'+e.classPrefix+'reset" role="application">'+s+'<div id="'+n+'-body" class="'+e.classes("body")+'">'+u+"</div>"+o+"</div>"+"</div>"},fullscreen:function(e){var t=this,r=document.documentElement,i,s=t.classPrefix,o;if(e!=t._fullscreen){n.on(window,"resize",function(){var e;if(t._fullscreen)if(!i){e=(new Date).getTime();var r=n.getWindowSize();t.moveTo(0,0).resizeTo(r.w,r.h),(new Date).getTime()-e>50&&(i=!0)}else t._timer||(t._timer=setTimeout(function(){var e=n.getWindowSize();t.moveTo(0,0).resizeTo(e.w,e.h),t._timer=0},50))}),o=t.layoutRect(),t._fullscreen=e;if(!e)t._borderBox=t.parseBox(t.settings.border),t.getEl("head").style.display="",o.deltaH+=o.headerH,n.removeClass(r,s+"fullscreen"),n.removeClass(document.body,s+"fullscreen"),t.removeClass("fullscreen"),t.moveTo(t._initial.x,t._initial.y).resizeTo(t._initial.w,t._initial.h);else{t._initial={x:o.x,y:o.y,w:o.w,h:o.h},t._borderBox=t.parseBox("0"),t.getEl("head").style.display="none",o.deltaH-=o.headerH+2,n.addClass(r,s+"fullscreen"),n.addClass(document.body,s+"fullscreen"),t.addClass("fullscreen");var u=n.getWindowSize();t.moveTo(0,0).resizeTo(u.w,u.h)}}return t.reflow()},postRender:function(){var e=this,t;setTimeout(function(){e.addClass("in")},0),e._super(),e.statusbar&&e.statusbar.postRender(),e.focus(),this.dragHelper=new r(e._id+"-dragh",{start:function(){t={x:e.layoutRect().x,y:e.layoutRect().y}},drag:function(n){e.moveTo(t.x+n.deltaX,t.y+n.deltaY)}}),e.on("submit",function(t){t.isDefaultPrevented()||e.close()})},submit:function(){return this.fire("submit",{data:this.toJSON()})},remove:function(){var e=this,t=e.classPrefix;e.dragHelper.destroy(),e._super(),e.statusbar&&this.statusbar.remove(),e._fullscreen&&(n.removeClass(document.documentElement,t+"fullscreen"),n.removeClass(document.body,t+"fullscreen"))},getContentWindow:function(){var e=this.getEl().getElementsByTagName("iframe")[0];return e?e.contentWindow:null}});return i}),i("tinymce/ui/MessageBox",["tinymce/ui/Window"],function(e){var t=e.extend({init:function(e){e={border:1,padding:20,layout:"flex",pack:"center",align:"center",containerCls:"panel",autoScroll:!0,buttons:{type:"button",text:"Ok",action:"ok"},items:{type:"label",multiline:!0,maxWidth:500,maxHeight:200}},this._super(e)},Statics:{OK:1,OK_CANCEL:2,YES_NO:3,YES_NO_CANCEL:4,msgBox:function(n){var r,i=n.callback||function(){};switch(n.buttons){case t.OK_CANCEL:r=[{type:"button",text:"Ok",subtype:"primary",onClick:function(e){e.control.parents()[1].close(),i(!0)}},{type:"button",text:"Cancel",onClick:function(e){e.control.parents()[1].close(),i(!1)}}];break;case t.YES_NO:r=[{type:"button",text:"Ok",subtype:"primary",onClick:function(e){e.control.parents()[1].close(),i(!0)}}];break;case t.YES_NO_CANCEL:r=[{type:"button",text:"Ok",subtype:"primary",onClick:function(e){e.control.parents()[1].close()}}];break;default:r=[{type:"button",text:"Ok",subtype:"primary",onClick:function(e){e.control.parents()[1].close(),i(!0)}}]}return(new e({padding:20,x:n.x,y:n.y,minWidth:300,minHeight:100,layout:"flex",pack:"center",align:"center",buttons:r,title:n.title,role:"alertdialog",items:{type:"label",multiline:!0,maxWidth:500,maxHeight:200,text:n.text},onPostRender:function(){this.aria("describedby",this.items()[0]._id)},onClose:n.onClose,onCancel:function(){i(!1)}})).renderTo(document.body).reflow()},alert:function(e,n){return typeof e=="string"&&(e={text:e}),e.callback=n,t.msgBox(e)},confirm:function(e,n){return typeof e=="string"&&(e={text:e}),e.callback=n,e.buttons=t.OK_CANCEL,t.msgBox(e)}}});return t}),i("tinymce/WindowManager",["tinymce/ui/Window","tinymce/ui/MessageBox"],function(e,t){return function(n){function s(){if(i.length)return i[i.length-1]}var r=this,i=[];r.windows=i,r.open=function(t,r){var s;return n.editorManager.activeEditor=n,t.title=t.title||" ",t.url=t.url||t.file,t.url&&(t.width=parseInt(t.width||320,10),t.height=parseInt(t.height||240,10)),t.body&&(t.items={defaults:t.defaults,type:t.bodyType||"form",items:t.body}),!t.url&&!t.buttons&&(t.buttons=[{text:"Ok",subtype:"primary",onclick:function(){s.find("form")[0].submit()}},{text:"Cancel",onclick:function(){s.close()}}]),s=new e(t),i.push(s),s.on("close",function(){var e=i.length;while(e--)i[e]===s&&i.splice(e,1);n.focus()}),t.data&&s.on("postRender",function(){this.find("*").each(function(e){var n=e.name();n in t.data&&e.value(t.data[n])})}),s.features=t||{},s.params=r||{},n.nodeChanged(),s.renderTo().reflow()},r.alert=function(e,r,i){t.alert(e,function(){r?r.call(i||this):n.focus()})},r.confirm=function(e,n,r){t.confirm(e,function(e){n.call(r||this,e)})},r.close=function(){s()&&s().close()},r.getParams=function(){return s()?s().params:null},r.setParams=function(e){s()&&(s().params=e)},r.getWindows=function(){return i}}}),i("tinymce/util/Quirks",["tinymce/util/VK","tinymce/dom/RangeUtils","tinymce/html/Node","tinymce/html/Entities","tinymce/Env","tinymce/util/Tools"],function(e,t,n,r,i,s){return function(o){function y(e,t){try{o.getDoc().execCommand(e,!1,t)}catch(n){}}function b(){var e=o.getDoc().documentMode;return e?e:6}function w(e){return e.isDefaultPrevented()}function E(){function h(e){var t=new r(function(){});s.each(o.getBody().getElementsByTagName("*"),function(e){e.tagName=="SPAN"&&e.setAttribute("mce-data-marked",1),!e.hasAttribute("data-mce-style")&&e.hasAttribute("style")&&o.dom.setAttrib(e,"style",e.getAttribute("style"))}),t.observe(o.getDoc(),{childList:!0,attributes:!0,subtree:!0,attributeFilter:["style"]}),o.getDoc().execCommand(e?"ForwardDelete":"Delete",!1,null);var n=o.selection.getRng(),i=n.startContainer.parentNode;s.each(t.takeRecords(),function(e){if(!l.isChildOf(e.target,o.getBody()))return;if(e.attributeName=="style"){var t=e.target.getAttribute("data-mce-style");t?e.target.setAttribute("style",t):e.target.removeAttribute("style")}s.each(e.addedNodes,function(e){if(e.nodeName=="SPAN"&&!e.getAttribute("mce-data-marked")){var t,r;e==i&&(t=n.startOffset,r=e.firstChild),l.remove(e,!0),r&&(n.setStart(r,t),n.setEnd(r,t),o.selection.setRng(n))}})}),t.disconnect(),s.each(o.dom.select("span[mce-data-marked]"),function(e){e.removeAttribute("mce-data-marked")})}var t=o.getDoc(),n="data:text/mce-internal,",r=window.MutationObserver,i,u;r||(i=!0,r=function(){function n(t){var n=t.relatedNode||t.target;e.push({target:n,addedNodes:[n]})}function r(t){var n=t.relatedNode||t.target;e.push({target:n,attributeName:t.attrName})}var e=[],t;this.observe=function(e){t=e,t.addEventListener("DOMSubtreeModified",n,!1),t.addEventListener("DOMNodeInsertedIntoDocument",n,!1),t.addEventListener("DOMNodeInserted",n,!1),t.addEventListener("DOMAttrModified",r,!1)},this.disconnect=function(){t.removeEventListener("DOMSubtreeModified",n,!1),t.removeEventListener("DOMNodeInsertedIntoDocument",n,!1),t.removeEventListener("DOMNodeInserted",n,!1),t.removeEventListener("DOMAttrModified",r,!1)},this.takeRecords=function(){return e}}),o.on("keydown",function(t){var n=t.keyCode==f,r=e.metaKeyPressed(t);if(!w(t)&&(n||t.keyCode==a)){var i=o.selection.getRng(),s=i.startContainer,u=i.startOffset;if(!r&&i.collapsed&&s.nodeType==3)if(n?u<s.data.length:u>0)return;t.preventDefault(),r&&o.selection.getSel().modify("extend",n?"forward":"backward","word"),h(n)}}),o.on("keypress",function(t){!w(t)&&!c.isCollapsed()&&t.charCode&&!e.metaKeyPressed(t)&&(t.preventDefault(),h(!0),o.selection.setContent(String.fromCharCode(t.charCode)))}),o.addCommand("Delete",function(){h()}),o.addCommand("ForwardDelete",function(){h(!0)});if(i)return;o.on("dragstart",function(e){var t;o.selection.isCollapsed()&&e.target.tagName=="IMG"&&c.select(e.target),u=c.getRng(),t=o.selection.getContent(),t.length>0&&e.dataTransfer.setData("URL","data:text/mce-internal,"+escape(t))}),o.on("drop",function(e){if(!w(e)){var r=e.dataTransfer.getData("URL");if(!r||r.indexOf(n)==-1||!t.caretRangeFromPoint)return;r=unescape(r.substr(n.length)),t.caretRangeFromPoint&&(e.preventDefault(),window.setTimeout(function(){var n=t.caretRangeFromPoint(e.x,e.y);u&&(c.setRng(u),u=null),h(),c.setRng(n),o.insertContent(r)},0))}}),o.on("cut",function(e){!w(e)&&e.clipboardData&&(e.preventDefault(),e.clipboardData.clearData(),e.clipboardData.setData("text/html",o.selection.getContent()),e.clipboardData.setData("text/plain",o.selection.getContent({format:"text"})),h(!0))})}function S(){function e(e){var t=l.create("body"),n=e.cloneContents();return t.appendChild(n),c.serializer.serialize(t,{format:"html"})}function n(n){if(!n.setStart){if(n.item)return!1;var r=n.duplicate();return r.moveToElementText(o.getBody()),t.compareRanges(n,r)}var i=e(n),s=l.createRng();s.selectNode(o.getBody());var u=e(s);return i===u}o.on("keydown",function(e){var t=e.keyCode,r,i;if(!w(e)&&(t==f||t==a)){r=o.selection.isCollapsed(),i=o.getBody();if(r&&!l.isEmpty(i))return;if(!r&&!n(o.selection.getRng()))return;e.preventDefault(),o.setContent(""),i.firstChild&&l.isBlock(i.firstChild)?o.selection.setCursorLocation(i.firstChild,0):o.selection.setCursorLocation(i,0),o.nodeChanged()}})}function x(){o.on("keydown",function(t){!w(t)&&t.keyCode==65&&e.metaKeyPressed(t)&&(t.preventDefault(),o.execCommand("SelectAll"))})}function T(){o.settings.content_editable||(l.bind(o.getDoc(),"focusin",function(){c.setRng(c.getRng())}),l.bind(o.getDoc(),"mousedown",function(e){e.target==o.getDoc().documentElement&&(o.getBody().focus(),c.setRng(c.getRng()))}))}function N(){o.on("keydown",function(e){if(!w(e)&&e.keyCode===a&&c.isCollapsed()&&c.getRng(!0).startOffset===0){var t=c.getNode(),n=t.previousSibling;if(t.nodeName=="HR"){l.remove(t),e.preventDefault();return}n&&n.nodeName&&n.nodeName.toLowerCase()==="hr"&&(l.remove(n),e.preventDefault())}})}function C(){window.Range.prototype.getClientRects||o.on("mousedown",function(e){if(!w(e)&&e.target.nodeName==="HTML"){var t=o.getBody();t.blur(),setTimeout(function(){t.focus()},0)}})}function k(){o.on("click",function(e){e=e.target,/^(IMG|HR)$/.test(e.nodeName)&&c.getSel().setBaseAndExtent(e,0,e,1),e.nodeName=="A"&&l.hasClass(e,"mce-item-anchor")&&c.select(e),o.nodeChanged()})}function L(){function e(){var e=l.getAttribs(c.getStart().cloneNode(!1));return function(){var t=c.getStart();t!==o.getBody()&&(l.setAttrib(t,"style",null),u(e,function(e){t.setAttributeNode(e.cloneNode(!0))}))}}function t(){return!c.isCollapsed()&&l.getParent(c.getStart(),l.isBlock)!=l.getParent(c.getEnd(),l.isBlock)}o.on("keypress",function(n){var r;if(!w(n)&&(n.keyCode==8||n.keyCode==46)&&t())return r=e(),o.getDoc().execCommand("delete",!1,null),r(),n.preventDefault(),!1}),l.bind(o.getDoc(),"cut",function(n){var r;!w(n)&&t()&&(r=e(),setTimeout(function(){r()},0))})}function A(){var e,n;o.on("selectionchange",function(){n&&(clearTimeout(n),n=0),n=window.setTimeout(function(){if(o.removed)return;var n=c.getRng();if(!e||!t.compareRanges(n,e))o.nodeChanged(),e=n},50)})}function O(){document.body.setAttribute("role","application")}function M(){o.on("keydown",function(e){if(!w(e)&&e.keyCode===a&&c.isCollapsed()&&c.getRng(!0).startOffset===0){var t=c.getNode().previousSibling;if(t&&t.nodeName&&t.nodeName.toLowerCase()==="table")return e.preventDefault(),!1}})}function _(){if(b()>7)return;y("RespectVisibilityInDesign",!0),o.contentStyles.push(".mceHideBrInPre pre br {display: none}"),l.addClass(o.getBody(),"mceHideBrInPre"),p.addNodeFilter("pre",function(e){var t=e.length,r,i,s,o;while(t--){r=e[t].getAll("br"),i=r.length;while(i--)s=r[i],o=s.prev,o&&o.type===3&&o.value.charAt(o.value-1)!="\n"?o.value+="\n":s.parent.insert(new n("#text",3),s,!0).value="\n"}}),d.addNodeFilter("pre",function(e){var t=e.length,n,r,i,s;while(t--){n=e[t].getAll("br"),r=n.length;while(r--)i=n[r],s=i.prev,s&&s.type==3&&(s.value=s.value.replace(/\r?\n$/,""))}})}function D(){l.bind(o.getBody(),"mouseup",function(){var e,t=c.getNode();if(t.nodeName=="IMG"){if(e=l.getStyle(t,"width"))l.setAttrib(t,"width",e.replace(/[^0-9%]+/g,"")),l.setStyle(t,"width","");if(e=l.getStyle(t,"height"))l.setAttrib(t,"height",e.replace(/[^0-9%]+/g,"")),l.setStyle(t,"height","")}})}function P(){o.on("keydown",function(t){var n,r,i,s,u;if(w(t)||t.keyCode!=e.BACKSPACE)return;n=c.getRng(),r=n.startContainer,i=n.startOffset,s=l.getRoot(),u=r;if(!n.collapsed||i!==0)return;while(u&&u.parentNode&&u.parentNode.firstChild==u&&u.parentNode!=s)u=u.parentNode;u.tagName==="BLOCKQUOTE"&&(o.formatter.toggle("blockquote",null,u),n=l.createRng(),n.setStart(r,0),n.setEnd(r,0),c.setRng(n))})}function H(){function e(){o._refreshContentEditable(),y("StyleWithCSS",!1),y("enableInlineTableEditing",!1),h.object_resizing||y("enableObjectResizing",!1)}h.readonly||o.on("BeforeExecCommand MouseDown",e)}function B(){function e(){u(l.select("a"),function(e){var t=e.parentNode,n=l.getRoot();if(t.lastChild===e){while(t&&!l.isBlock(t)){if(t.parentNode.lastChild!==t||t===n)return;t=t.parentNode}l.add(t,"br",{"data-mce-bogus":1})}})}o.on("SetContent ExecCommand",function(t){(t.type=="setcontent"||t.command==="mceInsertLink")&&e()})}function j(){h.forced_root_block&&o.on("init",function(){y("DefaultParagraphSeparator",h.forced_root_block)})}function F(){o.on("Undo Redo SetContent",function(e){e.initial||o.execCommand("mceRepaint")})}function I(){o.on("keydown",function(e){var t;!w(e)&&e.keyCode==a&&(t=o.getDoc().selection.createRange(),t&&t.item&&(e.preventDefault(),o.undoManager.beforeChange(),l.remove(t.item(0)),o.undoManager.add()))})}function q(){var e;b()>=10&&(e="",u("p div h1 h2 h3 h4 h5 h6".split(" "),function(t,n){e+=(n>0?",":"")+t+":empty"}),o.contentStyles.push(e+"{padding-right: 1px !important}"))}function R(){b()<9&&(p.addNodeFilter("noscript",function(e){var t=e.length,n,r;while(t--)n=e[t],r=n.firstChild,r&&n.attr("data-mce-innertext",r.value)}),d.addNodeFilter("noscript",function(e){var t=e.length,i,s,o;while(t--)i=e[t],s=e[t].firstChild,s?s.value=r.decode(s.value):(o=i.attributes.map["data-mce-innertext"],o&&(i.attr("data-mce-innertext",null),s=new n("#text",3),s.value=o,s.raw=!0,i.append(s)))}))}function U(){function s(e,n){var r=t.createTextRange();try{r.moveToPoint(e,n)}catch(i){r=null}return r}function o(e){var t;e.button?(t=s(e.x,e.y),t&&(t.compareEndPoints("StartToStart",r)>0?t.setEndPoint("StartToStart",r):t.setEndPoint("EndToEnd",r),t.select())):u()}function u(){var t=e.selection.createRange();r&&!t.item&&t.compareEndPoints("StartToEnd",t)===0&&r.select(),l.unbind(e,"mouseup",u),l.unbind(e,"mousemove",o),r=n=0}var e=l.doc,t=e.body,n,r,i;e.documentElement.unselectable=!0,l.bind(e,"mousedown contextmenu",function(t){if(t.target.nodeName==="HTML"){n&&u(),i=e.documentElement;if(i.scrollHeight>i.clientHeight)return;n=1,r=s(t.x,t.y),r&&(l.bind(e,"mouseup",u),l.bind(e,"mousemove",o),l.getRoot().focus(),r.select())}})}function z(){o.on("keyup focusin mouseup",function(t){(t.keyCode!=65||!e.metaKeyPressed(t))&&c.normalize()},!0)}function W(){o.contentStyles.push("img:-moz-broken {-moz-force-broken-image-icon:1;min-width:24px;min-height:24px}")}function X(){o.inline||o.on("keydown",function(){document.activeElement==document.body&&o.getWin().focus()})}function V(){o.inline||(o.contentStyles.push("body {min-height: 150px}"),o.on("click",function(e){e.target.nodeName=="HTML"&&(o.getBody().focus(),o.selection.normalize(),o.nodeChanged())}))}function $(){i.mac&&o.on("keydown",function(t){e.metaKeyPressed(t)&&(t.keyCode==37||t.keyCode==39)&&(t.preventDefault(),o.selection.getSel().modify("move",t.keyCode==37?"backward":"forward","word"))})}function J(){y("AutoUrlDetect",!1)}function K(){o.inline||o.on("focus blur beforegetcontent",function(){var e=o.dom.create("br");o.getBody().appendChild(e),e.parentNode.removeChild(e)},!0)}function Q(){o.on("click",function(e){var t=e.target;do if(t.tagName==="A"){e.preventDefault();return}while(t=t.parentNode)}),o.contentStyles.push(".mce-content-body {-webkit-touch-callout: none}")}function G(){o.on("init",function(){o.dom.bind(o.getBody(),"submit",function(e){e.preventDefault()})})}var u=s.each,a=e.BACKSPACE,f=e.DELETE,l=o.dom,c=o.selection,h=o.settings,p=o.parser,d=o.serializer,v=i.gecko,m=i.ie,g=i.webkit;M(),P(),S(),z(),g&&(E(),T(),k(),j(),G(),i.iOS?(A(),X(),V(),Q()):x()),m&&i.ie<11&&(N(),O(),_(),D(),I(),q(),R(),U()),i.ie>=11&&(V(),K()),i.ie&&(x(),J()),v&&(N(),C(),L(),H(),B(),F(),W(),$())}}),i("tinymce/util/Observable",["tinymce/util/EventDispatcher"],function(e){function t(t){return t._eventDispatcher||(t._eventDispatcher=new e({scope:t,toggleEvent:function(n,r){e.isNative(n)&&t.toggleNativeEvent&&t.toggleNativeEvent(n,r)}})),t._eventDispatcher}return{fire:function(e,n,r){var i=this;if(i.removed&&e!=="remove")return n;n=t(i).fire(e,n,r);if(r!==!1&&i.parent){var s=i.parent();while(s&&!n.isPropagationStopped())s.fire(e,n,!1),s=s.parent()}return n},on:function(e,n,r){return t(this).on(e,n,r)},off:function(e,n){return t(this).off(e,n)},once:function(e,n){return t(this).once(e,n)},hasEventListeners:function(e){return t(this).has(e)}}}),i("tinymce/EditorObservable",["tinymce/util/Observable","tinymce/dom/DOMUtils","tinymce/util/Tools"],function(e,t,n){function i(e,t){return t=="selectionchange"?e.getDoc():!e.inline&&/^mouse|click|contextmenu|drop|dragover|dragend/.test(t)?e.getDoc():e.getBody()}function s(e,t){var n=e.settings.event_root,s=e.editorManager,o=s.eventRootElm||i(e,t);if(n){s.rootEvents||(s.rootEvents={},s.on("RemoveEditor",function(){s.activeEditor||(r.unbind(o),delete s.rootEvents)}));if(s.rootEvents[t])return;o==e.getBody()&&(o=r.select(n)[0],s.eventRootElm=o),s.rootEvents[t]=!0,r.bind(o,t,function(e){var n=e.target,i=s.editors,o=i.length;while(o--){var u=i[o].getBody();if(u===n||r.isChildOf(n,u))i[o].hidden||i[o].fire(t,e)}})}else e.dom.bind(o,t,function(n){e.hidden||e.fire(t,n)})}var r=t.DOM,o={bindPendingEventDelegates:function(){var e=this;n.each(e._pendingNativeEvents,function(t){s(e,t)})},toggleNativeEvent:function(e,t){var n=this;if(n.settings.readonly)return;if(e=="focus"||e=="blur")return;t?n.initialized?s(n,e):n._pendingNativeEvents?n._pendingNativeEvents.push(e):n._pendingNativeEvents=[e]:n.initialized&&n.dom.unbind(i(n,e),e)}};return o=n.extend({},e,o),o}),i("tinymce/Shortcuts",["tinymce/util/Tools","tinymce/Env"],function(e,t){var n=e.each,r=e.explode,i={f9:120,f10:121,f11:122};return function(s){var o=this,u={};s.on("keyup keypress keydown",function(e){(e.altKey||e.ctrlKey||e.metaKey)&&n(u,function(n){var r=t.mac?e.metaKey:e.ctrlKey;if(n.ctrl!=r||n.alt!=e.altKey||n.shift!=e.shiftKey)return;if(e.keyCode==n.keyCode||e.charCode&&e.charCode==n.charCode)return e.preventDefault(),e.type=="keydown"&&n.func.call(n.scope),!0})}),o.add=function(t,o,a,f){var l;return l=a,typeof a=="string"?a=function(){s.execCommand(l,!1,null)}:e.isArray(l)&&(a=function(){s.execCommand(l[0],l[1],l[2])}),n(r(t.toLowerCase()),function(e){var t={func:a,scope:f||s,desc:s.translate(o),alt:!1,ctrl:!1,shift:!1};n(r(e,"+"),function(e){switch(e){case"alt":case"ctrl":case"shift":t[e]=!0;break;default:/^[0-9]{2,}$/.test(e)?t.keyCode=parseInt(e,10):(t.charCode=e.charCodeAt(0),t.keyCode=i[e]||e.toUpperCase().charCodeAt(0))}}),u[(t.ctrl?"ctrl":"")+","+(t.alt?"alt":"")+","+(t.shift?"shift":"")+","+t.keyCode]=t}),!0}}}),i("tinymce/Editor",["tinymce/dom/DOMUtils","tinymce/AddOnManager","tinymce/html/Node","tinymce/dom/Serializer","tinymce/html/Serializer","tinymce/dom/Selection","tinymce/Formatter","tinymce/UndoManager","tinymce/EnterKey","tinymce/ForceBlocks","tinymce/EditorCommands","tinymce/util/URI","tinymce/dom/ScriptLoader","tinymce/dom/EventUtils","tinymce/WindowManager","tinymce/html/Schema","tinymce/html/DomParser","tinymce/util/Quirks","tinymce/Env","tinymce/util/Tools","tinymce/EditorObservable","tinymce/Shortcuts"],function(e,n,r,i,s,o,u,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S){function H(e,t,r){var i=this,s,o;s=i.documentBaseUrl=r.documentBaseURL,o=r.baseURI,i.settings=t=C({id:e,theme:"modern",delta_width:0,delta_height:0,popup_css:"",plugins:"",document_base_url:s,add_form_submit_trigger:!0,submit_patch:!0,add_unload_trigger:!0,convert_urls:!0,relative_urls:!0,remove_script_host:!0,object_resizing:!0,doctype:"<!DOCTYPE html>",visual:!0,font_size_style_values:"xx-small,x-small,small,medium,large,x-large,xx-large",font_size_legacy_values:"xx-small,small,medium,large,x-large,xx-large,300%",forced_root_block:"p",hidden_input:!0,padd_empty_editor:!0,render_ui:!0,indentation:"30px",inline_styles:!0,convert_fonts_to_spans:!0,indent:"simple",indent_before:"p,h1,h2,h3,h4,h5,h6,blockquote,div,title,style,pre,script,td,ul,li,area,table,thead,tfoot,tbody,tr,section,article,hgroup,aside,figure,option,optgroup,datalist",indent_after:"p,h1,h2,h3,h4,h5,h6,blockquote,div,title,style,pre,script,td,ul,li,area,table,thead,tfoot,tbody,tr,section,article,hgroup,aside,figure,option,optgroup,datalist",validate:!0,entity_encoding:"named",url_converter:i.convertURL,url_converter_scope:i,ie7_compat:!0},t),n.language=t.language||"en",n.languageLoad=t.language_load,n.baseURL=r.baseURL,i.id=t.id=e,i.isNotDirty=!0,i.plugins={},i.documentBaseURI=new h(t.document_base_url||s,{base_uri:o}),i.baseURI=o,i.contentCSS=[],i.contentStyles=[],i.shortcuts=new S(i),i.execCommands={},i.queryStateCommands={},i.queryValueCommands={},i.loadedCSS={},i.suffix=r.suffix,i.editorManager=r,i.inline=t.inline,r.fire("SetupEditor",i),i.execCallback("setup",i)}var x=e.DOM,T=n.ThemeManager,N=n.PluginManager,C=w.extend,k=w.each,L=w.explode,A=w.inArray,O=w.trim,M=w.resolve,_=d.Event,D=b.gecko,P=b.ie;return H.prototype={render:function(){function i(){x.unbind(window,"ready",i),e.render()}function o(){var n=p.ScriptLoader;t.language&&t.language!="en"&&!t.language_url&&(t.language_url=e.editorManager.baseURL+"/langs/"+t.language+".js"),t.language_url&&n.add(t.language_url);if(t.theme&&typeof t.theme!="function"&&t.theme.charAt(0)!="-"&&!T.urls[t.theme]){var i=t.theme_url;i?i=e.documentBaseURI.toAbsolute(i):i="themes/"+t.theme+"/theme"+r+".js",T.load(t.theme,i)}w.isArray(t.plugins)&&(t.plugins=t.plugins.join(" ")),k(t.external_plugins,function(e,n){N.load(n,e),t.plugins+=" "+n}),k(t.plugins.split(/[ ,]/),function(e){e=O(e);if(e&&!N.urls[e])if(e.charAt(0)=="-"){e=e.substr(1,e.length);var t=N.dependencies(e);k(t,function(e){var t={prefix:"plugins/",resource:e,suffix:"/plugin"+r+".js"};e=N.createUrl(t,e),N.load(e.resource,e)})}else N.load(e,{prefix:"plugins/",resource:e,suffix:"/plugin"+r+".js"})}),n.loadQueue(function(){e.removed||e.init()})}var e=this,t=e.settings,n=e.id,r=e.suffix;if(!_.domLoaded){x.bind(window,"ready",i);return}if(!e.getElement())return;if(!b.contentEditable)return;t.inline?e.inline=!0:(e.orgVisibility=e.getElement().style.visibility,e.getElement().style.visibility="hidden");var s=e.getElement().form||x.getParent(n,"form");s&&(e.formElement=s,t.hidden_input&&!/TEXTAREA|INPUT/i.test(e.getElement().nodeName)&&(x.insertAfter(x.create("input",{type:"hidden",name:n}),n),e.hasHiddenInput=!0),e.formEventDelegate=function(t){e.fire(t.type,t)},x.bind(s,"submit reset",e.formEventDelegate),e.on("reset",function(){e.setContent(e.startContent,{format:"raw"})}),t.submit_patch&&!s.submit.nodeType&&!s.submit.length&&!s._mceOldSubmit&&(s._mceOldSubmit=s.submit,s.submit=function(){return e.editorManager.triggerSave(),e.isNotDirty=!0,s._mceOldSubmit(s)})),e.windowManager=new v(e),t.encoding=="xml"&&e.on("GetContent",function(e){e.save&&(e.content=x.encode(e.content))}),t.add_form_submit_trigger&&e.on("submit",function(){e.initialized&&e.save()}),t.add_unload_trigger&&(e._beforeUnload=function(){e.initialized&&!e.destroyed&&!e.isHidden()&&e.save({format:"raw",no_events:!0,set_dirty:!1})},e.editorManager.on("BeforeUnload",e._beforeUnload)),o()},init:function(){function v(t){var n=N.get(t),r,i;r=N.urls[t]||e.documentBaseUrl.replace(/\/$/,""),t=O(t),n&&A(d,t)===-1&&(k(N.dependencies(t),function(e){v(e)}),i=new n(e,r),e.plugins[t]=i,i.init&&(i.init(e,r),d.push(t)))}var e=this,t=e.settings,n=e.getElement(),r,i,s,o,u,a,f,l,c,h,p,d=[];e.rtl=this.editorManager.i18n.rtl,e.editorManager.add(e),t.aria_label=t.aria_label||x.getAttrib(n,"aria-label",e.getLang("aria.rich_text_area")),t.theme&&(typeof t.theme!="function"?(t.theme=t.theme.replace(/-/,""),a=T.get(t.theme),e.theme=new a(e,T.urls[t.theme]),e.theme.init&&e.theme.init(e,T.urls[t.theme]||e.documentBaseUrl.replace(/\/$/,""))):e.theme=t.theme),k(t.plugins.replace(/\-/g,"").split(/[ ,]/),v),t.render_ui&&e.theme&&(e.orgDisplay=n.style.display,typeof t.theme!="function"?(r=t.width||n.style.width||n.offsetWidth,i=t.height||n.style.height||n.offsetHeight,s=t.min_height||100,h=/^[0-9\.]+(|px)$/i,h.test(""+r)&&(r=Math.max(parseInt(r,10),100)),h.test(""+i)&&(i=Math.max(parseInt(i,10),s)),u=e.theme.renderUI({targetNode:n,width:r,height:i,deltaWidth:t.delta_width,deltaHeight:t.delta_height}),t.content_editable||(x.setStyles(u.sizeContainer||u.editorContainer,{wi2dth:r,h2eight:i}),i=(u.iframeHeight||i)+(typeof i=="number"?u.deltaHeight||0:""),i<s&&(i=s))):(u=t.theme(e,n),u.editorContainer.nodeType&&(u.editorContainer=u.editorContainer.id=u.editorContainer.id||e.id+"_parent"),u.iframeContainer.nodeType&&(u.iframeContainer=u.iframeContainer.id=u.iframeContainer.id||e.id+"_iframecontainer"),i=u.iframeHeight||n.offsetHeight),e.editorContainer=u.editorContainer),t.content_css&&k(L(t.content_css),function(t){e.contentCSS.push(e.documentBaseURI.toAbsolute(t))}),t.content_style&&e.contentStyles.push(t.content_style);if(t.content_editable)return n=o=u=null,e.initContentBody();e.iframeHTML=t.doctype+"<html><head>",t.document_base_url!=e.documentBaseUrl&&(e.iframeHTML+='<base href="'+e.documentBaseURI.getURI()+'" />'),!b.caretAfter&&t.ie7_compat&&(e.iframeHTML+='<meta http-equiv="X-UA-Compatible" content="IE=7" />'),e.iframeHTML+='<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';for(p=0;p<e.contentCSS.length;p++){var m=e.contentCSS[p];e.iframeHTML+='<link type="text/css" rel="stylesheet" href="'+m+'" />',e.loadedCSS[m]=!0}l=t.body_id||"tinymce",l.indexOf("=")!=-1&&(l=e.getParam("body_id","","hash"),l=l[e.id]||l),c=t.body_class||"",c.indexOf("=")!=-1&&(c=e.getParam("body_class","","hash"),c=c[e.id]||""),e.iframeHTML+='</head><body id="'+l+'" class="mce-content-body '+c+'" '+"onload=\"window.parent.tinymce.get('"+e.id+"').fire('load');\"><br></body></html>"
;var g='javascript:(function(){document.open();document.domain="'+document.domain+'";'+'var ed = window.parent.tinymce.get("'+e.id+'");document.write(ed.iframeHTML);'+"document.close();ed.initContentBody(true);})()";document.domain!=location.hostname&&(f=g),o=x.add(u.iframeContainer,"iframe",{id:e.id+"_ifr",src:f||'javascript:""',frameBorder:"0",allowTransparency:"true",title:e.editorManager.translate("Rich Text Area. Press ALT-F9 for menu. Press ALT-F10 for toolbar. Press ALT-0 for help"),style:{width:"100%",height:i,display:"block"}});if(P)try{e.getDoc()}catch(y){o.src=f=g}e.contentAreaContainer=u.iframeContainer,u.editorContainer&&(x.get(u.editorContainer).style.display=e.orgDisplay),x.get(e.id).style.display="none",x.setAttrib(e.id,"aria-hidden",!0),f||e.initContentBody(),n=o=u=null},initContentBody:function(t){var n=this,s=n.settings,h=x.get(n.id),p=n.getDoc(),d,v;s.inline||(n.getElement().style.visibility=n.orgVisibility),!t&&!s.content_editable&&(p.open(),p.write(n.iframeHTML),p.close()),s.content_editable&&(n.on("remove",function(){var e=this.getBody();x.removeClass(e,"mce-content-body"),x.removeClass(e,"mce-edit-focus"),x.setAttrib(e,"contentEditable",null)}),x.addClass(h,"mce-content-body"),n.contentDocument=p=s.content_document||document,n.contentWindow=s.content_window||window,n.bodyElement=h,s.content_document=s.content_window=null,s.root_name=h.nodeName.toLowerCase()),d=n.getBody(),d.disabled=!0,s.readonly||(n.inline&&x.getStyle(d,"position",true)=="static"&&(d.style.position="relative"),d.contentEditable=n.getParam("content_editable_state",!0)),d.disabled=!1,n.schema=new m(s),n.dom=new e(p,{keep_values:!0,url_converter:n.convertURL,url_converter_scope:n,hex_colors:s.force_hex_style_colors,class_filter:s.class_filter,update_styles:!0,root_element:s.content_editable?n.id:null,collect:s.content_editable,schema:n.schema,onSetAttrib:function(e){n.fire("SetAttrib",e)}}),n.parser=new g(s,n.schema),n.parser.addAttributeFilter("src,href,style,tabindex",function(e,t){var r=e.length,i,s=n.dom,o,u;while(r--)i=e[r],o=i.attr(t),u="data-mce-"+t,i.attributes.map[u]||(t==="style"?(o=s.serializeStyle(s.parseStyle(o),i.name),o.length||(o=null),i.attr(u,o),i.attr(t,o)):t==="tabindex"?(i.attr(u,o),i.attr(t,null)):i.attr(u,n.convertURL(o,t,i.name)))}),n.parser.addNodeFilter("script",function(e){var t=e.length,n;while(t--)n=e[t],n.attr("type","mce-"+(n.attr("type")||"no/type"))}),n.parser.addNodeFilter("#cdata",function(e){var t=e.length,n;while(t--)n=e[t],n.type=8,n.name="#comment",n.value="[CDATA["+n.value+"]]"}),n.parser.addNodeFilter("p,h1,h2,h3,h4,h5,h6,div",function(e){var t=e.length,i,s=n.schema.getNonEmptyElements();while(t--)i=e[t],i.isEmpty(s)&&(i.empty().append(new r("br",1)).shortEnded=!0)}),n.serializer=new i(s,n),n.selection=new o(n.dom,n.getWin(),n.serializer,n),n.formatter=new u(n),n.undoManager=new a(n),n.forceBlocks=new l(n),n.enterKey=new f(n),n.editorCommands=new c(n),n.fire("PreInit"),!s.browser_spellcheck&&!s.gecko_spellcheck&&(p.body.spellcheck=!1,x.setAttrib(d,"spellcheck","false")),n.fire("PostRender"),n.quirks=y(n),s.directionality&&(d.dir=s.directionality),s.nowrap&&(d.style.whiteSpace="nowrap"),s.protect&&n.on("BeforeSetContent",function(e){k(s.protect,function(t){e.content=e.content.replace(t,function(e){return"<!--mce:protected "+escape(e)+"-->"})})}),n.on("SetContent",function(){n.addVisual(n.getBody())}),s.padd_empty_editor&&n.on("PostProcess",function(e){e.content=e.content.replace(/^(<p[^>]*>(&nbsp;|&#160;|\s|\u00a0|)<\/p>[\r\n]*|<br \/>[\r\n]*)$/,"")}),n.load({initial:!0,format:"html"}),n.startContent=n.getContent({format:"raw"}),n.initialized=!0,n.bindPendingEventDelegates(),n.fire("init"),n.focus(!0),n.nodeChanged({initial:!0}),n.execCallback("init_instance_callback",n),n.contentStyles.length>0&&(v="",k(n.contentStyles,function(e){v+=e+"\r\n"}),n.dom.addStyle(v)),k(n.contentCSS,function(e){n.loadedCSS[e]||(n.dom.loadCSS(e),n.loadedCSS[e]=!0)}),s.auto_focus&&setTimeout(function(){var e=n.editorManager.get(s.auto_focus);e.selection.select(e.getBody(),1),e.selection.collapse(1),e.getBody().focus(),e.getWin().focus()},100),h=p=d=null},focus:function(e){var t,n=this,r=n.selection,i=n.settings.content_editable,s,o,u=n.getDoc(),a;if(!e){s=r.getRng(),s.item&&(o=s.item(0)),n._refreshContentEditable(),i||(b.opera||n.getBody().focus(),n.getWin().focus());if(D||i){a=n.getBody();if(a.setActive)try{a.setActive()}catch(f){a.focus()}else a.focus();i&&r.normalize()}o&&o.ownerDocument==u&&(s=u.body.createControlRange(),s.addElement(o),s.select())}n.editorManager.activeEditor!=n&&((t=n.editorManager.activeEditor)&&t.fire("deactivate",{relatedTarget:n}),n.fire("activate",{relatedTarget:t})),n.editorManager.activeEditor=n},execCallback:function(e){var t=this,n=t.settings[e],r;if(!n)return;return t.callbackLookup&&(r=t.callbackLookup[e])&&(n=r.func,r=r.scope),typeof n=="string"&&(r=n.replace(/\.\w+$/,""),r=r?M(r):0,n=M(n),t.callbackLookup=t.callbackLookup||{},t.callbackLookup[e]={func:n,scope:r}),n.apply(r||t,Array.prototype.slice.call(arguments,1))},translate:function(e){var t=this.settings.language||"en",n=this.editorManager.i18n;return e?n.data[t+"."+e]||e.replace(/\{\#([^\}]+)\}/g,function(e,r){return n.data[t+"."+r]||"{#"+r+"}"}):""},getLang:function(e,n){return this.editorManager.i18n.data[(this.settings.language||"en")+"."+e]||(n!==t?n:"{#"+e+"}")},getParam:function(e,t,n){var r=e in this.settings?this.settings[e]:t,i;return n==="hash"?(i={},typeof r=="string"?k(r.indexOf("=")>0?r.split(/[;,](?![^=;,]*(?:[;,]|$))/):r.split(","),function(e){e=e.split("="),e.length>1?i[O(e[0])]=O(e[1]):i[O(e[0])]=O(e)}):i=r,i):r},nodeChanged:function(e){var t=this,n=t.selection,r,i,s;t.initialized&&!t.settings.disable_nodechange&&!t.settings.readonly&&(s=t.getBody(),r=n.getStart()||s,r=P&&r.ownerDocument!=t.getDoc()?t.getBody():r,r.nodeName=="IMG"&&n.isCollapsed()&&(r=r.parentNode),i=[],t.dom.getParent(r,function(e){if(e===s)return!0;i.push(e)}),e=e||{},e.element=r,e.parents=i,t.fire("NodeChange",e))},addButton:function(e,t){var n=this;t.cmd&&(t.onclick=function(){n.execCommand(t.cmd)}),!t.text&&!t.icon&&(t.icon=e),n.buttons=n.buttons||{},t.tooltip=t.tooltip||t.title,n.buttons[e]=t},addMenuItem:function(e,t){var n=this;t.cmd&&(t.onclick=function(){n.execCommand(t.cmd)}),n.menuItems=n.menuItems||{},n.menuItems[e]=t},addCommand:function(e,t,n){this.execCommands[e]={func:t,scope:n||this}},addQueryStateHandler:function(e,t,n){this.queryStateCommands[e]={func:t,scope:n||this}},addQueryValueHandler:function(e,t,n){this.queryValueCommands[e]={func:t,scope:n||this}},addShortcut:function(e,t,n,r){this.shortcuts.add(e,t,n,r)},execCommand:function(e,t,n,r){var i=this,s=0,o;!/^(mceAddUndoLevel|mceEndUndoLevel|mceBeginUndoLevel|mceRepaint)$/.test(e)&&(!r||!r.skip_focus)&&i.focus(),r=C({},r),r=i.fire("BeforeExecCommand",{command:e,ui:t,value:n});if(r.isDefaultPrevented())return!1;if(o=i.execCommands[e])if(o.func.call(o.scope,t,n)!==!0)return i.fire("ExecCommand",{command:e,ui:t,value:n}),!0;k(i.plugins,function(r){if(r.execCommand&&r.execCommand(e,t,n))return i.fire("ExecCommand",{command:e,ui:t,value:n}),s=!0,!1});if(s)return s;if(i.theme&&i.theme.execCommand&&i.theme.execCommand(e,t,n))return i.fire("ExecCommand",{command:e,ui:t,value:n}),!0;if(i.editorCommands.execCommand(e,t,n))return i.fire("ExecCommand",{command:e,ui:t,value:n}),!0;try{s=i.getDoc().execCommand(e,t,n)}catch(u){}return s?(i.fire("ExecCommand",{command:e,ui:t,value:n}),!0):!1},queryCommandState:function(e){var t=this,n,r;if(t._isHidden())return;if(n=t.queryStateCommands[e]){r=n.func.call(n.scope);if(r===!0||r===!1)return r}r=t.editorCommands.queryCommandState(e);if(r!==-1)return r;try{return t.getDoc().queryCommandState(e)}catch(i){}},queryCommandValue:function(e){var n=this,r,i;if(n._isHidden())return;if(r=n.queryValueCommands[e]){i=r.func.call(r.scope);if(i!==!0)return i}i=n.editorCommands.queryCommandValue(e);if(i!==t)return i;try{return n.getDoc().queryCommandValue(e)}catch(s){}},show:function(){var e=this;e.hidden&&(e.hidden=!1,e.inline?e.getBody().contentEditable=!0:(x.show(e.getContainer()),x.hide(e.id)),e.load(),e.fire("show"))},hide:function(){var e=this,t=e.getDoc();e.hidden||(P&&t&&!e.inline&&t.execCommand("SelectAll"),e.save(),e.inline?(e.getBody().contentEditable=!1,e==e.editorManager.focusedEditor&&(e.editorManager.focusedEditor=null)):(x.hide(e.getContainer()),x.setStyle(e.id,"display",e.orgDisplay)),e.hidden=!0,e.fire("hide"))},isHidden:function(){return!!this.hidden},setProgressState:function(e,t){this.fire("ProgressState",{state:e,time:t})},load:function(e){var n=this,r=n.getElement(),i;if(r)return e=e||{},e.load=!0,i=n.setContent(r.value!==t?r.value:r.innerHTML,e),e.element=r,e.no_events||n.fire("LoadContent",e),e.element=r=null,i},save:function(e){var t=this,n=t.getElement(),r,i;if(!n||!t.initialized)return;return e=e||{},e.save=!0,e.element=n,r=e.content=t.getContent(e),e.no_events||t.fire("SaveContent",e),r=e.content,/TEXTAREA|INPUT/i.test(n.nodeName)?n.value=r:(t.inline||(n.innerHTML=r),(i=x.getParent(t.id,"form"))&&k(i.elements,function(e){if(e.name==t.id)return e.value=r,!1})),e.element=n=null,e.set_dirty!==!1&&(t.isNotDirty=!0),r},setContent:function(e,t){var n=this,r=n.getBody(),i;return t=t||{},t.format=t.format||"html",t.set=!0,t.content=e,t.no_events||n.fire("BeforeSetContent",t),e=t.content,e.length===0||/^\s+$/.test(e)?(i=n.settings.forced_root_block,i&&n.schema.isValidChild(r.nodeName.toLowerCase(),i.toLowerCase())?(e=P&&P<11?"":'<br data-mce-bogus="1">',e=n.dom.createHTML(i,n.settings.forced_root_block_attrs,e)):P||(e='<br data-mce-bogus="1">'),r.innerHTML=e,n.fire("SetContent",t)):(t.format!=="raw"&&(e=(new s({},n.schema)).serialize(n.parser.parse(e,{isRootContent:!0}))),t.content=O(e),n.dom.setHTML(r,t.content),t.no_events||n.fire("SetContent",t)),t.content},getContent:function(e){var t=this,n,r=t.getBody();return e=e||{},e.format=e.format||"html",e.get=!0,e.getInner=!0,e.no_events||t.fire("BeforeGetContent",e),e.format=="raw"?n=r.innerHTML:e.format=="text"?n=r.innerText||r.textContent:n=t.serializer.serialize(r,e),e.format!="text"?e.content=O(n):e.content=n,e.no_events||t.fire("GetContent",e),e.content},insertContent:function(e,t){t&&(e=C({content:e},t)),this.execCommand("mceInsertContent",!1,e)},isDirty:function(){return!this.isNotDirty},getContainer:function(){var e=this;return e.container||(e.container=x.get(e.editorContainer||e.id+"_parent")),e.container},getContentAreaContainer:function(){return this.contentAreaContainer},getElement:function(){return x.get(this.settings.content_element||this.id)},getWin:function(){var e=this,t;return e.contentWindow||(t=x.get(e.id+"_ifr"),t&&(e.contentWindow=t.contentWindow)),e.contentWindow},getDoc:function(){var e=this,t;return e.contentDocument||(t=e.getWin(),t&&(e.contentDocument=t.document)),e.contentDocument},getBody:function(){return this.bodyElement||this.getDoc().body},convertURL:function(e,t,n){var r=this,i=r.settings;return i.urlconverter_callback?r.execCallback("urlconverter_callback",e,n,!0,t):!i.convert_urls||n&&n.nodeName=="LINK"||e.indexOf("file:")===0||e.length===0?e:i.relative_urls?r.documentBaseURI.toRelative(e):(e=r.documentBaseURI.toAbsolute(e,i.remove_script_host),e)},addVisual:function(e){var n=this,r=n.settings,i=n.dom,s;e=e||n.getBody(),n.hasVisual===t&&(n.hasVisual=r.visual),k(i.select("table,a",e),function(e){var t;switch(e.nodeName){case"TABLE":s=r.visual_table_class||"mce-item-table",t=i.getAttrib(e,"border");if(!t||t=="0")n.hasVisual?i.addClass(e,s):i.removeClass(e,s);return;case"A":i.getAttrib(e,"href",!1)||(t=i.getAttrib(e,"name")||e.id,s=r.visual_anchor_class||"mce-item-anchor",t&&(n.hasVisual?i.addClass(e,s):i.removeClass(e,s)));return}}),n.fire("VisualAid",{element:e,hasVisual:n.hasVisual})},remove:function(){var e=this;if(!e.removed){e.save(),e.removed=1,e.hasHiddenInput&&x.remove(e.getElement().nextSibling),e.inline||(P&&P<10&&e.getDoc().execCommand("SelectAll",!1,null),x.setStyle(e.id,"display",e.orgDisplay),e.getBody().onload=null,_.unbind(e.getWin()),_.unbind(e.getDoc()));var t=e.getContainer();_.unbind(e.getBody()),_.unbind(t),e.fire("remove"),e.editorManager.remove(e),x.remove(t),e.destroy()}},destroy:function(e){var t=this,n;if(t.destroyed)return;if(!e&&!t.removed){t.remove();return}e&&D&&(_.unbind(t.getDoc()),_.unbind(t.getWin()),_.unbind(t.getBody())),e||(t.editorManager.off("beforeunload",t._beforeUnload),t.theme&&t.theme.destroy&&t.theme.destroy(),t.selection.destroy(),t.dom.destroy()),n=t.formElement,n&&(n._mceOldSubmit&&(n.submit=n._mceOldSubmit,n._mceOldSubmit=null),x.unbind(n,"submit reset",t.formEventDelegate)),t.contentAreaContainer=t.formElement=t.container=t.editorContainer=null,t.settings.content_element=t.bodyElement=t.contentDocument=t.contentWindow=null,t.selection&&(t.selection=t.selection.win=t.selection.dom=t.selection.dom.doc=null),t.destroyed=1},_refreshContentEditable:function(){var e=this,t,n;e._isHidden()&&(t=e.getBody(),n=t.parentNode,n.removeChild(t),n.appendChild(t),t.focus())},_isHidden:function(){var e;return D?(e=this.selection.getSel(),!e||!e.rangeCount||e.rangeCount===0):0}},C(H.prototype,E),H}),i("tinymce/util/I18n",[],function(){var e={};return{rtl:!1,add:function(t,n){for(var r in n)e[r]=n[r];this.rtl=this.rtl||e._dir==="rtl"},translate:function(t){if(typeof t=="undefined")return t;if(typeof t!="string"&&t.raw)return t.raw;if(t.push){var n=t.slice(1);t=(e[t[0]]||t[0]).replace(/\{([^\}]+)\}/g,function(e,t){return n[t]})}return e[t]||t},data:e}}),i("tinymce/FocusManager",["tinymce/dom/DOMUtils","tinymce/Env"],function(e,t){function o(e){function u(){try{return document.activeElement}catch(e){return document.body}}function a(e,t){if(t&&t.startContainer){if(!e.isChildOf(t.startContainer,e.getRoot())||!e.isChildOf(t.endContainer,e.getRoot()))return;return{startContainer:t.startContainer,startOffset:t.startOffset,endContainer:t.endContainer,endOffset:t.endOffset}}return t}function f(e,t){var n;return t.startContainer?(n=e.getDoc().createRange(),n.setStart(t.startContainer,t.startOffset),n.setEnd(t.endContainer,t.endOffset)):n=t,n}function l(e){return!!s.getParent(e,o.isEditorUIElement)}function c(o){var c=o.editor;c.on("init",function(){if(c.inline||t.ie)c.on("nodechange keyup",function(){var e=document.activeElement;e&&e.id==c.id+"_ifr"&&(e=c.getBody()),c.dom.isChildOf(e,c.getBody())&&(c.lastRng=c.selection.getRng())}),t.webkit&&!n&&(n=function(){var t=e.activeEditor;if(t&&t.selection){var n=t.selection.getRng();n&&!n.collapsed&&(c.lastRng=n)}},s.bind(document,"selectionchange",n))}),c.on("setcontent",function(){c.lastRng=null}),c.on("mousedown",function(){c.selection.lastFocusBookmark=null}),c.on("focusin",function(){var t=e.focusedEditor;c.selection.lastFocusBookmark&&(c.selection.setRng(f(c,c.selection.lastFocusBookmark)),c.selection.lastFocusBookmark=null),t!=c&&(t&&t.fire("blur",{focusedEditor:c}),e.activeEditor=c,e.focusedEditor=c,c.fire("focus",{blurredEditor:t}),c.focus(!0)),c.lastRng=null}),c.on("focusout",function(){window.setTimeout(function(){var t=e.focusedEditor;!l(u())&&t==c&&(c.fire("blur",{focusedEditor:null}),e.focusedEditor=null,c.selection&&(c.selection.lastFocusBookmark=null))},0)}),r||(r=function(t){var n=e.activeEditor;n&&t.target.ownerDocument==document&&(n.selection&&(n.selection.lastFocusBookmark=a(n.dom,n.lastRng)),!l(t.target)&&e.focusedEditor==n&&(n.fire("blur",{focusedEditor:null}),e.focusedEditor=null))},s.bind(document,"focusin",r)),c.inline&&!i&&(i=function(t){var n=e.activeEditor;if(n.inline&&!n.dom.isChildOf(t.target,n.getBody())){var r=n.selection.getRng();r.collapsed||(n.lastRng=r)}},s.bind(document,"mouseup",i))}function h(t){e.focusedEditor==t.editor&&(e.focusedEditor=null),e.activeEditor||(s.unbind(document,"selectionchange",n),s.unbind(document,"focusin",r),s.unbind(document,"mouseup",i),n=r=i=null)}e.on("AddEditor",c),e.on("RemoveEditor",h)}var n,r,i,s=e.DOM;return o.isEditorUIElement=function(e){return e.className.toString().indexOf("mce-")!==-1},o}),i("tinymce/EditorManager",["tinymce/Editor","tinymce/dom/DOMUtils","tinymce/util/URI","tinymce/Env","tinymce/util/Tools","tinymce/util/Observable","tinymce/util/I18n","tinymce/FocusManager"],function(e,t,n,r,i,s,o,u){function v(e){var t=d.editors,n;delete t[e.id];for(var r=0;r<t.length;r++)if(t[r]==e){t.splice(r,1),n=!0;break}return d.activeEditor==e&&(d.activeEditor=t[0]),d.focusedEditor==e&&(d.focusedEditor=null),n}function m(e){return e&&!(e.getContainer()||e.getBody()).parentNode&&(v(e),e.destroy(!0),e=null),e}var a=t.DOM,f=i.explode,l=i.each,c=i.extend,h=0,p,d;return d={majorVersion:"4",minorVersion:"0.29",releaseDate:"2014-06-xx",editors:[],i18n:o,activeEditor:null,setup:function(){var e=this,t,r,i="",s,o;r=document.location.href,/^[^:]+:\/\/\/?[^\/]+\//.test(r)&&(r=r.replace(/[\?#].*$/,"").replace(/[\/\\][^\/]+$/,""),/[\/\\]$/.test(r)||(r+="/")),s=window.tinymce||window.tinyMCEPreInit;if(s)t=s.base||s.baseURL,i=s.suffix;else{var a=document.getElementsByTagName("script");for(var f=0;f<a.length;f++){o=a[f].src;if(/tinymce(\.full|\.jquery|)(\.min|\.dev|)\.js/.test(o)){o.indexOf(".min")!=-1&&(i=".min"),t=o.substring(0,o.lastIndexOf("/"));break}}!t&&document.currentScript&&(o=document.currentScript.src,o.indexOf(".min")!=-1&&(i=".min"),t=o.substring(0,o.lastIndexOf("/")))}e.baseURL=(new n(r)).toAbsolute(t),e.documentBaseURL=r,e.baseURI=new n(e.baseURL),e.suffix=i,e.focusManager=new u(e)},init:function(t){function s(e){var t=e.id;return t||(t=e.name,t&&!a.get(t)?t=e.name:t=a.uniqueId(),e.setAttribute("id",t)),t}function o(t,i){if(!m(n.get(t))){var s=new e(t,i,n);r.push(s),s.render()}}function u(e,t,n){var r=e[t];if(!r)return;return r.apply(n||this,Array.prototype.slice.call(arguments,2))}function p(e,t){return t.constructor===RegExp?t.test(e.className):a.hasClass(e,t)}function d(){var v,m;a.unbind(window,"ready",d),u(t,"onpageload");if(t.types){l(t.types,function(e){l(a.select(e.selector),function(n){o(s(n),c({},t,e))})});return}if(t.selector){l(a.select(t.selector),function(e){o(s(e),t)});return}switch(t.mode){case"exact":v=t.elements||"",v.length>0&&l(f(v),function(s){a.get(s)?(i=new e(s,t,n),r.push(i),i.render()):l(document.forms,function(e){l(e.elements,function(e){e.name===s&&(s="mce_editor_"+h++,a.setAttrib(e,"id",s),o(s,t))})})});break;case"textareas":case"specific_textareas":l(a.select("textarea"),function(e){if(t.editor_deselector&&p(e,t.editor_deselector))return;(!t.editor_selector||p(e,t.editor_selector))&&o(s(e),t)})}t.oninit&&(v=m=0,l(r,function(e){m++,e.initialized?v++:e.on("init",function(){v++,v==m&&u(t,"oninit")}),v==m&&u(t,"oninit")}))}var n=this,r=[],i;n.settings=t,a.bind(window,"ready",d)},get:function(e){return arguments.length?e in this.editors?this.editors[e]:null:this.editors},add:function(e){var t=this,n=t.editors;return n[e.id]=e,n.push(e),t.activeEditor=e,t.fire("AddEditor",{editor:e}),p||(p=function(){t.fire("BeforeUnload")},a.bind(window,"beforeunload",p)),e},createEditor:function(t,n){return this.add(new e(t,n,this))},remove:function(e){var t=this,n,r=t.editors,i;if(!e){for(n=r.length-1;n>=0;n--)t.remove(r[n]);return}if(typeof e=="string"){e=e.selector||e,l(a.select(e),function(e){t.remove(r[e.id])});return}return i=e,r[i.id]?(v(i)&&t.fire("RemoveEditor",{editor:i}),r.length||a.unbind(window,"beforeunload",p),i.remove(),i):null},execCommand:function(t,n,r){var i=this,s=i.get(r);switch(t){case"mceAddEditor":return i.get(r)||(new e(r,i.settings,i)).render(),!0;case"mceRemoveEditor":return s&&s.remove(),!0;case"mceToggleEditor":if(!s)return i.execCommand("mceAddEditor",0,r),!0;return s.isHidden()?s.show():s.hide(),!0}return i.activeEditor?i.activeEditor.execCommand(t,n,r):!1},triggerSave:function(){l(this.editors,function(e){e.save()})},addI18n:function(e,t){o.add(e,t)},translate:function(e){return o.translate(e)}},c(d,s),d.setup(),window.tinymce=window.tinyMCE=d,d}),i("tinymce/LegacyInput",["tinymce/EditorManager","tinymce/util/Tools"],function(e,t){var n=t.each,r=t.explode;e.on("AddEditor",function(e){var t=e.editor;t.on("preInit",function(){function u(e,t){n(t,function(t,n){t&&s.setStyle(e,n,t)}),s.rename(e,"span")}function a(r){s=t.dom,o.convert_fonts_to_spans&&n(s.select("font,u,strike",r.node),function(t){e[t.nodeName.toLowerCase()](s,t)})}var e,i,s,o=t.settings;o.inline_styles&&(i=r(o.font_size_legacy_values),e={font:function(e,t){u(t,{backgroundColor:t.style.backgroundColor,color:t.color,fontFamily:t.face,fontSize:i[parseInt(t.size,10)-1]})},u:function(e,t){u(t,{textDecoration:"underline"})},strike:function(e,t){u(t,{textDecoration:"line-through"})}},t.on("PreProcess SetContent",a))})})}),i("tinymce/util/XHR",[],function(){return{send:function(e){function r(){!e.async||t.readyState==4||n++>1e4?(e.success&&n<1e4&&t.status==200?e.success.call(e.success_scope,""+t.responseText,t,e):e.error&&e.error.call(e.error_scope,n>1e4?"TIMED_OUT":"GENERAL",t,e),t=null):setTimeout(r,10)}var t,n=0;e.scope=e.scope||this,e.success_scope=e.success_scope||e.scope,e.error_scope=e.error_scope||e.scope,e.async=e.async===!1?!1:!0,e.data=e.data||"",t=new XMLHttpRequest;if(t){t.overrideMimeType&&t.overrideMimeType(e.content_type),t.open(e.type||(e.data?"POST":"GET"),e.url,e.async),e.content_type&&t.setRequestHeader("Content-Type",e.content_type),t.setRequestHeader("X-Requested-With","XMLHttpRequest"),t.send(e.data);if(!e.async)return r();setTimeout(r,10)}}}}),i("tinymce/util/JSON",[],function(){function e(t,n){var r,i,s,o;n=n||'"';if(t===null)return"null";s=typeof t;if(s=="string")return i="\bb	t\nn\ff\rr\"\"''\\\\",n+t.replace(/([\u0080-\uFFFF\x00-\x1f\"\'\\])/g,function(e,t){return n==='"'&&e==="'"?e:(r=i.indexOf(t),r+1?"\\"+i.charAt(r+1):(e=t.charCodeAt().toString(16),"\\u"+"0000".substring(e.length)+e))})+n;if(s=="object"){if(t.hasOwnProperty&&Object.prototype.toString.call(t)==="[object Array]"){for(r=0,i="[";r<t.length;r++)i+=(r>0?",":"")+e(t[r],n);return i+"]"}i="{";for(o in t)t.hasOwnProperty(o)&&(i+=typeof t[o]!="function"?(i.length>1?","+n:n)+o+n+":"+e(t[o],n):"");return i+"}"}return""+t}return{serialize:e,parse:function(e){try{return window[String.fromCharCode(101)+"val"]("("+e+")")}catch(t){}}}}),i("tinymce/util/JSONRequest",["tinymce/util/JSON","tinymce/util/XHR","tinymce/util/Tools"],function(e,t,n){function i(e){this.settings=r({},e),this.count=0}var r=n.extend;return i.sendRPC=function(e){return(new i).send(e)},i.prototype={send:function(n){var i=n.error,s=n.success;n=r(this.settings,n),n.success=function(t,r){t=e.parse(t),typeof t=="undefined"&&(t={error:"JSON Parse error."}),t.error?i.call(n.error_scope||n.scope,t.error,r):s.call(n.success_scope||n.scope,t.result)},n.error=function(e,t){i&&i.call(n.error_scope||n.scope,e,t)},n.data=e.serialize({id:n.id||"c"+this.count++,method:n.method,params:n.params}),n.content_type="application/json",t.send(n)}},i}),i("tinymce/util/JSONP",["tinymce/dom/DOMUtils"],function(e){return{callbacks:{},count:0,send:function(n){var r=this,i=e.DOM,s=n.count!==t?n.count:r.count,o="tinymce_jsonp_"+s;r.callbacks[s]=function(e){i.remove(o),delete r.callbacks[s],n.callback(e)},i.add(i.doc.body,"script",{id:o,src:n.url,type:"text/javascript"}),r.count++}}}),i("tinymce/util/LocalStorage",[],function(){function a(){i=[];for(var t in r)i.push(t);e.length=i.length}function f(){function l(e){var n,r;return r=e!==t?f+e:i.indexOf(",",f),r===-1||r>i.length?null:(n=i.substring(f,r),f=r+1,n)}var e,i,u,f=0;r={};if(!o)return;n.load(s),i=n.getAttribute(s)||"";do{var c=l();if(c===null)break;e=l(parseInt(c,32)||0);if(e!==null){c=l();if(c===null)break;u=l(parseInt(c,32)||0),e&&(r[e]=u)}}while(e!==null);a()}function l(){var e,t="";if(!o)return;for(var i in r)e=r[i],t+=(t?",":"")+i.length.toString(32)+","+i+","+e.length.toString(32)+","+e;n.setAttribute(s,t);try{n.save(s)}catch(u){}a()}var e,n,r,i,s,o;try{if(window.localStorage)return localStorage}catch(u){}return s="tinymce",n=document.documentElement,o=!!n.addBehavior,o&&n.addBehavior("#default#userData"),e={key:function(e){return i[e]},getItem:function(e){return e in r?r[e]:null},setItem:function(e,t){r[e]=""+t,l()},removeItem:function(e){delete r[e],l()},clear:function(){r={},l()}},f(),e}),i("tinymce/Compat",["tinymce/dom/DOMUtils","tinymce/dom/EventUtils","tinymce/dom/ScriptLoader","tinymce/AddOnManager","tinymce/util/Tools","tinymce/Env"],function(e,t,n,r,i,s){var o=window.tinymce;return o.DOM=e.DOM,o.ScriptLoader=n.ScriptLoader,o.PluginManager=r.PluginManager,o.ThemeManager=r.ThemeManager,o.dom=o.dom||{},o.dom.Event=t.Event,i.each(i,function(e,t){o[t]=e}),i.each("isOpera isWebKit isIE isGecko isMac".split(" "),function(e){o[e]=s[e.substr(2).toLowerCase()]}),{}}),i("tinymce/ui/Layout",["tinymce/util/Class","tinymce/util/Tools"],function(e,t){return e.extend({Defaults:{firstControlClass:"first",lastControlClass:"last"},init:function(e){this.settings=t.extend({},this.Defaults,e)},preRender:function(e){e.addClass(this.settings.containerClass,"body")},applyClasses:function(e){var t=this,n=t.settings,r,i,s;r=e.items().filter(":visible"),i=n.firstControlClass,s=n.lastControlClass,r.each(function(e){e.removeClass(i).removeClass(s),n.controlClass&&e.addClass(n.controlClass)}),r.eq(0).addClass(i),r.eq(-1).addClass(s)},renderHtml:function(e){var t=this,n=t.settings,r,i="";return r=e.items(),r.eq(0).addClass(n.firstControlClass),r.eq(-1).addClass(n.lastControlClass),r.each(function(e){n.controlClass&&e.addClass(n.controlClass),i+=e.renderHtml()}),i},recalc:function(){},postRender:function(){}})}),i("tinymce/ui/AbsoluteLayout",["tinymce/ui/Layout"],function(e){return e.extend({Defaults:{containerClass:"abs-layout",controlClass:"abs-layout-item"},recalc:function(e){e.items().filter(":visible").each(function(e){var t=e.settings;e.layoutRect({x:t.x,y:t.y,w:t.w,h:t.h}),e.recalc&&e.recalc()})},renderHtml:function(e){return'<div id="'+e._id+'-absend" class="'+e.classPrefix+'abs-end"></div>'+this._super(e)}})}),i("tinymce/ui/Tooltip",["tinymce/ui/Control","tinymce/ui/Movable"],function(e,t){return e.extend({Mixins:[t],Defaults:{classes:"widget tooltip tooltip-n"},text:function(e){var t=this;return typeof e!="undefined"?(t._value=e,t._rendered&&(t.getEl().lastChild.innerHTML=t.encode(e)),t):t._value},renderHtml:function(){var e=this,t=e.classPrefix;return'<div id="'+e._id+'" class="'+e.classes()+'" role="presentation">'+'<div class="'+t+'tooltip-arrow"></div>'+'<div class="'+t+'tooltip-inner">'+e.encode(e._text)+"</div>"+"</div>"},repaint:function(){var e=this,t,n;t=e.getEl().style,n=e._layoutRect,t.left=n.x+"px",t.top=n.y+"px",t.zIndex=131070}})}),i("tinymce/ui/Widget",["tinymce/ui/Control","tinymce/ui/Tooltip"],function(e,t){var n,r=e.extend({init:function(e){var t=this;t._super(e),e=t.settings,t.canFocus=!0,e.tooltip&&r.tooltips!==!1&&(t.on("mouseenter",function(n){var r=t.tooltip().moveTo(-65535);if(n.control==t){var i=r.text(e.tooltip).show().testMoveRel(t.getEl(),["bc-tc","bc-tl","bc-tr"]);r.toggleClass("tooltip-n",i=="bc-tc"),r.toggleClass("tooltip-nw",i=="bc-tl"),r.toggleClass("tooltip-ne",i=="bc-tr"),r.moveRel(t.getEl(),i)}else r.hide()}),t.on("mouseleave mousedown click",function(){t.tooltip().hide()})),t.aria("label",e.ariaLabel||e.tooltip)},tooltip:function(){return n||(n=new t({type:"tooltip"}),n.renderTo()),n},active:function(e){var t=this,n;return e!==n&&(t.aria("pressed",e),t.toggleClass("active",e)),t._super(e)},disabled:function(e){var t=this,n;return e!==n&&(t.aria("disabled",e),t.toggleClass("disabled",e)),t._super(e)},postRender:function(){var e=this,t=e.settings;e._rendered=!0,e._super(),!e.parent()&&(t.width||t.height)&&(e.initLayoutRect(),e.repaint()),t.autofocus&&e.focus()},remove:function(){this._super(),n&&(n.remove(),n=null)}});return r}),i("tinymce/ui/Button",["tinymce/ui/Widget"],function(e){return e.extend({Defaults:{classes:"widget btn",role:"button"},init:function(e){var t=this,n;t.on("click mousedown",function(e){e.preventDefault()}),t._super(e),n=e.size,e.subtype&&t.addClass(e.subtype),n&&t.addClass("btn-"+n)},icon:function(e){var t=this,n=t.classPrefix;if(typeof e=="undefined")return t.settings.icon;t.settings.icon=e,e=e?n+"ico "+n+"i-"+t.settings.icon:"";if(t._rendered){var r=t.getEl().firstChild,i=r.getElementsByTagName("i")[0];if(e){if(!i||i!=r.firstChild)i=document.createElement("i"),r.insertBefore(i,r.firstChild);i.className=e}else i&&r.removeChild(i);t.text(t._text)}return t},repaint:function(){var e=this.getEl().firstChild.style;e.width=e.height="100%",this._super()},text:function(e){var t=this;if(t._rendered){var n=t.getEl().lastChild.lastChild;n&&(n.data=t.translate(e))}return t._super(e)},renderHtml:function(){var e=this,t=e._id,n=e.classPrefix,r=e.settings.icon,i;return i=e.settings.image,i?(r="none",typeof i!="string"&&(i=window.getSelection?i[0]:i[1]),i=" style=\"background-image: url('"+i+"')\""):i="",r=e.settings.icon?n+"ico "+n+"i-"+r:"",'<div id="'+t+'" class="'+e.classes()+'" tabindex="-1" aria-labelledby="'+t+'">'+'<button role="presentation" type="button" tabindex="-1">'+(r?'<i class="'+r+'"'+i+"></i>":"")+(e._text?(r?" ":"")+e.encode(e._text):"")+"</button>"+"</div>"}})}),i("tinymce/ui/ButtonGroup",["tinymce/ui/Container"],function(e){return e.extend({Defaults:{defaultType:"button",role:"group"},renderHtml:function(){var e=this,t=e._layout;return e.addClass("btn-group"),e.preRender(),t.preRender(e),'<div id="'+e._id+'" class="'+e.classes()+'">'+'<div id="'+e._id+'-body">'+(e.settings.html||"")+t.renderHtml(e)+"</div>"+"</div>"}})}),i("tinymce/ui/Checkbox",["tinymce/ui/Widget"],function(e){return e.extend({Defaults:{classes:"checkbox",role:"checkbox",checked:!1},init:function(e){var t=this;t._super(e),t.on("click mousedown",function(e){e.preventDefault()}),t.on("click",function(e){e.preventDefault(),t.disabled()||t.checked(!t.checked())}),t.checked(t.settings.checked)},checked:function(e){var t=this;return typeof e!="undefined"?(e?t.addClass("checked"):t.removeClass("checked"),t._checked=e,t.aria("checked",e),t):t._checked},value:function(e){return this.checked(e)},renderHtml:function(){var e=this,t=e._id,n=e.classPrefix;return'<div id="'+t+'" class="'+e.classes()+'" unselectable="on" aria-labelledby="'+t+'-al" tabindex="-1">'+'<i class="'+n+"ico "+n+'i-checkbox"></i>'+'<span id="'+t+'-al" class="'+n+'label">'+e.encode(e._text)+"</span>"+"</div>"}})}),i("tinymce/ui/ComboBox",["tinymce/ui/Widget","tinymce/ui/Factory","tinymce/ui/DomUtils"],function(e,t,n){return e.extend({init:function(e){var t=this;t._super(e),t.addClass("combobox"),t.subinput=!0,t.ariaTarget="inp",e=t.settings,e.menu=e.menu||e.values,e.menu&&(e.icon="caret"),t.on("click",function(n){var r=n.target,i=t.getEl();while(r&&r!=i)r.id&&r.id.indexOf("-open")!=-1&&(t.fire("action"),e.menu&&(t.showMenu(),n.aria&&t.menu.items()[0].focus())),r=r.parentNode}),t.on("keydown",function(e){e.target.nodeName=="INPUT"&&e.keyCode==13&&t.parents().reverse().each(function(n){e.preventDefault(),t.fire("change");if(n.hasEventListeners("submit")&&n.toJSON)return n.fire("submit",{data:n.toJSON()}),!1})}),e.placeholder&&(t.addClass("placeholder"),t.on("focusin",function(){t._hasOnChange||(n.on(t.getEl("inp"),"change",function(){t.fire("change")}),t._hasOnChange=!0),t.hasClass("placeholder")&&(t.getEl("inp").value="",t.removeClass("placeholder"))}),t.on("focusout",function(){t.value().length===0&&(t.getEl("inp").value=e.placeholder,t.addClass("placeholder"))}))},showMenu:function(){var e=this,n=e.settings,r;e.menu||(r=n.menu||[],r.length?r={type:"menu",items:r}:r.type=r.type||"menu",e.menu=t.create(r).parent(e).renderTo(e.getContainerElm()),e.fire("createmenu"),e.menu.reflow(),e.menu.on("cancel",function(t){t.control===e.menu&&e.focus()}),e.menu.on("show hide",function(t){t.control.items().each(function(t){t.active(t.value()==e.value())})}).fire("show"),e.menu.on("select",function(t){e.value(t.control.value())}),e.on("focusin",function(t){t.target.tagName.toUpperCase()=="INPUT"&&e.menu.hide()}),e.aria("expanded",!0)),e.menu.show(),e.menu.layoutRect({w:e.layoutRect().w}),e.menu.moveRel(e.getEl(),e.isRtl()?["br-tr","tr-br"]:["bl-tl","tl-bl"])},value:function(e){var t=this;return typeof e!="undefined"?(t._value=e,t.removeClass("placeholder"),t._rendered&&(t.getEl("inp").value=e),t):t._rendered?(e=t.getEl("inp").value,e!=t.settings.placeholder?e:""):t._value},disabled:function(e){var t=this;return t._rendered&&typeof e!="undefined"&&(t.getEl("inp").disabled=e),t._super(e)},focus:function(){this.getEl("inp").focus()},repaint:function(){var e=this,t=e.getEl(),r=e.getEl("open"),i=e.layoutRect(),s,o;r?s=i.w-n.getSize(r).width-10:s=i.w-10;var u=document;return u.all&&(!u.documentMode||u.documentMode<=8)&&(o=e.layoutRect().h-2+"px"),n.css(t.firstChild,{width:s,lineHeight:o}),e._super(),e},postRender:function(){var e=this;return n.on(this.getEl("inp"),"change",function(){e.fire("change")}),e._super
()},remove:function(){n.off(this.getEl("inp")),this._super()},renderHtml:function(){var e=this,t=e._id,n=e.settings,r=e.classPrefix,i=n.value||n.placeholder||"",s,o,u="",a="";"spellcheck"in n&&(a+=' spellcheck="'+n.spellcheck+'"'),n.maxLength&&(a+=' maxlength="'+n.maxLength+'"'),n.size&&(a+=' size="'+n.size+'"'),n.subtype&&(a+=' type="'+n.subtype+'"'),e.disabled()&&(a+=' disabled="disabled"'),s=n.icon,s&&s!="caret"&&(s=r+"ico "+r+"i-"+n.icon),o=e._text;if(s||o)u='<div id="'+t+'-open" class="'+r+"btn "+r+'open" tabIndex="-1" role="button">'+'<button id="'+t+'-action" type="button" hidefocus="1" tabindex="-1">'+(s!="caret"?'<i class="'+s+'"></i>':'<i class="'+r+'caret"></i>')+(o?(s?" ":"")+o:"")+"</button>"+"</div>",e.addClass("has-open");return'<div id="'+t+'" class="'+e.classes()+'">'+'<input id="'+t+'-inp" class="'+r+"textbox "+r+'placeholder" value="'+i+'" hidefocus="1"'+a+" />"+u+"</div>"}})}),i("tinymce/ui/ColorBox",["tinymce/ui/ComboBox"],function(e){return e.extend({init:function(e){var t=this;e.spellcheck=!1,e.icon="none",t._super(e),t.addClass("colorbox"),t.on("change keyup postrender",function(){t.repaintColor(t.value())})},repaintColor:function(e){this.getEl().getElementsByTagName("i")[0].style.background=e},value:function(e){var t=this;return typeof e!="undefined"&&t._rendered&&t.repaintColor(e),t._super(e)}})}),i("tinymce/ui/PanelButton",["tinymce/ui/Button","tinymce/ui/FloatPanel"],function(e,t){return e.extend({showPanel:function(){var e=this,n=e.settings;e.active(!0);if(!e.panel){var r=n.panel;r.type&&(r={layout:"grid",items:r}),r.role=r.role||"dialog",r.popover=!0,r.autohide=!0,r.ariaRoot=!0,e.panel=(new t(r)).on("hide",function(){e.active(!1)}).on("cancel",function(t){t.stopPropagation(),e.focus(),e.hidePanel()}).parent(e).renderTo(e.getContainerElm()),e.panel.fire("show"),e.panel.reflow()}else e.panel.show();e.panel.moveRel(e.getEl(),n.popoverAlign||(e.isRtl()?["bc-tr","bc-tc"]:["bc-tl","bc-tc"]))},hidePanel:function(){var e=this;e.panel&&e.panel.hide()},postRender:function(){var e=this;return e.aria("haspopup",!0),e.on("click",function(t){t.control===e&&(e.panel&&e.panel.visible()?e.hidePanel():(e.showPanel(),e.panel.focus(!!t.aria)))}),e._super()}})}),i("tinymce/ui/ColorButton",["tinymce/ui/PanelButton","tinymce/dom/DOMUtils"],function(e,t){var n=t.DOM;return e.extend({init:function(e){this._super(e),this.addClass("colorbutton")},color:function(e){return e?(this._color=e,this.getEl("preview").style.backgroundColor=e,this):this._color},renderHtml:function(){var e=this,t=e._id,n=e.classPrefix,r=e.settings.icon?n+"ico "+n+"i-"+e.settings.icon:"",i=e.settings.image?" style=\"background-image: url('"+e.settings.image+"')\"":"";return'<div id="'+t+'" class="'+e.classes()+'" role="button" tabindex="-1" aria-haspopup="true">'+'<button role="presentation" hidefocus="1" type="button" tabindex="-1">'+(r?'<i class="'+r+'"'+i+"></i>":"")+'<span id="'+t+'-preview" class="'+n+'preview"></span>'+(e._text?(r?" ":"")+e._text:"")+"</button>"+'<button type="button" class="'+n+'open" hidefocus="1" tabindex="-1">'+' <i class="'+n+'caret"></i>'+"</button>"+"</div>"},postRender:function(){var e=this,t=e.settings.onclick;return e.on("click",function(r){if(r.aria&&r.aria.key=="down")return;r.control==e&&!n.getParent(r.target,"."+e.classPrefix+"open")&&(r.stopImmediatePropagation(),t.call(e,r))}),delete e.settings.onclick,e._super()}})}),i("tinymce/util/Color",[],function(){function r(r){function a(r,i,s){var o,u,a,f,l,c;return o=0,u=0,a=0,r/=255,i/=255,s/=255,l=e(r,e(i,s)),c=t(r,t(i,s)),l==c?(a=l,{h:0,s:0,v:a}):(f=r==l?i-s:s==l?r-i:s-r,o=r==l?3:s==l?1:5,o=60*(o-f/(c-l)),u=(c-l)/c,a=c,{h:n(o),s:n(u*100),v:n(a*100)})}function f(r,i,a){var f,l,c,h;r=(parseInt(r,10)||0)%360,i=parseInt(i,10)/100,a=parseInt(a,10)/100,i=t(0,e(i,1)),a=t(0,e(a,1));if(i===0){s=o=u=n(255*a);return}f=r/60,l=a*i,c=l*(1-Math.abs(f%2-1)),h=a-l;switch(Math.floor(f)){case 0:s=l,o=c,u=0;break;case 1:s=c,o=l,u=0;break;case 2:s=0,o=l,u=c;break;case 3:s=0,o=c,u=l;break;case 4:s=c,o=0,u=l;break;case 5:s=l,o=0,u=c;break;default:s=o=u=0}s=n(255*(s+h)),o=n(255*(o+h)),u=n(255*(u+h))}function l(){function e(e){return e=parseInt(e,10).toString(16),e.length>1?e:"0"+e}return"#"+e(s)+e(o)+e(u)}function c(){return{r:s,g:o,b:u}}function h(){return a(s,o,u)}function p(e){var t;if(typeof e=="object")"r"in e?(s=e.r,o=e.g,u=e.b):"v"in e&&f(e.h,e.s,e.v);else if(t=/rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)[^\)]*\)/gi.exec(e))s=parseInt(t[1],10),o=parseInt(t[2],10),u=parseInt(t[3],10);else if(t=/#([0-F]{2})([0-F]{2})([0-F]{2})/gi.exec(e))s=parseInt(t[1],16),o=parseInt(t[2],16),u=parseInt(t[3],16);else if(t=/#([0-F])([0-F])([0-F])/gi.exec(e))s=parseInt(t[1]+t[1],16),o=parseInt(t[2]+t[2],16),u=parseInt(t[3]+t[3],16);return s=s<0?0:s>255?255:s,o=o<0?0:o>255?255:o,u=u<0?0:u>255?255:u,i}var i=this,s=0,o=0,u=0;r&&p(r),i.toRgb=c,i.toHsv=h,i.toHex=l,i.parse=p}var e=Math.min,t=Math.max,n=Math.round;return r}),i("tinymce/ui/ColorPicker",["tinymce/ui/Widget","tinymce/ui/DragHelper","tinymce/ui/DomUtils","tinymce/util/Color"],function(e,t,n,r){return e.extend({Defaults:{classes:"widget colorpicker"},init:function(e){this._super(e)},postRender:function(){function l(e,t){var r=n.getPos(e),i,s;return i=t.pageX-r.x,s=t.pageY-r.y,i=Math.max(0,Math.min(i/e.clientWidth,1)),s=Math.max(0,Math.min(s/e.clientHeight,1)),{x:i,y:s}}function c(t,i){var s=(360-t.h)/360;n.css(u,{top:s*100+"%"}),i||n.css(f,{left:t.s+"%",top:100-t.v+"%"}),a.style.background=(new r({s:100,v:100,h:t.h})).toHex(),e.color().parse({s:t.s,v:t.v,h:t.h}),e.fire("update")}function h(e){var t;t=l(a,e),s.s=t.x*100,s.v=(1-t.y)*100,c(s)}function p(e){var t;t=l(o,e),s=i.toHsv(),s.h=(1-t.y)*360,c(s,!0)}var e=this,i=e.color(),s,o,u,a,f;o=e.getEl("h"),u=e.getEl("hp"),a=e.getEl("sv"),f=e.getEl("svp"),e._repaint=function(){s=i.toHsv(),c(s)},e._super(),e._svdraghelper=new t(e._id+"-sv",{start:h,drag:h}),e._hdraghelper=new t(e._id+"-h",{start:p,drag:p}),e._repaint()},rgb:function(){return this.color().toRgb()},value:function(e){var t=this;if(!arguments.length)return t.color().toHex();t.color().parse(e),t._rendered&&t._repaint()},color:function(){return this._color||(this._color=new r),this._color},renderHtml:function(){function s(){var e,t,r="",s,o;s="filter:progid:DXImageTransform.Microsoft.gradient(GradientType=0,startColorstr=",o=i.split(",");for(e=0,t=o.length-1;e<t;e++)r+='<div class="'+n+'colorpicker-h-chunk" style="'+"height:"+100/t+"%;"+s+o[e]+",endColorstr="+o[e+1]+");"+"-ms-"+s+o[e]+",endColorstr="+o[e+1]+")"+'"></div>';return r}var e=this,t=e._id,n=e.classPrefix,r,i="#ff0000,#ff0080,#ff00ff,#8000ff,#0000ff,#0080ff,#00ffff,#00ff80,#00ff00,#80ff00,#ffff00,#ff8000,#ff0000",o="background: -ms-linear-gradient(top,"+i+");"+"background: linear-gradient(to bottom,"+i+");";return r='<div id="'+t+'-h" class="'+n+'colorpicker-h" style="'+o+'">'+s()+'<div id="'+t+'-hp" class="'+n+'colorpicker-h-marker"></div>'+"</div>",'<div id="'+t+'" class="'+e.classes()+'">'+'<div id="'+t+'-sv" class="'+n+'colorpicker-sv">'+'<div class="'+n+'colorpicker-overlay1">'+'<div class="'+n+'colorpicker-overlay2">'+'<div id="'+t+'-svp" class="'+n+'colorpicker-selector1">'+'<div class="'+n+'colorpicker-selector2"></div>'+"</div>"+"</div>"+"</div>"+"</div>"+r+"</div>"}})}),i("tinymce/ui/Path",["tinymce/ui/Widget"],function(e){return e.extend({init:function(e){var t=this;e.delimiter||(e.delimiter="»"),t._super(e),t.addClass("path"),t.canFocus=!0,t.on("click",function(e){var n,r=e.target;(n=r.getAttribute("data-index"))&&t.fire("select",{value:t.data()[n],index:n})})},focus:function(){var e=this;return e.getEl().firstChild.focus(),e},data:function(e){var t=this;return typeof e!="undefined"?(t._data=e,t.update(),t):t._data},update:function(){this.innerHtml(this._getPathHtml())},postRender:function(){var e=this;e._super(),e.data(e.settings.data)},renderHtml:function(){var e=this;return'<div id="'+e._id+'" class="'+e.classes()+'">'+e._getPathHtml()+"</div>"},_getPathHtml:function(){var e=this,t=e._data||[],n,r,i="",s=e.classPrefix;for(n=0,r=t.length;n<r;n++)i+=(n>0?'<div class="'+s+'divider" aria-hidden="true"> '+e.settings.delimiter+" </div>":"")+'<div role="button" class="'+s+"path-item"+(n==r-1?" "+s+"last":"")+'" data-index="'+n+'" tabindex="-1" id="'+e._id+"-"+n+'" aria-level="'+n+'">'+t[n].name+"</div>";return i||(i='<div class="'+s+'path-item"> </div>'),i}})}),i("tinymce/ui/ElementPath",["tinymce/ui/Path","tinymce/EditorManager"],function(e,t){return e.extend({postRender:function(){function r(e){if(e.nodeType===1){if(e.nodeName=="BR"||!!e.getAttribute("data-mce-bogus"))return!0;if(e.getAttribute("data-mce-type")==="bookmark")return!0}return!1}var e=this,n=t.activeEditor;return e.on("select",function(e){var t=[],i,s=n.getBody();n.focus(),i=n.selection.getStart();while(i&&i!=s)r(i)||t.push(i),i=i.parentNode;n.selection.select(t[t.length-1-e.index]),n.nodeChanged()}),n.on("nodeChange",function(t){var i=[],s=t.parents,o=s.length;while(o--)if(s[o].nodeType==1&&!r(s[o])){var u=n.fire("ResolveName",{name:s[o].nodeName.toLowerCase(),target:s[o]});i.push({name:u.name})}e.data(i)}),e._super()}})}),i("tinymce/ui/FormItem",["tinymce/ui/Container"],function(e){return e.extend({Defaults:{layout:"flex",align:"center",defaults:{flex:1}},renderHtml:function(){var e=this,t=e._layout,n=e.classPrefix;return e.addClass("formitem"),t.preRender(e),'<div id="'+e._id+'" class="'+e.classes()+'" hidefocus="1" tabindex="-1">'+(e.settings.title?'<div id="'+e._id+'-title" class="'+n+'title">'+e.settings.title+"</div>":"")+'<div id="'+e._id+'-body" class="'+e.classes("body")+'">'+(e.settings.html||"")+t.renderHtml(e)+"</div>"+"</div>"}})}),i("tinymce/ui/Form",["tinymce/ui/Container","tinymce/ui/FormItem","tinymce/util/Tools"],function(e,t,n){return e.extend({Defaults:{containerCls:"form",layout:"flex",direction:"column",align:"stretch",flex:1,padding:20,labelGap:30,spacing:10,callbacks:{submit:function(){this.submit()}}},preRender:function(){var e=this,r=e.items();e.settings.formItemDefaults||(e.settings.formItemDefaults={layout:"flex",autoResize:"overflow",defaults:{flex:1}}),r.each(function(r){var i,s=r.settings.label;s&&(i=new t(n.extend({items:{type:"label",id:r._id+"-l",text:s,flex:0,forId:r._id,disabled:r.disabled()}},e.settings.formItemDefaults)),i.type="formitem",r.aria("labelledby",r._id+"-l"),typeof r.settings.flex=="undefined"&&(r.settings.flex=1),e.replace(r,i),i.add(r))})},recalcLabels:function(){var e=this,t=0,n=[],r,i,s;if(e.settings.labelGapCalc===!1)return;e.settings.labelGapCalc=="children"?s=e.find("formitem"):s=e.items(),s.filter("formitem").each(function(e){var r=e.items()[0],i=r.getEl().clientWidth;t=i>t?i:t,n.push(r)}),i=e.settings.labelGap||0,r=n.length;while(r--)n[r].settings.minWidth=t+i},visible:function(e){var t=this._super(e);return e===!0&&this._rendered&&this.recalcLabels(),t},submit:function(){return this.fire("submit",{data:this.toJSON()})},postRender:function(){var e=this;e._super(),e.recalcLabels(),e.fromJSON(e.settings.data)}})}),i("tinymce/ui/FieldSet",["tinymce/ui/Form"],function(e){return e.extend({Defaults:{containerCls:"fieldset",layout:"flex",direction:"column",align:"stretch",flex:1,padding:"25 15 5 15",labelGap:30,spacing:10,border:1},renderHtml:function(){var e=this,t=e._layout,n=e.classPrefix;return e.preRender(),t.preRender(e),'<fieldset id="'+e._id+'" class="'+e.classes()+'" hidefocus="1" tabindex="-1">'+(e.settings.title?'<legend id="'+e._id+'-title" class="'+n+'fieldset-title">'+e.settings.title+"</legend>":"")+'<div id="'+e._id+'-body" class="'+e.classes("body")+'">'+(e.settings.html||"")+t.renderHtml(e)+"</div>"+"</fieldset>"}})}),i("tinymce/ui/FilePicker",["tinymce/ui/ComboBox","tinymce/util/Tools"],function(e,t){return e.extend({init:function(e){var n=this,r=tinymce.activeEditor,i=r.settings,s,o,u;e.spellcheck=!1,u=i.file_picker_types||i.file_browser_callback_types,u&&(u=t.makeMap(u,/[, ]/));if(!u||u[e.filetype])o=i.file_picker_callback,o&&(!u||u[e.filetype])?s=function(){var i=n.fire("beforecall").meta;i=t.extend({filetype:e.filetype},i),o.call(r,function(e,t){n.value(e).fire("change",{meta:t})},n.value(),i)}:(o=i.file_browser_callback,o&&(!u||u[e.filetype])&&(s=function(){o(n.getEl("inp").id,n.value(),e.filetype,window)}));s&&(e.icon="browse",e.onaction=s),n._super(e)}})}),i("tinymce/ui/FitLayout",["tinymce/ui/AbsoluteLayout"],function(e){return e.extend({recalc:function(e){var t=e.layoutRect(),n=e.paddingBox();e.items().filter(":visible").each(function(e){e.layoutRect({x:n.left,y:n.top,w:t.innerW-n.right-n.left,h:t.innerH-n.top-n.bottom}),e.recalc&&e.recalc()})}})}),i("tinymce/ui/FlexLayout",["tinymce/ui/AbsoluteLayout"],function(e){return e.extend({recalc:function(e){var t,n,r,i,s,o,u,a,f,l,c,h,p,d,v,m,g=[],y,b,w,E,S,x,T,N,C,k,L,A,O,M,_,D,P,H,B,j,F,I,q=Math.max,R=Math.min;r=e.items().filter(":visible"),i=e.layoutRect(),s=e._paddingBox,o=e.settings,h=e.isRtl()?o.direction||"row-reversed":o.direction,u=o.align,a=e.isRtl()?o.pack||"end":o.pack,f=o.spacing||0;if(h=="row-reversed"||h=="column-reverse")r=r.set(r.toArray().reverse()),h=h.split("-")[0];h=="column"?(C="y",T="h",N="minH",k="maxH",A="innerH",L="top",O="deltaH",M="contentH",B="left",P="w",_="x",D="innerW",H="minW",j="right",F="deltaW",I="contentW"):(C="x",T="w",N="minW",k="maxW",A="innerW",L="left",O="deltaW",M="contentW",B="top",P="h",_="y",D="innerH",H="minH",j="bottom",F="deltaH",I="contentH"),c=i[A]-s[L]-s[L],x=l=0;for(t=0,n=r.length;t<n;t++)p=r[t],d=p.layoutRect(),v=p.settings,m=v.flex,c-=t<n-1?f:0,m>0&&(l+=m,d[k]&&g.push(p),d.flex=m),c-=d[N],y=s[B]+d[H]+s[j],y>x&&(x=y);E={},c<0?E[N]=i[N]-c+i[O]:E[N]=i[A]-c+i[O],E[H]=x+i[F],E[M]=i[A]-c,E[I]=x,E.minW=R(E.minW,i.maxW),E.minH=R(E.minH,i.maxH),E.minW=q(E.minW,i.startMinWidth),E.minH=q(E.minH,i.startMinHeight);if(!(!i.autoResize||E.minW==i.minW&&E.minH==i.minH)){E.w=E.minW,E.h=E.minH,e.layoutRect(E),this.recalc(e);if(e._lastRect===null){var U=e.parent();U&&(U._lastRect=null,U.recalc())}return}w=c/l;for(t=0,n=g.length;t<n;t++)p=g[t],d=p.layoutRect(),b=d[k],y=d[N]+d.flex*w,y>b?(c-=d[k]-d[N],l-=d.flex,d.flex=0,d.maxFlexSize=b):d.maxFlexSize=0;w=c/l,S=s[L],E={},l===0&&(a=="end"?S=c+s[L]:a=="center"?(S=Math.round(i[A]/2-(i[A]-c)/2)+s[L],S<0&&(S=s[L])):a=="justify"&&(S=s[L],f=Math.floor(c/(r.length-1)))),E[_]=s[B];for(t=0,n=r.length;t<n;t++)p=r[t],d=p.layoutRect(),y=d.maxFlexSize||d[N],u==="center"?E[_]=Math.round(i[D]/2-d[P]/2):u==="stretch"?(E[P]=q(d[H]||0,i[D]-s[B]-s[j]),E[_]=s[B]):u==="end"&&(E[_]=i[D]-d[P]-s.top),d.flex>0&&(y+=d.flex*w),E[T]=y,E[C]=S,p.layoutRect(E),p.recalc&&p.recalc(),S+=y+f}})}),i("tinymce/ui/FlowLayout",["tinymce/ui/Layout"],function(e){return e.extend({Defaults:{containerClass:"flow-layout",controlClass:"flow-layout-item",endClass:"break"},recalc:function(e){e.items().filter(":visible").each(function(e){e.recalc&&e.recalc()})}})}),i("tinymce/ui/FormatControls",["tinymce/ui/Control","tinymce/ui/Widget","tinymce/ui/FloatPanel","tinymce/util/Tools","tinymce/EditorManager","tinymce/Env"],function(e,t,n,r,i,s){function u(e){function r(t,n){return function(){var r=this;e.on("nodeChange",function(i){var s=e.formatter,u=null;o(i.parents,function(e){o(t,function(t){n?s.matchNode(e,n,{value:t.value})&&(u=t.value):s.matchNode(e,t.value)&&(u=t.value);if(u)return!1});if(u)return!1}),r.value(u)})}}function i(e){e=e.replace(/;$/,"").split(";");var t=e.length;while(t--)e[t]=e[t].split("=");return e}function s(){function i(e){var r=[];if(!e)return;return o(e,function(e){var s={text:e.title,icon:e.icon};if(e.items)s.menu=i(e.items);else{var o=e.format||"custom"+t++;e.format||(e.name=o,n.push(e)),s.format=o,s.cmd=e.cmd}r.push(s)}),r}function s(){var t;return e.settings.style_formats_merge?e.settings.style_formats?t=i(r.concat(e.settings.style_formats)):t=i(r):t=i(e.settings.style_formats||r),t}var t=0,n=[],r=[{title:"Headings",items:[{title:"Heading 1",format:"h1"},{title:"Heading 2",format:"h2"},{title:"Heading 3",format:"h3"},{title:"Heading 4",format:"h4"},{title:"Heading 5",format:"h5"},{title:"Heading 6",format:"h6"}]},{title:"Inline",items:[{title:"Bold",icon:"bold",format:"bold"},{title:"Italic",icon:"italic",format:"italic"},{title:"Underline",icon:"underline",format:"underline"},{title:"Strikethrough",icon:"strikethrough",format:"strikethrough"},{title:"Superscript",icon:"superscript",format:"superscript"},{title:"Subscript",icon:"subscript",format:"subscript"},{title:"Code",icon:"code",format:"code"}]},{title:"Blocks",items:[{title:"Paragraph",format:"p"},{title:"Blockquote",format:"blockquote"},{title:"Div",format:"div"},{title:"Pre",format:"pre"}]},{title:"Alignment",items:[{title:"Left",icon:"alignleft",format:"alignleft"},{title:"Center",icon:"aligncenter",format:"aligncenter"},{title:"Right",icon:"alignright",format:"alignright"},{title:"Justify",icon:"alignjustify",format:"alignjustify"}]}];return e.on("init",function(){o(n,function(t){e.formatter.register(t.name,t)})}),{type:"menu",items:s(),onPostRender:function(t){e.fire("renderFormatsMenu",{control:t.control})},itemDefaults:{preview:!0,textStyle:function(){if(this.settings.format)return e.formatter.getCssText(this.settings.format)},onPostRender:function(){var t=this;t.parent().on("show",function(){var n,r;n=t.settings.format,n&&(t.disabled(!e.formatter.canApply(n)),t.active(e.formatter.match(n))),r=t.settings.cmd,r&&t.active(e.queryCommandState(r))})},onclick:function(){this.settings.format&&f(this.settings.format),this.settings.cmd&&e.execCommand(this.settings.cmd)}}}}function u(t){return function(){function r(){return e.undoManager?e.undoManager[t]():!1}var n=this;t=t=="redo"?"hasRedo":"hasUndo",n.disabled(!r()),e.on("Undo Redo AddUndo TypingUndo ClearUndos",function(){n.disabled(!r())})}}function a(){var t=this;e.on("VisualAid",function(e){t.active(e.hasVisual)}),t.active(e.hasVisual)}function f(t){t.control&&(t=t.control.value()),t&&e.execCommand("mceToggleFormat",!1,t)}var t;t=s(),o({bold:"Bold",italic:"Italic",underline:"Underline",strikethrough:"Strikethrough",subscript:"Subscript",superscript:"Superscript"},function(t,n){e.addButton(n,{tooltip:t,onPostRender:function(){var t=this;e.formatter?e.formatter.formatChanged(n,function(e){t.active(e)}):e.on("init",function(){e.formatter.formatChanged(n,function(e){t.active(e)})})},onclick:function(){f(n)}})}),o({outdent:["Decrease indent","Outdent"],indent:["Increase indent","Indent"],cut:["Cut","Cut"],copy:["Copy","Copy"],paste:["Paste","Paste"],help:["Help","mceHelp"],selectall:["Select all","SelectAll"],hr:["Insert horizontal rule","InsertHorizontalRule"],removeformat:["Clear formatting","RemoveFormat"],visualaid:["Visual aids","mceToggleVisualAid"],newdocument:["New document","mceNewDocument"]},function(t,n){e.addButton(n,{tooltip:t[0],cmd:t[1]})}),o({blockquote:["Blockquote","mceBlockQuote"],numlist:["Numbered list","InsertOrderedList"],bullist:["Bullet list","InsertUnorderedList"],subscript:["Subscript","Subscript"],superscript:["Superscript","Superscript"],alignleft:["Align left","JustifyLeft"],aligncenter:["Align center","JustifyCenter"],alignright:["Align right","JustifyRight"],alignjustify:["Justify","JustifyFull"]},function(t,n){e.addButton(n,{tooltip:t[0],cmd:t[1],onPostRender:function(){var t=this;e.formatter?e.formatter.formatChanged(n,function(e){t.active(e)}):e.on("init",function(){e.formatter.formatChanged(n,function(e){t.active(e)})})}})}),e.addButton("undo",{tooltip:"Undo",onPostRender:u("undo"),cmd:"undo"}),e.addButton("redo",{tooltip:"Redo",onPostRender:u("redo"),cmd:"redo"}),e.addMenuItem("newdocument",{text:"New document",shortcut:"Ctrl+N",icon:"newdocument",cmd:"mceNewDocument"}),e.addMenuItem("undo",{text:"Undo",icon:"undo",shortcut:"Ctrl+Z",onPostRender:u("undo"),cmd:"undo"}),e.addMenuItem("redo",{text:"Redo",icon:"redo",shortcut:"Ctrl+Y",onPostRender:u("redo"),cmd:"redo"}),e.addMenuItem("visualaid",{text:"Visual aids",selectable:!0,onPostRender:a,cmd:"mceToggleVisualAid"}),o({cut:["Cut","Cut","Ctrl+X"],copy:["Copy","Copy","Ctrl+C"],paste:["Paste","Paste","Ctrl+V"],selectall:["Select all","SelectAll","Ctrl+A"],bold:["Bold","Bold","Ctrl+B"],italic:["Italic","Italic","Ctrl+I"],underline:["Underline","Underline"],strikethrough:["Strikethrough","Strikethrough"],subscript:["Subscript","Subscript"],superscript:["Superscript","Superscript"],removeformat:["Clear formatting","RemoveFormat"]},function(t,n){e.addMenuItem(n,{text:t[0],icon:n,shortcut:t[2],cmd:t[1]})}),e.on("mousedown",function(){n.hideAll()}),e.addButton("styleselect",{type:"menubutton",text:"Formats",menu:t}),e.addButton("formatselect",function(){var t=[],n=i(e.settings.block_formats||"Paragraph=p;Address=address;Pre=pre;Heading 1=h1;Heading 2=h2;Heading 3=h3;Heading 4=h4;Heading 5=h5;Heading 6=h6");return o(n,function(n){t.push({text:n[0],value:n[1],textStyle:function(){return e.formatter.getCssText(n[1])}})}),{type:"listbox",text:n[0][0],values:t,fixedWidth:!0,onselect:f,onPostRender:r(t)}}),e.addButton("fontselect",function(){var t="Andale Mono=andale mono,times;Arial=arial,helvetica,sans-serif;Arial Black=arial black,avant garde;Book Antiqua=book antiqua,palatino;Comic Sans MS=comic sans ms,sans-serif;Courier New=courier new,courier;Georgia=georgia,palatino;Helvetica=helvetica;Impact=impact,chicago;Symbol=symbol;Tahoma=tahoma,arial,helvetica,sans-serif;Terminal=terminal,monaco;Times New Roman=times new roman,times;Trebuchet MS=trebuchet ms,geneva;Verdana=verdana,geneva;Webdings=webdings;Wingdings=wingdings,zapf dingbats",n=[],s=i(e.settings.font_formats||t);return o(s,function(e){n.push({text:{raw:e[0]},value:e[1],textStyle:e[1].indexOf("dings")==-1?"font-family:"+e[1]:""})}),{type:"listbox",text:"Font",tooltip:"Font",values:n,fixedWidth:!0,onPostRender:r(n,"fontname"),onselect:function(t){t.control.settings.value&&e.execCommand("FontName",!1,t.control.settings.value)}}}),e.addButton("fontsizeselect",function(){var t=[],n="8pt 10pt 12pt 14pt 18pt 24pt 36pt",i=e.settings.fontsize_formats||n;return o(i.split(" "),function(e){var n=e,r=e,i=e.split("=");i.length>1&&(n=i[0],r=i[1]),t.push({text:n,value:r})}),{type:"listbox",text:"Font Sizes",tooltip:"Font Sizes",values:t,fixedWidth:!0,onPostRender:r(t,"fontsize"),onclick:function(t){t.control.settings.value&&e.execCommand("FontSize",!1,t.control.settings.value)}}}),e.addMenuItem("formats",{text:"Formats",menu:t})}var o=r.each;i.on("AddEditor",function(t){t.editor.rtl&&(e.rtl=!0),u(t.editor)}),e.translate=function(e){return i.translate(e)},t.tooltips=!s.iOS}),i("tinymce/ui/GridLayout",["tinymce/ui/AbsoluteLayout"],function(e){return e.extend({recalc:function(e){var t=e.settings,n,r,i,s,o,u,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S,x,T=[],N=[],C,k,L,A,O,M;t=e.settings,i=e.items().filter(":visible"),s=e.layoutRect(),r=t.columns||Math.ceil(Math.sqrt(i.length)),n=Math.ceil(i.length/r),y=t.spacingH||t.spacing||0,b=t.spacingV||t.spacing||0,w=t.alignH||t.align,E=t.alignV||t.align,m=e._paddingBox,O="reverseRows"in t?t.reverseRows:e.isRtl(),w&&typeof w=="string"&&(w=[w]),E&&typeof E=="string"&&(E=[E]);for(c=0;c<r;c++)T.push(0);for(h=0;h<n;h++)N.push(0);for(h=0;h<n;h++)for(c=0;c<r;c++){l=i[h*r+c];if(!l)break;f=l.layoutRect(),C=f.minW,k=f.minH,T[c]=C>T[c]?C:T[c],N[h]=k>N[h]?k:N[h]}L=s.innerW-m.left-m.right;for(S=0,c=0;c<r;c++)S+=T[c]+(c>0?y:0),L-=(c>0?y:0)+T[c];A=s.innerH-m.top-m.bottom;for(x=0,h=0;h<n;h++)x+=N[h]+(h>0?b:0),A-=(h>0?b:0)+N[h];S+=m.left+m.right,x+=m.top+m.bottom,a={},a.minW=S+(s.w-s.innerW),a.minH=x+(s.h-s.innerH),a.contentW=a.minW-s.deltaW,a.contentH=a.minH-s.deltaH,a.minW=Math.min(a.minW,s.maxW),a.minH=Math.min(a.minH,s.maxH),a.minW=Math.max(a.minW,s.startMinWidth),a.minH=Math.max(a.minH,s.startMinHeight);if(!(!s.autoResize||a.minW==s.minW&&a.minH==s.minH)){a.w=a.minW,a.h=a.minH,e.layoutRect(a),this.recalc(e);if(e._lastRect===null){var _=e.parent();_&&(_._lastRect=null,_.recalc())}return}s.autoResize&&(a=e.layoutRect(a),a.contentW=a.minW-s.deltaW,a.contentH=a.minH-s.deltaH);var D;t.packV=="start"?D=0:D=A>0?Math.floor(A/n):0;var P=0,H=t.flexWidths;if(H)for(c=0;c<H.length;c++)P+=H[c];else P=r;var B=L/P;for(c=0;c<r;c++)T[c]+=H?H[c]*B:B;d=m.top;for(h=0;h<n;h++){p=m.left,u=N[h]+D;for(c=0;c<r;c++){O?M=h*r+r-1-c:M=h*r+c,l=i[M];if(!l)break;v=l.settings,f=l.layoutRect(),o=Math.max(T[c],f.startMinWidth),f.x=p,f.y=d,g=v.alignH||(w?w[c]||w[0]:null),g=="center"?f.x=p+o/2-f.w/2:g=="right"?f.x=p+o-f.w:g=="stretch"&&(f.w=o),g=v.alignV||(E?E[c]||E[0]:null),g=="center"?f.y=d+u/2-f.h/2:g=="bottom"?f.y=d+u-f.h:g=="stretch"&&(f.h=u),l.layoutRect(f),p+=o+y,l.recalc&&l.recalc()}d+=u+b}}})}),i("tinymce/ui/Iframe",["tinymce/ui/Widget"],function(e){return e.extend({renderHtml:function(){var e=this;return e.addClass("iframe"),e.canFocus=!1,'<iframe id="'+e._id+'" class="'+e.classes()+'" tabindex="-1" src="'+(e.settings.url||"javascript:''")+'" frameborder="0"></iframe>'},src:function(e){this.getEl().src=e},html:function(e,t){var n=this,r=this.getEl().contentWindow.document.body;return r?(r.innerHTML=e,t&&t()):setTimeout(function(){n.html(e)},0),this}})}),i("tinymce/ui/Label",["tinymce/ui/Widget","tinymce/ui/DomUtils"],function(e,t){return e.extend({init:function(e){var t=this;t._super(e),t.addClass("widget"),t.addClass("label"),t.canFocus=!1,e.multiline&&t.addClass("autoscroll"),e.strong&&t.addClass("strong")},initLayoutRect:function(){var e=this,n=e._super();if(e.settings.multiline){var r=t.getSize(e.getEl());r.width>n.maxW&&(n.minW=n.maxW,e.addClass("multiline")),e.getEl().style.width=n.minW+"px",n.startMinH=n.h=n.minH=Math.min(n.maxH,t.getSize(e.getEl()).height)}return n},repaint:function(){var e=this;return e.settings.multiline||(e.getEl().style.lineHeight=e.layoutRect().h+"px"),e._super()},text:function(e){var t=this;return t._rendered&&e&&this.innerHtml(t.encode(e)),t._super(e)},renderHtml:function(){var e=this,t=e.settings.forId;return'<label id="'+e._id+'" class="'+e.classes()+'"'+(t?' for="'+t+'"':"")+">"+e.encode(e._text)+"</label>"}})}),i("tinymce/ui/Toolbar",["tinymce/ui/Container"],function(e){return e.extend({Defaults:{role:"toolbar",layout:"flow"},init:function(e){var t=this;t._super(e),t.addClass("toolbar")},postRender:function(){var e=this;return e.items().addClass("toolbar-item"),e._super()}})}),i("tinymce/ui/MenuBar",["tinymce/ui/Toolbar"],function(e){return e.extend({Defaults:{role:"menubar",containerCls:"menubar",ariaRoot:!0,defaults:{type:"menubutton"}}})}),i("tinymce/ui/MenuButton",["tinymce/ui/Button","tinymce/ui/Factory","tinymce/ui/MenuBar"],function(e,t,n){function r(e,t){while(e){if(t===e)return!0;e=e.parentNode}return!1}var i=e.extend({init:function(e){var t=this;t._renderOpen=!0,t._super(e),t.addClass("menubtn"),e.fixedWidth&&t.addClass("fixed-width"),t.aria("haspopup",!0),t.hasPopup=!0},showMenu:function(){var e=this,n=e.settings,r;if(e.menu&&e.menu.visible())return e.hideMenu();e.menu||(r=n.menu||[],r.length?r={type:"menu",items:r}:r.type=r.type||"menu",e.menu=t.create(r).parent(e).renderTo(),e.fire("createmenu"),e.menu.reflow(),e.menu.on("cancel",function(t){t.control.parent()===e.menu&&(t.stopPropagation(),e.focus(),e.hideMenu())}),e.menu.on("select",function(){e.focus()}),e.menu.on("show hide",function(t){t.control==e.menu&&e.activeMenu(t.type=="show"),e.aria("expanded",t.type=="show")}).fire("show")),e.menu.show(),e.menu.layoutRect({w:e.layoutRect().w}),e.menu.moveRel(e.getEl(),e.isRtl()?["br-tr","tr-br"]:["bl-tl","tl-bl"])},hideMenu:function(){var e=this;e.menu&&(e.menu.items().each(function(e){e.hideMenu&&e.hideMenu()}),e.menu.hide())},activeMenu:function(e){this.toggleClass("active",e)},renderHtml:function(){var e=this,t=e._id,r=e.classPrefix,i=e.settings.icon?r+"ico "+r+"i-"+e.settings.icon:"";return e.aria("role",e.parent()instanceof n?"menuitem":"button"),'<div id="'+t+'" class="'+e.classes()+'" tabindex="-1" aria-labelledby="'+t+'">'+'<button id="'+t+'-open" role="presentation" type="button" tabindex="-1">'+(i?'<i class="'+i+'"></i>':"")+"<span>"+(e._text?(i?" ":"")+e.encode(e._text):"")+"</span>"+' <i class="'+r+'caret"></i>'+"</button>"+"</div>"},postRender:function(){var e=this;return e.on("click",function(t){t.control===e&&r(t.target,e.getEl())&&(e.showMenu(),t.aria&&e.menu.items()[0].focus())}),e.on("mouseenter",function(t){var n=t.control,r=e.parent(),s;n&&r&&n instanceof i&&n.parent()==r&&(r.items().filter("MenuButton").each(function(e){e.hideMenu&&e!=n&&(e.menu&&e.menu.visible()&&(s=!0),e.hideMenu())}),s&&(n.focus(),n.showMenu()))}),e._super()},text:function(e){var t=this,n,r;if(t._rendered){r=t.getEl("open").getElementsByTagName("span");for(n=0;n<r.length;n++)r[n].innerHTML=(t.settings.icon&&e?" ":"")+t.encode(e)}return this._super(e)},remove:function(){this._super(),this.menu&&this.menu.remove()}});return i}),i("tinymce/ui/ListBox",["tinymce/ui/MenuButton"],function(e){return e.extend({init:function(e){function o(n){for(var s=0;s<n.length;s++){r=n[s].selected||e.value===n[s].value;if(r){i=i||n[s].text,t._value=n[s].value;break}n[s].menu&&o(n[s].menu)}}var t=this,n,r,i,s;t._values=n=e.values,n&&(typeof e.value!="undefined"&&o(n),!r&&n.length>0&&(i=n[0].text,t._value=n[0].value),e.menu=n),e.text=e.text||i||n[0].text,t._super(e),t.addClass("listbox"),t.on("select",function(n){var r=n.control;s&&(n.lastControl=s),e.multiple?r.active(!r.active()):t.value(n.control.settings.value),s=r})},value:function(e){function s(e,t){e.items().each(function(e){n=e.value()===t,n&&(r=r||e.text()),e.active(n),e.menu&&s(e.menu,t)})}function o(t){for(var i=0;i<t.length;i++)n=t[i].value==e,n&&(r=r||t[i].text),t[i].active=n,t[i].menu&&o(t[i].menu)}var t=this,n,r,i;return typeof e!="undefined"&&(t.menu?s(t.menu,e):(i=t.settings.menu,o(i)),t.text(r||this.settings.text)),t._super(e)}})}),i("tinymce/ui/MenuItem",["tinymce/ui/Widget","tinymce/ui/Factory","tinymce/Env"],function(e,t,n){return e.extend({Defaults:{border:0,role:"menuitem"},init:function(e){var t=this;t.hasPopup=!0,t._super(e),e=t.settings,t.addClass("menu-item"),e.menu&&t.addClass("menu-item-expand"),e.preview&&t.addClass("menu-item-preview");if(t._text==="-"||t._text==="|")t.addClass("menu-item-sep"),t.aria("role","separator"),t._text="-";e.selectable&&(t.aria("role","menuitemcheckbox"),t.addClass("menu-item-checkbox"),e.icon="selected"),!e.preview&&!e.selectable&&t.addClass("menu-item-normal"),t.on("mousedown",function(e){e.preventDefault()}),e.menu&&!e.ariaHideMenu&&t.aria("haspopup",!0)},hasMenus:function(){return!!this.settings.menu},showMenu:function(){var e=this,n=e.settings,r,i=e.parent();i.items().each(function(t){t!==e&&t.hideMenu()});if(n.menu){r=e.menu,r?r.show():(r=n.menu,r.length?r={type:"menu",items:r}:r.type=r.type||"menu",i.settings.itemDefaults&&(r.itemDefaults=i.settings.itemDefaults),r=e.menu=t.create(r).parent(e).renderTo(),r.reflow(),r.on("cancel",function(t){t.stopPropagation(),e.focus(),r.hide()}),r.on("show hide",function(e){e.control.items().each(function(e){e.active(e.settings.selected)})}).fire("show"),r.on("hide",function(t){t.control===r&&e.removeClass("selected")}),r.submenu=!0),r._parentMenu=i,r.addClass("menu-sub");var s=r.testMoveRel(e.getEl(),e.isRtl()?["tl-tr","bl-br","tr-tl","br-bl"]:["tr-tl","br-bl","tl-tr","bl-br"]);r.moveRel(e.getEl(),s),r.rel=s,s="menu-sub-"+s,r.removeClass(r._lastRel),r.addClass(s),r._lastRel=s,e.addClass("selected"),e.aria("expanded",!0)}},hideMenu:function(){var e=this;return e.menu&&(e.menu.items().each(function(e){e.hideMenu&&e.hideMenu()}),e.menu.hide(),e.aria("expanded",!1)),e},renderHtml:function(){var e=this,t=e._id,r=e.settings,i=e.classPrefix,s=e.encode(e._text),o=e.settings.icon,u="",a=r.shortcut;return o&&e.parent().addClass("menu-has-icons"),r.image&&(o="none",u=" style=\"background-image: url('"+r.image+"')\""),a&&n.mac&&(a=a.replace(/ctrl\+alt\+/i,"&#x2325;&#x2318;"),a=a.replace(/ctrl\+/i,"&#x2318;"),a=a.replace(/alt\+/i,"&#x2325;"),a=a.replace(/shift\+/i,"&#x21E7;")),o=i+"ico "+i+"i-"+(e.settings.icon||"none"),'<div id="'+t+'" class="'+e.classes()+'" tabindex="-1">'+(s!=="-"?'<i class="'+o+'"'+u+"></i> ":"")+(s!=="-"?'<span id="'+t+'-text" class="'+i+'text">'+s+"</span>":"")+(a?'<div id="'+t+'-shortcut" class="'+i+'menu-shortcut">'+a+"</div>":"")+(r.menu?'<div class="'+i+'caret"></div>':"")+"</div>"},postRender:function(){var e=this,t=e.settings,n=t.textStyle;typeof n=="function"&&(n=n.call(this));if(n){var r=e.getEl("text");r&&r.setAttribute("style",n)}return e.on("mouseenter click",function(n){n.control===e&&(!t.menu&&n.type==="click"?(e.fire("select"),e.parent().hideAll()):(e.showMenu(),n.aria&&e.menu.focus(!0)))}),e._super(),e},active:function(e){return typeof e!="undefined"&&this.aria("checked",e),this._super(e)},remove:function(){this._super(),this.menu&&this.menu.remove()}})}),i("tinymce/ui/Menu",["tinymce/ui/FloatPanel","tinymce/ui/MenuItem","tinymce/util/Tools"],function(e,t,n){var r=e.extend({Defaults:{defaultType:"menuitem",border:1,layout:"stack"
,role:"application",bodyRole:"menu",ariaRoot:!0},init:function(e){var t=this;e.autohide=!0,e.constrainToViewport=!0;if(e.itemDefaults){var r=e.items,i=r.length;while(i--)r[i]=n.extend({},e.itemDefaults,r[i])}t._super(e),t.addClass("menu")},repaint:function(){return this.toggleClass("menu-align",!0),this._super(),this.getEl().style.height="",this.getEl("body").style.height="",this},cancel:function(){var e=this;e.hideAll(),e.fire("select")},hideAll:function(){var e=this;return this.find("menuitem").exec("hideMenu"),e._super()},preRender:function(){var e=this;return e.items().each(function(t){var n=t.settings;if(n.icon||n.selectable)return e._hasIcons=!0,!1}),e._super()}});return r}),i("tinymce/ui/Radio",["tinymce/ui/Checkbox"],function(e){return e.extend({Defaults:{classes:"radio",role:"radio"}})}),i("tinymce/ui/ResizeHandle",["tinymce/ui/Widget","tinymce/ui/DragHelper"],function(e,t){return e.extend({renderHtml:function(){var e=this,t=e.classPrefix;return e.addClass("resizehandle"),e.settings.direction=="both"&&e.addClass("resizehandle-both"),e.canFocus=!1,'<div id="'+e._id+'" class="'+e.classes()+'">'+'<i class="'+t+"ico "+t+'i-resize"></i>'+"</div>"},postRender:function(){var e=this;e._super(),e.resizeDragHelper=new t(this._id,{start:function(){e.fire("ResizeStart")},drag:function(t){e.settings.direction!="both"&&(t.deltaX=0),e.fire("Resize",t)},stop:function(){e.fire("ResizeEnd")}})},remove:function(){return this.resizeDragHelper&&this.resizeDragHelper.destroy(),this._super()}})}),i("tinymce/ui/Spacer",["tinymce/ui/Widget"],function(e){return e.extend({renderHtml:function(){var e=this;return e.addClass("spacer"),e.canFocus=!1,'<div id="'+e._id+'" class="'+e.classes()+'"></div>'}})}),i("tinymce/ui/SplitButton",["tinymce/ui/MenuButton","tinymce/ui/DomUtils"],function(e,t){return e.extend({Defaults:{classes:"widget btn splitbtn",role:"button"},repaint:function(){var e=this,n=e.getEl(),r=e.layoutRect(),i,s;return e._super(),i=n.firstChild,s=n.lastChild,t.css(i,{width:r.w-t.getSize(s).width,height:r.h-2}),t.css(s,{height:r.h-2}),e},activeMenu:function(e){var n=this;t.toggleClass(n.getEl().lastChild,n.classPrefix+"active",e)},renderHtml:function(){var e=this,t=e._id,n=e.classPrefix,r=e.settings.icon?n+"ico "+n+"i-"+e.settings.icon:"";return'<div id="'+t+'" class="'+e.classes()+'" role="button" tabindex="-1">'+'<button type="button" hidefocus="1" tabindex="-1">'+(r?'<i class="'+r+'"></i>':"")+(e._text?(r?" ":"")+e._text:"")+"</button>"+'<button type="button" class="'+n+'open" hidefocus="1" tabindex="-1">'+(e._menuBtnText?(r?" ":"")+e._menuBtnText:"")+' <i class="'+n+'caret"></i>'+"</button>"+"</div>"},postRender:function(){var e=this,t=e.settings.onclick;return e.on("click",function(e){var n=e.target;if(e.control==this)while(n){if(e.aria&&e.aria.key!="down"||n.nodeName=="BUTTON"&&n.className.indexOf("open")==-1){e.stopImmediatePropagation(),t.call(this,e);return}n=n.parentNode}}),delete e.settings.onclick,e._super()}})}),i("tinymce/ui/StackLayout",["tinymce/ui/FlowLayout"],function(e){return e.extend({Defaults:{containerClass:"stack-layout",controlClass:"stack-layout-item",endClass:"break"}})}),i("tinymce/ui/TabPanel",["tinymce/ui/Panel","tinymce/ui/DomUtils"],function(e,t){return e.extend({Defaults:{layout:"absolute",defaults:{type:"panel"}},activateTab:function(e){var n;this.activeTabId&&(n=this.getEl(this.activeTabId),t.removeClass(n,this.classPrefix+"active"),n.setAttribute("aria-selected","false")),this.activeTabId="t"+e,n=this.getEl("t"+e),n.setAttribute("aria-selected","true"),t.addClass(n,this.classPrefix+"active"),this.items()[e].show().fire("showtab"),this.reflow(),this.items().each(function(t,n){e!=n&&t.hide()})},renderHtml:function(){var e=this,t=e._layout,n="",r=e.classPrefix;return e.preRender(),t.preRender(e),e.items().each(function(t,i){var s=e._id+"-t"+i;t.aria("role","tabpanel"),t.aria("labelledby",s),n+='<div id="'+s+'" class="'+r+'tab" '+'unselectable="on" role="tab" aria-controls="'+t._id+'" aria-selected="false" tabIndex="-1">'+e.encode(t.settings.title)+"</div>"}),'<div id="'+e._id+'" class="'+e.classes()+'" hidefocus="1" tabindex="-1">'+'<div id="'+e._id+'-head" class="'+r+'tabs" role="tablist">'+n+"</div>"+'<div id="'+e._id+'-body" class="'+e.classes("body")+'">'+t.renderHtml(e)+"</div>"+"</div>"},postRender:function(){var e=this;e._super(),e.settings.activeTab=e.settings.activeTab||0,e.activateTab(e.settings.activeTab),this.on("click",function(t){var n=t.target.parentNode;if(t.target.parentNode.id==e._id+"-head"){var r=n.childNodes.length;while(r--)n.childNodes[r]==t.target&&e.activateTab(r)}})},initLayoutRect:function(){var e=this,n,r,i;r=t.getSize(e.getEl("head")).width,r=r<0?0:r,i=0,e.items().each(function(e){r=Math.max(r,e.layoutRect().minW),i=Math.max(i,e.layoutRect().minH)}),e.items().each(function(e){e.settings.x=0,e.settings.y=0,e.settings.w=r,e.settings.h=i,e.layoutRect({x:0,y:0,w:r,h:i})});var s=t.getSize(e.getEl("head")).height;return e.settings.minWidth=r,e.settings.minHeight=i+s,n=e._super(),n.deltaH+=s,n.innerH=n.h-n.deltaH,n}})}),i("tinymce/ui/TextBox",["tinymce/ui/Widget","tinymce/ui/DomUtils"],function(e,t){return e.extend({init:function(e){var t=this;t._super(e),t._value=e.value||"",t.addClass("textbox"),e.multiline?t.addClass("multiline"):t.on("keydown",function(e){e.keyCode==13&&t.parents().reverse().each(function(t){e.preventDefault();if(t.hasEventListeners("submit")&&t.toJSON)return t.fire("submit",{data:t.toJSON()}),!1})})},disabled:function(e){var t=this;return t._rendered&&typeof e!="undefined"&&(t.getEl().disabled=e),t._super(e)},value:function(e){var t=this;return typeof e!="undefined"?(t._value=e,t._rendered&&(t.getEl().value=e),t):t._rendered?t.getEl().value:t._value},repaint:function(){var e=this,t,n,r,i=0,s=0,o;t=e.getEl().style,n=e._layoutRect,o=e._lastRepaintRect||{};var u=document;return!e.settings.multiline&&u.all&&(!u.documentMode||u.documentMode<=8)&&(t.lineHeight=n.h-s+"px"),r=e._borderBox,i=r.left+r.right+8,s=r.top+r.bottom+(e.settings.multiline?8:0),n.x!==o.x&&(t.left=n.x+"px",o.x=n.x),n.y!==o.y&&(t.top=n.y+"px",o.y=n.y),n.w!==o.w&&(t.width=n.w-i+"px",o.w=n.w),n.h!==o.h&&(t.height=n.h-s+"px",o.h=n.h),e._lastRepaintRect=o,e.fire("repaint",{},!1),e},renderHtml:function(){var e=this,t=e._id,n=e.settings,r=e.encode(e._value,!1),i="";return"spellcheck"in n&&(i+=' spellcheck="'+n.spellcheck+'"'),n.maxLength&&(i+=' maxlength="'+n.maxLength+'"'),n.size&&(i+=' size="'+n.size+'"'),n.subtype&&(i+=' type="'+n.subtype+'"'),e.disabled()&&(i+=' disabled="disabled"'),n.multiline?'<textarea id="'+t+'" class="'+e.classes()+'" '+(n.rows?' rows="'+n.rows+'"':"")+' hidefocus="1"'+i+">"+r+"</textarea>":'<input id="'+t+'" class="'+e.classes()+'" value="'+r+'" hidefocus="1"'+i+" />"},postRender:function(){var e=this;return t.on(e.getEl(),"change",function(t){e.fire("change",t)}),e._super()},remove:function(){t.off(this.getEl()),this._super()}})}),i("tinymce/ui/Throbber",["tinymce/ui/DomUtils","tinymce/ui/Control"],function(e,t){return function(n,r){var i=this,s,o=t.classPrefix;i.show=function(t){return i.hide(),s=!0,window.setTimeout(function(){s&&n.appendChild(e.createFragment('<div class="'+o+"throbber"+(r?" "+o+"throbber-inline":"")+'"></div>'))},t||0),i},i.hide=function(){var e=n.lastChild;return e&&e.className.indexOf("throbber")!=-1&&e.parentNode.removeChild(e),s=!1,i}}}),u(["tinymce/dom/EventUtils","tinymce/dom/Sizzle","tinymce/dom/DomQuery","tinymce/html/Styles","tinymce/dom/TreeWalker","tinymce/util/Tools","tinymce/dom/Range","tinymce/html/Entities","tinymce/Env","tinymce/dom/DOMUtils","tinymce/dom/ScriptLoader","tinymce/AddOnManager","tinymce/html/Node","tinymce/html/Schema","tinymce/html/SaxParser","tinymce/html/DomParser","tinymce/html/Writer","tinymce/html/Serializer","tinymce/dom/Serializer","tinymce/dom/TridentSelection","tinymce/util/VK","tinymce/dom/ControlSelection","tinymce/dom/BookmarkManager","tinymce/dom/Selection","tinymce/dom/ElementUtils","tinymce/Formatter","tinymce/UndoManager","tinymce/EnterKey","tinymce/ForceBlocks","tinymce/EditorCommands","tinymce/util/URI","tinymce/util/Class","tinymce/util/EventDispatcher","tinymce/ui/Selector","tinymce/ui/Collection","tinymce/ui/DomUtils","tinymce/ui/Control","tinymce/ui/Factory","tinymce/ui/KeyboardNavigation","tinymce/ui/Container","tinymce/ui/DragHelper","tinymce/ui/Scrollable","tinymce/ui/Panel","tinymce/ui/Movable","tinymce/ui/Resizable","tinymce/ui/FloatPanel","tinymce/ui/Window","tinymce/ui/MessageBox","tinymce/WindowManager","tinymce/util/Quirks","tinymce/util/Observable","tinymce/EditorObservable","tinymce/Shortcuts","tinymce/Editor","tinymce/util/I18n","tinymce/FocusManager","tinymce/EditorManager","tinymce/LegacyInput","tinymce/util/XHR","tinymce/util/JSON","tinymce/util/JSONRequest","tinymce/util/JSONP","tinymce/util/LocalStorage","tinymce/Compat","tinymce/ui/Layout","tinymce/ui/AbsoluteLayout","tinymce/ui/Tooltip","tinymce/ui/Widget","tinymce/ui/Button","tinymce/ui/ButtonGroup","tinymce/ui/Checkbox","tinymce/ui/ComboBox","tinymce/ui/ColorBox","tinymce/ui/PanelButton","tinymce/ui/ColorButton","tinymce/util/Color","tinymce/ui/ColorPicker","tinymce/ui/Path","tinymce/ui/ElementPath","tinymce/ui/FormItem","tinymce/ui/Form","tinymce/ui/FieldSet","tinymce/ui/FilePicker","tinymce/ui/FitLayout","tinymce/ui/FlexLayout","tinymce/ui/FlowLayout","tinymce/ui/FormatControls","tinymce/ui/GridLayout","tinymce/ui/Iframe","tinymce/ui/Label","tinymce/ui/Toolbar","tinymce/ui/MenuBar","tinymce/ui/MenuButton","tinymce/ui/ListBox","tinymce/ui/MenuItem","tinymce/ui/Menu","tinymce/ui/Radio","tinymce/ui/ResizeHandle","tinymce/ui/Spacer","tinymce/ui/SplitButton","tinymce/ui/StackLayout","tinymce/ui/TabPanel","tinymce/ui/TextBox","tinymce/ui/Throbber"])})(this);})();
;(function() { if (Cognito.config.scripts.indexOf('cognito-init-tinymce') >= 0) return; else Cognito.config.scripts.push('cognito-init-tinymce');(function () {
    tinyMCE.baseURL = Cognito.config.baseUrl + "Scripts/component/tinymce";

    function stripEditorHtml(s) {
        return s.replace(/\<span class\=['"]mceNonEditable.+?\>(.+?)\<\/span\>/gi, "[$1]").replace("\uFEFF", "")
    }

    var _validTags = "span,p,h1,h2,h3,h4,h5,h6,br,b,a,img,li,hr,ol,li,ul,strong,em,pre,address";

    // Establish options for the editor
    var options = {
        convert_urls: false,
        selector: "div.c-html .c-editor div",
        relative_urls: false,
        remove_script_host: false,
        plugins: ["paste preview searchreplace noneditable link Cognito.plugins.TokenSelectorPlugin"],
        noneditable_leave_contenteditable: true,
        default_link_target: "_top",
        target_list: [
            { title: 'Current Window', value: '_top' },
            { title: 'New Window', value: '_blank' },
            { title: 'Current Frame', value: '_self' }
        ],
        menubar: false,
        statusbar: false,
        toolbar1: "formatselect fontselect | bold italic underline | bullist numlist",
        toolbar2: "alignleft aligncenter alignright alignjustify | outdent indent | hr link image | tokenselector",
        inline: true,
        fixed_toolbar_container: "#c-forms-tinymce-toolbar",
        toolbar_items_size: "small",
        entity_encoding: "raw",
        content_css: "/content/c-tinymce.css",
        font_formats: "Arial=arial,helvetica,sans-serif;" +
        "Georgia=georgia,palatino,serif;" +
        "Times New Roman=times new roman,times,serif;" +
        "Trebuchet MS=trebuchet ms,geneva,sans-serif;" +
        "Verdana=verdana,geneva,sans-serif;",
        urlconverter_callback: function (url, tag, bool, attr) {
            return stripEditorHtml(url);
        },
        paste_preprocess: function (pl, o) {
        },
        paste_postprocess: function (pl, o) {
            // Remove <font> tags (IE converts MS Word formatting to font tags)
            $(o.node).find('font').contents().unwrap();

            $(o.node).find(":not(" + _validTags + ")").contents().unwrap();
            $(o.node).find(":input").remove();

            // Remove all style attributes
            $.each($(o.node).find('*[style]'), function () {
                this.removeAttribute('style');
                this.removeAttribute('data-mce-style');
            });
        },
        submit_patch: false,
        setup: function (editor) {

            var element = $(editor.getElement());
            if (element.hasClass("c-token-only")) {
                editor.settings.toolbar1 = "tokenselector";
                editor.settings.toolbar2 = "";
            }

            //editor.addButton('image', {
            //	title: 'Insert/edit image',
            //	onclick: function () {
            //		// Add you own code to execute something on click
            //		editor.focus();
            //		editor.selection.setContent('Hello world!');
            //	}
            //});

            editor.on("focus", function (editor) {
                var element = $(editor.target.bodyElement);
                var container = element.parents(".c-forms-settings");
                container.append($("#c-forms-tinymce-toolbar"));
                $("#c-forms-tinymce-toolbar").css("display", "block");
                $("#c-forms-tinymce-toolbar").css("top", (element.position().top - (element.hasClass("c-token-only") ? 35 : 65)) + "px");
                if (element.width() < 300) {
                    $("#c-forms-tinymce-toolbar").css("left", element.position().left + "px");
                    $("#c-forms-tinymce-toolbar").css("right", "auto");
                }
                else {
                    $("#c-forms-tinymce-toolbar").css("left", "auto");
                    $("#c-forms-tinymce-toolbar").css("right", (container.width() - element.outerWidth() - element.position().left) + "px");
                }
            });

            editor.on("blur", function (editor) {
                var element = $(editor.target.bodyElement);

                $("#c-forms-tinymce-toolbar").css("display", "none");
            });

            editor.on("keypress", function (e) {
                var node = tinymce.activeEditor.selection.getNode();
                // Don't consider backspace, delete or arrow keys (left,up,right,down=>37,38,39,40)
                // get the current node of the active editor and remove the bogus and non-editablecaret attributes
                // these cause issues when trying to delete/edit items around a token
                if (e.keyCode < 37 || e.keyCode > 40) {
                    if (node.id === "mce_noneditablecaret") {
                        node.removeAttribute("data-mce-bogus");
                        node.setAttribute("id", "mce_editablecaret");
                    }
                }
            });

            editor.on("change", function (editor) {
                // suppress events so spellchecker will work
                this.save();

                var element = $(editor.target.bodyElement);

                // Get the current value of the editor.
                //var newValue = $.trim(element.html());
                var newValue = tinyMCE.activeEditor.getContent();

                // Remove all image resize handles from the markup before saving. The editor will break if the temporary/bogus markup is encountered when the editor initialized.
                newValue = newValue.replace(/\<div.*?data-mce-bogus.*?\<\/div\>/gi, "");

                // get the current node of the active editor and remove the bogus and non-editablecaret attributes
                // these cause issues when trying to delete/edit items around a token
                var node = tinymce.activeEditor.selection.getNode();
                if (node.id === "mce_noneditablecaret") {
                    node.removeAttribute("data-mce-bogus");
                    node.setAttribute("id", "mce_editablecaret");
                }

                // Get rid of empty html added by editor so that requiredness checks work as expected.
                if (newValue === "<p>&nbsp;</p>") {
                    element.html(newValue = "");
                }

                // Convert tokens into the correct syntax
                newValue = stripEditorHtml(newValue);

                if (element.attr("data-text-only"))
                    newValue = $("<span>" + newValue + "</span>").text();

                // Get the target property that is being bound to.
                var targetProperty = element.attr("data-property");

                // Swallowing error, �Not within a container template�, thrown by $parentContextData when a 
                // template sub container is not found for the bound element due to the expeceted datacontext no longer existing  
                try {
                    // Get the current value of the target so that we can compare it with the new value.
                    var instance = $parentContextData(element.get(0));
                    var currentValue = window.ExoWeb.evalPath(instance, targetProperty);

                    // If the value has actually changed then set the value using the observer.  Otherwise, just raise 
                    // the event since the value was probably originally changed without using the observer.
                    if (currentValue !== newValue)
                        ExoWeb.Observer.setValue(instance, targetProperty, newValue);
                    else
                        ExoWeb.Observer.raisePropertyChanged(instance, targetProperty);
                }
                catch (err) { };
            });
        }

    };

    tinyMCE.PluginManager.add("Cognito.plugins.TokenSelectorPlugin", function (ed, url) {
        var boundElement = $(ed.getElement());
        if (boundElement.length > 0) {
            var instance = $parentContextData(boundElement.get(0));
            var options = [];

            if (boundElement.attr("data-tinymce-tokens")) {
                var tokenPropertyName = boundElement.attr("data-tinymce-tokens");
                var targetObj = instance instanceof ExoWeb.View.Adapter ? instance.get_target() : instance;
                var tokens = targetObj["get_" + tokenPropertyName]();
                for (var i = 0; i < tokens.length; i++) {
                    var token = tokens[i];

                    var value = "<span class='mceNonEditable'>" + token.InternalName + "</span>";
                    if (token.IsLink)
                        value = "<a href='[" + token.InternalName + "]' target='_blank'>" + token.Name + "</a>";

                    // if the element allows spaces, then append a space to the front and back of the value
                    // to ensure that cannot accidently change the token value.
                    if (!boundElement.attr("data-no-spaces"))
                        value = "&nbsp;" + value + "&nbsp;";

                    options.push({ text: token.Path, value: value, disabled: token.InternalName === "" });
                }

                ed.addButton("tokenselector", {
                    text: "Insert Field",
                    type: "listbox",
                    icon: false,
                    values: options,
                    onselect: function (e) {
                        ed.insertContent(this.value());
                        this.value(null);
                    },
                    onpostrender: function () {
                        return;
                    },
                    createmenu: function () {
                        return;
                    }
                });
            }
        }
    });

    tinyMCE.EditorManager.suffix = ".min";

    Cognito.initializeHtmlEditors = function (processOptions) {
        // Image insertion is not available on all pages that use the HTML editor (e.g. share entry dialog opened from entry details)
        if (Cognito.Image)
            options.plugins.push("image");
        tinymce.init(options);
    };

    // Image Plugin
    /**
     * plugin.js
     *
     * Copyright, Moxiecode Systems AB
     * Released under LGPL License.
     *
     * License: http://www.tinymce.com/license
     * Contributing: http://www.tinymce.com/contributing
     */

    /*global tinymce:true */

    var editImageDialog;

    tinymce.PluginManager.add('image', function (editor) {

        function getImageSize(url, callback) {
            var img = document.createElement('img');

            function done(width, height) {
                if (img.parentNode) {
                    img.parentNode.removeChild(img);
                }

                callback({ width: width, height: height });
            }

            img.onload = function () {
                done(Math.max(img.width, img.clientWidth), Math.max(img.height, img.clientHeight));
            };

            img.onerror = function () {
                done();
            };

            var style = img.style;
            style.visibility = 'hidden';
            style.position = 'fixed';
            style.bottom = style.left = 0;
            style.width = style.height = 'auto';

            document.body.appendChild(img);
            img.src = url;
        }

        function showDialog() {
            var win, data = {}, dom = editor.dom, imgElm = editor.selection.getNode();
            var width, height, image = new Cognito.Image();

            function onSubmitForm(image) {

                function waitLoad(imgElm) {
                    function selectImage() {
                        imgElm.onload = imgElm.onerror = null;

                        if (editor.selection) {
                            editor.selection.select(imgElm);
                            editor.nodeChanged();
                        }
                    }

                    imgElm.onload = function () {
                        //if (!data.width && !data.height) {
                        //	dom.setAttribs(imgElm, {
                        //		width: imgElm.clientWidth,
                        //		height: imgElm.clientHeight
                        //	});
                        //}

                        selectImage();
                    };

                    imgElm.onerror = selectImage;
                }

                data.src = image.get_url();

                // Setup new data excluding style properties
                /*eslint dot-notation: 0*/
                data = {
                    src: image.get_url(),
                    alt: data.alt,
                    title: data.title,
                    width: data.width,
                    height: data.height,
                    style: data.style,
                    "class": data["class"]
                };

                editor.undoManager.transact(function () {
                    if (!data.src) {
                        if (imgElm) {
                            dom.remove(imgElm);
                            editor.focus();
                            editor.nodeChanged();
                        }

                        return;
                    }

                    if (data.title === "") {
                        data.title = null;
                    }

                    if (!imgElm) {
                        data.id = '__mcenew';
                        editor.focus();
                        editor.selection.setContent(dom.createHTML('img', data));
                        imgElm = dom.get('__mcenew');
                        dom.setAttrib(imgElm, 'id', null);
                    } else {
                        dom.setAttribs(imgElm, data);
                    }

                    waitLoad(imgElm);
                });
            }

            width = dom.getAttrib(imgElm, 'width');
            height = dom.getAttrib(imgElm, 'height');

            if (imgElm.nodeName == 'IMG' && !imgElm.getAttribute('data-mce-object') && !imgElm.getAttribute('data-mce-placeholder')) {
                data = {
                    src: dom.getAttrib(imgElm, 'src'),
                    alt: dom.getAttrib(imgElm, 'alt'),
                    title: dom.getAttrib(imgElm, 'title'),
                    "class": dom.getAttrib(imgElm, 'class'),
                    width: width,
                    height: height
                };
            } else {
                imgElm = null;
            }

            $("#c-forms-tinymce-toolbar").css("display", "none");

            // Extracts a text value from a string and returns a default value if not found
            function getValue(data, regex, index, def) {
                var result = regex.exec(data);
                if (result && result.length > index)
                    return result[index];
                return def;
            }

            image.set_url(data.src);

            // See if the user is attempting to edit an existing uploaded image
            var fileInfo = /\/file\/([a-zA-Z0-9-_.]+)\?id=(F-[!$0-9a-zA-Z]{22})/.exec(data.src);
            if (fileInfo) {
                image.set_file(new Cognito.FileDataRef({
                    Id: fileInfo[2],
                    Name: decodeURIComponent(getValue(data.src, /\&name=(.*?)\&/i, 1, "Image")),
                    ContentType: decodeURIComponent(getValue(data.src, /\&ct=(.*?)\&/i, 1, "Image")),
                    Size: parseInt(getValue(data.src, /\&size=(\d+)/i, 1, "0")) || 0
                }));
                image.set_source("File");
            }
            else {
                image.set_source("URL");
                image.set_file(null);
            }

            // Open the image editor dialog
            editImage(image, onSubmitForm);
        }

        // Opens the image editing dialog for the specified image and calls the specified callback when saved
        function editImage(image, callback) {

            // Create the dialog
            if (!editImageDialog)
                editImageDialog = $.fn.dialog({
                    title: 'Insert/Edit Image',
                    contentSelector: '#edit-image-dialog',
                    height: 400,
                    width: 425,
                    buttons: [
                        {
                            label: "Cancel",
                            isCancel: true
                        },
                        {
                            label: "Save",
                            isDefault: true,
                            autoClose: false,
                            click: function () {
                                var image = Cognito.Forms.model.image;
                                var validationElements = $("#edit-image-dialog .c-validation:not(:empty)");

                                if (validationElements.length > 0) {
                                    validationElements.show();
                                    editImageDialog._dialog.find(".c-modal-button-executing").removeClass("c-modal-button-executing");
                                    return;
                                } else {
                                    this.close();
                                    $("#c-forms-tinymce-toolbar").css("display", "block");

                                    // Get a permanent link to the file and append file metadata
                                    if (!image) {
                                        image.set_url("");
                                    } else if (image.get_source() == "File" && image.get_file())
                                        Cognito.Forms.getPermalink(image.get_file().get_Id(), function (url) {
                                            url += "?id=" + image.get_file().get_Id() + "&name=" + encodeURIComponent(image.get_file().get_Name()) + "&ct=" + encodeURIComponent(image.get_file().get_ContentType()) + "&size=" + encodeURIComponent(image.get_file().get_Size());
                                            image.set_url(url);
                                            if (editImageDialog.callback)
                                                editImageDialog.callback(image);
                                        });

                                    // Otherwise, just invoke the callback
                                    else {
                                        if (editImageDialog.callback)
                                            editImageDialog.callback(image);
                                    }
                                }
                            }
                        }
                    ]
                });

            // Store the callback
            editImageDialog.callback = callback;

            // Set the image model property
            ExoWeb.Observer.setValue(Cognito.Forms.model, "image", image);

            // Open the dialog
            editImageDialog.open();
        }

        editor.addButton('image', {
            icon: 'image',
            tooltip: 'Insert/edit image',
            onclick: showDialog,
            stateSelector: 'img:not([data-mce-object],[data-mce-placeholder])'
        });

        editor.addMenuItem('image', {
            icon: 'image',
            text: 'Insert/edit image',
            onclick: showDialog,
            context: 'insert',
            prependToContext: true
        });

        editor.addCommand('mceImage', showDialog);
    });
})();})();
;(function() { if (Cognito.config.scripts.indexOf('cognito-datepicker') >= 0) return; else Cognito.config.scripts.push('cognito-datepicker');/* =========================================================
 * bootstrap-datepicker.js
 * http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Copyright 2012 Stefan Petre
 * Improvements by Andrew Rowls
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function ($) {

	var $window = $(window);

	function UTCDate() {
		return new Date(Date.UTC.apply(Date, arguments));
	}
	function UTCToday() {
		var today = new Date();
		return UTCDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	}


	// Picker object

	var Datepicker = function (element, options) {
		var that = this;

		this._process_options(options);

		this.element = $(element);
		this.isInline = false;
		//this.isInput = this.element.is('input');
		this.isInput = true;
		this.component = this.element.parent().parent().find(".c-editor-date-icon:first");
		this.hasInput = false;
		if (this.component && this.component.length === 0)
			this.component = false;

		this.picker = $(DPGlobal.template);
		this._buildEvents();
		this._attachEvents();

		if (this.isInline) {
			this.picker.addClass('cognito-datepicker-inline').appendTo(this.element);
		} else {
			this.picker.addClass('cognito-datepicker-dropdown cognito-dropdown-menu');
		}

		if (this.o.rtl) {
			this.picker.addClass('cognito-datepicker-rtl');
			this.picker.find('.prev i, .next i')
						.toggleClass('icon-arrow-left icon-arrow-right');
		}


		this.viewMode = this.o.startView;

		if (this.o.calendarWeeks)
			this.picker.find('tfoot th.today')
						.attr('colspan', function (i, val) {
							return parseInt(val) + 1;
						});

		this._allow_update = false;

		this.setStartDate(this._o.startDate);
		this.setEndDate(this._o.endDate);
		this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);

		this.fillDow();
		this.fillMonths();

		this._allow_update = true;

		this.update();
		this.showMode();

		if (this.isInline) {
			this.show();
		}
	};

	Datepicker.prototype = {
		constructor: Datepicker,

		_process_options: function (opts) {
			// Store raw options for reference
			this._o = $.extend({}, this._o, opts);
			// Processed options
			var o = this.o = $.extend({}, this._o);

			// override the dates variable
			if (opts.dates)
				$.extend(dates, opts.dates);

			// Check if "de-DE" style date is available, if not language should
			// fallback to 2 letter code eg "de"
			var lang = o.language;
			if (!dates[lang]) {
				lang = lang.split('-')[0];
				if (!dates[lang])
					lang = defaults.language;
			}
			o.language = lang;

			switch (o.startView) {
				case 2:
				case 'decade':
					o.startView = 2;
					break;
				case 1:
				case 'year':
					o.startView = 1;
					break;
				default:
					o.startView = 0;
			}

			switch (o.minViewMode) {
				case 1:
				case 'months':
					o.minViewMode = 1;
					break;
				case 2:
				case 'years':
					o.minViewMode = 2;
					break;
				default:
					o.minViewMode = 0;
			}

			o.startView = Math.max(o.startView, o.minViewMode);

			o.weekStart %= 7;
			o.weekEnd = ((o.weekStart + 6) % 7);

			var format = DPGlobal.parseFormat(o.format);
			if (o.startDate !== -Infinity) {
				if (!!o.startDate) {
					if (o.startDate instanceof Date)
						o.startDate = this._local_to_utc(this._zero_time(o.startDate));
					else
						o.startDate = DPGlobal.parseDate(o.startDate, format, o.language);
				} else {
					o.startDate = -Infinity;
				}
			}
			if (o.endDate !== Infinity) {
				if (!!o.endDate) {
					if (o.endDate instanceof Date)
						o.endDate = this._local_to_utc(this._zero_time(o.endDate));
					else
						o.endDate = DPGlobal.parseDate(o.endDate, format, o.language);
				} else {
					o.endDate = Infinity;
				}
			}

			o.daysOfWeekDisabled = o.daysOfWeekDisabled || [];
			if (!$.isArray(o.daysOfWeekDisabled))
				o.daysOfWeekDisabled = o.daysOfWeekDisabled.split(/[,\s]*/);
			o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled, function (d) {
				return parseInt(d, 10);
			});

			var plc = String(o.orientation).toLowerCase().split(/\s+/g),
				_plc = o.orientation.toLowerCase();
			plc = $.grep(plc, function (word) {
				return (/^auto|left|right|top|bottom$/).test(word);
			});
			o.orientation = { x: 'auto', y: 'auto' };
			if (!_plc || _plc === 'auto')
				; // no action
			else if (plc.length === 1) {
				switch (plc[0]) {
					case 'top':
					case 'bottom':
						o.orientation.y = plc[0];
						break;
					case 'left':
					case 'right':
						o.orientation.x = plc[0];
						break;
				}
			}
			else {
				_plc = $.grep(plc, function (word) {
					return (/^left|right$/).test(word);
				});
				o.orientation.x = _plc[0] || 'auto';

				_plc = $.grep(plc, function (word) {
					return (/^top|bottom$/).test(word);
				});
				o.orientation.y = _plc[0] || 'auto';
			}
		},
		_events: [],
		_secondaryEvents: [],
		_applyEvents: function (evs) {
			for (var i = 0, el, ev; i < evs.length; i++) {
				el = evs[i][0];
				ev = evs[i][1];
				el.on(ev);
			}
		},
		_unapplyEvents: function (evs) {
			for (var i = 0, el, ev; i < evs.length; i++) {
				el = evs[i][0];
				ev = evs[i][1];
				el.off(ev);
			}
		},

		//Toggles the widget open and close
		toggleWidget: function (e) {
			if ($(this.picker).is(":visible"))
				this.hide();
			else {
				this.show();
			}
		},

		_buildEvents: function () {
			if (this.isInput) { // single input
				this._events = [
					[this.element, {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(this.update, this),
						keydown: $.proxy(this.keydown, this)
					}],
					[this.element.parent().parent().find('.c-editor-date-icon'), {
						click: $.proxy(this.toggleWidget, this)
					}]
				];
			}
			else if (this.element.is('div')) {  // inline datepicker
				this.isInline = true;
			}
			else {
				this._events = [
					[this.element, {
						click: $.proxy(this.show, this)
					}]
				];
			}

			this._secondaryEvents = [
				[this.picker, {
					click: $.proxy(this.click, this)
				}],
				[$(window), {
					resize: $.proxy(this.place, this)
				}],
				[$(document), {
					mousedown: $.proxy(function (e) {
						//If the target is not the picker or the date field's widget, icon, or input field, then hide the widget
						if (!(
							this.element.is(e.target) ||
							this.picker.is(e.target) ||
							this.picker.find(e.target).length
						) && (
							//the user is not clicking the editor or icon that belongs to this field
                            !(e.target.className.indexOf("c-editor-date") > -1 ||
                                e.target.className.indexOf("icon-calendar") > -1 ||
                                e.target.className.indexOf("date-icon") > -1 ||
                                this.picker.is(e.target)) ||
                            $(e.target).parents(".c-date-date")[0] !== $(this.element).parents(".c-date-date")[0]
							)
						) {
							this.hide();
						}
					}, this)
				}]
			];
		},
		_attachEvents: function () {
			this._detachEvents();
			this._applyEvents(this._events);
		},
		_detachEvents: function () {
			this._unapplyEvents(this._events);
		},
		_attachSecondaryEvents: function () {
			this._detachSecondaryEvents();
			this._applyEvents(this._secondaryEvents);
		},
		_detachSecondaryEvents: function () {
			this._unapplyEvents(this._secondaryEvents);
		},
		_trigger: function (event, altdate) {
			var date = altdate || this.date,
				local_date = this._utc_to_local(date);

			this.element.trigger({
				type: event,
				date: local_date,
				format: $.proxy(function (altformat) {
					var format = altformat || this.o.format;
					return DPGlobal.formatDate(date, format, this.o.language);
				}, this)
			});
		},

		show: function (e) {
			if ($(this.picker).is(":visible"))
				return;
			if (!this.isInline)
				this.picker.appendTo("body");
			this.picker.show();
			this.height = this.component ? this.component.outerHeight() : this.element.outerHeight();
			this.place();
			this._attachSecondaryEvents();
			if (e) {
                e.preventDefault();                
            }

            if (this.element.val() !== "") {
                this.date = new Date(this.element.val());
                this.update();
            }
            
			this.setValue(); //Required to send information to Cogntio on close
            this._trigger('click'); //Sets focus back to the input field, not the widget
			this._trigger('show');		
		},

		hide: function (e) {
			if (this.isInline) return;
			if (!this.picker.is(':visible')) return;
			this.picker.hide().detach();
			this._detachSecondaryEvents();
			this.viewMode = this.o.startView;
			this.showMode();

			//Required to send information to Cogntio on close
			this._trigger('click');
			this._trigger('hide');
		},

		remove: function () {
			this.hide();
			this._detachEvents();
			this._detachSecondaryEvents();
			this.picker.remove();
			delete this.element.data().datepicker;
			if (!this.isInput) {
				delete this.element.data().date;
			}
		},

		_utc_to_local: function (utc) {
			return new Date(utc.getTime() + (utc.getTimezoneOffset() * 60000));
		},
		_local_to_utc: function (local) {
			return new Date(local.getTime() - (local.getTimezoneOffset() * 60000));
		},
		_zero_time: function (local) {
			return new Date(local.getFullYear(), local.getMonth(), local.getDate());
		},
		_zero_utc_time: function (utc) {
			return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
		},

		getDate: function () {
			return this._utc_to_local(this.getUTCDate());
		},

		getUTCDate: function () {
			return this.date;
		},

		setDate: function (d) {
			this.setUTCDate(this._local_to_utc(d));
		},

		setUTCDate: function (d) {
			this.date = d;
			this.setValue();
		},

		setValue: function () {
			var formatted = this.getFormattedDate();
            if (!this.isInput) {
				if (this.component) {
                    this.element.find('input').val(formatted).change();
				}
			} else {
				this.element.val(formatted).change();
			}
		},

		getFormattedDate: function (format) {
			if (format === undefined)
				format = this.o.format;
			return DPGlobal.formatDate(this.date, format, this.o.language);
		},

		setStartDate: function (startDate) {
			this._process_options({ startDate: startDate });
			this.update();
			this.updateNavArrows();
		},

		setEndDate: function (endDate) {
			this._process_options({ endDate: endDate });
			this.update();
			this.updateNavArrows();
		},

		setDaysOfWeekDisabled: function (daysOfWeekDisabled) {
			this._process_options({ daysOfWeekDisabled: daysOfWeekDisabled });
			this.update();
			this.updateNavArrows();
		},

		place: function () {
			if (this.isInline) return;
			var calendarWidth = this.picker.outerWidth(),
				calendarHeight = this.picker.outerHeight(),
				visualPadding = 10,
				windowWidth = $window.width(),
				windowHeight = $window.height(),
				scrollTop = $window.scrollTop();

			var zIndex = parseInt(this.element.parents().filter(function () {
				return $(this).css('z-index') != 'auto';
			}).first().css('z-index')) + 10;
			var offset = this.element.offset();
			var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
			var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
			var left = offset.left,
				top = offset.top;

			this.picker.removeClass(
				'cognito-datepicker-orient-top cognito-datepicker-orient-bottom ' +
				'cognito-datepicker-orient-right cognito-datepicker-orient-left ' +
                'cognito-datepicker-center-arrow'
			);

			if (this.o.orientation.x !== 'auto') {
				this.picker.addClass('cognito-datepicker-orient-' + this.o.orientation.x);
				if (this.o.orientation.x === 'right')
					left -= calendarWidth - width;
			}
            // auto x orientation is best-placement: if it crosses a window
            // edge, fudge it sideways
			else {
				// Default to left
				this.picker.addClass('cognito-datepicker-orient-left');
				if (offset.left < 0)
					left -= offset.left - visualPadding;
				else if (offset.left + calendarWidth > windowWidth)
					left = windowWidth - calendarWidth - visualPadding;
			}

			if (left + calendarWidth + visualPadding >= windowWidth)
			    this.picker.addClass('cognito-datepicker-center-arrow');

			// auto y orientation is best-situation: top or bottom, no fudging,
			// decision based on which shows more of the calendar
			var yorient = this.o.orientation.y,
				top_overflow, bottom_overflow;
			if (yorient === 'auto') {
				top_overflow = -scrollTop + offset.top - calendarHeight;
				bottom_overflow = scrollTop + windowHeight - (offset.top + height + calendarHeight);
				if (Math.max(top_overflow, bottom_overflow) === bottom_overflow)
					yorient = 'top';
				else
					yorient = 'bottom';
			}
			this.picker.addClass('cognito-datepicker-orient-' + yorient);
			if (yorient === 'top')
				top += height + 6;
			else
				top -= calendarHeight + parseInt(this.picker.css('padding-top'));

			this.picker.css({
				top: top,
				left: left,
				zIndex: zIndex
			});
		},

		_allow_update: true,
		update: function () {
			if (!this._allow_update) return;

			var oldDate = new Date(this.date),
				date, fromArgs = false;
			if (arguments && arguments.length && (typeof arguments[0] === 'string' || arguments[0] instanceof Date)) {
				date = arguments[0];
				if (date instanceof Date)
					date = this._local_to_utc(date);
				fromArgs = true;
			} else {
				date = this.isInput ? this.element.val() : this.element.data('date') || this.element.find('input').val();
				delete this.element.data().date;
			}

			this.date = DPGlobal.parseDate(date, this.o.format, this.o.language);

			if (fromArgs) {
				// setting date by clicking
				this.setValue();
			} else if (date) {
				// setting date by typing
				if (oldDate.getTime() !== this.date.getTime())
					this._trigger('changeDate');
			} else {
				// clearing date
				this._trigger('clearDate');
			}

			if (this.date < this.o.startDate) {
				this.viewDate = new Date(this.o.startDate);
				this.date = new Date(this.o.startDate);
			} else if (this.date > this.o.endDate) {
				this.viewDate = new Date(this.o.endDate);
				this.date = new Date(this.o.endDate);
			} else {
				this.viewDate = new Date(this.date);
				this.date = new Date(this.date);
			}
			this.fill();
            var keys = [
                "37",	// left
                "38",	// up
                "39",	// right
                "40"	// down
            ];

            if (arguments && arguments.length && keys.indexOf(arguments[0].keyCode) !== -1)
                arguments[0].stopPropagation();
		},

		fillDow: function () {
			var dowCnt = this.o.weekStart,
			html = '<tr>';
			if (this.o.calendarWeeks) {
				var cell = '<th class="cw">&nbsp;</th>';
				html += cell;
				this.picker.find('.cognito-datepicker-days thead tr:first-child').prepend(cell);
			}
			while (dowCnt < this.o.weekStart + 7) {
				html += '<th class="dow">' + dates[this.o.language].daysMin[(dowCnt++) % 7] + '</th>';
			}
			html += '</tr>';
			this.picker.find('.cognito-datepicker-days thead').append(html);
		},

		fillMonths: function () {
			var html = '',
			i = 0;
			while (i < 12) {
				html += '<span class="month">' + dates[this.o.language].monthsShort[i++] + '</span>';
			}
			this.picker.find('.cognito-datepicker-months td').html(html);
		},

		setRange: function (range) {
			if (!range || !range.length)
				delete this.range;
			else
				this.range = $.map(range, function (d) { return d.valueOf(); });
			this.fill();
		},

		getClassNames: function (date) {
			var cls = [],
				year = this.viewDate.getUTCFullYear(),
				month = this.viewDate.getUTCMonth(),
				currentDate = this.date.valueOf(),
				today = new Date();
			if (date.getUTCFullYear() < year || (date.getUTCFullYear() == year && date.getUTCMonth() < month)) {
				cls.push('old');
			} else if (date.getUTCFullYear() > year || (date.getUTCFullYear() == year && date.getUTCMonth() > month)) {
				cls.push('new');
			}
			// Compare internal UTC date with local today, not UTC today
			if (this.o.todayHighlight &&
				date.getUTCFullYear() == today.getFullYear() &&
				date.getUTCMonth() == today.getMonth() &&
				date.getUTCDate() == today.getDate()) {
				cls.push('today');
			}
			if (currentDate && date.valueOf() == currentDate) {
				cls.push('active');
			}
			if (date.valueOf() < this.o.startDate || date.valueOf() > this.o.endDate ||
				$.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1) {
				cls.push('disabled');
			}
			if (this.range) {
				if (date > this.range[0] && date < this.range[this.range.length - 1]) {
					cls.push('range');
				}
				if ($.inArray(date.valueOf(), this.range) != -1) {
					cls.push('selected');
				}
			}
			return cls;
		},

		fill: function () {
			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth(),
				startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
				startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
				endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
				endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
				currentDate = this.date && this.date.valueOf(),
				tooltip;
			this.picker.find('.cognito-datepicker-days thead th.datepicker-switch')
						.text(dates[this.o.language].months[month] + ' ' + year);
			this.picker.find('tfoot th.today')
						.text(dates[this.o.language].today)
						.toggle(this.o.todayBtn !== false);
			this.picker.find('tfoot th.clear')
						.text(dates[this.o.language].clear)
						.toggle(this.o.clearBtn !== false);
			this.updateNavArrows();
			this.fillMonths();
			var prevMonth = UTCDate(year, month - 1, 28, 0, 0, 0, 0),
				day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
			prevMonth.setUTCDate(day);
			prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7) % 7);
			var nextMonth = new Date(prevMonth);
			nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
			nextMonth = nextMonth.valueOf();
			var html = [];
			var clsName;
			while (prevMonth.valueOf() < nextMonth) {
				if (prevMonth.getUTCDay() == this.o.weekStart) {
					html.push('<tr>');
					if (this.o.calendarWeeks) {
						// ISO 8601: First week contains first thursday.
						// ISO also states week starts on Monday, but we can be more abstract here.
						var
							// Start of current week: based on weekstart/current date
							ws = new Date(+prevMonth + (this.o.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5),
							// Thursday of this week
							th = new Date(+ws + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
							// First Thursday of year, year from thursday
							yth = new Date(+(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay()) % 7 * 864e5),
							// Calendar week: ms between thursdays, div ms per day, div 7 days
							calWeek = (th - yth) / 864e5 / 7 + 1;
						html.push('<td class="cw">' + calWeek + '</td>');

					}
				}
				clsName = this.getClassNames(prevMonth);
				clsName.push('day');

				if (this.o.beforeShowDay !== $.noop) {
					var before = this.o.beforeShowDay(this._utc_to_local(prevMonth));
					if (before === undefined)
						before = {};
					else if (typeof (before) === 'boolean')
						before = { enabled: before };
					else if (typeof (before) === 'string')
						before = { classes: before };
					if (before.enabled === false)
						clsName.push('disabled');
					if (before.classes)
						clsName = clsName.concat(before.classes.split(/\s+/));
					if (before.tooltip)
						tooltip = before.tooltip;
				}

				clsName = $.unique(clsName);
				html.push('<td class="' + clsName.join(' ') + '"' + (tooltip ? ' title="' + tooltip + '"' : '') + '>' + prevMonth.getUTCDate() + '</td>');
				if (prevMonth.getUTCDay() == this.o.weekEnd) {
					html.push('</tr>');
				}
				prevMonth.setUTCDate(prevMonth.getUTCDate() + 1);
			}
			this.picker.find('.cognito-datepicker-days tbody').empty().append(html.join(''));
			var currentYear = this.date && this.date.getUTCFullYear();

			var months = this.picker.find('.cognito-datepicker-months')
						.find('th:eq(1)')
							.text(year)
							.end()
						.find('span').removeClass('active');
			if (currentYear && currentYear == year) {
				months.eq(this.date.getUTCMonth()).addClass('active');
			}
			if (year < startYear || year > endYear) {
				months.addClass('disabled');
			}
			if (year == startYear) {
				months.slice(0, startMonth).addClass('disabled');
			}
			if (year == endYear) {
				months.slice(endMonth + 1).addClass('disabled');
			}

			html = '';
			year = parseInt(year / 10, 10) * 10;
			var yearCont = this.picker.find('.cognito-datepicker-years')
								.find('th:eq(1)')
									.text(year + '-' + (year + 9))
									.end()
								.find('td');
			year -= 1;
			for (var i = -1; i < 11; i++) {
				html += '<span class="year' + (i == -1 ? ' old' : i == 10 ? ' new' : '') + (currentYear == year ? ' active' : '') + (year < startYear || year > endYear ? ' disabled' : '') + '">' + year + '</span>';
				year += 1;
			}
			yearCont.html(html);
		},

		updateNavArrows: function () {
			if (!this._allow_update) return;

			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth();
			switch (this.viewMode) {
				case 0:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()) {
						this.picker.find('.prev').css({ visibility: 'hidden' });
					} else {
						this.picker.find('.prev').css({ visibility: 'visible' });
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() && month >= this.o.endDate.getUTCMonth()) {
						this.picker.find('.next').css({ visibility: 'hidden' });
					} else {
						this.picker.find('.next').css({ visibility: 'visible' });
					}
					break;
				case 1:
				case 2:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear()) {
						this.picker.find('.prev').css({ visibility: 'hidden' });
					} else {
						this.picker.find('.prev').css({ visibility: 'visible' });
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear()) {
						this.picker.find('.next').css({ visibility: 'hidden' });
					} else {
						this.picker.find('.next').css({ visibility: 'visible' });
					}
					break;
			}
		},

		click: function (e) {
			e.preventDefault();
			var target = $(e.target).closest('span, td, th');
			if (target.length == 1) {
				switch (target[0].nodeName.toLowerCase()) {
					case 'th':
						switch (target[0].className) {
							case 'datepicker-switch':
								this.showMode(1);
								break;
							case 'prev':
							case 'next':
								var dir = DPGlobal.modes[this.viewMode].navStep * (target[0].className == 'prev' ? -1 : 1);
								switch (this.viewMode) {
									case 0:
										this.viewDate = this.moveMonth(this.viewDate, dir);
										this._trigger('changeMonth', this.viewDate);
										break;
									case 1:
									case 2:
										this.viewDate = this.moveYear(this.viewDate, dir);
										if (this.viewMode === 1)
											this._trigger('changeYear', this.viewDate);
										break;
								}
								this.fill();
								break;
							case 'today':
								var date = new Date();
								date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

								this.showMode(-2);
								var which = this.o.todayBtn == 'linked' ? null : 'view';
								this._setDate(date, which);
								break;
							case 'clear':
								var element;
								if (this.isInput)
									element = this.element;
								else if (this.component)
									element = this.element.find('input');
								if (element)
									element.val("").change();
								this._trigger('changeDate');
								this.update();
								if (this.o.autoclose)
									this.hide();
								break;
						}
						break;
					case 'span':
						if (!target.is('.disabled')) {
							this.viewDate.setUTCDate(1);
							if (target.is('.month')) {
								var day = 1;
								var month = target.parent().find('span').index(target);
								var year = this.viewDate.getUTCFullYear();
								this.viewDate.setUTCMonth(month);
								this._trigger('changeMonth', this.viewDate);
								if (this.o.minViewMode === 1) {
									this._setDate(UTCDate(year, month, day, 0, 0, 0, 0));
								}
							} else {
								var year = parseInt(target.text(), 10) || 0;
								var day = 1;
								var month = 0;
								this.viewDate.setUTCFullYear(year);
								this._trigger('changeYear', this.viewDate);
								if (this.o.minViewMode === 2) {
									this._setDate(UTCDate(year, month, day, 0, 0, 0, 0));
								}
							}
							this.showMode(-1);
							this.fill();
						}
						break;
					case 'td':
						if (target.is('.day') && !target.is('.disabled')) {
							var day = parseInt(target.text(), 10) || 1;
							var year = this.viewDate.getUTCFullYear(),
								month = this.viewDate.getUTCMonth();
							if (target.is('.old')) {
								if (month === 0) {
									month = 11;
									year -= 1;
								} else {
									month -= 1;
								}
							} else if (target.is('.new')) {
								if (month == 11) {
									month = 0;
									year += 1;
								} else {
									month += 1;
								}
							}
							this._setDate(UTCDate(year, month, day, 0, 0, 0, 0));
						}
						break;
				}
			}
		},

		_setDate: function (date, which) {
			if (!which || which == 'date')
				this.date = new Date(date);
			if (!which || which == 'view')
				this.viewDate = new Date(date);
			this.fill();
			this.setValue();
			this._trigger('changeDate');
			var element;
			if (this.isInput) {
				element = this.element;
			} else if (this.component) {
				element = this.element.find('input');
			}
			if (element) {
				element.change();
			}
			if (this.o.autoclose && (!which || which == 'date')) {
				this.hide();
			}
		},

		moveMonth: function (date, dir) {
			if (!dir) return date;
			var new_date = new Date(date.valueOf()),
				day = new_date.getUTCDate(),
				month = new_date.getUTCMonth(),
				mag = Math.abs(dir),
				new_month, test;
			dir = dir > 0 ? 1 : -1;
			if (mag == 1) {
				test = dir == -1
					// If going back one month, make sure month is not current month
					// (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
					? function () { return new_date.getUTCMonth() == month; }
					// If going forward one month, make sure month is as expected
					// (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
					: function () { return new_date.getUTCMonth() != new_month; };
				new_month = month + dir;
				new_date.setUTCMonth(new_month);
				// Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
				if (new_month < 0 || new_month > 11)
					new_month = (new_month + 12) % 12;
			} else {
				// For magnitudes >1, move one month at a time...
				for (var i = 0; i < mag; i++)
					// ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
					new_date = this.moveMonth(new_date, dir);
				// ...then reset the day, keeping it in the new month
				new_month = new_date.getUTCMonth();
				new_date.setUTCDate(day);
				test = function () { return new_month != new_date.getUTCMonth(); };
			}
			// Common date-resetting loop -- if date is beyond end of month, make it
			// end of month
			while (test()) {
				new_date.setUTCDate(--day);
				new_date.setUTCMonth(new_month);
			}
			return new_date;
		},

		moveYear: function (date, dir) {
			return this.moveMonth(date, dir * 12);
		},

		dateWithinRange: function (date) {
			return date >= this.o.startDate && date <= this.o.endDate;
		},

		keydown: function (e) {
			if (this.picker.is(':not(:visible)')) {
				if (e.keyCode == 27) // allow escape to hide and re-show picker
					this.show();
				return;
			}
			var dateChanged = false,
				dir, day, month,
				newDate, newViewDate;
			switch (e.keyCode) {
				case 27: // escape
					this.hide();
					e.preventDefault();
					break;
				case 37: // left
				case 39: // right
					if (!this.o.keyboardNavigation) break;
					dir = e.keyCode == 37 ? -1 : 1;
					if (e.ctrlKey) {
						newDate = this.moveYear(this.date, dir);
						newViewDate = this.moveYear(this.viewDate, dir);
						this._trigger('changeYear', this.viewDate);
					} else if (e.shiftKey) {
						newDate = this.moveMonth(this.date, dir);
						newViewDate = this.moveMonth(this.viewDate, dir);
						this._trigger('changeMonth', this.viewDate);
					} else {
						newDate = new Date(this.date);
						newDate.setUTCDate(this.date.getUTCDate() + dir);
						newViewDate = new Date(this.viewDate);
						newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir);
					}
					if (this.dateWithinRange(newDate)) {
						this.date = newDate;
						this.viewDate = newViewDate;
						this.setValue();
						this.update();
						e.preventDefault();
						dateChanged = true;
					}
					e.stopPropagation();
					break;
				case 38: // up
				case 40: // down
					if (!this.o.keyboardNavigation) break;
					dir = e.keyCode == 38 ? -1 : 1;
					if (e.ctrlKey) {
						newDate = this.moveYear(this.date, dir);
						newViewDate = this.moveYear(this.viewDate, dir);
						this._trigger('changeYear', this.viewDate);
					} else if (e.shiftKey) {
						newDate = this.moveMonth(this.date, dir);
						newViewDate = this.moveMonth(this.viewDate, dir);
						this._trigger('changeMonth', this.viewDate);
					} else {
						newDate = new Date(this.date);
						newDate.setUTCDate(this.date.getUTCDate() + dir * 7);
						newViewDate = new Date(this.viewDate);
						newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir * 7);
					}
					if (this.dateWithinRange(newDate)) {
						this.date = newDate;
						this.viewDate = newViewDate;
						this.setValue();
						this.update();
						e.preventDefault();
						dateChanged = true;
					}
					e.stopPropagation();
					break;
				case 13: // enter
					this.hide();
					e.preventDefault();
					break;
				case 9: // tab
					this.hide();
					break;
			}
			if (dateChanged) {
				this._trigger('changeDate');
				var element;
				if (this.isInput) {
					element = this.element;
				} else if (this.component) {
					element = this.element.find('input');
				}
				if (element) {
					element.change();
				}
			}
		},

		showMode: function (dir) {
			if (dir) {
				this.viewMode = Math.max(this.o.minViewMode, Math.min(2, this.viewMode + dir));
			}
			/*
				vitalets: fixing bug of very special conditions:
				jquery 1.7.1 + webkit + show inline datepicker in bootstrap popover.
				Method show() does not set display css correctly and datepicker is not shown.
				Changed to .css('display', 'block') solve the problem.
				See https://github.com/vitalets/x-editable/issues/37

				In jquery 1.7.2+ everything works fine.
			*/
			//this.picker.find('>div').hide().filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName).show();
			this.picker.find('>div').hide().filter('.cognito-datepicker-' + DPGlobal.modes[this.viewMode].clsName).css('display', 'block');
			this.updateNavArrows();
		}
	};

	var DateRangePicker = function (element, options) {
		this.element = $(element);
		this.inputs = $.map(options.inputs, function (i) { return i.jquery ? i[0] : i; });
		delete options.inputs;

		$(this.inputs)
			.datepicker(options)
			.bind('changeDate', $.proxy(this.dateUpdated, this));

		this.pickers = $.map(this.inputs, function (i) { return $(i).data('datepicker'); });
		this.updateDates();
	};
	DateRangePicker.prototype = {
		updateDates: function () {
			this.dates = $.map(this.pickers, function (i) { return i.date; });
			this.updateRanges();
		},
		updateRanges: function () {
			var range = $.map(this.dates, function (d) { return d.valueOf(); });
			$.each(this.pickers, function (i, p) {
				p.setRange(range);
			});
		},
		dateUpdated: function (e) {
			var dp = $(e.target).data('datepicker'),
				new_date = dp.getUTCDate(),
				i = $.inArray(e.target, this.inputs),
				l = this.inputs.length;
			if (i == -1) return;

			if (new_date < this.dates[i]) {
				// Date being moved earlier/left
				while (i >= 0 && new_date < this.dates[i]) {
					this.pickers[i--].setUTCDate(new_date);
				}
			}
			else if (new_date > this.dates[i]) {
				// Date being moved later/right
				while (i < l && new_date > this.dates[i]) {
					this.pickers[i++].setUTCDate(new_date);
				}
			}
			this.updateDates();
		},
		remove: function () {
			$.map(this.pickers, function (p) { p.remove(); });
			delete this.element.data().datepicker;
		}
	};

	function opts_from_el(el, prefix) {
		// Derive options from element data-attrs
		var data = $(el).data(),
			out = {}, inkey,
			replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])'),
			prefix = new RegExp('^' + prefix.toLowerCase());
		for (var key in data)
			if (prefix.test(key)) {
				inkey = key.replace(replace, function (_, a) { return a.toLowerCase(); });
				out[inkey] = data[key];
			}
		return out;
	}

	function opts_from_locale(lang) {
		// Derive options from locale plugins
		var out = {};
		// Check if "de-DE" style date is available, if not language should
		// fallback to 2 letter code eg "de"
		if (!dates[lang]) {
			lang = lang.split('-')[0]
			if (!dates[lang])
				return;
		}
		var d = dates[lang];
		$.each(locale_opts, function (i, k) {
			if (k in d)
				out[k] = d[k];
		});
		return out;
	}

	var old = $.fn.datepicker;
	$.fn.datepicker = function (option) {
		var args = Array.apply(null, arguments);
		args.shift();
		var internal_return,
			this_return;
		this.each(function () {
			var $this = $(this),
				data = $this.data('datepicker'),
				options = typeof option == 'object' && option;
			if (!data) {
				var elopts = opts_from_el(this, 'date'),
					// Preliminary otions
					xopts = $.extend({}, defaults, elopts, options),
					locopts = opts_from_locale(xopts.language),
					// Options priority: js args, data-attrs, locales, defaults
					opts = $.extend({}, defaults, locopts, options, elopts);
				if ($this.is('.input-daterange') || opts.inputs) {
					var ropts = {
						inputs: opts.inputs || $this.find('input').toArray()
					};
					$this.data('datepicker', (data = new DateRangePicker(this, $.extend(opts, ropts))));
				}
				else {
					$this.data('datepicker', (data = new Datepicker(this, opts)));
				}
			}
			if (typeof option == 'string' && typeof data[option] == 'function') {
				internal_return = data[option].apply(data, args);
				if (internal_return !== undefined)
					return false;
			}
		});
		if (internal_return !== undefined)
			return internal_return;
		else
			return this;
	};

	var defaults = $.fn.datepicker.defaults = {
		autoclose: true,
		beforeShowDay: $.noop,
		calendarWeeks: false,
		clearBtn: false,
		daysOfWeekDisabled: [],
		endDate: Infinity,
		forceParse: true,
		format: 'mm/dd/yyyy',
		keyboardNavigation: true,
		language: 'en',
		minViewMode: 0,
		orientation: "auto",
		rtl: false,
		startDate: -Infinity,
		startView: 0,
		todayBtn: false,
		todayHighlight: false,
		weekStart: 0
	};
	var locale_opts = $.fn.datepicker.locale_opts = [
		'format',
		'rtl',
		'weekStart'
	];
	$.fn.datepicker.Constructor = Datepicker;
	var dates = $.fn.datepicker.dates = {
		en: {
			days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
			daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
			months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			today: "Today",
			clear: "Clear"
		}
	};

	var DPGlobal = {
		modes: [
			{
				clsName: 'days',
				navFnc: 'Month',
				navStep: 1
			},
			{
				clsName: 'months',
				navFnc: 'FullYear',
				navStep: 1
			},
			{
				clsName: 'years',
				navFnc: 'FullYear',
				navStep: 10
			}],
		isLeapYear: function (year) {
			return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
		},
		getDaysInMonth: function (year, month) {
			return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
		},
		validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
		nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
		parseFormat: function (format) {
			// IE treats \0 as a string end in inputs (truncating the value),
			// so it's a bad format delimiter, anyway
			var separators = format.replace(this.validParts, '\0').split('\0'),
				parts = format.match(this.validParts);
			if (!separators || !separators.length || !parts || parts.length === 0) {
				throw new Error("Invalid date format.");
			}
			return { separators: separators, parts: parts };
		},
		parseDate: function (date, format, language) {
			if (date instanceof Date) return date;
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)) {
				var part_re = /([\-+]\d+)([dmwy])/,
					parts = date.match(/([\-+]\d+)([dmwy])/g),
					part, dir;
				date = new Date();
				for (var i = 0; i < parts.length; i++) {
					part = part_re.exec(parts[i]);
					dir = parseInt(part[1]);
					switch (part[2]) {
						case 'd':
							date.setUTCDate(date.getUTCDate() + dir);
							break;
						case 'm':
							date = Datepicker.prototype.moveMonth.call(Datepicker.prototype, date, dir);
							break;
						case 'w':
							date.setUTCDate(date.getUTCDate() + dir * 7);
							break;
						case 'y':
							date = Datepicker.prototype.moveYear.call(Datepicker.prototype, date, dir);
							break;
					}
				}
				return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
			}
			var parts = date && date.match(this.nonpunctuation) || [],
				date = new Date(),
				parsed = {},
				setters_order = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'],
				setters_map = {
					yyyy: function (d, v) { return d.setUTCFullYear(v); },
					yy: function (d, v) { return d.setUTCFullYear(2000 + v); },
					m: function (d, v) {
						if (isNaN(d))
							return d;
						v -= 1;
						while (v < 0) v += 12;
						v %= 12;
						d.setUTCMonth(v);
						while (d.getUTCMonth() != v)
							d.setUTCDate(d.getUTCDate() - 1);
						return d;
					},
					d: function (d, v) { return d.setUTCDate(v); }
				},
				val, filtered, part;
			setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
			setters_map['dd'] = setters_map['d'];
			date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
			var fparts = format.parts.slice();
			// Remove noop parts
			if (parts.length != fparts.length) {
				fparts = $(fparts).filter(function (i, p) {
					return $.inArray(p, setters_order) !== -1;
				}).toArray();
			}
			// Process remainder
			if (parts.length == fparts.length) {
				for (var i = 0, cnt = fparts.length; i < cnt; i++) {
					val = parseInt(parts[i], 10);
					part = fparts[i];
					if (isNaN(val)) {
						switch (part) {
							case 'MM':
								filtered = $(dates[language].months).filter(function () {
									var m = this.slice(0, parts[i].length),
										p = parts[i].slice(0, m.length);
									return m == p;
								});
								val = $.inArray(filtered[0], dates[language].months) + 1;
								break;
							case 'M':
								filtered = $(dates[language].monthsShort).filter(function () {
									var m = this.slice(0, parts[i].length),
										p = parts[i].slice(0, m.length);
									return m == p;
								});
								val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
								break;
						}
					}
					parsed[part] = val;
				}
				for (var i = 0, _date, s; i < setters_order.length; i++) {
					s = setters_order[i];
					if (s in parsed && !isNaN(parsed[s])) {
						_date = new Date(date);
						setters_map[s](_date, parsed[s]);
						if (!isNaN(_date))
							date = _date;
					}
				}
			}
			return date;
		},
		formatDate: function (date, format, language) {
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			var val = {
				d: date.getUTCDate(),
				D: dates[language].daysShort[date.getUTCDay()],
				DD: dates[language].days[date.getUTCDay()],
				m: date.getUTCMonth() + 1,
				M: dates[language].monthsShort[date.getUTCMonth()],
				MM: dates[language].months[date.getUTCMonth()],
				yy: date.getUTCFullYear().toString().substring(2),
				yyyy: date.getUTCFullYear()
			};
			val.dd = (val.d < 10 ? '0' : '') + val.d;
			val.mm = (val.m < 10 ? '0' : '') + val.m;
			var date = [],
				seps = $.extend([], format.separators);
			for (var i = 0, cnt = format.parts.length; i <= cnt; i++) {
				if (seps.length)
					date.push(seps.shift());
				date.push(val[format.parts[i]]);
			}
			return date.join('');
		},
		headTemplate: '<thead>' +
							'<tr>' +
								'<th class="prev">&laquo;</th>' +
								'<th colspan="5" class="datepicker-switch"></th>' +
								'<th class="next">&raquo;</th>' +
							'</tr>' +
						'</thead>',
		contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
		footTemplate: '<tfoot><tr><th colspan="7" class="today"></th></tr><tr><th colspan="7" class="clear"></th></tr></tfoot>'
	};
	DPGlobal.template = '<div class="cognito-datepicker">' +
							'<div class="cognito-datepicker-days">' +
								'<table class=" table-condensed">' +
									DPGlobal.headTemplate +
									'<tbody></tbody>' +
									DPGlobal.footTemplate +
								'</table>' +
							'</div>' +
							'<div class="cognito-datepicker-months">' +
								'<table class="table-condensed">' +
									DPGlobal.headTemplate +
									DPGlobal.contTemplate +
									DPGlobal.footTemplate +
								'</table>' +
							'</div>' +
							'<div class="cognito-datepicker-years">' +
								'<table class="table-condensed">' +
									DPGlobal.headTemplate +
									DPGlobal.contTemplate +
									DPGlobal.footTemplate +
								'</table>' +
							'</div>' +
						'</div>';

	$.fn.datepicker.DPGlobal = DPGlobal;


	/* DATEPICKER NO CONFLICT
	* =================== */

	$.fn.datepicker.noConflict = function () {
		$.fn.datepicker = old;
		return this;
	};


	/* DATEPICKER DATA-API
	* ================== */

	$(document).on(
		'focus.datepicker.data-api click.datepicker.data-api',
		'[data-provide="datepicker"]',
		function (e) {
			var $this = $(this);
			if ($this.data('datepicker')) return;
			e.preventDefault();
			// component click requires us to explicitly show it
			$this.datepicker('show');
		}
	);
	$(function () {
		$('[data-provide="datepicker-inline"]').datepicker();
	});

}(jQuery));})();
;(function() { if (Cognito.config.scripts.indexOf('cognito-timepicker') >= 0) return; else Cognito.config.scripts.push('cognito-timepicker');/*!
 * Timepicker Component for Twitter Bootstrap
 *
 * Copyright 2013 Joris de Wit
 *
 * Contributors https://github.com/jdewit/bootstrap-timepicker/graphs/contributors
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
(function ($, window, document, undefined) {
	'use strict';

	// TIMEPICKER PUBLIC CLASS DEFINITION
	var Timepicker = function (element, options) {
		this.widget = '';
		this.$element = $(element);
		this.defaultTime = options.defaultTime;
		this.disableFocus = options.disableFocus;
		this.isOpen = options.isOpen;
		this.minuteStep = options.minuteStep;
		this.modalBackdrop = options.modalBackdrop;
		this.secondStep = options.secondStep;
		this.showInputs = options.showInputs;
		this.showMeridian = options.showMeridian;
		this.timeSeparator = options.timeSeparator;
		if (this.showMeridian)
		{
			this.AMDesignator = options.AMDesignator;
			this.PMDesignator = options.PMDesignator;
		}
		this.showSeconds = options.showSeconds;
		this.template = options.template;
		this.appendWidgetTo = options.appendWidgetTo;
		this.twoDigitHourFormat = options.twoDigitHourFormat;

		this._init();
	};

	Timepicker.prototype = {

		constructor: Timepicker,

		_init: function () {
			var self = this;

			if (this.$element.parent().hasClass('c-editor-time')) {
				this.$element.parent('.c-editor-time').parent().find('.c-editor-time-icon').on({
					'click.timepicker': $.proxy(this.toggleWidget, this)
				});
				this.$element.on({
					'focus.timepicker': $.proxy(this.showOrHighlight, this),
					'click.timepicker': $.proxy(this.showOrHighlight, this),
					'keydown.timepicker': $.proxy(this.elementKeydown, this),
					'blur.timepicker': $.proxy(this.blurElement, this)
				});
			} else {
				if (this.template) {
					this.$element.on({
						'focus.timepicker': $.proxy(this.toggleWidget, this),
						'click.timepicker': $.proxy(this.toggleWidget, this),
						'blur.timepicker': $.proxy(this.blurElement, this)
					});
				} else {
					this.$element.on({
						'focus.timepicker': $.proxy(this.showOrHighlight, this),
						'click.timepicker': $.proxy(this.showOrHighlight, this),
						'keydown.timepicker': $.proxy(this.elementKeydown, this),
						'blur.timepicker': $.proxy(this.blurElement, this)
					});
				}
			}

			if (this.template !== false) {
				//this.$widget = $(this.getTemplate()).prependTo(this.$element.parents(this.appendWidgetTo)).on('click', $.proxy(this.widgetClick, this));
				this.$widget = $(this.getTemplate()).appendTo('body').on('click', $.proxy(this.widgetClick, this));
			} else {
				this.$widget = false;
			}

			if (this.showInputs && this.$widget !== false) {
				this.$widget.find('input').each(function () {
					$(this).on({
						'click.timepicker': function () { $(this).select(); },
						'keydown.timepicker': $.proxy(self.widgetKeydown, self)
					});
				});
			}

			this.setDefaultTime(this.defaultTime);
		},

		blurElement: function () {
			this.highlightedUnit = undefined;
			this.updateFromElementVal();
		},

		decrementHour: function () {
			if (this.showMeridian) {
				if (this.hour === 1) {
					this.hour = 12;
				} else if (this.hour === 12) {
					this.hour--;

					return this.toggleMeridian();
				} else if (this.hour === 0) {
					this.hour = 11;

					return this.toggleMeridian();
				} else {
					this.hour--;
				}
			} else {
				if (this.hour === 0) {
					this.hour = 23;
				} else {
					this.hour--;
				}
			}
			this.update();
		},

		decrementMinute: function (step) {
			var newVal;

			if (step) {
				newVal = this.minute - step;
			} else {
				newVal = this.minute - this.minuteStep;
			}

			if (newVal < 0) {
				this.decrementHour();
				this.minute = newVal + 60;
			} else {
				this.minute = newVal;
			}
			this.update();
		},

		decrementSecond: function () {
			var newVal = this.second - this.secondStep;

			if (newVal < 0) {
				this.decrementMinute(true);
				this.second = newVal + 60;
			} else {
				this.second = newVal;
			}
			this.update();
		},

		elementKeydown: function (e) {
			switch (e.keyCode) {
				case 9: //tab
					this.updateFromElementVal();

					switch (this.highlightedUnit) {
						case 'hour':
							e.preventDefault();
							this.highlightNextUnit();
							break;
						case 'minute':
							if (this.showMeridian || this.showSeconds) {
								e.preventDefault();
								this.highlightNextUnit();
							}
							else
								this.hideWidget();
							break;
						case 'second':
							if (this.showMeridian) {
								e.preventDefault();
								this.highlightNextUnit();
							}
							else
								this.hideWidget();
							break;
						default:
							//By default, hide the widget if it is tabbed out of
							this.hideWidget();
					}
					break;
				case 27: // escape
					this.updateFromElementVal();
					this.hideWidget();
					break;
				case 37: // left arrow
					e.preventDefault();
					this.highlightPrevUnit();
					this.updateFromElementVal();
					break;
				case 38: // up arrow
					e.preventDefault();
					switch (this.highlightedUnit) {
						case 'hour':
							this.incrementHour();
							this.highlightHour();
							break;
						case 'minute':
							this.incrementMinute();
							this.highlightMinute();
							break;
						case 'second':
							this.incrementSecond();
							this.highlightSecond();
							break;
						case 'meridian':
							this.toggleMeridian();
							this.highlightMeridian();
							break;
					}
					break;
				case 39: // right arrow
					e.preventDefault();
					this.updateFromElementVal();
					this.highlightNextUnit();
					break;
				case 40: // down arrow
					e.preventDefault();
					switch (this.highlightedUnit) {
						case 'hour':
							this.decrementHour();
							this.highlightHour();
							break;
						case 'minute':
							this.decrementMinute();
							this.highlightMinute();
							break;
						case 'second':
							this.decrementSecond();
							this.highlightSecond();
							break;
						case 'meridian':
							this.toggleMeridian();
							this.highlightMeridian();
							break;
					}
					break;
			}
		},

		formatTime: function (hour, minute, second, meridian) {
			hour = this.twoDigitHourFormat & hour < 10 ? '0' + hour: hour;
			minute = minute < 10 ? '0' + minute : minute;
			second = second < 10 ? '0' + second : second;

			return hour + this.timeSeparator + minute + (this.showSeconds ? this.timeSeparator + second : '') + (this.showMeridian ? ' ' + meridian : '');
		},

		getCursorPosition: function () {
			var input = this.$element.get(0);

			if ('selectionStart' in input) {// Standard-compliant browsers

				return input.selectionStart;
			} else if (document.selection) {// IE fix
				input.focus();
				var sel = document.selection.createRange(),
				  selLen = document.selection.createRange().text.length;

				sel.moveStart('character', -input.value.length);

				return sel.text.length - selLen;
			}
		},

		getTemplate: function () {
			var template,
				hourTemplate,
				minuteTemplate,
				secondTemplate,
				meridianTemplate,
				templateContent;

			if (this.showInputs) {
				hourTemplate = '<input type="text" name="hour" class="cognito-timepicker-hour" maxlength="2"/>';
				minuteTemplate = '<input type="text" name="minute" class="cognito-timepicker-minute" maxlength="2"/>';
				secondTemplate = '<input type="text" name="second" class="cognito-timepicker-second" maxlength="2"/>';
				meridianTemplate = '<input type="text" name="meridian" class="cognito-timepicker-meridian" maxlength="2"/>';
			} else {
				hourTemplate = '<span class="cognito-timepicker-hour"></span>';
				minuteTemplate = '<span class="cognito-timepicker-minute"></span>';
				secondTemplate = '<span class="cognito-timepicker-second"></span>';
				meridianTemplate = '<span class="cognito-timepicker-meridian"></span>';
			}

			templateContent = '<table>' +
				'<tr>' +
				'<td><a href="#" data-action="incrementHour"><i class="icon-chevron-up"></i></a></td>' +
				'<td class="separator">&nbsp;</td>' +
				'<td><a href="#" data-action="incrementMinute"><i class="icon-chevron-up"></i></a></td>' +
				(this.showSeconds ?
					'<td class="separator">&nbsp;</td>' +
					'<td><a href="#" data-action="incrementSecond"><i class="icon-chevron-up"></i></a></td>'
					: '') +
				(this.showMeridian ?
					'<td class="separator">&nbsp;</td>' +
					'<td class="meridian-column"><a href="#" data-action="toggleMeridian"><i class="icon-chevron-up"></i></a></td>'
					: '') +
				'</tr>' +
				'<tr>' +
				'<td>' + hourTemplate + '</td> ' +
				'<td class="separator">' + this.timeSeparator + '</td>' +
				'<td>' + minuteTemplate + '</td> ' +
				(this.showSeconds ?
					'<td class="separator">' + this.timeSeparator + '</td>' +
					'<td>' + secondTemplate + '</td>'
					: '') +
				(this.showMeridian ?
					'<td class="separator">&nbsp;</td>' +
					'<td>' + meridianTemplate + '</td>'
					: '') +
				'</tr>' +
				'<tr>' +
				'<td><a href="#" data-action="decrementHour"><i class="icon-chevron-down"></i></a></td>' +
				'<td class="separator"></td>' +
				'<td><a href="#" data-action="decrementMinute"><i class="icon-chevron-down"></i></a></td>' +
				(this.showSeconds ?
					'<td class="separator">&nbsp;</td>' +
					'<td><a href="#" data-action="decrementSecond"><i class="icon-chevron-down"></i></a></td>'
					: '') +
				(this.showMeridian ?
					'<td class="separator">&nbsp;</td>' +
					'<td><a href="#" data-action="toggleMeridian"><i class="icon-chevron-down"></i></a></td>'
					: '') +
				'</tr>' +
				'</table>';

			switch (this.template) {
				case 'modal':
					template = '<div class="cognito-timepicker-widget modal hide fade in" data-backdrop="' + (this.modalBackdrop ? 'true' : 'false') + '">' +
						'<div class="modal-header">' +
						'<a href="#" class="close" data-dismiss="modal">×</a>' +
						'<h3>Pick a Time</h3>' +
						'</div>' +
						'<div class="modal-content">' +
						templateContent +
						'</div>' +
						'<div class="modal-footer">' +
						'<a href="#" class="btn btn-primary" data-dismiss="modal">OK</a>' +
						'</div>' +
						'</div>';
					break;
				case 'dropdown':
					template = '<div class="cognito-timepicker-widget cognito-dropdown-menu">' + templateContent + '</div>';
					break;
			}

			return template;
		},

		getTime: function () {
			return this.formatTime(this.hour, this.minute, this.second, this.meridian);
		},

		hideWidget: function () {
			if (this.isOpen === false) {
				return;
			}

			if (this.showInputs) {
				this.updateFromWidgetInputs();
			}

			this.$element.trigger({
				'type': 'hide.timepicker',
				'time': {
					'value': this.getTime(),
					'hours': this.hour,
					'minutes': this.minute,
					'seconds': this.second,
					'meridian': this.meridian
				}
			});

			if (this.template === 'modal' && this.$widget.modal) {
				this.$widget.modal('hide');
			} else {
				this.$widget.removeClass('open');
			}

			$(document).off('mousedown.timepicker');
			$(document).off('resize.timepicker');

			this.isOpen = false;
		},

		showOrHighlight: function () {
			if (!this.isOpen) {
				this.showWidget();
			} else {
				this.highlightUnit();
			}			
		},

		highlightUnit: function () {
			this.position = this.getCursorPosition();

			if (this.position >= 0 && this.position <= 2) {
				this.highlightHour();
			} else if (this.position >= 3 && this.position <= 5) {
				this.highlightMinute();
			} else if (this.position >= 6 && this.position <= 8) {
				if (this.showSeconds) {
					this.highlightSecond();
				} else {
					this.highlightMeridian();
				}
			} else if (this.position >= 9 && this.position <= 11) {
				this.highlightMeridian();
			}
		},

		highlightNextUnit: function () {
			switch (this.highlightedUnit) {
				case 'hour':
					this.highlightMinute();
					break;
				case 'minute':
					if (this.showSeconds) {
						this.highlightSecond();
					} else if (this.showMeridian) {
						this.highlightMeridian();
					} else {
						this.highlightHour();
					}
					break;
				case 'second':
					if (this.showMeridian) {
						this.highlightMeridian();
					} else {
						this.highlightHour();
					}
					break;
				case 'meridian':
					this.highlightHour();
					break;
			}
		},

		highlightPrevUnit: function () {
			switch (this.highlightedUnit) {
				case 'hour':
					this.highlightMeridian();
					break;
				case 'minute':
					this.highlightHour();
					break;
				case 'second':
					this.highlightMinute();
					break;
				case 'meridian':
					if (this.showSeconds) {
						this.highlightSecond();
					} else {
						this.highlightMinute();
					}
					break;
			}
		},

		//Universal function for executing the highlighting on select units
		highlightElement: function (startIndex, endIndex) {

			var $element = this.$element.get(0);

			var mod = !this.twoDigitHourFormat && this.hour < 10 ? -1 : 0;
			startIndex = startIndex + mod < 0 ? 0 : startIndex + mod;
			endIndex = endIndex + mod > $($element).val().length ? $($element).val().length : endIndex + mod;
			
			if ($element.setSelectionRange) {
				setTimeout(function () {
					$element.setSelectionRange(startIndex, endIndex);
				}, 0);
			}
		},

		highlightHour: function () {
			this.highlightedUnit = "hour";
			this.highlightElement(0, 2);
		},

		highlightMinute: function () {			
			this.highlightedUnit = 'minute';
			this.highlightElement(3, 5);
		},

		highlightSecond: function () {
			this.highlightedUnit = 'second';
			this.highlightElement(6, 8);
		},

		highlightMeridian: function () {
			this.highlightedUnit = 'meridian';

			if (this.showSeconds) {
				this.highlightElement(9, 11);
			} else {
				this.highlightElement(6, 8);
			}
		},

		incrementHour: function () {
			if (this.showMeridian) {
				if (this.hour === 11) {
					this.hour++;
					return this.toggleMeridian();
				} else if (this.hour === 12) {
					this.hour = 0;
				}
			}
			if (this.hour === 23) {
				this.hour = 0;
			} else {
				this.hour++;
			}
			this.update();
		},

		incrementMinute: function (step) {
			var newVal;

			if (step) {
				newVal = this.minute + step;
			} else {
				newVal = this.minute + this.minuteStep - (this.minute % this.minuteStep);
			}

			if (newVal > 59) {
				this.incrementHour();
				this.minute = newVal - 60;
			} else {
				this.minute = newVal;
			}
			this.update();
		},

		incrementSecond: function () {
			var newVal = this.second + this.secondStep - (this.second % this.secondStep);

			if (newVal > 59) {
				this.incrementMinute(true);
				this.second = newVal - 60;
			} else {
				this.second = newVal;
			}
			this.update();
		},

		remove: function () {
			$('document').off('.timepicker');
			if (this.$widget) {
				this.$widget.remove();
			}
			delete this.$element.data().timepicker;
		},

		setDefaultTime: function (defaultTime) {
			if (!this.$element.val()) {
				if (defaultTime === 'current') {
					var dTime = new Date(),
					  hours = dTime.getHours(),
					  minutes = Math.floor(dTime.getMinutes() / this.minuteStep) * this.minuteStep,
					  seconds = Math.floor(dTime.getSeconds() / this.secondStep) * this.secondStep,
					  meridian = this.AMDesignator;

					if (this.showMeridian) {
						if (hours === 0) {
							hours = 12;
						} else if (hours >= 12) {
							if (hours > 12) {
								hours = hours - 12;
							}
							meridian = this.PMDesignator;
						} else {
							meridian = this.AMDesignator;
						}
					}

					this.hour = hours;
					this.minute = minutes;
					this.second = seconds;
					this.meridian = meridian;

				} else if (defaultTime === false) {
					this.hour = 0;
					this.minute = 0;
					this.second = 0;
					this.meridian = this.AMDesignator;
				} else {
					this.setTime(defaultTime);
				}
			} else {
				this.updateFromElementVal();
			}
		},

		setTime: function (time) {
			var arr,
			  timeArray;

            if (this.showMeridian) {                
                arr = time.split(' ');                
                timeArray = arr[0].split(this.timeSeparator);
                this.meridian = time.substr(time.indexOf(' ') + 1);
			} else {
				timeArray = time.split(this.timeSeparator);
			}

			this.hour = parseInt(timeArray[0], 10);
			this.minute = parseInt(timeArray[1], 10);
			this.second = parseInt(timeArray[2], 10);

			if (isNaN(this.hour)) {
				this.hour = 0;
			}
			if (isNaN(this.minute)) {
				this.minute = 0;
			}

			if (this.showMeridian) {
				if (this.hour > 12) {
					this.hour = 12;
				} else if (this.hour < 1) {
					this.hour = 12;
				}
               
				if (this.meridian !== this.AMDesignator && this.meridian !== this.PMDesignator) {
					this.meridian = this.AMDesignator;
				}
			} else {
				if (this.hour >= 24) {
					this.hour = 23;
				} else if (this.hour < 0) {
					this.hour = 0;
				}
			}

			if (this.minute < 0) {
				this.minute = 0;
			} else if (this.minute >= 60) {
				this.minute = 59;
			}

			if (this.showSeconds) {
				if (isNaN(this.second)) {
					this.second = 0;
				} else if (this.second < 0) {
					this.second = 0;
				} else if (this.second >= 60) {
					this.second = 59;
				}
			}

			this.update();
		},

		place: function () {
			var scrollTop = $(window).scrollTop();
			var widgetWidth = this.$widget.width();
			var widgetHeight = this.$widget.height();
			var windowWidth = $(window).width();
			var windowHeight = $(window).height();

			var offset = this.$element.offset();
			var height = this.$element.outerHeight(false);
			var width = this.$element.outerWidth(false);
			var top = offset.top;
			var left = offset.left;

			this.$widget.removeClass('cognito-timepicker-orient-top cognito-timepicker-orient-bottom');

			var yorient;
			var topOverflow = -scrollTop + offset.top - widgetHeight;
			var bottomOverflow = scrollTop + windowHeight - (offset.top + height + widgetHeight);
			if (Math.max(topOverflow, bottomOverflow) === bottomOverflow)
				yorient = 'top';
			else
				yorient = 'bottom';

			this.$widget.addClass('cognito-timepicker-orient-' + yorient);
			if (yorient === 'top')
				top += height + 6;
			else
				top -= widgetHeight + parseInt(this.$widget.css('padding-top')) + 8;

			this.$widget.css({
				top: top,
				left: left
			});
		},

		//Toggles the widget open and close
		toggleWidget: function () {
			if (this.isOpen === true) {
				this.hideWidget();
			}
			else {
				this.showWidget();
			}
		},
		
		showWidget: function () {
			if (this.isOpen) {
				return;
			}

			if (this.$element.is(':disabled')) {
				return;
			}

			//If the time has not been set when the widget is opened, set it to it's default time
			if (this.getTime() == '0' + this.timeSeparator + '00 ' + this.AMDesignator)
				this.setDefaultTime(this.defaultTime);

			this.updateWidget();

			this.place();

			var self = this;
			$(document).on('mousedown.timepicker', function (e) {
				
				//If there is an open time picker widget and the target is not the time picker, it's icon, or it's field, then close the widget
				if (
					$(e.target).closest('.cognito-timepicker-widget').length === 0 
					&& (
						//the user is not clicking the editor or icon that belongs to this field
                        !(self.$element.is(e.target) ||
                            e.target.className.indexOf("c-editor-time") > -1 ||
                            e.target.className.indexOf("icon-time") > -1 ||
                            e.target.className.indexOf("time-icon") > -1)
						|| $(e.target).parents(".c-date-time")[0] !== $(self.$element).parents(".c-date-time")[0]
					)
				) {
					self.hideWidget();
				}
			});

			//Replace on document resize
			$(document).on('resize.timepicker', function (e) {
				self.place();
			});

			this.$element.trigger({
				'type': 'show.timepicker',
				'time': {
					'value': this.getTime(),
					'hours': this.hour,
					'minutes': this.minute,
					'seconds': this.second,
					'meridian': this.meridian
				}
			});

			if (this.disableFocus) {
				this.$element.blur();
			}

			this.updateFromElementVal();

			if (this.template === 'modal' && this.$widget.modal) {
				this.$widget.modal('show').on('hidden', $.proxy(this.hideWidget, this));
			} else {
				if (this.isOpen === false) {
					this.$widget.addClass('open');
				}
			}

			this.update();
			this.isOpen = true;
		},

		toggleMeridian: function () {
			this.meridian = this.meridian === this.AMDesignator ? this.PMDesignator : this.AMDesignator;
			this.update();
		},

		update: function () {
			this.updateElement();

			this.$element.trigger({
				'type': 'changeTime.timepicker',
				'time': {
					'value': this.getTime(),
					'hours': this.hour,
					'minutes': this.minute,
					'seconds': this.second,
					'meridian': this.meridian
				}
			});

			this.updateWidget();
		},

		updateElement: function () {
			this.$element.val(this.getTime()).change();
		},

		updateFromElementVal: function () {
			var val = this.$element.val();

			if (val) {
				this.setTime(val);
			}
		},

		updateWidget: function () {
			if (this.$widget === false) {
				return;
			}

			var hour = this.hour < 10 ? '0' + this.hour : this.hour,
				minute = this.minute < 10 ? '0' + this.minute : this.minute,
				second = this.second < 10 ? '0' + this.second : this.second;

			if (this.showInputs) {
				this.$widget.find('input.cognito-timepicker-hour').val(hour);
				this.$widget.find('input.cognito-timepicker-minute').val(minute);

				if (this.showSeconds) {
					this.$widget.find('input.cognito-timepicker-second').val(second);
				}
				if (this.showMeridian) {
					this.$widget.find('input.cognito-timepicker-meridian').val(this.meridian);
				}
			} else {
				this.$widget.find('span.cognito-timepicker-hour').text(hour);
				this.$widget.find('span.cognito-timepicker-minute').text(minute);

				if (this.showSeconds) {
					this.$widget.find('span.cognito-timepicker-second').text(second);
				}
				if (this.showMeridian) {
					this.$widget.find('span.cognito-timepicker-meridian').text(this.meridian);
				}
			}
		},

		updateFromWidgetInputs: function () {
			if (this.$widget === false || this.$element.val() === "") {
				return;
			}

			var time = $('input.cognito-timepicker-hour', this.$widget).val() + this.timeSeparator +
			  $('input.cognito-timepicker-minute', this.$widget).val() +
			  (this.showSeconds ? this.timeSeparator + $('input.cognito-timepicker-second', this.$widget).val() : '') +
			  (this.showMeridian ? ' ' + $('input.cognito-timepicker-meridian', this.$widget).val() : '');

			this.setTime(time);
		},

		widgetClick: function (e) {
			e.stopPropagation();
			e.preventDefault();

			var action = $(e.target).closest('a').data('action');
			if (action) {
				this[action]();
			}
		},

		widgetKeydown: function (e) {
			var $input = $(e.target).closest('input'),
				name = $input.attr('name');

			switch (e.keyCode) {
				case 9: //tab
					if (this.showMeridian) {
						if (name === 'meridian') {
							return this.hideWidget();
						}
					} else {
						if (this.showSeconds) {
							if (name === 'second') {
								return this.hideWidget();
							}
						} else {
							if (name === 'minute') {
								return this.hideWidget();
							}
						}
					}

					this.updateFromWidgetInputs();
					break;
				case 27: // escape
					this.hideWidget();
					break;
				case 38: // up arrow
					e.preventDefault();
					switch (name) {
						case 'hour':
							this.incrementHour();
							break;
						case 'minute':
							this.incrementMinute();
							break;
						case 'second':
							this.incrementSecond();
							break;
						case 'meridian':
							this.toggleMeridian();
							break;
					}
					break;
				case 40: // down arrow
					e.preventDefault();
					switch (name) {
						case 'hour':
							this.decrementHour();
							break;
						case 'minute':
							this.decrementMinute();
							break;
						case 'second':
							this.decrementSecond();
							break;
						case 'meridian':
							this.toggleMeridian();
							break;
					}
					break;
			}
		}
	};


	//TIMEPICKER PLUGIN DEFINITION
	$.fn.timepicker = function (option) {
		var args = Array.apply(null, arguments);
		args.shift();
		return this.each(function () {
			var $this = $(this),
			  data = $this.data('timepicker'),
			  options = typeof option === 'object' && option;

			if (!data) {
				$this.data('timepicker', (data = new Timepicker(this, $.extend({}, $.fn.timepicker.defaults, options, $(this).data()))));
			}

			if (typeof option === 'string') {
				data[option].apply(data, args);
			}
		});
	};

	$.fn.timepicker.defaults = {
		defaultTime: 'current',
		disableFocus: false,
		isOpen: false,
		minuteStep: 15,
		modalBackdrop: false,
		secondStep: 15,
		showSeconds: false,
		showInputs: true,
		showMeridian: true,
		template: 'dropdown',
		appendWidgetTo: '.cognito-timepicker',
		timeSeparator: ':',
		AMDesignator: "AM",
		PMDesignator: "PM",
		twoDigitHourFormat: false
	};

	$.fn.timepicker.Constructor = Timepicker;

})(jQuery, window, document);})();
;(function() { if (Cognito.config.scripts.indexOf('cognito-typeahead') >= 0) return; else Cognito.config.scripts.push('cognito-typeahead');/**
* bootstrap-typeahead.js
* Copyright 2013 Twitter, Inc.
* http://www.apache.org/licenses/LICENSE-2.0.txt
*/
/* =============================================================
 * bootstrap-typeahead.js v2.3.2
 * http://getbootstrap.com/2.3.2/javascript.html#typeahead
 * =============================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

	"use strict"; // jshint ;_;


	/* TYPEAHEAD PUBLIC CLASS DEFINITION
	 * ================================= */

	var Typeahead = function (element, options) {
		this.$element = $(element)
		this.options = $.extend({}, $.fn.typeahead.defaults, options)
		this.matcher = this.options.matcher || this.matcher
		this.sorter = this.options.sorter || this.sorter
		this.highlighter = this.options.highlighter || this.highlighter
		this.updater = this.options.updater || this.updater
		this.source = this.options.source || $.map(this.$element[0].__msajaxbindings[0]._source.get_options(), function (val, i) { return val.get_displayValue(); }),
		this.$menu = $(this.options.menu)
		this.shown = false
		this.listen()
	}

	Typeahead.prototype = {

		constructor: Typeahead

	, select: function () {
		var val = this.$menu.find('.active').attr('data-value')
		this.$element
		  .val(this.updater(val))
		  .change()

		$simulateMutationEvent(this.$element.get(0), "change", false, true)

		return this.hide()
	}

	, updater: function (item) {
		return item
	}

	, show: function () {
		var pos = $.extend({}, this.$element.position(), {
			height: this.$element[0].offsetHeight
		})

		this.$menu
		  .insertAfter(this.$element)
		  .css({
			top: pos.top + pos.height
		  , left: pos.left
		  })
		  .show()

		var $pageContainer = this.$element.closest('.c-forms-pages')
		if ($pageContainer.length) {
			var currentHeight = this.$menu.get(0).offsetHeight
			var maxHeight = $pageContainer.get(0).offsetHeight - (pos.top + pos.height);
			if (currentHeight > maxHeight) {
				this.$menu.css({
					height: maxHeight
					, overflow: 'auto'
				})
			}
		}

		this.shown = true
		return this
	}

	, hide: function () {
		this.$menu.hide()
		this.shown = false
		return this
	}

	, lookup: function (event) {
		var items

		this.query = this.$element.val()

		if (!this.query || this.query.length < this.options.minLength) {
			return this.shown ? this.hide() : this
		}

		items = $.isFunction(this.source) ? this.source(this.query, $.proxy(this.process, this)) : this.source

		return items ? this.process(items) : this
	}

	, process: function (items) {
		var that = this

		items = $.grep(items, function (item) {
			return that.matcher(item)
		})

		items = this.sorter(items)

		if (!items.length) {
			return this.shown ? this.hide() : this
		}

		return this.render(items.slice(0, this.options.items)).show()
	}

	, matcher: function (item) {
		return ~item.toLowerCase().indexOf(this.query.toLowerCase())
	}

	, sorter: function (items) {
		var beginswith = []
		  , caseSensitive = []
		  , caseInsensitive = []
		  , item

		while (item = items.shift()) {
			if (!item.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item)
			else if (~item.indexOf(this.query)) caseSensitive.push(item)
			else caseInsensitive.push(item)
		}

		return beginswith.concat(caseSensitive, caseInsensitive)
	}

	, highlighter: function (item) {
		var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')
		return item.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
			return '<strong>' + match + '</strong>'
		})
	}

	, render: function (items) {
		var that = this

		items = $(items).map(function (i, item) {
			i = $(that.options.item).attr('data-value', item)
			i.find('a').html(that.highlighter(item))
			return i[0]
		})
		items.first().addClass('active')
		this.$menu.html(items)
		return this
	}

	, next: function (event) {
		var active = this.$menu.find('.active').removeClass('active')
		  , next = active.next()

		if (!next.length) {
			next = $(this.$menu.find('li')[0])
		}

		next.addClass('active')
		
		var index = parseInt(next.attr('data-index'));
		var liPos = (index + 1) * 26;
		if (index == 0)
			this.$menu.scrollTop(0);
		else if (liPos > this.$menu.height()+this.$menu.scrollTop())
			this.$menu.scrollTop(liPos - this.$menu.height());
	}

	, prev: function (event) {
		var active = this.$menu.find('.active').removeClass('active')
		  , prev = active.prev()
		var isLast = false;

		if (!prev.length) {
			prev = this.$menu.find('li').last()
			isLast = true;
		}

		prev.addClass('active')

		var index = parseInt(prev.attr('data-index'));
		var liPos = index * 26;
		if (isLast)
			this.$menu.scrollTop(liPos);
		else if (liPos < this.$menu.scrollTop())
			this.$menu.scrollTop(liPos);
	}

	, listen: function () {
		this.$element
		  .on('focus', $.proxy(this.focus, this))
		  .on('blur', $.proxy(this.blur, this))
		  .on('keyup', $.proxy(this.keyup, this))

		if (this.eventSupported('keydown')) {
			this.$element.on('keydown', $.proxy(this.keydown, this))
		}

		this.$menu
		  .on('click', $.proxy(this.click, this))
		  .on('mouseenter', 'li', $.proxy(this.mouseenter, this))
		  .on('mouseleave', 'li', $.proxy(this.mouseleave, this))
		  .on('mouseenter', $.proxy(this.mouseentermenu, this))
		  .on('mouseleave', $.proxy(this.mouseleavemenu, this))
		  .on('mouseup', $.proxy(this.mouseup, this))
	}

	, eventSupported: function (eventName) {
		var isSupported = eventName in this.$element
		if (!isSupported) {
			this.$element.setAttribute(eventName, 'return;')
			isSupported = typeof this.$element[eventName] === 'function'
		}
		return isSupported
	}

	, move: function (e) {
		if (!this.shown) return

		switch (e.keyCode) {
			case 9: // tab
			case 13: // enter
			case 27: // escape
				e.preventDefault()
				break

			case 38: // up arrow
				e.preventDefault()
				this.prev()
				break

			case 40: // down arrow
				e.preventDefault()
				this.next()
				break
		}

		e.stopPropagation()
	}

	, keydown: function (e) {
		this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40, 38, 9, 13, 27])
		this.move(e)
	}

	, keyup: function (e) {
		switch (e.keyCode) {
			case 40: // down arrow
			case 38: // up arrow
			case 16: // shift
			case 17: // ctrl
			case 18: // alt
				break

			case 9: // tab
			case 13: // enter
				if (!this.shown) return
				this.select()
				break

			case 27: // escape
				if (!this.shown) return
				this.hide()
				break

			default:
				this.lookup()
		}

		e.stopPropagation()
		e.preventDefault()
	}

	, focus: function (e) {
		this.focused = true
	}

	, blur: function (e) {
		this.focused = false
		if (!this.mousedovermenu && this.shown) this.hide()
	}

	, click: function (e) {
		e.stopPropagation()
		e.preventDefault()
		this.select()
		this.$element.focus()
	}

	, mouseenter: function (e) {
		this.mousedover = true
		this.$menu.find('.active').removeClass('active')
		$(e.currentTarget).addClass('active')
	}

	, mouseleave: function (e) {
		this.mousedover = false
	}

	, mouseentermenu: function (e) {
		this.mousedovermenu = true
	}

	, mouseleavemenu: function (e) {
		this.mousedovermenu = false
	}

	, mouseup: function (e) {
		var selectedElement = this.$menu.find('.active')
		if (this.mousedovermenu && !this.mousedover) {
			this.focusItem = selectedElement
			this.$element.focus()
		}
	}

	}


	/* TYPEAHEAD PLUGIN DEFINITION
	 * =========================== */

	var old = $.fn.typeahead

	$.fn.typeahead = function (option) {
		return this.each(function () {
			var $this = $(this)
			  , data = $this.data('typeahead')
			  , options = typeof option == 'object' && option
			if (!data) $this.data('typeahead', (data = new Typeahead(this, options)))
			if (typeof option == 'string') data[option]()
		})
	}

	$.fn.typeahead.defaults = {
		source: []
	, items: 8
	, menu: '<ul class="typeahead dropdown-menu"></ul>'
	, item: '<li><a href="#"></a></li>'
	, minLength: 1
	}

	$.fn.typeahead.Constructor = Typeahead


	/* TYPEAHEAD NO CONFLICT
	 * =================== */

	$.fn.typeahead.noConflict = function () {
		$.fn.typeahead = old
		return this
	}


	/* TYPEAHEAD DATA-API
	 * ================== */

	$(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
		var $this = $(this)
		if ($this.data('typeahead')) return
		$this.typeahead($this.data())
	})

}(jQuery);

/* =============================================================
 * bootstrap-better-typeahead.js v1.0.0 by Philipp Nolte
 * https://github.com/ptnplanet/Bootstrap-Better-Typeahead
 * =============================================================
 * This plugin makes use of twitter bootstrap typeahead
 * http://twitter.github.com/bootstrap/javascript.html#typeahead
 *
 * Bootstrap is licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 * ============================================================ */

!function($) {

	"use strict";

	/**
	 * The better typeahead plugin will extend the bootstrap typeahead plugin and provide the ability to set the
	 * minLength option to zero. The tab keyup event handler had to be moved to the keydown event handler, so that
	 * the full list of available items is shown on tab-focus and the original behaviour is preserved as best as
	 * possible.
	 *
	 * @type {object}
	 */
	var BetterTypeahead = {

		lookup: function(event) {
			var items;

			// Now supports empty queries (eg. with a length of 0).
			this.query = this.$element.val() || '';

			if (this.query.length < this.options.minLength) {
				return this.shown ? this.hide() : this;
			}

			items = $.isFunction(this.source) ? this.source(this.query, $.proxy(this.process, this)) : this.source;

			return items ? this.process(items) : this;
		}

		, process: function (items) {
			var that = this;

			items = $.grep(items, function (item) {
				return that.matcher(item);
			});

			items = this.sorter(items);

			if (!items.length) {
				return this.shown ? this.hide() : this;
			}

			if (this.query.length) {
				items = items.slice(0, this.options.items);
			}
			if (this.focusItem) {
				this.focusItem = null;
				return;
			}
			return this.render(items).show();
		}

		, render: function (items) {
			var that = this

			items = $(items).map(function (i, item) {
				var li = $(that.options.item).attr('data-value', item);
				li.attr('data-index', i);
				li.find('a').html(that.highlighter(item));
				return li[0];
			});

			if (this.query.length > 0) {
				if (this.focusItem)
					return;
				else
					items.first().addClass('active');
			}

			this.$menu.html(items);
			return this;
		}

		, move: function (e) {
			if (!this.shown) return;

			switch (e.keyCode) {
				case 9: // tab
				case 13: // enter
					if (this.options.useTabToSelect === true)
						e.preventDefault();
					else if (this.shown) {
                        this.select()
						this.hide();
					}
					break;
				case 27: // escape
					e.preventDefault();
					break;

				case 38: // up arrow
					e.preventDefault();
					this.prev();
					e.stopPropagation();
					break;

				case 40: // down arrow
					e.preventDefault();
					this.next();
					e.stopPropagation();
					break;
			}
		}

		, keydown: function (e) {
			this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40,38,9,13,27]);
			this.move(e);
		}

		, keyup: function (e) {
			switch(e.keyCode) {
			    case 37: // left
			    case 39: // right
			        return;
				case 40: // down arrow
				case 38: // up arrow
				case 16: // shift
				case 17: // ctrl
				case 18: // alt
					break;

				case 13: // enter
				case 9: // tab
					if (!this.shown) return;
					this.select();
					this.show();
					break;

				case 27: // escape;
					if (!this.shown) return;
					this.hide();
					break;

				default:
					this.lookup();
			}

			//if (!this.options.useTabToSelect)
            e.stopPropagation();
			e.preventDefault();
		}

		, focus: function(e) {
			this.focused = true;

			if (!this.mousedover) {
				this.lookup(e);
			}
		}
	};

	$.extend($.fn.typeahead.Constructor.prototype, BetterTypeahead);

}(jQuery);})();
;(function() { if (Cognito.config.scripts.indexOf('cognito-dialog') >= 0) return; else Cognito.config.scripts.push('cognito-dialog');; (function($) {
	var Dialog = function(options, element) {
		this._options = $.extend({}, Dialog.defaults, options);
		this._dialogVisible = false;
		this._hasTemplate = false;
		this._checkpoint = null;
		this._isExecuting = new ExoWeb.Signal();
		this._defaultButton = null;
		this._accelerators = {};

		// If an instance/property was specified, but no buttons, create default buttons
		if (this._options.instance) {
			if (!this._options.buttons) {
				this._options.buttons = [
		            {
		            	label: "Cancel",
		            	isCancel: true
		            },
                    {
                        label: "Ok",
                        autoClose: false,
                        click: function () {
                            this._checkpoint = null;
                            this.close(false);
                        }
                    }
			    ]
			}
		} else if (!this._options.buttons) {
			this._options.buttons = {
				"Ok": function() {
					this.close(false);
				}
			}
		}

		if (element) {
			this.$element = $(element);
			this.$element.bind("click", this.open.bind(this, element));
		}

		//this.$element.append(this._create());
		this._dialog = this._create();

		// Create and add the dialog UI elements once the DOM is ready
		var that = this;
		Cognito.ready("append-dialog-" + options.title, "ExoWeb.dom", function ($) {
			var cognitoDiv = $('.cognito:first');
			that._dialog.appendTo(cognitoDiv.length == 0 ? document.body : cognitoDiv);

			// Force activation if using templates
			if (that._options.templateName)
				Sys.Application.activateElement(that._dialog[0]);
		});
	};

	Dialog.defaults = {
		title: "",
		width: 400,
		height: 200,
		text: "",
		source: "",
		open: undefined,
		cancel: undefined,
		instance: null,
		property: null,
		templateName: null,
		closeOnEscape: true,
		includeCloseButton: true,
		contentSelector: null,
		closeOnOverlayClick: true,
		onClose: null
	};

	Dialog.activeDialogs = [];

	Dialog.prototype = {
		_create: function () {
			var dialogPane = $("<div class='c-modal' />");
			dialogPane.append("<div class='c-modal-overlay'></div>")
			var dialogContainer = dialogPane;

			dialogContainer.append(this._createContent());

			// Only include the title bar if a title was specified
			if (this._options.title)
				dialogContainer.append(this._createTitle());
			else
				dialogContainer.children().css({ "padding-top": "0px" });

			dialogContainer.append(this._createButtons());

			// Ensure that clicks inside the dialog do not propagate beyond the dialog context
			dialogPane.click(function (event) {
				(event.originalEvent || event).dialog = true;
			});

			return dialogPane;
		},
		_createTitle: function () {
			var titlePane = $("<div class='c-modal-title-bar' />");
			titlePane.append("<div class='c-modal-title'>" + this._options.title + "</div>")

			if (this._options.includeCloseButton) {
				var closePane = $("<div class='c-modal-close' />") // close button
				closePane.append("<i class='icon-remove' />");
				closePane.bind("click", this.close.bind(this));
				titlePane.append(closePane);
			}

			return titlePane;
		},
		_createContent: function () {
			var contentContainer = $("<div class='c-modal-content-container' />");
			var contentPane = $("<div class='c-modal-content' />");
			contentContainer.append(contentPane);
			if (this._options.text) {
				var textContainer = $("<p>");
				if (this._options.text.constructor === String)
					textContainer.html(this._options.text);
				contentPane.append(textContainer);
			} else if (this._options.contentSelector) {
				contentPane.append($(this._options.contentSelector).show());
			}

			// If template name provided, load existing, otherwise create new template
			if (this._options.instance && this._options.templateName)
				contentPane.append(this._loadTemplate());
			else if (this._options.instance)
				contentPane.append(this._createTemplate());

			return contentContainer;
		},
		_createButtons: function () {
			var that = this;
			var buttonPane = $("<div class='c-modal-button-bar' />");
			var leftButtons = $("<div class='c-modal-buttons-left' />");
			var rightButtons = $("<div class='c-modal-buttons-right' />");
			if (this._options.buttons) {
				$.each(this._options.buttons, function (name, props) {
					var button;
					var execute = function () { };
					var autoClose = true;
					var isAlignedRight = true;
					var isAction = false;
					var isDefault = false;
					var isTab = false;
					var isCancel = false;

					// Can use array to pass in additional options
					if (Array.isArray(that._options.buttons)) {
						name = props.label;
						if ($.isFunction(props.click)) execute = props.click;
						if (props.align === "left") isAlignedRight = false;
						autoClose = props.autoClose != false;
						isAction = props.isAction;
						isTab = props.isTab;
						isCancel = props.isCancel;
						isDefault = props.isDefault;
					}
					else {
						if ($.isFunction(props)) {
							execute = props;
						} else {
							if (props.execute && $.isFunction(props.execute)) execute = props.execute;
							isDefault = props.isDefault;
						}
					}

					// Tabbed button
					if (isTab) {
						button = props.isDefaultTab ? $("<a class='c-modal-tab c-modal-tab-active'>" + name + "</a>") : $("<a class='c-modal-tab'>" + name + "</a>");
						isAlignedRight = false;
					}
					else {
						var actionStyle = isAction ? " c-modal-button-action" : "";
						actionStyle += isCancel ? " c-modal-button-cancel" : "";
						button = isAlignedRight ? $("<a class='c-modal-button" + actionStyle + "'>" + name + "</a>") : $("<a class='c-modal-button c-modal-button-left" + actionStyle + "'>" + name + "</a>");
					}
					if (isDefault) that._defaultButton = button;

					var acceleratorChar = null;
					for (var i = 0; i < name.length && !acceleratorChar; i++) {
						if (!that._accelerators[name[i].toLowerCase()]) acceleratorChar = name[i].toLowerCase();
					}

					that._accelerators[acceleratorChar] = button;

					button.bind("click", that._buttonWrapper.bind(that, buttonPane, execute, autoClose, isCancel, button));
					isAlignedRight ? rightButtons.append(button) : leftButtons.append(button);
				});

				buttonPane.append(leftButtons);
				buttonPane.append(rightButtons);
			}

			return buttonPane;
		},
		_createTemplate: function () {
			var templatePane = $("<div class='sys-template' sys:attach='dataview' dataview:data='{~ " + this._options.instance + " }' sys:content-template='form' />");
			templatePane.append("<div sys:attach='content' content:data='{@ " + this._options.property + "}' />");

			return templatePane;
		},
		_loadTemplate: function () {
			return $("<div sys:attach='content' content:data='{~ " + this._options.instance + " }' content:template='" + this._options.templateName + "'></div>");
		},
		_buttonWrapper: function (buttonPane, buttonFunc, autoClose, isCancel, button, event) {
			if (this._isExecuting.isActive()) return;

			if(!isCancel && button.hasClass("c-modal-button"))
				button.addClass("c-modal-button-executing");

			buttonFunc.call(this, event, button);

			var that = this;
			this._isExecuting.waitForAll(function () {
				if (autoClose) that.close(isCancel);
			});
		},
		_bindTo: function (element) {
			if (element) $(element).bind("click", this.open.bind(this));
		},
		open: function (origEvt) {
			if (this._options.open) {
				if (!this._options.open.call(this, origEvt))

					// Indicate that the dialog was not opened
					return false;
			}

			$('body').addClass('c-modal-active');

			if (this._options.url) {
				this._dialog.find(".c-modal-content").remove();

				var contentContainer = this._dialog.find(".c-modal-content-container");

				this.frame = $("<iframe"
						+ (this._options.name ? " name='" + this._options.name + "'" : "")
						+ " style='width: 100%; height: 100%; overflow-x: hidden; overflow-y: hidden; -ms-overflow-style: scrollbar'"
						+ " src='" + this._options.url + "'"
						+ "></iframe>")
					.appendTo(contentContainer)
					.get(0);
			}
			else if (this._options.text instanceof Function)
				this._dialog.find(".c-modal-content p").html(this._options.text());

			if (origEvt) {
				this.$element = $(origEvt.currentTarget);
				if (origEvt.preventDefault instanceof Function)
					origEvt.preventDefault();
			}

			// Expose the event that caused the dialog to open
			this.event = origEvt;

			if (this._options.checkpoint) {
				window.context.server.beginCapturingChanges();
				this._checkpoint = context.server.checkpoint();
			}

			// Show the overlay and support automatic closure when the overlay is clicked
			if (Cognito.showOverlay && Dialog.activeDialogs.length == 0) {
				Cognito.showOverlay(function () {
					var dialogs = Dialog.activeDialogs;
					Dialog.activeDialogs = [];
					for (var d = dialogs.length - 1; d >= 0; d--) {
						var dialog = dialogs[d];
						if (dialog._options.closeOnOverlayClick)
							dialog.close(true);
					}
				});
			}

			// Set the width and height
			this._dialog.css({
				"max-width": this._options.width + ($.isNumeric(this._options.width) ? "px" : ""),
				"max-height": this._options.height + ($.isNumeric(this._options.height) ? "px" : "")
			});

			// Show the dialog
			$(this._dialog).css("opacity", 1);
			this._dialog.fadeIn();

			// Fade in an overlay above the active dialog, if stacking
			if (Dialog.activeDialogs.length > 0) {
				var dialog = Dialog.activeDialogs[Dialog.activeDialogs.length - 1];
				dialog._dialog.find(".c-modal-overlay").fadeIn();
			}

			// Add the dialog to the active dialog stack
			Dialog.activeDialogs.push(this);

			// Indicate that the dialog was opened
			return true;
		},
		close: function (isCancel) {

			if (this.frame) {
				var frame = this.frame;

				// Clean up the iframe.
				// http://stackoverflow.com/questions/12128458/iframes-and-memory-management-in-javascript
				frame.src = "";
				frame.contentWindow.location.reload();
				setTimeout(function(){
					$(frame).remove();
				}, 1000);

				delete this.frame;
			}

			$('body').removeClass('c-modal-active');

			var that = this;
			if (this._checkpoint && this._options.checkpoint) {
				if (isCancel)
					context.server.rollback(this._checkpoint);
				context.server.stopCapturingChanges();
			}

			if (isCancel && this._options.cancel) {
				this._options.cancel.call(this);
			}

			if (typeof (this._options.onClose) === "function")
				this._options.onClose.call(this);

			$(".c-modal-button:visible").removeClass("c-modal-button-executing");
			this._dialog.fadeOut(function () { that._isExecuting = new ExoWeb.Signal(); that._dialog.find(".c-modal-overlay").hide() });

			Dialog.activeDialogs.pop(this);

			// Fade out the overlay above the active dialog, if stacking
			if (Dialog.activeDialogs.length > 0) {
				var dialog = Dialog.activeDialogs[Dialog.activeDialogs.length - 1];
				dialog._dialog.find(".c-modal-overlay").fadeOut();
			}

			// Hide the overlay, if this is the final dialog
			else
				Cognito.hideOverlay();
		},
		pending: function (callback) {
			return this._isExecuting.pending(callback);
		},
		orPending: function (callback) {
			return this._isExecuting.orPending(callback);
		}
	};

	var that = this;

	// For some unknown reason, the event is being bounded multiple times.  To ensure the event is only bounded once, the event is unbind before it is bind.
	$(document)
		.on("keyup.cognito.dialog", function (e) {
			if (Dialog.activeDialogs.length > 0) {
				var dialog = Dialog.activeDialogs[Dialog.activeDialogs.length - 1];

                if (e.altKey || e.ctrlKey)
                    return;

				switch (e.keyCode) {
					case 13:
						if (dialog._defaultButton && !dialog._defaultButton.is("[disabled], .disabled"))
							dialog._defaultButton.trigger("click");
						e.preventDefault();
						break;
					case 27:
						if (dialog._options.closeOnEscape) {
							dialog.close.call(dialog, true);
							e.preventDefault();
						}
						break;
					default:
						if (dialog._dialog.find("input:focus, textarea:focus").length === 0) {
							var charCode = e.which || e.keyCode;
							var char = String.fromCharCode(charCode).toLowerCase();
							if (dialog._accelerators[char] && !dialog._accelerators[char].is("[disabled], .disabled"))
								dialog._accelerators[char].trigger("click");
							e.preventDefault();
						}
				}
			}
		})

		// Hide the dialog when the title bar is clicked (so users can peek under the dialog)
		.on("mousedown.cognito.dialog", ".c-modal-title-bar", function (event) {
			if (Dialog.activeDialogs.length > 0 && $(event.srcElement).closest(".c-modal-close").length == 0) {
				var dialog = Dialog.activeDialogs[Dialog.activeDialogs.length - 1];
				$(dialog._dialog).css("opacity", 0.05);
				$(document).on("mousemove.cognito.dialog", function () {
					$(dialog._dialog).css("opacity", 1);
					$(document).off("mousemove.cognito.dialog");
				});
			}
		})

		// Hide the dialog when the title bar is clicked (so users can peek under the dialog)
		.on("click", ".c-modal-overlay", function () {
			if (Dialog.activeDialogs.length > 0) {
				var dialog = Dialog.activeDialogs[Dialog.activeDialogs.length - 1];
				dialog.close(true);
			}
		});

	$.fn.dialog = function(options) {
		try {
			// Determine if the page is hosted in an iframe dialog.
			var frame = window.frameElement;
			if (frame && $(frame.parentElement).is(".c-modal-content-container")) {
				// Determine if the iframe's parent window contains the Cognito jQuery dialog function.
				if (window.parent.$ && window.parent.$.fn && window.parent.$.fn.dialog) {

					// Convert content selectors into text before promoting to parent window
					if (options.contentSelector) {
						options.text = $(options.contentSelector).html();
						options.contentSelector = null;
					}

					// Call the dialog function on the parent window so that all dialogs open in
					// the outermost window, so they don't have to be nested within one another.
					return window.parent.$.fn.dialog(options);
				}
			}
		} catch (e) {
			// Ignore potential cross-domain errors when attempting to access the frame element...
		}

		var dialog = new Dialog(options);

		// Called in the context of a selector
		if (this.length > 0) {
			return this.each(function() {
				var $this = $(this);
				var data = $this.data("cognito.dialog");

				if (!data) $this.data("cognito.dialog", (data = dialog));

				data._bindTo(this);
			});
		}

		// Called in the context of an assignment
		var viewport = $((options.viewport || (options.viewport = document.body)));
		var storage = viewport.data("cognito.dialog");
		if (!storage) viewport.data("cognito.dialog", (storage = []));

		var data = dialog;
		storage.push(data);

		return data;
	};

	$.fn.dialog.constructor = Dialog;
})(jQuery);
})();
;(function() { if (Cognito.config.scripts.indexOf('cognito-toggle') >= 0) return; else Cognito.config.scripts.push('cognito-toggle');/*! ============================================================
 * bootstrapSwitch v1.8 by Larentis Mattia @SpiritualGuru
 * http://www.larentis.eu/
 *
 * Enhanced for radiobuttons by Stein, Peter @BdMdesigN
 * http://www.bdmdesign.org/
 *
 * Project site:
 * http://www.larentis.eu/switch/
 * ============================================================
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 * ============================================================ */

!function ($) {
	"use strict";

	$.fn['bootstrapSwitch'] = function (method) {
		var methods = {
			init: function () {
				return this.each(function () {
					var $element = $(this).parent()
					  , $input = $(this)
					  , $div
					  , $switchLeft
					  , $switchRight
					  , $label
					  , $form = $element.closest('form')
					  , myClasses = ""
					  , classes = $element.attr('class')
					  , color
					  , moving
					  , onLabel = "ON"
					  , offLabel = "OFF"
					  , icon = false
					  , textLabel = false;

					/*
					$.each(['switch-mini', 'switch-small', 'switch-large'], function (i, el) {
						if (classes.indexOf(el) >= 0)
							myClasses = el;
					});
					*/

					$element.addClass('has-switch');

					if ($element.data('on') !== undefined)
						color = "switch-" + $element.data('on');

					if ($element.data('on-label') !== undefined)
						onLabel = $element.data('on-label');

					if ($element.data('off-label') !== undefined)
						offLabel = $element.data('off-label');

					if ($element.data('label-icon') !== undefined)
						icon = $element.data('label-icon');

					if ($element.data('text-label') !== undefined)
						textLabel = $element.data('text-label');

					$switchLeft = $('<span>')
					  .addClass("switch-left")
					  .addClass(myClasses)
					  .addClass(color)
					  .html('' + onLabel + '');

					color = '';
					if ($element.data('off') !== undefined)
						color = "switch-" + $element.data('off');

					$switchRight = $('<span>')
					  .addClass("switch-right")
					  .addClass(myClasses)
					  .addClass(color)
					  .html('' + offLabel + '');

					$label = $('<label>')
					  .html("&nbsp;")
					  .addClass(myClasses)
					  .attr('for', $input.attr('id'));

					if (icon) {
						$label.html('<i class="icon ' + icon + '"></i>');
					}

					if (textLabel) {
						$label.html('' + textLabel + '');
					}

					$div = $input.wrap($('<div>')).parent().data('animated', false);

					if ($element.data('animated') !== false)
						$div.addClass('switch-animate').data('animated', true);

					$div
					  .append($switchLeft)
					  .append($label)
					  .append($switchRight);

					$element.find('>div').addClass(
					  $input.is(':checked') ? 'switch-on' : 'switch-off'
					);

					if ($input.is(':disabled'))
						$(this).addClass('deactivate');

					var changeStatus = function ($this) {
						if ($element.parent('label').is('.label-change-switch')) {

						} else {
							$this.siblings('label').trigger('mousedown').trigger('mouseup').trigger('click');
						}
					};

					$element.on('keydown', function (e) {
						if (e.keyCode === 32) {
							e.stopImmediatePropagation();
							e.preventDefault();
							changeStatus($(e.target).find('span:first'));
						}
					});

					$switchLeft.on('click', function (e) {
						changeStatus($(this));
					});

					$switchRight.on('click', function (e) {
						changeStatus($(this));
					});

					$input.on('change', function (e, skipOnChange) {
						var $this = $(this)
						  , $element = $this.parent()
						  , thisState = $this.is(':checked')
						  , state = $element.is('.switch-off');

						e.preventDefault();

						$element.css('left', '');

						if (state === thisState) {

							if (thisState)
								$element.removeClass('switch-off').addClass('switch-on');
							else $element.removeClass('switch-on').addClass('switch-off');

							if ($element.data('animated') !== false)
								$element.addClass("switch-animate");

							if (typeof skipOnChange === 'boolean' && skipOnChange)
								return;

							$element.parent().trigger('switch-change', { 'el': $this, 'value': thisState })
						}
					});

					$element.find('label').on('mousedown touchstart', function (e) {
						var $this = $(this);
						moving = false;

						e.preventDefault();
						e.stopImmediatePropagation();

						$this.closest('div').removeClass('switch-animate');

						if ($this.closest('.has-switch').is('.deactivate')) {
							$this.unbind('click');
						} else if ($this.closest('.switch-on').parent().is('.radio-no-uncheck')) {
							$this.unbind('click');
						} else {
							$this.on('mousemove touchmove', function (e) {
								var $element = $(this).parents(".has-switch")
								  , relativeX = (e.pageX || e.originalEvent.targetTouches[0].pageX) - $element.offset().left
								  , percent = (relativeX / $element.width()) * 100
								  , left = 25
								  , right = 75;

								moving = true;

								if (percent < left)
									percent = left;
								else if (percent > right)
									percent = right;

								$element.find('>div').css('left', (percent - right) + "%")
							});

							$this.on('click touchend', function (e) {
								var $this = $(this)
								  , $myInputBox = $this.siblings('input');

								e.stopImmediatePropagation();
								e.preventDefault();

								$this.unbind('mouseleave');

								if (moving)
									$myInputBox.prop('checked', !(parseInt($this.parent().css('left')) < -25));
								else
									$myInputBox.prop("checked", !$myInputBox.is(":checked"));

								moving = false;
								$myInputBox.trigger('change');
							});

							$this.on('mouseleave', function (e) {
								var $this = $(this)
								  , $myInputBox = $this.siblings('input');

								e.preventDefault();
								e.stopImmediatePropagation();

								$this.unbind('mouseleave mousemove');
								$this.trigger('mouseup');

								$myInputBox.prop('checked', !(parseInt($this.parent().css('left')) < -25)).trigger('change');
							});

							$this.on('mouseup', function (e) {
								e.stopImmediatePropagation();
								e.preventDefault();

								$(this).trigger('mouseleave');
							});
						}
					});

					if ($form.data('bootstrapSwitch') !== 'injected') {
						$form.bind('reset', function () {
							setTimeout(function () {
								$form.find('.c-toggle').each(function () {
									$input.prop('checked', $input.is(':checked')).trigger('change');
								});
							}, 1);
						});
						$form.data('bootstrapSwitch', 'injected');
					}
				}
				);
			},
			toggleActivation: function () {
				var $element = $(this).parent();
				var $this = $(this);

				$element.toggleClass('deactivate');
				$this.prop('disabled', $element.is('.deactivate'));
			},
			isActive: function () {
				return !$(this).hasClass('deactivate');
			},
			setActive: function (active) {
				var $element = $(this).parent();
				var $this = $(this);

				if (active) {
					$element.removeClass('deactivate');
					$this.removeAttr('disabled');
				}
				else {
					$element.addClass('deactivate');
					$this.attr('disabled', 'disabled');
				}
			},
			toggleState: function (skipOnChange) {
				var $input = $(this).find(':checkbox');
				$input.prop('checked', !$input.is(':checked')).trigger('change', skipOnChange);
			},
			toggleRadioState: function (skipOnChange) {
				var $radioinput = $(this).find(':radio');
				$radioinput.not(':checked').prop('checked', !$radioinput.is(':checked')).trigger('change', skipOnChange);
			},
			toggleRadioStateAllowUncheck: function (uncheck, skipOnChange) {
				var $radioinput = $(this).find(':radio');
				if (uncheck) {
					$radioinput.not(':checked').trigger('change', skipOnChange);
				}
				else {
					$radioinput.not(':checked').prop('checked', !$radioinput.is(':checked')).trigger('change', skipOnChange);
				}
			},
			setState: function (value, skipOnChange) {
				$(this).prop('checked', value).trigger('change', skipOnChange);
			},
			setOnLabel: function (value) {
				var $switchLeft = $(this).find(".switch-left");
				$switchLeft.html(value);
			},
			setOffLabel: function (value) {
				var $switchRight = $(this).find(".switch-right");
				$switchRight.html(value);
			},
			setOnClass: function (value) {
				var $switchLeft = $(this).find(".switch-left");
				var color = '';
				if (value !== undefined) {
					if ($(this).attr('data-on') !== undefined) {
						color = "switch-" + $(this).attr('data-on')
					}
					$switchLeft.removeClass(color);
					color = "switch-" + value;
					$switchLeft.addClass(color);
				}
			},
			setOffClass: function (value) {
				var $switchRight = $(this).find(".switch-right");
				var color = '';
				if (value !== undefined) {
					if ($(this).attr('data-off') !== undefined) {
						color = "switch-" + $(this).attr('data-off')
					}
					$switchRight.removeClass(color);
					color = "switch-" + value;
					$switchRight.addClass(color);
				}
			},
			setAnimated: function (value) {
				var $element = $(this);
				if (value === undefined) value = false;
				$element.data('animated', value);
				$element.attr('data-animated', value);

				if ($element.data('animated') !== false) {
					$element.addClass("switch-animate");
				} else {
					$element.removeClass("switch-animate");
				}
			},
			setSizeClass: function (value) {
				var $element = $(this);
				var $switchLeft = $element.find(".switch-left");
				var $switchRight = $element.find(".switch-right");
				var $label = $element.find("label");
				$.each(['switch-mini', 'switch-small', 'switch-large'], function (i, el) {
					if (el !== value) {
						$switchLeft.removeClass(el);
						$switchRight.removeClass(el);
						$label.removeClass(el);
					} else {
						$switchLeft.addClass(el);
						$switchRight.addClass(el);
						$label.addClass(el);
					}
				});
			},
			status: function () {
				return $(this).find(inputSelector).is(':checked');
			},
			destroy: function () {
				var $element = $(this)
				  , $div = $element.find('div')
				  , $form = $element.closest('form')
				  , $inputbox;

				$div.find(':not(input)').remove();

				$inputbox = $div.children();
				$inputbox.unwrap().unwrap();

				$inputbox.unbind('change');

				if ($form) {
					$form.unbind('reset');
					$form.removeData('bootstrapSwitch');
				}

				return $inputbox;
			}
		};

		if (methods[method])
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		else if (typeof method === 'object' || !method)
			return methods.init.apply(this, arguments);
		else
			$.error('Method ' + method + ' does not exist!');
	};
}(jQuery);})();
;(function() { if (Cognito.config.scripts.indexOf('jquery.focusable') >= 0) return; else Cognito.config.scripts.push('jquery.focusable');
(function( $, undefined ) {
	// selectors
	function focusable(element, isTabIndexNotNaN) {
		var map, mapName, img,
			nodeName = element.nodeName.toLowerCase();
		if ("area" === nodeName) {
			map = element.parentNode;
			mapName = map.name;
			if (!element.href || !mapName || map.nodeName.toLowerCase() !== "map") {
				return false;
			}
			img = $("img[usemap=#" + mapName + "]")[0];
			return !!img && visible(img);
		}
		return (/input|select|textarea|button|object/.test(nodeName) ?
			!element.disabled :
			"a" === nodeName ?
				element.href || isTabIndexNotNaN :
				isTabIndexNotNaN) &&
			// the element and all of its ancestors must be visible
			visible(element);
	}

	function visible(element) {
		return $.expr.filters.visible(element) &&
			!$(element).parents().addBack().filter(function () {
				return $.css(this, "visibility") === "hidden";
			}).length;
	}

	$.extend($.expr[":"], {
		focusable: function (element) {
			return focusable(element, !isNaN($.attr(element, "tabindex")));
		},

		tabbable: function (element) {
			var tabIndex = $.attr(element, "tabindex"),
				isTabIndexNaN = isNaN(tabIndex);
			return (isTabIndexNaN || tabIndex >= 0) && focusable(element, !isTabIndexNaN);
		}
	});

})(jQuery);})();
;(function() { if (Cognito.config.scripts.indexOf('Sortable') >= 0) return; else Cognito.config.scripts.push('Sortable');/**!
 * Sortable
 * @author	RubaXa   <trash@rubaxa.org>
 * @license MIT
 */

(function sortableModule(factory) {
    "use strict";

    if (typeof define === "function" && define.amd) {
        define(factory);
    }
    else if (typeof module != "undefined" && typeof module.exports != "undefined") {
        module.exports = factory();
    }
    else {
        /* jshint sub:true */
        window["Sortable"] = factory();
    }
})(function sortableFactory() {
    "use strict";

    if (typeof window === "undefined" || !window.document) {
        return function sortableError() {
            throw new Error("Sortable.js requires a window with a document");
        };
    }

    var dragEl,
        parentEl,
        ghostEl,
        cloneEl,
        rootEl,
        nextEl,
        lastDownEl,

        scrollEl,
        scrollParentEl,
        scrollCustomFn,

        lastEl,
        lastCSS,
        lastParentCSS,

        oldIndex,
        newIndex,

        activeGroup,
        putSortable,

        autoScroll = {},

        tapEvt,
        touchEvt,

        moved,

        /** @const */
        R_SPACE = /\s+/g,
        R_FLOAT = /left|right|inline/,

        expando = 'Sortable' + (new Date).getTime(),

        win = window,
        document = win.document,
        parseInt = win.parseInt,
        setTimeout = win.setTimeout,

        $ = win.jQuery || win.Zepto,
        Polymer = win.Polymer,

        captureMode = false,
        passiveMode = false,

        supportDraggable = ('draggable' in document.createElement('div')),
        supportCssPointerEvents = (function (el) {
            // false when IE11
            if (!!navigator.userAgent.match(/(?:Trident.*rv[ :]?11\.|msie)/i)) {
                return false;
            }
            el = document.createElement('x');
            el.style.cssText = 'pointer-events:auto';
            return el.style.pointerEvents === 'auto';
        })(),

        _silent = false,

        abs = Math.abs,
        min = Math.min,

        savedInputChecked = [],
        touchDragOverListeners = [],

        _autoScroll = _throttle(function (/**Event*/evt, /**Object*/options, /**HTMLElement*/rootEl) {
            // Bug: https://bugzilla.mozilla.org/show_bug.cgi?id=505521
            if (rootEl && options.scroll) {
                var _this = rootEl[expando],
                    el,
                    rect,
                    sens = options.scrollSensitivity,
                    speed = options.scrollSpeed,

                    x = evt.clientX,
                    y = evt.clientY,

                    winWidth = window.innerWidth,
                    winHeight = window.innerHeight,

                    vx,
                    vy,

                    scrollOffsetX,
                    scrollOffsetY
                    ;

                // Delect scrollEl
                if (scrollParentEl !== rootEl) {
                    scrollEl = options.scroll;
                    scrollParentEl = rootEl;
                    scrollCustomFn = options.scrollFn;

                    if (scrollEl === true) {
                        scrollEl = rootEl;

                        do {
                            if ((scrollEl.offsetWidth < scrollEl.scrollWidth) ||
                                (scrollEl.offsetHeight < scrollEl.scrollHeight)
                            ) {
                                break;
                            }
                            /* jshint boss:true */
                        } while (scrollEl = scrollEl.parentNode);
                    }
                }

                if (scrollEl) {
                    el = scrollEl;
                    rect = scrollEl.getBoundingClientRect();
                    vx = (abs(rect.right - x) <= sens) - (abs(rect.left - x) <= sens);
                    vy = (abs(rect.bottom - y) <= sens) - (abs(rect.top - y) <= sens);
                }


                if (!(vx || vy)) {
                    vx = (winWidth - x <= sens) - (x <= sens);
                    vy = (winHeight - y <= sens) - (y <= sens);

                    /* jshint expr:true */
                    (vx || vy) && (el = win);
                }


                if (autoScroll.vx !== vx || autoScroll.vy !== vy || autoScroll.el !== el) {
                    autoScroll.el = el;
                    autoScroll.vx = vx;
                    autoScroll.vy = vy;

                    clearInterval(autoScroll.pid);

                    if (el) {
                        autoScroll.pid = setInterval(function () {
                            scrollOffsetY = vy ? vy * speed : 0;
                            scrollOffsetX = vx ? vx * speed : 0;

                            if ('function' === typeof (scrollCustomFn)) {
                                return scrollCustomFn.call(_this, scrollOffsetX, scrollOffsetY, evt);
                            }

                            if (el === win) {
                                win.scrollTo(win.pageXOffset + scrollOffsetX, win.pageYOffset + scrollOffsetY);
                            } else {
                                el.scrollTop += scrollOffsetY;
                                el.scrollLeft += scrollOffsetX;
                            }
                        }, 24);
                    }
                }
            }
        }, 30),

        _prepareGroup = function (options) {
            function toFn(value, pull) {
                if (value === void 0 || value === true) {
                    value = group.name;
                }

                if (typeof value === 'function') {
                    return value;
                } else {
                    return function (to, from) {
                        var fromGroup = from.options.group.name;

                        return pull
                            ? value
                            : value && (value.join
                                ? value.indexOf(fromGroup) > -1
                                : (fromGroup == value)
                            );
                    };
                }
            }

            var group = {};
            var originalGroup = options.group;

            if (!originalGroup || typeof originalGroup != 'object') {
                originalGroup = { name: originalGroup };
            }

            group.name = originalGroup.name;
            group.checkPull = toFn(originalGroup.pull, true);
            group.checkPut = toFn(originalGroup.put);
            group.revertClone = originalGroup.revertClone;

            options.group = group;
        }
        ;

    // Detect support a passive mode
    try {
        window.addEventListener('test', null, Object.defineProperty({}, 'passive', {
            get: function () {
                // `false`, because everything starts to work incorrectly and instead of d'n'd,
                // begins the page has scrolled.
                passiveMode = false;
                captureMode = {
                    capture: false,
                    passive: passiveMode
                };
            }
        }));
    } catch (err) { }

	/**
	 * @class  Sortable
	 * @param  {HTMLElement}  el
	 * @param  {Object}       [options]
	 */
    function Sortable(el, options) {
        if (!(el && el.nodeType && el.nodeType === 1)) {
            throw 'Sortable: `el` must be HTMLElement, and not ' + {}.toString.call(el);
        }

        this.el = el; // root element
        this.options = options = _extend({}, options);


        // Export instance
        el[expando] = this;

        // Default options
        var defaults = {
            group: Math.random(),
            sort: true,
            disabled: false,
            store: null,
            handle: null,
            scroll: true,
            scrollSensitivity: 30,
            scrollSpeed: 10,
            draggable: /[uo]l/i.test(el.nodeName) ? 'li' : '>*',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            ignore: 'a, img',
            filter: null,
            preventOnFilter: true,
            animation: 0,
            setData: function (dataTransfer, dragEl) {
                dataTransfer.setData('Text', dragEl.textContent);
            },
            dropBubble: false,
            dragoverBubble: false,
            dataIdAttr: 'data-id',
            delay: 0,
            forceFallback: false,
            fallbackClass: 'sortable-fallback',
            fallbackOnBody: false,
            fallbackTolerance: 0,
            fallbackOffset: { x: 0, y: 0 },
            supportPointer: Sortable.supportPointer !== false
        };


        // Set default options
        for (var name in defaults) {
            !(name in options) && (options[name] = defaults[name]);
        }

        _prepareGroup(options);

        // Bind all private methods
        for (var fn in this) {
            if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
                this[fn] = this[fn].bind(this);
            }
        }

        // Setup drag mode
        this.nativeDraggable = options.forceFallback ? false : supportDraggable;

        // Bind events
        _on(el, 'mousedown', this._onTapStart);
        _on(el, 'touchstart', this._onTapStart);
        options.supportPointer && _on(el, 'pointerdown', this._onTapStart);

        if (this.nativeDraggable) {
            _on(el, 'dragover', this);
            _on(el, 'dragenter', this);
        }

        touchDragOverListeners.push(this._onDragOver);

        // Restore sorting
        options.store && this.sort(options.store.get(this));
    }


    Sortable.prototype = /** @lends Sortable.prototype */ {
        constructor: Sortable,

        _onTapStart: function (/** Event|TouchEvent */evt) {
            var _this = this,
                el = this.el,
                options = this.options,
                preventOnFilter = options.preventOnFilter,
                type = evt.type,
                touch = evt.touches && evt.touches[0],
                target = (touch || evt).target,
                originalTarget = evt.target.shadowRoot && (evt.path && evt.path[0]) || target,
                filter = options.filter,
                startIndex;

            _saveInputCheckedState(el);


            // Don't trigger start event when an element is been dragged, otherwise the evt.oldindex always wrong when set option.group.
            if (dragEl) {
                return;
            }

            if (/mousedown|pointerdown/.test(type) && evt.button !== 0 || options.disabled) {
                return; // only left button or enabled
            }

            // cancel dnd if original target is content editable
            if (originalTarget.isContentEditable) {
                return;
            }

            target = _closest(target, options.draggable, el);

            if (!target) {
                return;
            }

            if (lastDownEl === target) {
                // Ignoring duplicate `down`
                return;
            }

            // Get the index of the dragged element within its parent
            startIndex = _index(target, options.draggable);

            // Check filter
            if (typeof filter === 'function') {
                if (filter.call(this, evt, target, this)) {
                    _dispatchEvent(_this, originalTarget, 'filter', target, el, el, startIndex);
                    preventOnFilter && evt.preventDefault();
                    return; // cancel dnd
                }
            }
            else if (filter) {
                filter = filter.split(',').some(function (criteria) {
                    criteria = _closest(originalTarget, criteria.trim(), el);

                    if (criteria) {
                        _dispatchEvent(_this, criteria, 'filter', target, el, el, startIndex);
                        return true;
                    }
                });

                if (filter) {
                    preventOnFilter && evt.preventDefault();
                    return; // cancel dnd
                }
            }

            if (options.handle && !_closest(originalTarget, options.handle, el)) {
                return;
            }

            // Prepare `dragstart`
            this._prepareDragStart(evt, touch, target, startIndex);
        },

        _prepareDragStart: function (/** Event */evt, /** Touch */touch, /** HTMLElement */target, /** Number */startIndex) {
            var _this = this,
                el = _this.el,
                options = _this.options,
                ownerDocument = el.ownerDocument,
                dragStartFn;

            if (target && !dragEl && (target.parentNode === el)) {
                tapEvt = evt;

                rootEl = el;
                dragEl = target;
                parentEl = dragEl.parentNode;
                nextEl = dragEl.nextSibling;
                lastDownEl = target;
                activeGroup = options.group;
                oldIndex = startIndex;

                this._lastX = (touch || evt).clientX;
                this._lastY = (touch || evt).clientY;

                dragEl.style['will-change'] = 'all';

                dragStartFn = function () {
                    // Delayed drag has been triggered
                    // we can re-enable the events: touchmove/mousemove
                    _this._disableDelayedDrag();

                    // Make the element draggable
                    dragEl.draggable = _this.nativeDraggable;

                    // Chosen item
                    _toggleClass(dragEl, options.chosenClass, true);

                    // Bind the events: dragstart/dragend
                    _this._triggerDragStart(evt, touch);

                    // Drag start event
                    _dispatchEvent(_this, rootEl, 'choose', dragEl, rootEl, rootEl, oldIndex);
                };

                // Disable "draggable"
                options.ignore.split(',').forEach(function (criteria) {
                    _find(dragEl, criteria.trim(), _disableDraggable);
                });

                _on(ownerDocument, 'mouseup', _this._onDrop);
                _on(ownerDocument, 'touchend', _this._onDrop);
                _on(ownerDocument, 'touchcancel', _this._onDrop);
                _on(ownerDocument, 'selectstart', _this);
                options.supportPointer && _on(ownerDocument, 'pointercancel', _this._onDrop);

                if (options.delay) {
                    // If the user moves the pointer or let go the click or touch
                    // before the delay has been reached:
                    // disable the delayed drag
                    _on(ownerDocument, 'mouseup', _this._disableDelayedDrag);
                    _on(ownerDocument, 'touchend', _this._disableDelayedDrag);
                    _on(ownerDocument, 'touchcancel', _this._disableDelayedDrag);
                    _on(ownerDocument, 'mousemove', _this._disableDelayedDrag);
                    _on(ownerDocument, 'touchmove', _this._disableDelayedDrag);
                    options.supportPointer && _on(ownerDocument, 'pointermove', _this._disableDelayedDrag);

                    _this._dragStartTimer = setTimeout(dragStartFn, options.delay);
                } else {
                    dragStartFn();
                }


            }
        },

        _disableDelayedDrag: function () {
            var ownerDocument = this.el.ownerDocument;

            clearTimeout(this._dragStartTimer);
            _off(ownerDocument, 'mouseup', this._disableDelayedDrag);
            _off(ownerDocument, 'touchend', this._disableDelayedDrag);
            _off(ownerDocument, 'touchcancel', this._disableDelayedDrag);
            _off(ownerDocument, 'mousemove', this._disableDelayedDrag);
            _off(ownerDocument, 'touchmove', this._disableDelayedDrag);
            _off(ownerDocument, 'pointermove', this._disableDelayedDrag);
        },

        _triggerDragStart: function (/** Event */evt, /** Touch */touch) {
            touch = touch || (evt.pointerType == 'touch' ? evt : null);

            if (touch) {
                // Touch device support
                tapEvt = {
                    target: dragEl,
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };

                this._onDragStart(tapEvt, 'touch');
            }
            else if (!this.nativeDraggable) {
                this._onDragStart(tapEvt, true);
            }
            else {
                _on(dragEl, 'dragend', this);
                _on(rootEl, 'dragstart', this._onDragStart);
            }

            try {
                if (document.selection) {
                    // Timeout neccessary for IE9
                    _nextTick(function () {
                        document.selection.empty();
                    });
                } else {
                    window.getSelection().removeAllRanges();
                }
            } catch (err) {
            }
        },

        _dragStarted: function () {
            if (rootEl && dragEl) {
                var options = this.options;

                // Apply effect
                _toggleClass(dragEl, options.ghostClass, true);
                _toggleClass(dragEl, options.dragClass, false);

                Sortable.active = this;

                // Drag start event
                _dispatchEvent(this, rootEl, 'start', dragEl, rootEl, rootEl, oldIndex);
            } else {
                this._nulling();
            }
        },

        _emulateDragOver: function () {
            if (touchEvt) {
                if (this._lastX === touchEvt.clientX && this._lastY === touchEvt.clientY) {
                    return;
                }

                this._lastX = touchEvt.clientX;
                this._lastY = touchEvt.clientY;

                if (!supportCssPointerEvents) {
                    _css(ghostEl, 'display', 'none');
                }

                var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
                var parent = target;
                var i = touchDragOverListeners.length;

                if (target && target.shadowRoot) {
                    target = target.shadowRoot.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
                    parent = target;
                }

                if (parent) {
                    do {
                        if (parent[expando]) {
                            while (i--) {
                                touchDragOverListeners[i]({
                                    clientX: touchEvt.clientX,
                                    clientY: touchEvt.clientY,
                                    target: target,
                                    rootEl: parent
                                });
                            }

                            break;
                        }

                        target = parent; // store last element
                    }
                    /* jshint boss:true */
                    while (parent = parent.parentNode);
                }

                if (!supportCssPointerEvents) {
                    _css(ghostEl, 'display', '');
                }
            }
        },


        _onTouchMove: function (/**TouchEvent*/evt) {
            if (tapEvt) {
                var options = this.options,
                    fallbackTolerance = options.fallbackTolerance,
                    fallbackOffset = options.fallbackOffset,
                    touch = evt.touches ? evt.touches[0] : evt,
                    dx = (touch.clientX - tapEvt.clientX) + fallbackOffset.x,
                    dy = (touch.clientY - tapEvt.clientY) + fallbackOffset.y,
                    translate3d = evt.touches ? 'translate3d(' + dx + 'px,' + dy + 'px,0)' : 'translate(' + dx + 'px,' + dy + 'px)';

                // only set the status to dragging, when we are actually dragging
                if (!Sortable.active) {
                    if (fallbackTolerance &&
                        min(abs(touch.clientX - this._lastX), abs(touch.clientY - this._lastY)) < fallbackTolerance
                    ) {
                        return;
                    }

                    this._dragStarted();
                }

                // as well as creating the ghost element on the document body
                this._appendGhost();

                moved = true;
                touchEvt = touch;

                _css(ghostEl, 'webkitTransform', translate3d);
                _css(ghostEl, 'mozTransform', translate3d);
                _css(ghostEl, 'msTransform', translate3d);
                _css(ghostEl, 'transform', translate3d);

                evt.preventDefault();
            }
        },

        _appendGhost: function () {
            if (!ghostEl) {
                var rect = dragEl.getBoundingClientRect(),
                    css = _css(dragEl),
                    options = this.options,
                    ghostRect;

                ghostEl = dragEl.cloneNode(true);

                _toggleClass(ghostEl, options.ghostClass, false);
                _toggleClass(ghostEl, options.fallbackClass, true);
                _toggleClass(ghostEl, options.dragClass, true);

                _css(ghostEl, 'top', rect.top - parseInt(css.marginTop, 10));
                _css(ghostEl, 'left', rect.left - parseInt(css.marginLeft, 10));
                _css(ghostEl, 'width', rect.width);
                _css(ghostEl, 'height', rect.height);
                _css(ghostEl, 'opacity', '0.8');
                _css(ghostEl, 'position', 'fixed');
                _css(ghostEl, 'zIndex', '100000');
                _css(ghostEl, 'pointerEvents', 'none');

                options.fallbackOnBody && document.body.appendChild(ghostEl) || rootEl.appendChild(ghostEl);

                // Fixing dimensions.
                ghostRect = ghostEl.getBoundingClientRect();
                _css(ghostEl, 'width', rect.width * 2 - ghostRect.width);
                _css(ghostEl, 'height', rect.height * 2 - ghostRect.height);
            }
        },

        _onDragStart: function (/**Event*/evt, /**boolean*/useFallback) {
            var _this = this;
            var dataTransfer = evt.dataTransfer;
            var options = _this.options;

            _this._offUpEvents();

            if (activeGroup.checkPull(_this, _this, dragEl, evt)) {
                cloneEl = _clone(dragEl);

                cloneEl.draggable = false;
                cloneEl.style['will-change'] = '';

                _css(cloneEl, 'display', 'none');
                _toggleClass(cloneEl, _this.options.chosenClass, false);

                // #1143: IFrame support workaround
                _this._cloneId = _nextTick(function () {
                    rootEl.insertBefore(cloneEl, dragEl);
                    _dispatchEvent(_this, rootEl, 'clone', dragEl);
                });
            }

            _toggleClass(dragEl, options.dragClass, true);

            if (useFallback) {
                if (useFallback === 'touch') {
                    // Bind touch events
                    _on(document, 'touchmove', _this._onTouchMove);
                    _on(document, 'touchend', _this._onDrop);
                    _on(document, 'touchcancel', _this._onDrop);

                    if (options.supportPointer) {
                        _on(document, 'pointermove', _this._onTouchMove);
                        _on(document, 'pointerup', _this._onDrop);
                    }
                } else {
                    // Old brwoser
                    _on(document, 'mousemove', _this._onTouchMove);
                    _on(document, 'mouseup', _this._onDrop);
                }

                _this._loopId = setInterval(_this._emulateDragOver, 50);
            }
            else {
                if (dataTransfer) {
                    dataTransfer.effectAllowed = 'move';
                    options.setData && options.setData.call(_this, dataTransfer, dragEl);
                }

                _on(document, 'drop', _this);

                // #1143: Бывает элемент с IFrame внутри блокирует `drop`,
                // поэтому если вызвался `mouseover`, значит надо отменять весь d'n'd.
                // Breaking Chrome 62+
                // _on(document, 'mouseover', _this);

                _this._dragStartId = _nextTick(_this._dragStarted);
            }
        },

        _onDragOver: function (/**Event*/evt) {
            var el = this.el,
                target,
                dragRect,
                targetRect,
                revert,
                options = this.options,
                group = options.group,
                activeSortable = Sortable.active,
                isOwner = (activeGroup === group),
                isMovingBetweenSortable = false,
                canSort = options.sort;

            if (evt.preventDefault !== void 0) {
                evt.preventDefault();
                !options.dragoverBubble && evt.stopPropagation();
            }

            if (dragEl.animated) {
                return;
            }

            moved = true;

            if (activeSortable && !options.disabled &&
                (isOwner
                    ? canSort || (revert = !rootEl.contains(dragEl)) // Reverting item into the original list
                    : (
                        putSortable === this ||
                        (
                            (activeSortable.lastPullMode = activeGroup.checkPull(this, activeSortable, dragEl, evt)) &&
                            group.checkPut(this, activeSortable, dragEl, evt)
                        )
                    )
                ) &&
                (evt.rootEl === void 0 || evt.rootEl === this.el) // touch fallback
            ) {
                // Smart auto-scrolling
                _autoScroll(evt, options, this.el);

                if (_silent) {
                    return;
                }

                target = _closest(evt.target, options.draggable, el);
                dragRect = dragEl.getBoundingClientRect();

                if (putSortable !== this) {
                    putSortable = this;
                    isMovingBetweenSortable = true;
                }

                if (revert) {
                    _cloneHide(activeSortable, true);
                    parentEl = rootEl; // actualization

                    if (cloneEl || nextEl) {
                        rootEl.insertBefore(dragEl, cloneEl || nextEl);
                    }
                    else if (!canSort) {
                        rootEl.appendChild(dragEl);
                    }

                    return;
                }


                if ((el.children.length === 0) || (el.children[0] === ghostEl) ||
                    (el === evt.target) && (_ghostIsLast(el, evt))
                ) {
                    //assign target only if condition is true
                    if (el.children.length !== 0 && el.children[0] !== ghostEl && el === evt.target) {
                        target = el.lastElementChild;
                    }

                    if (target) {
                        if (target.animated) {
                            return;
                        }

                        targetRect = target.getBoundingClientRect();
                    }

                    _cloneHide(activeSortable, isOwner);

                    if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt) !== false) {
                        if (!dragEl.contains(el)) {
                            el.appendChild(dragEl);
                            parentEl = el; // actualization
                        }

                        this._animate(dragRect, dragEl);
                        target && this._animate(targetRect, target);
                    }
                }
                else if (target && !target.animated && target !== dragEl && (target.parentNode[expando] !== void 0)) {
                    if (lastEl !== target) {
                        lastEl = target;
                        lastCSS = _css(target);
                        lastParentCSS = _css(target.parentNode);
                    }

                    targetRect = target.getBoundingClientRect();

                    var width = targetRect.right - targetRect.left,
                        height = targetRect.bottom - targetRect.top,
                        floating = R_FLOAT.test(lastCSS.cssFloat + lastCSS.display)
                            || (lastParentCSS.display == 'flex' && lastParentCSS['flex-direction'].indexOf('row') === 0),
                        isWide = (target.offsetWidth > dragEl.offsetWidth),
                        isLong = (target.offsetHeight > dragEl.offsetHeight),
                        halfway = (floating ? (evt.clientX - targetRect.left) / width : (evt.clientY - targetRect.top) / height) > 0.5,
                        nextSibling = target.nextElementSibling,
                        after = false
                        ;

                    if (floating) {
                        var elTop = dragEl.offsetTop,
                            tgTop = target.offsetTop;

                        if (elTop === tgTop) {
                            after = (target.previousElementSibling === dragEl) && !isWide || halfway && isWide;
                        }
                        else if (target.previousElementSibling === dragEl || dragEl.previousElementSibling === target) {
                            after = (evt.clientY - targetRect.top) / height > 0.5;
                        } else {
                            after = tgTop > elTop;
                        }
                    } else if (!isMovingBetweenSortable) {
                        after = (nextSibling !== dragEl) && !isLong || halfway && isLong;
                    }

                    var moveVector = _onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, after);

                    if (moveVector !== false) {
                        if (moveVector === 1 || moveVector === -1) {
                            after = (moveVector === 1);
                        }

                        _silent = true;
                        setTimeout(_unsilent, 30);

                        _cloneHide(activeSortable, isOwner);

                        if (!dragEl.contains(el)) {
                            if (after && !nextSibling) {
                                el.appendChild(dragEl);
                            } else {
                                target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
                            }
                        }

                        parentEl = dragEl.parentNode; // actualization

                        this._animate(dragRect, dragEl);
                        this._animate(targetRect, target);
                    }
                }
            }
        },

        _animate: function (prevRect, target) {
            var ms = this.options.animation;

            if (ms) {
                var currentRect = target.getBoundingClientRect();

                if (prevRect.nodeType === 1) {
                    prevRect = prevRect.getBoundingClientRect();
                }

                _css(target, 'transition', 'none');
                _css(target, 'transform', 'translate3d('
                    + (prevRect.left - currentRect.left) + 'px,'
                    + (prevRect.top - currentRect.top) + 'px,0)'
                );

                target.offsetWidth; // repaint

                _css(target, 'transition', 'all ' + ms + 'ms');
                _css(target, 'transform', 'translate3d(0,0,0)');

                clearTimeout(target.animated);
                target.animated = setTimeout(function () {
                    _css(target, 'transition', '');
                    _css(target, 'transform', '');
                    target.animated = false;
                }, ms);
            }
        },

        _offUpEvents: function () {
            var ownerDocument = this.el.ownerDocument;

            _off(document, 'touchmove', this._onTouchMove);
            _off(document, 'pointermove', this._onTouchMove);
            _off(ownerDocument, 'mouseup', this._onDrop);
            _off(ownerDocument, 'touchend', this._onDrop);
            _off(ownerDocument, 'pointerup', this._onDrop);
            _off(ownerDocument, 'touchcancel', this._onDrop);
            _off(ownerDocument, 'pointercancel', this._onDrop);
            _off(ownerDocument, 'selectstart', this);
        },

        _onDrop: function (/**Event*/evt) {
            var el = this.el,
                options = this.options;

            clearInterval(this._loopId);
            clearInterval(autoScroll.pid);
            clearTimeout(this._dragStartTimer);

            _cancelNextTick(this._cloneId);
            _cancelNextTick(this._dragStartId);

            // Unbind events
            _off(document, 'mouseover', this);
            _off(document, 'mousemove', this._onTouchMove);

            if (this.nativeDraggable) {
                _off(document, 'drop', this);
                _off(el, 'dragstart', this._onDragStart);
            }

            this._offUpEvents();

            if (evt) {
                if (moved) {
                    evt.preventDefault();
                    !options.dropBubble && evt.stopPropagation();
                }

                ghostEl && ghostEl.parentNode && ghostEl.parentNode.removeChild(ghostEl);

                if (rootEl === parentEl || Sortable.active.lastPullMode !== 'clone') {
                    // Remove clone
                    cloneEl && cloneEl.parentNode && cloneEl.parentNode.removeChild(cloneEl);
                }

                if (dragEl) {
                    if (this.nativeDraggable) {
                        _off(dragEl, 'dragend', this);
                    }

                    _disableDraggable(dragEl);
                    dragEl.style['will-change'] = '';

                    // Remove class's
                    _toggleClass(dragEl, this.options.ghostClass, false);
                    _toggleClass(dragEl, this.options.chosenClass, false);

                    // Drag stop event
                    _dispatchEvent(this, rootEl, 'unchoose', dragEl, parentEl, rootEl, oldIndex);

                    if (rootEl !== parentEl) {
                        newIndex = _index(dragEl, options.draggable);

                        if (newIndex >= 0) {
                            // Add event
                            _dispatchEvent(null, parentEl, 'add', dragEl, parentEl, rootEl, oldIndex, newIndex);

                            // Remove event
                            _dispatchEvent(this, rootEl, 'remove', dragEl, parentEl, rootEl, oldIndex, newIndex);

                            // drag from one list and drop into another
                            _dispatchEvent(null, parentEl, 'sort', dragEl, parentEl, rootEl, oldIndex, newIndex);
                            _dispatchEvent(this, rootEl, 'sort', dragEl, parentEl, rootEl, oldIndex, newIndex);
                        }
                    }
                    else {
                        if (dragEl.nextSibling !== nextEl) {
                            // Get the index of the dragged element within its parent
                            newIndex = _index(dragEl, options.draggable);

                            if (newIndex >= 0) {
                                // drag & drop within the same list
                                _dispatchEvent(this, rootEl, 'update', dragEl, parentEl, rootEl, oldIndex, newIndex);
                                _dispatchEvent(this, rootEl, 'sort', dragEl, parentEl, rootEl, oldIndex, newIndex);
                            }
                        }
                    }

                    if (Sortable.active) {
                        /* jshint eqnull:true */
                        if (newIndex == null || newIndex === -1) {
                            newIndex = oldIndex;
                        }

                        _dispatchEvent(this, rootEl, 'end', dragEl, parentEl, rootEl, oldIndex, newIndex);

                        // Save sorting
                        this.save();
                    }
                }

            }

            this._nulling();
        },

        _nulling: function () {
            rootEl =
                dragEl =
                parentEl =
                ghostEl =
                nextEl =
                cloneEl =
                lastDownEl =

                scrollEl =
                scrollParentEl =

                tapEvt =
                touchEvt =

                moved =
                newIndex =

                lastEl =
                lastCSS =

                putSortable =
                activeGroup =
                Sortable.active = null;

            savedInputChecked.forEach(function (el) {
                el.checked = true;
            });
            savedInputChecked.length = 0;
        },

        handleEvent: function (/**Event*/evt) {
            switch (evt.type) {
                case 'drop':
                case 'dragend':
                    this._onDrop(evt);
                    break;

                case 'dragover':
                case 'dragenter':
                    if (dragEl) {
                        this._onDragOver(evt);
                        _globalDragOver(evt);
                    }
                    break;

                case 'mouseover':
                    this._onDrop(evt);
                    break;

                case 'selectstart':
                    evt.preventDefault();
                    break;
            }
        },


		/**
		 * Serializes the item into an array of string.
		 * @returns {String[]}
		 */
        toArray: function () {
            var order = [],
                el,
                children = this.el.children,
                i = 0,
                n = children.length,
                options = this.options;

            for (; i < n; i++) {
                el = children[i];
                if (_closest(el, options.draggable, this.el)) {
                    order.push(el.getAttribute(options.dataIdAttr) || _generateId(el));
                }
            }

            return order;
        },


		/**
		 * Sorts the elements according to the array.
		 * @param  {String[]}  order  order of the items
		 */
        sort: function (order) {
            var items = {}, rootEl = this.el;

            this.toArray().forEach(function (id, i) {
                var el = rootEl.children[i];

                if (_closest(el, this.options.draggable, rootEl)) {
                    items[id] = el;
                }
            }, this);

            order.forEach(function (id) {
                if (items[id]) {
                    rootEl.removeChild(items[id]);
                    rootEl.appendChild(items[id]);
                }
            });
        },


		/**
		 * Save the current sorting
		 */
        save: function () {
            var store = this.options.store;
            store && store.set(this);
        },


		/**
		 * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
		 * @param   {HTMLElement}  el
		 * @param   {String}       [selector]  default: `options.draggable`
		 * @returns {HTMLElement|null}
		 */
        closest: function (el, selector) {
            return _closest(el, selector || this.options.draggable, this.el);
        },


		/**
		 * Set/get option
		 * @param   {string} name
		 * @param   {*}      [value]
		 * @returns {*}
		 */
        option: function (name, value) {
            var options = this.options;

            if (value === void 0) {
                return options[name];
            } else {
                options[name] = value;

                if (name === 'group') {
                    _prepareGroup(options);
                }
            }
        },


		/**
		 * Destroy
		 */
        destroy: function () {
            var el = this.el;

            el[expando] = null;

            _off(el, 'mousedown', this._onTapStart);
            _off(el, 'touchstart', this._onTapStart);
            _off(el, 'pointerdown', this._onTapStart);

            if (this.nativeDraggable) {
                _off(el, 'dragover', this);
                _off(el, 'dragenter', this);
            }

            // Remove draggable attributes
            Array.prototype.forEach.call(el.querySelectorAll('[draggable]'), function (el) {
                el.removeAttribute('draggable');
            });

            touchDragOverListeners.splice(touchDragOverListeners.indexOf(this._onDragOver), 1);

            this._onDrop();

            this.el = el = null;
        }
    };


    function _cloneHide(sortable, state) {
        if (sortable.lastPullMode !== 'clone') {
            state = true;
        }

        if (cloneEl && (cloneEl.state !== state)) {
            _css(cloneEl, 'display', state ? 'none' : '');

            if (!state) {
                if (cloneEl.state) {
                    if (sortable.options.group.revertClone) {
                        rootEl.insertBefore(cloneEl, nextEl);
                        sortable._animate(dragEl, cloneEl);
                    } else {
                        rootEl.insertBefore(cloneEl, dragEl);
                    }
                }
            }

            cloneEl.state = state;
        }
    }


    function _closest(/**HTMLElement*/el, /**String*/selector, /**HTMLElement*/ctx) {
        if (el) {
            ctx = ctx || document;

            do {
                if ((selector === '>*' && el.parentNode === ctx) || _matches(el, selector)) {
                    return el;
                }
                /* jshint boss:true */
            } while (el = _getParentOrHost(el));
        }

        return null;
    }


    function _getParentOrHost(el) {
        var parent = el.host;

        return (parent && parent.nodeType) ? parent : el.parentNode;
    }


    function _globalDragOver(/**Event*/evt) {
        if (evt.dataTransfer) {
            evt.dataTransfer.dropEffect = 'move';
        }
        evt.preventDefault();
    }


    function _on(el, event, fn) {
        el.addEventListener(event, fn, captureMode);
    }


    function _off(el, event, fn) {
        el.removeEventListener(event, fn, captureMode);
    }


    function _toggleClass(el, name, state) {
        if (el) {
            if (el.classList) {
                el.classList[state ? 'add' : 'remove'](name);
            }
            else {
                var className = (' ' + el.className + ' ').replace(R_SPACE, ' ').replace(' ' + name + ' ', ' ');
                el.className = (className + (state ? ' ' + name : '')).replace(R_SPACE, ' ');
            }
        }
    }


    function _css(el, prop, val) {
        var style = el && el.style;

        if (style) {
            if (val === void 0) {
                if (document.defaultView && document.defaultView.getComputedStyle) {
                    val = document.defaultView.getComputedStyle(el, '');
                }
                else if (el.currentStyle) {
                    val = el.currentStyle;
                }

                return prop === void 0 ? val : val[prop];
            }
            else {
                if (!(prop in style)) {
                    prop = '-webkit-' + prop;
                }

                style[prop] = val + (typeof val === 'string' ? '' : 'px');
            }
        }
    }


    function _find(ctx, tagName, iterator) {
        if (ctx) {
            var list = ctx.getElementsByTagName(tagName), i = 0, n = list.length;

            if (iterator) {
                for (; i < n; i++) {
                    iterator(list[i], i);
                }
            }

            return list;
        }

        return [];
    }



    function _dispatchEvent(sortable, rootEl, name, targetEl, toEl, fromEl, startIndex, newIndex) {
        sortable = (sortable || rootEl[expando]);

        var evt = document.createEvent('Event'),
            options = sortable.options,
            onName = 'on' + name.charAt(0).toUpperCase() + name.substr(1);

        evt.initEvent(name, true, true);

        evt.to = toEl || rootEl;
        evt.from = fromEl || rootEl;
        evt.item = targetEl || rootEl;
        evt.clone = cloneEl;

        evt.oldIndex = startIndex;
        evt.newIndex = newIndex;

        rootEl.dispatchEvent(evt);

        if (options[onName]) {
            options[onName].call(sortable, evt);
        }
    }


    function _onMove(fromEl, toEl, dragEl, dragRect, targetEl, targetRect, originalEvt, willInsertAfter) {
        var evt,
            sortable = fromEl[expando],
            onMoveFn = sortable.options.onMove,
            retVal;

        evt = document.createEvent('Event');
        evt.initEvent('move', true, true);

        evt.to = toEl;
        evt.from = fromEl;
        evt.dragged = dragEl;
        evt.draggedRect = dragRect;
        evt.related = targetEl || toEl;
        evt.relatedRect = targetRect || toEl.getBoundingClientRect();
        evt.willInsertAfter = willInsertAfter;

        fromEl.dispatchEvent(evt);

        if (onMoveFn) {
            retVal = onMoveFn.call(sortable, evt, originalEvt);
        }

        return retVal;
    }


    function _disableDraggable(el) {
        el.draggable = false;
    }


    function _unsilent() {
        _silent = false;
    }


    /** @returns {HTMLElement|false} */
    function _ghostIsLast(el, evt) {
        var lastEl = el.lastElementChild,
            rect = lastEl.getBoundingClientRect();

        // 5 — min delta
        // abs — нельзя добавлять, а то глюки при наведении сверху
        return (evt.clientY - (rect.top + rect.height) > 5) ||
            (evt.clientX - (rect.left + rect.width) > 5);
    }


	/**
	 * Generate id
	 * @param   {HTMLElement} el
	 * @returns {String}
	 * @private
	 */
    function _generateId(el) {
        var str = el.tagName + el.className + el.src + el.href + el.textContent,
            i = str.length,
            sum = 0;

        while (i--) {
            sum += str.charCodeAt(i);
        }

        return sum.toString(36);
    }

	/**
	 * Returns the index of an element within its parent for a selected set of
	 * elements
	 * @param  {HTMLElement} el
	 * @param  {selector} selector
	 * @return {number}
	 */
    function _index(el, selector) {
        var index = 0;

        if (!el || !el.parentNode) {
            return -1;
        }

        while (el && (el = el.previousElementSibling)) {
            if ((el.nodeName.toUpperCase() !== 'TEMPLATE') && (selector === '>*' || _matches(el, selector))) {
                index++;
            }
        }

        return index;
    }

    function _matches(/**HTMLElement*/el, /**String*/selector) {
        if (el) {
            selector = selector.split('.');

            var tag = selector.shift().toUpperCase(),
                re = new RegExp('\\s(' + selector.join('|') + ')(?=\\s)', 'g');

            return (
                (tag === '' || el.nodeName.toUpperCase() == tag) &&
                (!selector.length || ((' ' + el.className + ' ').match(re) || []).length == selector.length)
            );
        }

        return false;
    }

    function _throttle(callback, ms) {
        var args, _this;

        return function () {
            if (args === void 0) {
                args = arguments;
                _this = this;

                setTimeout(function () {
                    if (args.length === 1) {
                        callback.call(_this, args[0]);
                    } else {
                        callback.apply(_this, args);
                    }

                    args = void 0;
                }, ms);
            }
        };
    }

    function _extend(dst, src) {
        if (dst && src) {
            for (var key in src) {
                if (src.hasOwnProperty(key)) {
                    dst[key] = src[key];
                }
            }
        }

        return dst;
    }

    function _clone(el) {
        if (Polymer && Polymer.dom) {
            return Polymer.dom(el).cloneNode(true);
        }
        else if ($) {
            return $(el).clone(true)[0];
        }
        else {
            return el.cloneNode(true);
        }
    }

    function _saveInputCheckedState(root) {
        savedInputChecked.length = 0;

        var inputs = root.getElementsByTagName('input');
        var idx = inputs.length;

        while (idx--) {
            var el = inputs[idx];
            el.checked && savedInputChecked.push(el);
        }
    }

    function _nextTick(fn) {
        return setTimeout(fn, 0);
    }

    function _cancelNextTick(id) {
        return clearTimeout(id);
    }

    // Fixed #973:
    _on(document, 'touchmove', function (evt) {
        if (Sortable.active) {
            evt.preventDefault();
        }
    });

    // Export utils
    Sortable.utils = {
        on: _on,
        off: _off,
        css: _css,
        find: _find,
        is: function (el, selector) {
            return !!_closest(el, selector, el);
        },
        extend: _extend,
        throttle: _throttle,
        closest: _closest,
        toggleClass: _toggleClass,
        clone: _clone,
        index: _index,
        nextTick: _nextTick,
        cancelNextTick: _cancelNextTick
    };


	/**
	 * Create sortable instance
	 * @param {HTMLElement}  el
	 * @param {Object}      [options]
	 */
    Sortable.create = function (el, options) {
        return new Sortable(el, options);
    };


    // Export
    Sortable.version = '1.7.0';
    return Sortable;
});})();
;(function() { if (Cognito.config.scripts.indexOf('expression-validation') >= 0) return; else Cognito.config.scripts.push('expression-validation');; (function ($) {

	// Condition types
	var DefaultValueConditionType = new ExoWeb.Model.ConditionType.Error("DefaultValueExpression", "The default value expression is invalid.", []);
	var MinValueConditionType = new ExoWeb.Model.ConditionType.Error("MinValueExpression", "The min value expression is invalid.", []);
	var MaxValueConditionType = new ExoWeb.Model.ConditionType.Error("MaxValueExpression", "The max value expression is invalid.", []);
	var CalculationConditionType = new ExoWeb.Model.ConditionType.Error("CalculationExpression", "The calculation expression is invalid.", []);
	var ColumnSummaryConditionType = new ExoWeb.Model.ConditionType.Error("ColumnSummaryExpression", "The summary expression is invalid.", []);
	var LineItemNameConditionType = new ExoWeb.Model.ConditionType.Error("LineItemNameExpression", "The line item name expression is invalid.", []);
	var LineItemDescriptionConditionType = new ExoWeb.Model.ConditionType.Error("LineItemDescriptionExpression", "The line item description expression is invalid.", []);
	var RequiredConditionType = new ExoWeb.Model.ConditionType.Error("RequiredExpression", "The required expression is invalid.", []);
	var ErrorConditionType = new ExoWeb.Model.ConditionType.Error("ErrorExpression", "The error expression is invalid.", []);
	var ErrorMessageConditionType = new ExoWeb.Model.ConditionType.Error("ErrorMessageExpression", "The error message expression is invalid.", []);
	var QuantityConditionType = new ExoWeb.Model.ConditionType.Error("QuantityExpression", "The quantity expression is invalid.", []);
	var QuantityErrorConditionType = new ExoWeb.Model.ConditionType.Error("QuantityErrorExpression", "The error expression is invalid.", []);

	var module;

	// Get current module
	Cognito.modelReady(function () {
		module = Cognito.config.modules[0];
	});

	/// <summary>Validates all expressions in the root type (containing a view) with optional rename support.</summary>
	/// <param name="newRootType" type="TypeMeta">Most current type meta the expressions will be validated against.</param>
	/// <param name="newView" type="jQuery Object">View representation containing elements.</param>
	/// <param name="serializedOldRootType" type="String">Serialized type meta which will be used to attempt a rename. Optional.</param>
	/// <param name="newFieldPath" type="String">New field path for rename support (i.e. Form1.Section.Field). Optional if oldRootType not supplied.</param>
	/// <param name="oldFieldPath" type="String">Old field path for rename support (i.e. Form1.Section.Field). Optional if oldRootType not supplied.</param>
	Cognito.validateTypeExpressions = function Cognito$validateTypeExpressions(newRootType, newView, serializedOldRootType, newFieldPath, oldFieldPath, localization) {

		validateRootTypeRequest(newRootType, serializedOldRootType || null, newFieldPath || null, oldFieldPath || null, localization || null, function (validationResults) {
			applyElementsConditions(newView.children().filter(function () { return !$(this).isPlaceholder() }), validationResults);
		});
	};

	// <summary>Validates all expressions for a single element.</summary>
	/// <param name="element" type="jQuery Object">Element whose expressions attempting to validate.</param>
	/// <param name="rootType" type="TypeMeta">Root type of the model.</param>
	/// <param name="scope" type="String">Path to the element being validated</param>
	/// <param name="elementDefinition" type="String">Serialized definition of element.</param>
	Cognito.validateElementExpressions = function Cognito$validateElementExpressions(element, rootType, scope, elementDefinition, localization) {

		validateElementRequest(rootType, scope, elementDefinition, localization, function (validationResults) {
			applyElementConditions(element, Cognito.deserialize(Cognito.ValidationResult, validationResults));
		});
	};

	/// <summary>Validates a single string expression.</summary>
	/// <param name="containingType" type="TypeMeta">TypeMeta validating expression against.</param>
	/// <param name="expression" type="String">String expression to validate (should start with '=').</param>
	/// <returns type="ValidationResult">Validation for the expression.</returns>
	Cognito.validatePropertyExpression = function Cognito$validatePropertyExpression(rootType, scope, property, label, fieldType, fieldSubType, format, expression, localization, callback) {

		validateExpressionRequest(rootType, scope, property, label, fieldType, fieldSubType, format, expression, localization, callback);
	};

	/// <summary>Attempts to rename expressions based on an old type meta.</summary>
	/// <param name="serializedOldRootType" type="String">Serialized type meta which will be used to attempt a rename.</param>
	/// <param name="newFieldPath" type="String">New field path for rename support (i.e. Form1.Section.Field).</param>
	/// <param name="oldFieldPath" type="String">Old field path for rename support (i.e. Form1.Section.Field).</param>
	/// <returns type="List<ValidationResult>">The validation result of the rename proccess.</returns>
	Cognito.renameExpressions = function Cognito$renameExpressions(serializedOldRootType, newFieldPath, oldFieldPath, localization, callback) {

		renameExpressionsRequest(serializedOldRootType, newFieldPath, oldFieldPath, localization, callback);
	};

	Cognito.applyElementsConditions = function Cognito$applyElementsConditions(elements, validationResults) {
		applyElementsConditions(elements, validationResults);
	};

	//#region Service Requests

	// Validates all expressions in the root type (containing a view) with optional rename support
	function validateRootTypeRequest(newRootType, serializedOldRootType, newFieldPath, oldFieldPath, localization, callback) {
		module.serviceRequest({
			endpoint: "validateTypeExpressions",
			method: "POST",
			contentType: "application/json+cognito; charset=utf-8",
			data:{ NewRootType: Cognito.serialize(newRootType), OldRootType: serializedOldRootType, NewFieldPath: newFieldPath, OldFieldPath: oldFieldPath, Localization: Cognito.serialize(localization) },
			success: callback
		});
	};

	// Validates all expressions in an element
	function validateElementRequest(rootType, scope, elementDefinition, localization, callback) {
		module.serviceRequest({
			dataType: "json",
			endpoint: "validateElementExpressions",
			method: "POST",
			contentType: "application/json+cognito; charset=utf-8",
			data: {
				RootType: Cognito.serialize(rootType),
				Scope: scope,
				ElementDefinition: elementDefinition,
				Localization: Cognito.serialize(localization)
			},
			success: callback
		});
	};

	// Validates a single string expression
	function validateExpressionRequest(rootType, scope, property, label, fieldType, fieldSubType, format, expression, localization, callback) {
		module.serviceRequest({
			dataType: "json",
			endpoint: "validatePropertyExpression",
			contentType: "application/json+cognito; charset=utf-8",
			method: "POST",
			data:
			{
				RootType: Cognito.serialize(rootType),
				Scope: scope,
				Property: property,
				Label: label,
				FieldType: fieldType,
				FieldSubType: fieldSubType,
				Format: format,
				Expression: expression,
				Localization: Cognito.serialize(localization)
			},
			success: callback
		});
	};

	// Attempts to rename expressions based on an old type meta
	function renameExpressionsRequest(serializedOldRootType, newFieldPath, oldFieldPath, localization, callback) {
		module.serviceRequest({
			dataType: "json",
			endpoint: "renameExpressions",
			contentType: "application/json+cognito; charset=utf-8",
			method: "POST",
			data:
			{
				NewRootType: null,
				OldRootType: serializedOldRootType,
				NewFieldPath: newFieldPath,
				OldFieldPath: oldFieldPath,
				Localization: Cognito.serialize(localization)
			},
			success: callback
		});
	};

	//#endregion

	//#region Utility Functions

	// Traverses list of elements to clear existing conditions and apply new conditions
	function applyElementsConditions(elements, validationResults) {

		for (var i = 0; i < elements.length; i++) {
			var element = $(elements[i]);

			// Clear existing conditions and check if conditions exist for element
			clearElementConditions(element);
			var elementValidation = Cognito.deserialize(Cognito.ValidationResult, validationResults[element.uuid()]);

			// Apply conditions/formatted values
			if (elementValidation)
				updateElementValidation(element, elementValidation);

			// Traverse children for section/table
			if (element.isSection() || element.isTable())
				applyElementsConditions(element.childElements().filter(function () { return !$(this).isPlaceholder() }), validationResults);
		}
	}

	// Clears existing conditions and applies new conditions to element
	function applyElementConditions(element, exceptions) {
		clearElementConditions(element);
		updateElementValidation(element, exceptions);
	}

	// Sets new conditions & update values if necessary
	function updateElementValidation(element, elementValidationResults) {
		var field = element.get_field();

		// Element has been deleted, moved, or renamed during validation - skip
		if (field === undefined)
			return;

		for (var i = 0; i < elementValidationResults.length; i++) {
			var validationResult = elementValidationResults[i];

			// Validation error
			if (validationResult.get_ExceptionMessage() != null) {
				var message = validationResult.get_ExceptionMessage();
				if (validationResult.get_ExceptionPosition() !== -1)
					message += " <a class=\"c-validation-message\" data-position=\"" + validationResult.get_ExceptionPosition() + "\">at character " + validationResult.get_ExceptionPosition() + "</a>";

				// Field validation
				try {
					new ExoWeb.Model.Condition(eval(validationResult.get_Property() + "ConditionType"), message, field, [validationResult.get_Property()], "client");
				}
				// Element validation
				catch (e) {
					ExoWeb.Observer.setValue(element, validationResult.get_Property() + "ValidationError", message);
				}
			}
				// Update formatted value
			else {
				var prop;
				if (field)
					prop = field.meta.type.property(validationResult.get_Property());

				if (prop && prop.value(field) !== validationResult.get_FormattedValue()) {
					field.set(validationResult.get_Property(), validationResult.get_FormattedValue());
				}
				else {
					ExoWeb.Observer.setValue(element, validationResult.get_Property(), validationResult.get_FormattedValue());

					// Refreshed the Content element's markup to reflect the rename
					var elementType = element.elementType();
					if (elementType === Cognito.Forms.elementTypes.Content || elementType === Cognito.Forms.elementTypes.PageBreak)
						window.setTimeout(function () {
							element.html(Cognito.Forms.renderElementBody(element, element.containingType(), [], element.get_field(), elementType));
							Cognito.Forms.updatePageNumbers();
						}, 100);
				}

				// Force the element to refresh
				Cognito.refreshElement(element);
			}
		}
	}

	// Clears conditions pertaining to expressions
	function clearElementConditions(element) {
		var field = element.get_field();

		// Element has been deleted, moved, or renamed during validation - skip
		if (field === undefined)
			return;

		// Clear field specific conditions
		if (field !== null) {
			var condition;
			if (condition = field.meta.getCondition(DefaultValueConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(MinValueConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(MaxValueConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(CalculationConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(ColumnSummaryConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(LineItemNameConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(LineItemDescriptionConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(RequiredConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(ErrorConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(ErrorMessageConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(QuantityConditionType))
				condition.condition.destroy();
			if (condition = field.meta.getCondition(QuantityErrorConditionType))
				condition.condition.destroy();
		}

		// Clear element specific conditions
		if (element.get_visibleValidationError())
			ExoWeb.Observer.setValue(element, "visibleValidationError", null);
		//if (element.get_readOnlyValidationError())
		//	ExoWeb.Observer.setValue(element, "readOnlyValidationError", null);
	}

	//#endregion

})(ExoJQuery);})();
;(function() { if (Cognito.config.scripts.indexOf('intellisense') >= 0) return; else Cognito.config.scripts.push('intellisense');; (function($) {

	// Global variables
	var intellisense = null;
	var intellisenseId = 0;
	var intellisenseTimeout = null;
	var typeMeta = null;
	var scope;
	var module;

	// Get current module
	Cognito.modelReady(function() {
		module = Cognito.config.modules[0];
	});

	/// <summary>Initializes typeahead component.</summary>
	/// <param name="containerOrCollection" type="HTMLElement or jQuery collection">Either the element which holds all inputs/textareas would like to add intellisense to, or a jQuery collection containing the target inputs/textareas</param>
	/// <param name="containingType" type="TypeMeta">Containing typeMeta for the expressions. May be null if only want to display static expressions</param>
	Cognito.initializeIntellisense = function Cognito$initializeIntellisense(containerOrCollection, rootType, scope, localization) {

		// Filters and populates typeahead component for IntelliSense
		function populateIntellisense(query, process) {
			var typeAhead = this;
			var element = $(this.$element);

			// Hide IntelliSense if expression does not begin with '='
			if (!$(element).val().startsWith('=') && typeAhead.shown === true)
				typeAhead.hide();

			// Don't continue if expression does not begin with '='
			if (!$(element).val().startsWith('='))
				return;

			// Restart timeout
			if (intellisenseTimeout != null)
				clearTimeout(intellisenseTimeout);

			// Prevent requests on every keystroke. Only send if stop typing for 300ms
			intellisenseTimeout = setTimeout(function() {
				(intellisenseId++) % 25;
				var id = intellisenseId;

				if ($(element).parents(".c-expression").first().hasClass("c-expression-static"))
					rootType = null;

				intellisenseRequest($(element).val(), function(result) {
					// Only use the most recent IntelliSense request
					if (id == intellisenseId && result != null) {
						intellisense = result;

						var labels = new Array();
						for (var label in intellisense.identifiers) {
							labels.push(label);
						}
						process(labels);
					}
				});
			}, 300);
		}

		// Intellisense service request
		function intellisenseRequest(expression, callback) {
			module.serviceRequest({
				dataType: "json",
				endpoint: "intelliSense",
				contentType: "application/json+cognito; charset=utf-8",
				method: "POST",
				data:
				{
					RootType: Cognito.serialize(rootType),
					Scope: scope,
					Expression: expression,
					Localization: Cognito.serialize(localization)
				},
				success: callback
			});
		}

		// Get position of cursor
		function getSelectionStart(o) {
			// IE8 support
			if (o.selectionStart === undefined) {
				var r = document.selection.createRange().duplicate();
				r.moveEnd('character', o.value.length);
				if (r.text == '')
					return o.value.length;
				return o.value.lastIndexOf(r.text);
			}
			else
				return o.selectionStart;
		}

		var collection = containerOrCollection;
		if (!(containerOrCollection instanceof jQuery))
			collection = $(containerOrCollection).find('.c-expression input, .c-expression textarea');

		collection.typeahead({
			minLength: 0,
			items: 50,
            useTabToSelect: true,
			source: populateIntellisense,
			matcher: function(item) {
				if (this.query.startsWith('=')) {
					var currentProperty = this.query.substring(intellisense.position + 1, getSelectionStart(this.$element[0]));
					if (currentProperty == ')')
						return 0;
					return ~(item.toLowerCase()).indexOf(currentProperty.toLowerCase());
				}
			},
			highlighter: function(item) {
				var currentProperty = this.query.substring(intellisense.position + 1, getSelectionStart(this.$element[0]));
				var query = currentProperty.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
				return item.replace(new RegExp('(' + query + ')', 'ig'), function($1, match) {
					return '<strong>' + match + '</strong>';
				});
			},
			updater: function(item) {
				return this.query.substring(0, intellisense.position + 1) + intellisense.identifiers[item] + this.query.substring(getSelectionStart(this.$element[0]));
			}
		});
	}

})(ExoJQuery);})();
;(function() { if (Cognito.config.scripts.indexOf('expression-builder') >= 0) return; else Cognito.config.scripts.push('expression-builder');; (function ($) {

	//#region Variables/Setup

	// Global objects
	var module;
	var expressionBuilder = new Object();
	var expressionBuilderDialog;
	var dialogSaveCallback;
	var dialogCancelCallback;
	var ExpressionConditionConditionType;
	var supportedOperations = {
		String: ["IsFilledOut", "IsNotFilledOut", "StringEquals", "StringDoesNotEqual", "Contains", "DoesNotContain", "EndsWith", "DoesNotEndWith", "StartsWith", "DoesNotStartWith"],
		Enum: ["EnumEquals", "EnumDoesNotEqual"],
		Number: ["IsFilledOut", "IsNotFilledOut", "NumberEquals", "NumberDoesNotEqual", "IsGreaterThan", "IsLessThan", "IsPositive", "IsPositiveOrZero", "IsNegative"],
		YesNo: ["EqualsYes", "EqualsNo"],
		Date: ["IsFilledOut", "IsNotFilledOut", "DateTimeEquals", "DateTimeDoesNotEqual", "InTheFuture", "InThePast", "IsAfter", "IsBefore", "IsToday", "DayEquals", "DayOfWeekEquals", "MonthEquals", "YearEquals"],
		Time: ["IsFilledOut", "IsNotFilledOut", "DateTimeEquals", "DateTimeDoesNotEqual", "IsAfter", "IsBefore", "HourEquals", "MinuteEquals"],
		DateTime: ["IsFilledOut", "IsNotFilledOut", "DateTimeEquals", "DateTimeDoesNotEqual", "InTheFuture", "InThePast", "IsAfter", "IsBefore", "IsToday", "DayEquals", "DayOfWeekEquals", "MonthEquals", "YearEquals", "HourEquals", "MinuteEquals"],
		File: ["FileIsUploaded", "FileIsNotUploaded", "NumberUploadedEquals"],
		RepeatingSection: ["ContainsItems", "DoesNotContainItems", "NumberOfSectionsEquals"],
		Signature: ["SignatureFilledOut", "SignatureNotFilledOut"],
		Choice: ["ChoiceCheckboxesIsFilledOut", "ChoiceCheckboxesIsNotFilledOut", "ChoiceCheckboxesContains", "ChoiceCheckboxesDoesNotContain"]
	};
	var valueTypeMappings = {
		Text: [],
		Number: ["NumberEquals", "NumberDoesNotEqual", "IsGreaterThan", "IsLessThan", "IsPositive", "IsPositiveOrZero", "IsNegative", "DayEquals", "MonthEquals", "YearEquals", "HourEquals", "MinuteEquals", "NumberUploadedEquals", "NumberOfSectionsEquals"],
		DatePicker: ["DateTimeEquals", "DateTimeDoesNotEqual", "IsAfter", "IsBefore"],
		TimePicker: ["DateTimeEquals", "DateTimeDoesNotEqual", "IsAfter", "IsBefore"],
		DateTimePicker: ["DateTimeEquals", "DateTimeDoesNotEqual", "IsAfter", "IsBefore"],
		Hidden: ["SignatureFilledOut", "SignatureNotFilledOut", "IsFilledOut", "IsNotFilledOut", "IsPositive", "IsPositiveOrZero", "IsNegative", "InTheFuture", "InThePast", "IsLeapYear", "IsToday", "ContainsItems", "DoesNotContainItems", "EqualsYes", "EqualsNo", "FileIsUploaded", "FileIsNotUploaded", "ChoiceCheckboxesIsFilledOut", "ChoiceCheckboxesIsNotFilledOut"]
	};
	var trackingChanges;
	var validating = false;

	// Setup variables after types have loaded
	Cognito.modelReady(function () {
		module = Cognito.config.modules[0];
		module.model.expressionBuilder = expressionBuilder;
		expressionBuilder.viewModel = new Cognito.ExpressionConditionSet();
		ExpressionConditionConditionType = new ExoWeb.Model.ConditionType.Error("ExpressionCondition", "The condition value is invalid.", []);

		expressionBuilderDialog = $.fn.dialog({
			title: "Expression Builder",
			instance: "Cognito." + module.name.charAt(0).toUpperCase() + module.name.slice(1) + ".model.expressionBuilder",
			width: 700,
			height: 480,
			templateName: "expression-builder",
			cancel: function () {

				if (trackingChanges)
					context.server.beginCapturingChanges();

				// Call cancel callback if exists
				if (dialogCancelCallback)
					dialogCancelCallback();

					// If expression is empty, set empty string callback so the predicate is set to the default value
				else if ((expressionBuilder.isAdvanced && module.model.expressionBuilder.expression === "") ||
						(!expressionBuilder.isAdvanced && (module.model.expressionBuilder.viewModel.get_ConditionSets().length === 0)))
					dialogSaveCallback("");
			},
			buttons: [
				// Execute cancel behavior on cancel click
				{
					label: "Cancel",
					isCancel: true
				},
				{
					label: "Save",
					autoClose: false,
					isDefault: true,
					click: function () {

						// Check if there are any errors
						if (!isViewModelValid())
							return;

						if (trackingChanges)
							context.server.beginCapturingChanges();

						var that = this;
						// Return entered expression if on advanced screen
						if (module.model.expressionBuilder.isAdvanced) {
							dialogSaveCallback(module.model.expressionBuilder.expression);
							this.close();
						}
						else {
							// Empty expression
							if (module.model.expressionBuilder.viewModel.get_ConditionSets().length === 0) {
								dialogSaveCallback("");
								this.close();
							}
								// Translate view model to string expression
							else {
								translateExpressionBuilderViewModel(module.model.expressionBuilder.viewModel, function (newExpression) {

									// Return the expression back to the caller
									dialogSaveCallback(newExpression);
									that.close();
								});
							}
						}
					}
				},
				{
					label: "Basic Editor",
					align: "left",
					isTab: true,
					isDefaultTab: true,
					autoClose: false,
					click: function () {

						// In advanced tab, try to build view model
						if (module.model.expressionBuilder.isAdvanced) {

							// Empty expression, create default view model
							if (module.model.expressionBuilder.expression === "") {
								ExoWeb.Observer.setValue(module.model.expressionBuilder, "viewModel", getDefaultViewModel());
								updateIsAdvanced(false);
							}
								// Try to create view model from string expression
							else {
								createExpressionBuilderViewModel(expressionBuilder.rootType, expressionBuilder.scope, module.model.expressionBuilder.expression, function (builder) {
									if (builder.viewModel == null) {
										ExoWeb.Observer.setValue(module.model.expressionBuilder, "translationError", true);
										updateActiveTab(false);
									}
									else {
										ExoWeb.Observer.setValue(module.model.expressionBuilder, "viewModel", Cognito.deserialize(Cognito.ExpressionConditionSet, builder.viewModel));
										updateIsAdvanced(false);
									}
								});
							}
						}
					}
				},
				{
					label: "Advanced Editor",
					align: "left",
					isTab: true,
					autoClose: false,
					click: function () {

						// Check if there are any errors
						if (!isViewModelValid())
							return;

						// Translation error page open, flip back to advanced editor
						if (module.model.expressionBuilder.translationError) {
							ExoWeb.Observer.setValue(module.model.expressionBuilder, "translationError", false);
							updateActiveTab(true);
						}
							// In basic tab, create string equivalent
						else if (!module.model.expressionBuilder.isAdvanced) {

							translateExpressionBuilderViewModel(module.model.expressionBuilder.viewModel, function (newExpression) {
								ExoWeb.Observer.setValue(module.model.expressionBuilder, "expression", newExpression);
								updateIsAdvanced(true);
							});
						}
					}
				}
			]
		});
		expressionBuilderDialog._defaultButton = null;
	});

	//#endregion

	//#region Model Type Definitions

	// Extend ExpressionCondition to support user interface properties
	$extend("Cognito.ExpressionCondition", function (condition) {

		// Allowed values for field dropdown
		condition.meta.addProperty({ name: "allowedFields", type: String, isList: true }).calculated({
			calculate: function () {
				var allowedFields = [];
				for (var field in module.model.expressionBuilder.propertyMappings) {
					allowedFields.push(field);
				}
				return allowedFields;
			}
		});

		new ExoWeb.Model.Rule.allowedValues(condition, {
			property: condition.$Property,
			source: "allowedFields",
			ignoreValidation: true
		});

		// Calculate property type
		condition.$PropertyType.calculated({
			calculate: function () {
				var newPropertyType = module.model.expressionBuilder.propertyMappings[this.get_Property()];

				// Set operation to first item
				var operation = getEnumWithName(Cognito.ExpressionConditionOperation, supportedOperations[newPropertyType.get_Name()][0]);
				this.set_Operation(operation);

				return newPropertyType;
			},
			onChangeOf: ["Property"]
		});

		// Allowed values for operations dropdown
		condition.meta.addProperty({ name: "allowedOperations", type: Cognito.ExpressionConditionOperation, isList: true }).calculated({
			calculate: function () {
				if (!this.get_PropertyType())
					return [];

				var propertyType = this.get_PropertyType().get_Name();
				return Cognito.ExpressionConditionOperation.get_All().filter(function (operation) { return $.inArray(operation.get_Name(), supportedOperations[propertyType]) !== -1; });
			},
			onChangeOf: ["Property"]
		});

		new ExoWeb.Model.Rule.allowedValues(condition, {
			property: condition.$Operation,
			source: "allowedOperations",
			ignoreValidation: true
		});

		// Calculate value type and set default value
		condition.$Operation.addChanged(function (sender, args) {
			if ($.inArray(args.newValue.get_Name(), valueTypeMappings.Hidden) !== -1) {
				sender.set_ValueType(getEnumWithName(Cognito.ExpressionConditionValueType, "Hidden"));
				sender.set_Value(null);
			}
			else if (sender.get_PropertyType() == getEnumWithName(Cognito.ExpressionConditionPropertyType, "Date") &&
					$.inArray(args.newValue.get_Name(), valueTypeMappings.DatePicker) !== -1) {
				sender.set_ValueType(getEnumWithName(Cognito.ExpressionConditionValueType, "DatePicker"));
				sender.set_Value((new Date()).localeFormat("MM/dd/yyyy"));
			}
			else if (sender.get_PropertyType() == getEnumWithName(Cognito.ExpressionConditionPropertyType, "Time") &&
					$.inArray(args.newValue.get_Name(), valueTypeMappings.TimePicker) !== -1) {
				sender.set_ValueType(getEnumWithName(Cognito.ExpressionConditionValueType, "TimePicker"));
				sender.set_Value(Sys.CultureInfo.CurrentCulture.dateTimeFormat.LongTimePattern === "h:mm:ss tt" && Sys.CultureInfo.CurrentCulture.dateTimeFormat.AMDesignator === "AM" ? "12:00 AM" : "00:00");
			}
			else if ($.inArray(args.newValue.get_Name(), valueTypeMappings.Number) !== -1) {
				sender.set_ValueType(getEnumWithName(Cognito.ExpressionConditionValueType, "Number"));
				sender.set_Value("0");
			}
			else if (sender.get_PropertyType() == getEnumWithName(Cognito.ExpressionConditionPropertyType, "DateTime") &&
				$.inArray(args.newValue.get_Name(), valueTypeMappings.DateTimePicker) !== -1) {
				sender.set_ValueType(getEnumWithName(Cognito.ExpressionConditionValueType, "DateTimePicker"));
			}
			else {
				sender.set_ValueType(getEnumWithName(Cognito.ExpressionConditionValueType, "Text"));
				sender.set_Value("");
			}
		});

		// Validate value after changes
		condition.$Value.addChanged(function (sender, args) {

			// No validation for hidden value types
			if (sender.get_ValueType() == getEnumWithName(Cognito.ExpressionConditionValueType, "Hidden"))
				return;

			validateExpressionCondition(sender);
		});
	});

	//#endregion

	//#region Requests

	// Get view model from server, open expression builder, and store callback for when the expression builder is closed
	Cognito.openExpressionBuilder = function Cognito$openExpressionBuilder(rootType, scope, property, label, fieldType, fieldSubType, expression, localization, saveCallback, cancelCallback, openCallback, format) {

		trackingChanges = context.server.isCapturingChanges();
		if (trackingChanges)
			context.server.stopCapturingChanges();

		var isEmptyExpression = expression === null || expression === "";
		dialogSaveCallback = saveCallback;
		dialogCancelCallback = cancelCallback;

		// Make service call to get view model
		createExpressionBuilderViewModel(rootType, scope, expression, function (builder) {
			// variable to indicate that there are property mappings available for the editor
			var hasMappings = false;
			// Deserialize property types of each mapping
			for (var p in builder.propertyMappings) {
				if (builder.propertyMappings.hasOwnProperty(p)) {
					hasMappings = true;
					builder.propertyMappings[p] = Cognito.deserialize(Cognito.ExpressionConditionPropertyType, builder.propertyMappings[p]);
				}
			}
			module.model.expressionBuilder.propertyMappings = builder.propertyMappings;

			module.model.expressionBuilder.rootType = rootType;
			module.model.expressionBuilder.scope = scope;

			builder.label = label;
			builder.isAdvanced = !hasMappings || fieldSubType !== "YesNo" || (isEmptyExpression ? false : builder.viewModel == null);

			// hide the 'Basic Editor' button if the expression is not for a Yes/No or if there are no mappings present
			if (!hasMappings || fieldSubType !== "YesNo")
				expressionBuilderDialog._dialog.find(".c-modal-tab").first().hide();
			else
				expressionBuilderDialog._dialog.find(".c-modal-tab").first().show();
			builder.translationError = false;
			updateIsAdvanced(builder.isAdvanced);

			// Create default view model
			if (isEmptyExpression || builder.viewModel === null)
				builder.viewModel = getDefaultViewModel();
				// Deserialize view model
			else
				builder.viewModel = Cognito.deserialize(Cognito.ExpressionConditionSet, builder.viewModel);

			// Raise changes
			ExoWeb.Observer.setValue(module.model, "expressionBuilder", builder);

			// Change event for expression to show validation errors in advanced editor
			ExoWeb.Observer.makeObservable(module.model.expressionBuilder);
			ExoWeb.Observer.addPropertyChanged(module.model.expressionBuilder, "expression", function (sender, args) {

				// Hide validation while validating
				$('.c-expression-builder-advanced .c-validation').hide();
				validating = true;

				// Validate advanced editor expression
				Cognito.validatePropertyExpression(rootType, scope, property, label, fieldType, fieldSubType, format, module.model.expressionBuilder.expression, localization, function (validationResults) {

					// Show validation error if exists
					var exception = Cognito.deserialize(Cognito.ValidationResult, validationResults);
					if (exception && exception.get_ExceptionMessage()) {

						var message = exception.get_ExceptionMessage();
						if (exception.get_ExceptionPosition() !== -1)
							message += " <a class=\"c-validation-message\" data-position=\"" + exception.get_ExceptionPosition() + "\">at character " + exception.get_ExceptionPosition() + "</a>";

						ExoWeb.Observer.setValue(module.model.expressionBuilder, "expressionValidation", message);

						// Delay showing the validation message
						$('.c-expression-builder-advanced .c-validation').show();
					}
					else {
						ExoWeb.Observer.setValue(module.model.expressionBuilder, "expressionValidation", "");
						if (exception && exception.get_FormattedValue() && exception.get_FormattedValue() != module.model.expressionBuilder.expression)
							ExoWeb.Observer.setValue(module.model.expressionBuilder, "expression", exception.get_FormattedValue());
						$('.c-expression-builder-advanced .c-validation').show();
					}
				});
			});
			ExoWeb.Observer.setValue(module.model.expressionBuilder, "expression", isEmptyExpression ? "" : expression);

			// Setup intellisense for textarea (advanced view)
			Cognito.initializeIntellisense(expressionBuilderDialog._dialog[0], rootType, scope, localization);

			// Configure advanced help
			expressionBuilderDialog._dialog.find(".c-expression-help>div").hide();
			var helpType =
				fieldSubType == "Date" ? "date" :
				fieldSubType == "Time" ? "time" :
				fieldSubType == "Integer" || fieldSubType == "Decimal" || fieldSubType == "Percent" || fieldSubType == "Currency" || fieldType == "Currency" ? "number" :
				fieldSubType == "YesNo" || fieldType == "YesNo" ? "boolean" :
				"text";
			expressionBuilderDialog._dialog.find(".c-expression-help-" + helpType).show();

			// Open dialog
			expressionBuilderDialog._dialog.addClass("c-expression-builder-dialog");
			expressionBuilderDialog._dialog.find(".c-modal-title").text(label);
			expressionBuilderDialog.open();

			// Invoke the open callback
			if (openCallback)
				openCallback(expressionBuilderDialog);
		});
	};

	// Translate view model to a human readable string
	Cognito.getExpressionBuilderPreview = function Cognito$getExpressionBuilderPreview(rootType, scope, expression, callback) {

		// Make service call to get view model
		createExpressionBuilderViewModel(rootType, scope, expression, function (builder) {
			callback(builder.friendlyExpression, builder.invalidExpression);
		});
	};

	// Creates a view model based on a string expression and type meta.
	function createExpressionBuilderViewModel(rootType, scope, expression, callback) {
		module.serviceRequest({
			dataType: "json",
			endpoint: "createExpressionBuilderViewModel",
			contentType: "application/json+cognito; charset=utf-8",
			method: "POST",
			data:
			{
				RootType: Cognito.serialize(rootType),
				Scope: scope,
				Expression: expression
			},
			success: callback
		});
	};

	// Translates an expression condition set to its string equivalent
	function translateExpressionBuilderViewModel(viewModel, callback) {
		module.serviceRequest({
			dataType: "json",
			endpoint: "translateExpressionBuilderViewModel",
			contentType: "application/json+cognito; charset=utf-8",
			method: "POST",
			data: viewModel,
			success: callback
		});
	};

	// Validates an expression condition for correctness
	function validateExpressionCondition(expressionCondition) {
		module.serviceRequest({
			dataType: "json",
			endpoint: "validateExpressionConditionValue",
			contentType: "application/json+cognito; charset=utf-8",
			method: "POST",
			data: expressionCondition,
			success: function (validationResults) {

				// Clear old error
				if (expressionCondition.meta.getCondition(ExpressionConditionConditionType))
					expressionCondition.meta.getCondition(ExpressionConditionConditionType).condition.destroy();

				// Show validation error if exists
				var exception = Cognito.deserialize(Cognito.ValidationResult, validationResults);
				if (exception != null && exception.get_ExceptionMessage() != null) {
					var message = exception.get_ExceptionMessage();
					new ExoWeb.Model.Condition(ExpressionConditionConditionType, message, expressionCondition, ["Value"], "client");
				}
			}
		});
	};

	//#endregion

	//#region Utility Functions

	// Get enumeration with type and name
	function getEnumWithName(enumType, name) {
		return enumType.get_All().filter(function (e) { return e.get_Name() === name; })[0];
	}

	// Update isAdvanced variable and active tab
	function updateIsAdvanced(isAdvanced) {
		ExoWeb.Observer.setValue(module.model.expressionBuilder, "isAdvanced", isAdvanced);
		updateActiveTab(isAdvanced);
	}

	// Update active tab
	function updateActiveTab(isAdvanced) {
		var activeTab = expressionBuilderDialog._dialog.find('.c-modal-tab-active');
		if ((activeTab.text() === "Advanced Editor" && !isAdvanced) || (activeTab.text() === "Basic Editor" && isAdvanced)) {
			expressionBuilderDialog._dialog.find('.c-modal-tab:not(.c-modal-tab-active)').addClass('c-modal-tab-active');
			activeTab.removeClass('c-modal-tab-active');
		}
	}

	// Default view model if an expression is not provided
	function getDefaultViewModel() {
		var viewModel = new Cognito.ExpressionConditionSet();
		var operation = getEnumWithName(Cognito.ExpressionConditionSetOperation, "And");
		viewModel.set_Operation(operation);
		viewModel.get_ConditionSets().add(getDefaultConditionSet());
		return viewModel;
	}

	// Default Cognito.ExpressionCondition
	function getDefaultCondition() {

		// Set default values
		var property = Object.keys(module.model.expressionBuilder.propertyMappings)[0];
		var propertyType = module.model.expressionBuilder.propertyMappings[property];
		var operation = propertyType ? getEnumWithName(Cognito.ExpressionConditionOperation, supportedOperations[propertyType.get_Name()][0]) : null;

		return new Cognito.ExpressionCondition(
			{
				Property: property,
				PropertyType: propertyType,
				Operation: operation,
				Value: null,
				ValueType: getEnumWithName(Cognito.ExpressionConditionValueType, "Hidden")
			});
	}

	// Default Cognito.ExpressionConditionSet
	function getDefaultConditionSet() {

		// Create condition set with default condition added
		var conditionSet = new Cognito.ExpressionConditionSet();
		var operation = getEnumWithName(Cognito.ExpressionConditionSetOperation, "And");
		conditionSet.set_Operation(operation);
		conditionSet.get_Conditions().add(getDefaultCondition());
		return conditionSet;
	}

	// Checks if view model contains any errors, if so, scrolls to the position of the first visible error
	function isViewModelValid() {
		if (expressionBuilderDialog._dialog.find('.c-validation:not(:empty)').filter(':visible').length == 0)
			return true;

		// Don't need to scroll in advanced editor
		if (!module.model.expressionBuilder.isAdvanced) {
			var firstError = expressionBuilderDialog._dialog.find('.c-validation:not(:empty)').filter(':visible').first();
			firstError.closest('.c-expression-builder-and-container').children('.c-expression-builder-value:visible').get(0).scrollIntoView();
		}
		return false;
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

	//#endregion

	//#region jQuery events

	Cognito.ready("register-expression-builder-events", "ExoWeb.dom", function ($) {

		$(".cognito")

			// Add AND filter
			.on("click", ".c-expression-builder-add-and", function (event) {

				// Add new, default condition
				var orIndex = $(event.target).closest('.c-expression-builder-or-container').data('index');
				module.model.expressionBuilder.viewModel.get_ConditionSets()[orIndex].get_Conditions().add(getDefaultCondition());
			})

			// Remove AND filter
			.on("click", ".c-expression-builder-remove-and", function (event) {

				var orIndex = $(event.target).closest('.c-expression-builder-or-container').data('index');

				// If only one condition, delete entire condition set
				if (module.model.expressionBuilder.viewModel.get_ConditionSets()[orIndex].get_Conditions().length === 1) {
					var conditionSet = module.model.expressionBuilder.viewModel.get_ConditionSets()[orIndex]
					module.model.expressionBuilder.viewModel.get_ConditionSets().remove(conditionSet);
				}
					// Otherwise delete condition
				else {
					var andIndex = $(event.target).closest('.c-expression-builder-and-container').data('index');
					var condition = module.model.expressionBuilder.viewModel.get_ConditionSets()[orIndex].get_Conditions()[andIndex];
					module.model.expressionBuilder.viewModel.get_ConditionSets()[orIndex].get_Conditions().remove(condition);
				}
			})

			// Add OR filter
			.on("click", ".c-expression-builder-add-or", function (event) {

				// Add new, default condition set
				module.model.expressionBuilder.viewModel.get_ConditionSets().add(getDefaultConditionSet());
			})

			// Do not show validation messages when typing
			.on("focusin", ".c-expression-builder-value input, .c-expression-builder-advanced textarea", function (event) {
				$(".c-expression-builder").addClass("c-expression-suppress-validation");
			})

			// Show validation messages when done typing
			.on("focusout", ".c-expression-builder-value input, .c-expression-builder-advanced textarea", function (event) {
				window.setTimeout(function () {
					$(".c-expression-builder").removeClass("c-expression-suppress-validation");
				}, 500);
			})

			// Go to character position of error
			.on('click', '.c-expression-builder-advanced .c-validation-message', function () {
				var position = $(this).data('position');
				var input = $('.c-expression-builder-advanced textarea')[0];
				setSelectionRange(input, position + 1, position + 1);
			});

	});

	//#endregion

})(ExoJQuery);})();

});
