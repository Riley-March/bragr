var app = angular.module('storeApp');

app.factory("Auth", [ "$firebaseAuth", function($firebaseAuth) {
	var ref = new Firebase("https://bragr.firebaseio.com/");
	return $firebaseAuth(ref);
} ]);

app.factory('sessionService', [ '$http', function($http) {
	return {
		set : function(key, value) {
			return sessionStorage.setItem(key, JSON.stringify(value));
		},
		get : function(key) {
			return JSON.parse(sessionStorage.getItem(key));
		},
		destroy : function(key) {
			return sessionStorage.removeItem(key);
		},
	}
} ]);

app.factory('mediaService', function($http, $q) {
	function getParameterByName(url, name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex
				.exec(url);
		return results === null ? "" : decodeURIComponent(results[1].replace(
				/\+/g, " "));
	}

	var service = {
		getSrcFromURL : function(evidence, callBack) {
			var tmpSrc = null;
			var thumb = getParameterByName(evidence, 'v');
			if (thumb != "") {
				// FOUND YOUTUBE THUMBNAIL:
				tmpSrc = 'http://img.youtube.com/vi/' + thumb + '/0.jpg';
				callBack(tmpSrc, "success");
			} else {
				// NO YOUTUBE THUMNAIL FOUND:
				var img = new Image();
				img.onerror = img.onabort = function() {
					// NO IMAGE FOUND:
					callBack("", "Failed. No Image found.");
				};
				img.onload = function() {
					callBack(evidence, "Success. Image Found");
				};
				img.src = evidence;
			}
		}
	};
	return service;
});
