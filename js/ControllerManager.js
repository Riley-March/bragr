var app = angular.module('storeApp');

app.factory('controllerManager', function($mdDialog, $firebaseArray, sessionService, Auth,
		mediaService, ListeningArray, $firebaseAuth) {
	return function(scope, postsRef){
		// SETUP:
		var loadLimit = 5;
		var ref = new Firebase("https://bragr.firebaseio.com");
		var auth = $firebaseAuth(ref);
		scope.auth = Auth;
		Firebase.util.logLevel(true);
		var scrollRef = new Firebase.util.Scroll(postsRef, 'time');
		scope.posts = ListeningArray.setup(function(newPost) {
			console.log("NEW: " + newPost.text);
			fillPostData(newPost, false);
		})(scrollRef);
		if (sessionService.get('userId') == null) {
			scope.loggedIn = false;
		} else {
			scope.loggedIn = true;
			userLogin();
		}	
		scope.categoriesList = [ {
			name : "Automotive",
			icon : "directions_car"
		}, {
			name : "Jobs & Business",
			icon : "business"
		}, {
			name : "Money & Wealth",
			icon : "account_balance"
		}, {
			name : "Film & Television",
			icon : "local_movies"
		}, {
			name : "Music & Dance",
			icon : "music_video"
		}, {
			name : "Computing & Software",
			icon : "developer_board"
		}, {
			name : "Gaming & Web",
			icon : "gamepad"
		}, {
			name : "Sports & Fitness",
			icon : "fitness_center"
		}, {
			name : "Literature",
			icon : "import_contacts"
		}, {
			name : "Other",
			icon : "casino"
		} ];

		// LOAD MORE POSTS:
		scrollRef.scroll.next(loadLimit);
		scope.loadMorePosts = function(doLoad) {
			if (doLoad && scrollRef.scroll.hasNext()) {
				console.log("LOAD MORE");
				scrollRef.scroll.next(loadLimit);
				scope.$evalAsync();
			} 
		};
		scope.posts.$loaded().then(function() {
			// ASSIGN LISTENER:
			scrollRef.on('child_added', function(childSnapshot, prevChildKey) {
				fillPostData(childSnapshot.val(), false); 
			});
			
			// UPDATE POST TIME:
			window.setTimeout(function() {
				scope.posts.forEach(function(post) {
					post.timeTxt = getReadableTime(post.time);
				});
				scope.$evalAsync();
			}, 30000); // 30 SECONDS
		});
		
		// FILL POST DATA:
		function fillPostData(post, updateIcons) {
			if (post != undefined) {
				var postUid = post.uid;
				var dataRef = new Firebase(
						"https://bragr.firebaseio.com/");
				dataRef.once("value",
					function(snapshot) {
						dataRef.child("users/" + postUid).on('value', function(userSnap) {
							dataRef.child("posts/" + post.$id + "/votes").once('value', function(votesSnap) {
							try {
								userDetails = userSnap
										.val();
								post.username = userDetails.username;
								post.userRep = userDetails.rep;
								post.userBrag = userDetails.brag;
								post.timeTxt = getReadableTime(post.time);
	                            post.userPhoto = userDetails.userPhoto;
								var upVotesTmp = 0;
								var downVotesTmp = 0;
								votesSnap.forEach(function(childSnapshot) {
									if (childSnapshot.val() == 1) {
										upVotesTmp++;
										if (scope.user != undefined && childSnapshot.key() == scope.user.id) {
											post.iconUpVote = "check_circle";
										}
									} else {
										downVotesTmp++;
										if (scope.user != undefined && childSnapshot.key() == scope.user.id) {
											post.iconDownVote = "check_circle";
										}
									}
								});
								post.upVotes = upVotesTmp;
								post.downVotes = downVotesTmp;
								scope.$evalAsync();
							} catch (e){
								console.log(e);
							}
						});
					});
				});
			}
		}
		
		// UPDATE A USER VALUE:
		function setUserValue(uid, type, value) {
			var userRef = new Firebase(
					"https://bragr.firebaseio.com/users/" + uid
							+ "/" + type);
			userRef.transaction(function(currentValue) {
				return value;
			});
		}
		
		// UPDATE A USERS STATS
		function calculateUserStats(uid) {
			var userPostRef = new Firebase(
					"https://bragr.firebaseio.com/posts");
			userPostRef.orderByChild('uid').equalTo(uid).on("value", function(snapshot) {
				setUserValue(uid, "brag", snapshot.numChildren());
				var repTmp = 0;
				snapshot.forEach(function(childSnapshot) {
					var tmpPostRef = new Firebase(
							"https://bragr.firebaseio.com/posts/"
									+ childSnapshot.key());
					tmpPostRef.once("value", function(tmpSnapshot) {
						if (tmpSnapshot.exists()) {
							tmpSnapshot.child('votes').forEach(
							function(tmpVote) {
								repTmp += tmpVote.val();
							});
						}
					});
				});
				setUserValue(uid, "rep", repTmp);
				scope.$evalAsync();
			});
		}
		
		// UPVOTE POST:
		scope.upVote = function(post) {
			if (scope.user != undefined && scope.loggedIn) {
				var voteRef = scrollRef.child(post.$id).child(
						'votes/' + scope.user.id);
				voteRef.set(1);
				calculateUserStats(post.uid);
				post.iconUpVote = "check_circle";
				post.iconDownVote = "mood_bad";
			} else {
				scope.showLoginDialog(null);
			}
		}
		
		// DOWNVOTE POST:
		scope.downVote = function(post) {
			if (scope.user != undefined && scope.loggedIn) {
				var voteRef = scrollRef.child(post.$id).child(
						'votes/' + scope.user.id);
				voteRef.set(-1);
				calculateUserStats(post.uid);
				post.iconUpVote = "mood";
				post.iconDownVote = "check_circle";
			} else {
				scope.showLoginDialog(null);
			}
		}
		
		// OPEN WINDOW/TAB FROM URL:
		scope.openNewTab = function(post) {
			window.open(post.evidenceURL);
		}
		
		// LOGOUT:
		scope.logout = function() {
			scope.loggedIn = false;
			sessionService.destroy('userId');
		}
		
		// POST NEW BRAG:
		scope.brag = function(message, evidence, category) {			
			// DOUBLE CHECK INPUTS:
			if (evidence == undefined){
				evidence = "";
			}
			if (evidence != "")
				if (!validURL(evidence))
					return false;
			if (message == "" || message == undefined)
				return false;
			if (category == undefined || category == "") {
				return false;
			}
			if (scope.user == undefined)
				return false;
			
			// CLEAR INPUT:
			scope.message = "";
			scope.evidence = "";
			scope.category = "";
			scope.showBragForm = false;
		
			// GET SRC FROM EVIDENCE:
			mediaService.getSrcFromURL(evidence,
				function(url, response) {
					var date = new Date();
					var newPost = {
						uid : scope.user.id,
						text : message,
						category : category,
						evidenceURL : evidence,
						evidenceIMG : url,
						time : date.getTime()
					};
					scope.posts.$add(newPost).then(
						function(ref) {
							var id = ref.key();
							var index = scope.posts
									.$indexFor(id);
							fillPostData(
									scope.posts[index],
									false);
							calculateUserStats(scope.user.id);
					  });
				});
		}
		
		// CHECK IF VALID URL:
		var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
		var regex = new RegExp(expression);
		function validURL(str) {
			 if(!regex.test(str)) {
			   return false;
			 } else {
			   return true;
			 }
		}
		
		// SHOW LOGIN DATA:
		scope.showLoginDialog = function(ev) {
			$mdDialog.show({
				controller : DialogController,
				templateUrl : 'login.html',
				parent : angular.element(document.body),
				targetEvent : ev,
				clickOutsideToClose : true
			}).then(function() {
				scope.loggedIn = true;
			}, function() {
				scope.status = 'You cancelled the dialog.';
			});
		};
		
		// DIALOG MANAGER:
		function DialogController(scope, $mdDialog) {
			scope.hide = function() {
				$mdDialog.hide();
			};            
		    scope.facebookLogin = function(){
		        auth.$authWithOAuthPopup("facebook").then(function(authData) {           
		            ref.child("users").child(authData.uid).set({
		                username: getName(authData),
		                rep: 0,
		                brag: 0,
		                userPhoto: authData.facebook.profileImageURL
		            });
		            $mdDialog.hide();
		            sessionService.set('userId',{id : authData.uid});
		            userLogin();
		            scope.$evalAsync();
		        }).catch(function(error) {
		            console.log("Authentication failed:", error);
		        });
		    }
		    scope.googleLogin = function(){
		        auth.$authWithOAuthPopup("google").then(function(authData) {
		            ref.child("users").child(authData.uid).set({
		                username: getName(authData),
		                rep: 0,
		                brag: 0,
		                userPhoto: authData.google.profileImageURL
		            });
		            $mdDialog.hide();
		            sessionService.set('userId',{id : authData.uid});
		            userLogin();
		            scope.$evalAsync();
		        }).catch(function(error) {
		        	console.log("Authentication failed:", error);
		        });
		    }
		}
		
		// CONVERT MILLISECONDS TO STRING:
		function getReadableTime(timeInMs) {
			if (timeInMs < 0)
				timeInMs *= -1;
			timeInMs = new Date().getTime() - timeInMs;
			function numberEnding(number) {
				return (number > 1) ? 's' : '';
			}
			var temp = Math.floor(timeInMs / 1000);
			var years = Math.floor(temp / 31536000);
			if (years) {
				return years + ' year' + numberEnding(years)
						+ " ago";
			}
			var days = Math.floor((temp %= 31536000) / 86400);
			if (days) {
				return days + ' day' + numberEnding(days) + " ago";
			}
			var hours = Math.floor((temp %= 86400) / 3600);
			if (hours) {
				return hours + ' hour' + numberEnding(hours)
						+ " ago";
			}
			var minutes = Math.floor((temp %= 3600) / 60);
			if (minutes) {
				return minutes + ' minute' + numberEnding(minutes)
						+ " ago";
			}
			return 'Just Now';
		}
		
		// LOGIN A USER:
		function userLogin() {
			var userId = sessionService.get('userId');
			var userRef = new Firebase(
					"https://bragr.firebaseio.com/users/"
							+ userId.id);
			userRef.on("value", function(snapshot) {
				scope.user = {
					id : userId.id,
					username : snapshot.val().username,
					brag : snapshot.val().brag,
					rep : snapshot.val().rep,
		            userPhoto: snapshot.val().userPhoto || null
				};
				scope.loggedIn = true;
			});
		}
		
		// GET USERS NAME:
		function getName(authData) {
			switch(authData.provider) {
				case 'google':
					return authData.google.displayName;
				case 'facebook':
					return authData.facebook.displayName;
			}
		}
		
	};
});

