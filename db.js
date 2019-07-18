define(["angular"], function(angular) {

	// Get a reference to the $http service
  	var $injector = angular.injector( ['ng'] );
  	var $http = $injector.get( "$http" );
	
  	var options = {
  		"apiURL": ""
  	};

  	function init( config ) {
  		options.apiURL = config.apiURL || options.apiURL;
  	}


  	function createNew( data ) {
  		// Simple GET request example:
		return $http({
		  method: 'POST',
		  url: options.apiURL,
		  headers: {
   			"Content-Type": "application/json"
 		  },
		  data: data
		});
  	}

  	function updateCreateComment( id, data ) {
  		return $http({
		  method: 'POST',
		  url: options.apiURL+"/"+id,
		  headers: {
   			"Content-Type": "application/json"
 		  },
		  data: data
		});
  	}

  	function getCommentsBySheet( sheetId ) {
  		return $http({
		  method: "GET",
		  url: options.apiURL+"/"+sheetId,
		  headers: {
   			"Content-Type": "application/json"
 		  }//,
		  //params: {
		  //	sheetid: sheetId
		  //}
		});
  	}

  	function deleteComment( id ) {
  		return $http({
		  method: 'DELETE',
		  headers: {
   			"Content-Type": "application/json"
 		  },
		  url: options.apiURL+"/"+id
		});
  	}

	return {
		init: init,
		updateCreateComment: updateCreateComment,
		createNew: createNew,
		getCommentsBySheet: getCommentsBySheet,
		deleteComment: deleteComment
	}
});