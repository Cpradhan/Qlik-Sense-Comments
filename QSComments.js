define( [ 
	"angular",
	"qlik",
	"text!./template.html",
	"./properties",
	"./db",
	"./libs/moment",
	"./libs/md5.min",
	"css!./QSCommentsCss.css"
],
function (angular, qlik, template, props, DB, moment, md5) {
	
	return {
		definition: props,
		template: template,
		support : {
			snapshot: true,
			export: false,
			exportData : false
		},
		initialProperties: {
            version: 1.0,
            showTitles: false
        },
		paint: function ( $element, layout) {
			
			this.$scope.updateHeight();	
			
			DB.init({
				apiURL: layout.props.server.apiUrl
			});

			//var state = qlik.currApp(this).selectionState(),
			var state = qlik.currApp(this).selectionState(),
				dimensions = layout.qHyperCube.qDimensionInfo.map(function(dim){
					return dim.qGroupFieldDefs[0];
				}),
				selectionFields = [],
				selectionValues = [];
			this.$scope.selState = state;
			//console.log(state.selections);
			var newAnchor = md5(selectionValues.toString());
			

			var updateComments = !this.$scope.lastAnchor
				|| !angular.equals(this.$scope.lastAnchor, newAnchor)
					|| !angular.equals(this.$scope.props, layout.props );

			this.$scope.lastAnchor = newAnchor;
			this.$scope.props = angular.copy(layout.props);

			if ( updateComments ) {
				this.$scope.getComments();
			}
			
			
			return qlik.Promise.resolve();
		}
		,
		controller: ['$scope', '$element', '$timeout',function ( $scope, $element, $timeout ) {

			var currentUser;
			
			$scope.disabled = true;
			$scope.edit = false;
			$scope.comment = {};
			//$scope.lastAnchor = null;
			$scope.props = {};

			qlik.getGlobal().getAuthenticatedUser( function(res){
				currentUser = res.qReturn;				
			} );

			var currentAppId = qlik.currApp(this).id;
					
			
			$scope.updateHeight = function() {
				$scope.heightWrapper = { "height": ($element[0].clientHeight - 70)+"px" };
			};

			function _getComments(){
				//if ( !$scope.props.sheet.id ) {
				//	return;
				//}
				var currSheetId = qlik.navigation.getCurrentSheetId().sheetId;
				
				DB.getCommentsBySheet( currSheetId ).then(function(res){
					
					$timeout(function(){
								
						console.log(currSheetId);
						$scope.comment = res.data.map(
							function(c) {
								//Get Date Text
								const date = new Date(c.created);
								const momentDate = moment(date.toISOString());
								var dateText = moment(momentDate).calendar();
								var startOfToday = moment().startOf('day');
								var startOfDate = moment(momentDate).startOf('day');
								var daysDiff = startOfDate.diff(startOfToday, 'days');
								var days = {
									'0': 'Today',
									'-1': 'Yesterday',
									'1': 'Tomorrow'
								};

								if (Math.abs(daysDiff) >= 2) {

									dateText = moment(c.created).format("DD/MM/YY, h:mma");
								}
								
								c.created = dateText;
								
								
								return c;
							}
						);
					});
					$scope.error = false;
				}, function(err){
					$scope.error = err;
				});
			
			}
			/*$scope.$watch('comment.text', function(text){
				$scope.disabled = !text || text.trim() === "";
			});*/

			$scope.getComments = _getComments;
			
				
			
			$scope.updateCreateComment = function() {
				
				/*if ( $scope.comment.text.trim() !== "" ) {
					
					if ( $scope.comment.id ) {
						DB.updateCreateComment( $scope.comment.id, $scope.comment ).then( function(res) {
							$scope.comment = {};
							$scope.edit = false;
							$scope.error = false;
							_getComments();
						}, function(err){
							$scope.error = err;
						});
					} else {*/
						var mode = $("input[name='chkContextual']:checked").val();
						//console.log($scope.selState.selections);
						var userSelections = '';
						if(mode){
							$scope.selState.selections.forEach( function(s) {

								userSelections += s.fieldName;
								userSelections += ":";
								userSelections += s.qSelected;
								userSelections += "|";
							});
						}
						
						//Get the Date with Daylight Saving Offset
						Date.prototype.stdTimezoneOffset = function() 
						{
							var jan = new Date(this.getFullYear(), 0, 1);
							var jul = new Date(this.getFullYear(), 6, 1);
							return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
						}
						
						Date.prototype.dst = function() {
						  return this.getTimezoneOffset() < this.stdTimezoneOffset();
						}
						//var date = new Date();
						var comment = {
							created: new Date(),
							commentText: $scope.comment.text,
							username: currentUser,
							sheetId: qlik.navigation.getCurrentSheetId().sheetId,
							userselections: userSelections,
							importance: $("input[name='addimportance']:checked").val(),
							appId: currentAppId,
							mode: mode
						};
						
						DB.createNew( comment ).then( function(res) {
							$scope.comment = {};
							$scope.edit = false;
							uncheck();
							_getComments();
						}, function(err){
							$scope.error = err;
							hideCommentsListDiv();
						});
					//}
				}
			//};

			$scope.deleteComment = function( comment ) {
				DB.deleteComment(comment._id).then(function(){
					_getComments();
				});
			};

			$scope.editComment = function( comment ) {
				$scope.comment = angular.copy(comment);
				$scope.edit = true;
			};

			$scope.cancelEdit = function(){
				$scope.comment = {};
				$scope.edit = false;
			}
			
			$scope.applySelections = function(comment){
				var fieldArray = comment.userSelections.split("|").filter(e=>e.length);
				//console.log(fieldArray.length);
				if(fieldArray)
				{
					$scope.selState.clearAll();
					//console.log($scope.selState);
					//console.log(qlik.currApp(this));
					fieldArray.forEach( function(f) 
						{
							var valuesElement = f.split(":")[1].toString();
							//console.log(valuesElement);
							
							var valuesArray = valuesElement.split(",").map(item=>item.trim()).filter(e=>e.length);
							//console.log(valuesArray);
							var selectionValues = [];
							valuesArray.forEach ( function(val){
									//The below step is important as the selectValues method will not work if the comment has been added for numeric field selections.
									//For selectValues to work, the values must be converted to number before passing it into the function.
									if(!isNaN(val)){
										val = Number(val);
									}
									selectionValues.push(val);
								}
							);
							//console.log(selectionValues);
							//console.log(f.split(":")[0]);
							var field = qlik.currApp(this).field(f.split(":")[0]);
							//console.log(isNaN(selectionValues[0]));
							
							qlik.currApp(this).field(f.split(":")[0]).clear();
							qlik.currApp(this).field(f.split(":")[0]).selectValues(selectionValues);
						}
					);
				}
				
				//Highlight the comnent for which the context was set
				$('div[id^="cbox"]').css({'background-color':'#f5f5f5'});
				$('div[id^="cbox"]').css({'border':'1px solid #c0dca9'});
				$("#cbox"+comment.id).css({'background-color':'#dbffbf'});
				$("#cbox"+comment.id).css({'border':'1px solid #61a729'});
	}
			//commented the below call as it was causing the res.data to change an array type to non-array.
			//which caused the res.data.map to raise a typeerror.
			//_getComments();
			$scope.updateHeight();
		}]
	};

} );


function uncheck(){
	$('input[name=chkContextual]').removeAttr('checked');
}
function showSettings() {
	$('#settings').toggle("fast");
	//$('#settings').css({ 'display': 'block'});
}

function hideCommentsListDiv(){
	$('#wrapperDiv').css({ 'display': 'none'});
	$("#addcomment *").attr("disabled", "disabled").off('click');
	
}