// MAKE TEXTAREA EXPANDABLE:
app.directive('expandingTextarea', ['$document', function($document) {
	return {
		link: function(scope, element, attr) {
	    	var messageLastScrollHeight = element[0].scrollHeight;   
	    	scope.$watch('message', function(newVal, oldVal) {
	    		if (newVal == ""){
	    			scope.showBragForm = false;
	    			element[0].setAttribute("rows", "1");
	    		}
			});
	    	element.on('input', function() {
	    		if (element[0].value != "") {
	    			scope.showBragForm = true;
	    			   var rows = parseInt(element[0].getAttribute("rows"));
	   	    	    element[0].setAttribute("rows", "1");
	   	    	    if (element[0].scrollHeight > messageLastScrollHeight) {
	   	    	        rows++;
	   	    	    } else if (rows > 1 && element[0].scrollHeight < messageLastScrollHeight) {
	   	    	        rows--;
	   	    	    }
	   	    	    messageLastScrollHeight = element[0].scrollHeight;
	   	    	    element[0].setAttribute("rows", rows);
	    		} else { 
	    			scope.showBragForm = false;
	    			element[0].setAttribute("rows", "1");
	    		}
	    	});
		}
	};
}]);

// SCROLL LISTENER:
app.directive("autoLoad", function ($window) {
	var unbind;
	return {
	    scope: {
	        load: '=',
	        posts: '='
	    },
	    controller : function($scope, $element, $attrs) {
	        var scroller = $element[0];
	        if(unbind && $scope.posts != undefined) {
			    unbind(); 
		    }
	        unbind = $scope.$watchCollection("posts", function () {
	        	
		    });
	        angular.element($window).bind("scroll", function() {
	        	$scope.load(($(window).scrollTop() + $(window).height()) > ($(document).height() - 100));
	        });
	    }
	};
});

