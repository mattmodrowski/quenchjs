// Helpers

$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

var trim = (function () {
  function escapeRegex(string) {
    return string.replace(/[\[\](){}?*+\^$\\.|\-]/g, "\\$&");
  }

  return function trim(str, characters, flags) {
    flags = flags || "g";
    if (typeof str !== "string" || typeof characters !== "string" || typeof flags !== "string") {
      throw new TypeError("argument must be string");
    }

    if (!/^[gi]*$/.test(flags)) {
      throw new TypeError("Invalid flags supplied '" + flags.match(new RegExp("[^gi]*")) + "'");
    }

    characters = escapeRegex(characters);

    return str.replace(new RegExp("^[" + characters + "]+|[" + characters + "]+$", flags), '');
  };
}());

// Variable Setup

var quench_options = {
	'basic-gulpfile': false,
	'browser-sync': true,
	'css': true,
	'css-autoprefix': true,
	'css-destination': "dist/styles",
	'css-minimize': false,
	'css-precompile': true,
	'css-precompile-type': "sass",
	'css-remove': false,
	'css-source': "src/styles",
	'gulp-sass': true,
	'images-destination': "dist/images",
	'images-optimize': true,
	'images-source': "src/images",
	'js': true,
	'js-coffeescript': false,
	'js-concatenate': true,
	'js-destination': "dist/js",
	'js-es6': false,
	'js-hint': false,
	'js-minimize': true,
	'js-source': "src/js"
};
var current_file = 'gulpfile.js';
var isFileSaverSupported = false;
var isSafari = navigator.vendor.indexOf("Apple")==0 && /\sSafari\//.test(navigator.userAgent);

$(function(){
	$('#get-started').smoothScroll({offset: -24});

	//Test FileSaver
	try {
	    var isFileSaverSupported = !!new Blob;
	} catch (e) {}

	if (!isFileSaverSupported || isSafari) {
		$('#save-project, #toolbar-save').hide();
		ga('send', 'event', 'FileSaver', 'Not Supported');
	} else {
		$('#save-project').click(function(e){
			e.preventDefault();
			saveZip();
		});
		$('#toolbar-save').click(function(e){
			e.preventDefault();
			saveFile();
		});
	}

	//Show file
	renderFile(current_file);

	//Watch tabs
	$('#tabs a').click(function(e){
		e.preventDefault();

		handleTab($(this));
	});

	//Watch selects
	$('input:checkbox, select').change(function(){
		quench_options = formToJSON($('form'));
		renderFile(current_file);
	});

	//Watch pre-compile
	$('#css-precompile').change(function(){
		if ($(this).is(':checked')) {
			$('#css-precompile-type').prop('disabled', false);
		} else {
			$('#css-precompile-type').prop('disabled', true);
		}
	});

	//Watch inputs
	$("input[type='text']").on('keyup', function(){
		quench_options = formToJSON($('form'));
		renderFile(current_file);
	});

	//Set up copy functionality
	ZeroClipboard.config({ swfPath: "/dist/scripts/plugins/ZeroClipboard.swf"});
	$('#toolbar-copy').click(function(e){
		e.preventDefault();

		ga('send', 'event', 'Copy', 'Click');
		$('#file-toolbar').addClass('flash-copied');
		setTimeout(function(){
			$('#file-toolbar').removeClass('flash-copied');
		}, 4000);
	});
	var copyMe = new ZeroClipboard($('#toolbar-copy'));
});

function handleTab(el) {
	//Clear file classes for proper syntax highlighting
	$('#file').removeClass();

	//Set active tab
	$('#tabs a').removeClass('active');
	el.addClass('active');

	//Render file
	current_file = el.data('file');
	renderFile(current_file);
}

function renderFile(file, renderOnly) {
	var pJSON = '';

	if (renderOnly === undefined) {
		renderOnly = false;
	}

	if (!renderOnly) {
		$('#file-wrapper').addClass('loading');
	}

	if ($('#template-' + file.replace('.', '')).length) {
		var template = $('#template-' + file.replace('.', '')).text();
		Mustache.parse(template);
		pJSON = Mustache.render(template, quench_options);
		if (!renderOnly) {
			displayFile(pJSON);
			$('#file-wrapper').removeClass('loading');
		}
		return pJSON;
	} else {
		$.ajax({
			url: '/dist/scripts/templates/' + file + '.mst',
			dataType: 'text',
			success: function(template) {
				//Save template
				$('<script>')
					.attr('type', 'x-tmpl-mustache')
					.attr('id', 'template-' + file.replace('.', ''))
					.text(template)
					.appendTo('body');

				pJSON = Mustache.render(template, quench_options);
				if (!renderOnly) {
					displayFile(pJSON);
					$('#file-wrapper').removeClass('loading');
				}
				return pJSON;
			}
		});
	}
}

