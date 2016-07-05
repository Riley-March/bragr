var app = angular.module('storeApp');
app.factory('ListeningArray', function($firebaseArray) {
	return {
		setup : function(callBack) {
			var PostsWithUsers = $firebaseArray.$extend({
				$$added : function(snap) {
					var record = $firebaseArray.prototype.$$added.call(this,
							snap);
					callBack(record);
					return record;
				}
			});
			return PostsWithUsers;
		}
	}
});