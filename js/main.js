var app = angular.module('storeApp', [ 'ngMaterial', 'firebase', 'ui.router',
		'ngMessages' ]);

// TABS:
app.config(function($stateProvider, $urlRouterProvider) {
	$stateProvider.state('home', {
		url : "/home"
	}).state('top', {
		url : "/top"
	}).state('trending', {
		url : "/trending"
	});
	$urlRouterProvider.otherwise('/home');
});

app.controller("MainCtrl", function($scope, $location, $log, controllerManager) {
	// POST MANAGER:
	var postsRef = new Firebase("https://bragr.firebaseio.com/posts");
	var manager = new controllerManager($scope, postsRef);	
	
	// TABS:
	$scope.selectedIndex = 0;
	$scope.$watch('selectedIndex', function(current, old) {
		switch (current) {
		case 0:
			$location.url("/home");
			console.log("LOAD NEW");
			break;
		case 1:
			$location.url("/top");
			console.log("LOAD TOP");
			break;
		case 2:
			$location.url("/trending");
			console.log("LOAD HOT");
			break;
		}
	});
});

//SEARCH:
app.filter('searchFor', function() {
	return function(arr, searchString) {
		if (!searchString) {
			return arr;
		}
		var result = [];
		searchString = searchString.toLowerCase();
		angular.forEach(arr,
			function(item) {
				if (item.username.toLowerCase().indexOf(
						searchString) !== -1
						|| item.text.toLowerCase().indexOf(
								searchString) !== -1
						|| item.category.toLowerCase().indexOf(
								searchString) !== -1) {
					result.push(item);
				}
			});
		return result;
	};
});