function displayFile(file) {
	$('#file').html(file);
	hljs.highlightBlock($('#file').get(0));
}

function formToJSON(form) {
	var input_object = {};

	$('input, select', form).each(function(){
		el = $(this);
		if (el.is(":checkbox")) {
			input_object[el.attr('name')] = (el.is(":checked")) ? true: false;
		} else {
			input_object[el.attr('name')] = trim(el.val().trim(), '/');
		}
	});

	input_object.css = $('#css-precompile, #css-autoprefix, #css-remove').is(':checked') ? true: false;
	input_object.js = $('#js-coffeescript, #js-es6, #js-hint, #js-concatenate, #js-minimize').is(':checked') ? true: false;

	if ($('#css-precompile:checked') && $('#css-precompile-type').val() != 'none') {
		input_object['gulp-' + $('#css-precompile-type').val()] = true;
	}

	jsonString = JSON.stringify(input_object);
	return input_object;
}

function saveFile() {
	var blob = false;

	if (current_file == "package.json") {
		blob = new Blob([$('#file').text()], {type: "application/json;charset=utf-8"});
		ga('send', 'event', 'Save File', 'package.json');
	} else if (current_file == "gulpfile.js") {
		blob = new Blob([$('#file').text()], {type: "application/javascript;charset=utf-8"});
		ga('send', 'event', 'Save File', 'gulpfile.js');
	}

	saveAs(blob, current_file);
}

function saveZip() {
	var zip = new JSZip();
	$('#save-project').addClass('loading');
	ga('send', 'event', 'Save Zip', 'Initiated');

	$.ajax({
		url: '/dist/scripts/templates/' + file + '.mst',
		dataType: 'text',
		success: function(templates){
			var h = $(templates);

			h.each(function(){
				if (!$('#' + $(this).id).length) {
					$(this).appendTo('body');
				}
			});

			zip.file("package.json", renderFile("package.json", true));
			zip.file("gulpfile.js", renderFile("gulpfile.js", true));
			zip.file("readme.txt", renderFile("readme.txt", true));

			if (!$('#basic-gulpfile').is('checked')) {
				zip.file("index.html", renderFile("index.html", true));

				if (quench_options.css) {
					zip.folder(quench_options['css-source']);

					if (quench_options['css-precompile']) {
						zip.folder(quench_options['css-source'] + "/base");
						zip.folder(quench_options['css-source'] + "/components");
						zip.folder(quench_options['css-source'] + "/layouts");
						zip.folder(quench_options['css-source'] + "/plugins");

						if (quench_options['gulp-less']) {
							zip.file(quench_options['css-source'] + "/screen.less", renderFile("screen.css", true));
							zip.file(quench_options['css-source'] + "/base/normalize.less", renderFile("normalize.css", true));
							zip.file(quench_options['css-source'] + "/base/global.less", "// Global CSS goes here\n");
							zip.file(quench_options['css-source'] + "/base/variables.less", "// Variables go here\n");
						}
						if (quench_options['gulp-sass']) {
							zip.file(quench_options['css-source'] + "/screen.scss", renderFile("screen.css", true));
							zip.file(quench_options['css-source'] + "/base/_normalize.scss", renderFile("normalize.css", true));
							zip.file(quench_options['css-source'] + "/base/_global.scss", "// Global CSS goes here\n");
							zip.file(quench_options['css-source'] + "/base/_variables.scss", "// Variables go here\n");
						}
						if (quench_options['gulp-stylus']) {
							zip.file(quench_options['css-source'] + "/screen.stylus", renderFile("screen.css", true));
							zip.file(quench_options['css-source'] + "/base/normalize.stylus", renderFile("normalize.css", true));
							zip.file(quench_options['css-source'] + "/base/global.stylus", "// Global CSS goes here\n");
							zip.file(quench_options['css-source'] + "/base/variables.stylus", "// Variables go here\n");
						}
					}
				}

				if (quench_options.js) {
					zip.folder(quench_options['js-source']);
				}

				if (quench_options['images-optimize']) {
					zip.folder(quench_options['images-source']);
				}

				var zipBlob = zip.generate({type: "blob"});
				saveAs(zipBlob, "quench-project.zip");
				$('#save-project').removeClass('loading');
				ga('send', 'event', 'Save Zip', 'Succes', 'Full Project');
			} else {
				var zipBlob = zip.generate({type: "blob"});
			  saveAs(zipBlob, "quench-project.zip");
			  $('#save-project').removeClass('loading');
			  ga('send', 'event', 'Save Zip', 'Succes', 'Basic Project');
			}
		}
	});
}

//TODO: Add linkability