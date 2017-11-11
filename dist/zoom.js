$(document).ready(function(){
	var image;

	$('#imageview').bind("DOMSubtreeModified", function() {
		image = $('#imageview > #image');
	});

	var setup = function() {

		if (image == null)
			image = $('#imageview > #image');

		if (image.zoom == null)
			image.zoom = $.Panzoom(image[0], { minScale: 1 });
	}

	$("#button_zoom-in").on('click', function() {
		setup();

		image.zoom.zoom();
	});

	$("#button_zoom-out").on('click', function() {
		setup();

		image.zoom.zoom(true);
	});
});