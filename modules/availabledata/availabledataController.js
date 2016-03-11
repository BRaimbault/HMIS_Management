
/* 
   Copyright (c) 2015.
 
   This file is part of Project Manager.
 
   Project Manager is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.
 
   Project Manager is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
 
   You should have received a copy of the GNU General Public License
   along with Project Manager.  If not, see <http://www.gnu.org/licenses/>. */


appManagerMSF.controller('availabledataController', ["$scope", "$q", "$http", "$parse", "$animate", "commonvariable",
	"DataElementGroupsUID", "Organisationunit", "OrganisationunitLevel", "meUser",
	function($scope, $q, $http, $parse, $animate, commonvariable, DataElementGroupsUID, Organisationunit,
			 OrganisationunitLevel, meUser) {


		// Some common variables
		$scope.tableRows = [];
		$scope.periods = [];

		// Initialize visibility of table and progressBar
		$scope.tableDisplayed = false;
		$scope.progressbarDisplayed = true;

		// Definition of meUser promise
		var meUserPromise = meUser.get({fields: 'dataViewOrganisationUnits[id,level,children[id]]'}).$promise;

		meUserPromise.then(function(meUser){
			var dataViewOrgUnits = meUser.dataViewOrganisationUnits;

			var k = dataViewOrgUnits.length;
			var currentOu = 0;
			angular.forEach(dataViewOrgUnits, function(dataViewOrgUnit){
				var queryParent = constructQuerySingleOrgunit(dataViewOrgUnit);
				var queryChildren = constructQuery(dataViewOrgUnit.children);

				$q.all([$http.get(queryParent), $http.get(queryChildren)])
					.then(function(analyticsData){
						var parentResult = analyticsData[0].data;
						var childrenResult = analyticsData[1].data;

						// Generate public period array. It is required for other functions
						regenerateScopePeriodArray(parentResult);

						var parentRows = formatAnalyticsResult(parentResult);
						var childrenRows = formatAnalyticsResult(childrenResult);
						$scope.tableRows = $scope.tableRows.concat(parentRows).concat(childrenRows);

						// Check if last dataViewOrgunit
						if(k === ++currentOu){
							$scope.tableDisplayed = true;
							$scope.progressbarDisplayed = false;
						}
					});
			});

		});

		var formatAnalyticsResult = function (analytics) {
			var orgunits = {};
			angular.forEach(analytics.metaData.ou, function(orgunit){
				orgunits[orgunit] = {
					id: orgunit,
					name: analytics.metaData.names[orgunit],
					ouHierarchy: analytics.metaData.ouHierarchy[orgunit],
					data: {}
				}
			});

			// Include data. Data is in "rows" attribute as an array with the syntax [orgunitid, period, value]
			angular.forEach(analytics.rows, function(row){
				orgunits[row[0]].data[row[1]] = row[2];
			});

			return $.map(orgunits, function(orgunit, id){ return [orgunit]; })
		};

		var regenerateScopePeriodArray = function (analyticsResponse) {
			$scope.periods = [];
			angular.forEach(analyticsResponse.metaData.pe, function(pe){
				$scope.periods.push({
					id: pe,
					name: analyticsResponse.metaData.names[pe]
				})
			});
		};

		var constructQuerySingleOrgunit = function(orgunit){
			return constructQuery([orgunit]);
		};

		var constructQuery = function(orgunitList){
			var query = commonvariable.url + "analytics.json";

			// Include list of orgunits
			query = query + "?dimension=ou:";
			angular.forEach(orgunitList, function(orgunit){
				query = query + orgunit.id + ";";
			});

			// Add the period parameter: last 6 months
			query = query + "&dimension=pe:LAST_6_MONTHS";
			// Add the aggregation type: count
			query = query + "&aggregationType=COUNT";
			// Show complete hierarchy
			query = query + "&hierarchyMeta=true&displayProperty=NAME";

			return query;
		};


/**
	$q.all([meUserPromise, ouLevelsPromise])
	.then(function(data){

		// Save array of dataView organisation units
		var dataViewOrgUnits = data[0].dataViewOrganisationUnits;
		
		// Save max level in the the system
		maxLevel = getMaxLevel(data[1].organisationUnitLevels);
		
		// Create array of orgunits
		var orgunits = [];
		
		var k = dataViewOrgUnits.length;
		var currentOu = 0;
		angular.forEach(dataViewOrgUnits, function(preDataViewOrgUnit){
			
			var dataViewOrgUnitPromise = Organisationunit.get({filter: 'id:eq:' + preDataViewOrgUnit.id}).$promise;
			
			dataViewOrgUnitPromise.then(function(data){
				
				// We can assume that filtering by ID only returns one result
				var dataViewOrgUnit = data.organisationUnits[0];

				// Construction of analytics query
				var avData_url = commonvariable.url + "analytics.json";
				avData_url = avData_url + "?dimension=ou:" + dataViewOrgUnit.id;
				
				// Include all levels below dataViewOrgUnit				
				for(var i = dataViewOrgUnit.level; i <= maxLevel; i++){
					avData_url = avData_url + ";LEVEL-" + i;
				}
						
				// Add the period parameter: last 6 months
				avData_url = avData_url + "&dimension=pe:LAST_6_MONTHS";
				// Add the aggregation type: count
				avData_url = avData_url + "&aggregationType=COUNT";
				// Show complete hierarchy
				avData_url = avData_url + "&hierarchyMeta=true&displayProperty=NAME";
				
				// Get data
				$http.get(avData_url).
					success(function(data){
						
						// Create array of periods
						var periods = [];
						angular.forEach(data.metaData.pe, function(pe){
							periods.push({
								id: pe,
								name: data.metaData.names[pe]
							})
						});		
											
						// Process organisation units
						angular.forEach(data.metaData.ou, function(ou){
							
							var parentsString = data.metaData.ouHierarchy[ou];
							
							// Check hierarchy integrity
							if(ou == dataViewOrgUnit.id){
								parentsString = "";
							}
							else if(!parentsString.startsWith("/" + dataViewOrgUnit.id)){
								// If dataViewOrgUnit is not included, add parent hierarchy at the beginning
								if( parentsString.indexOf(dataViewOrgUnit.id) === -1 ){
									var parent = parentsString.split("/")[1];
									parentsString = data.metaData.ouHierarchy[parent] + parentsString;
								}
								
								// If hierarchy is longer than needed, cut from dataViewOrgUnit.id
								parentsString = parentsString.substring( parentsString.indexOf("/" + dataViewOrgUnit.id));
							}
							
							//Create full name with real names
							var parents = parentsString.split("/");
							parents.shift();
													
							var fullName = "";
							angular.forEach(parents, function(parent){
								fullName = fullName + "/" + data.metaData.names[parent].replace(" ","_");
							});
							fullName = fullName + "/" + data.metaData.names[ou].replace(" ","_");
							
							var level = dataViewOrgUnit.level + parents.length;

							// Push the new orgunit
							orgunits.push({
								id: ou,
								name: data.metaData.names[ou],
								fullName: fullName,
								parents: parents.join(" && "),
								relativeLevel: parents.length,
								level: level,
								isLastLevel: (level === maxLevel)
							});					
							
						});
						
						// Store values in "values" variable
						for(var i = 0; i < data.rows.length; i++){
							values.push(data.rows[i]);
						}
						
						// Make visible orgunits under dataViewOrgunit
						$parse(dataViewOrgUnit.id).assign($scope, true);
						
						// If last orgunit, start table displaying
						currentOu++;
						if(currentOu == k){
							// Assign periods and orgunits to view
							$scope.periods = periods;
							$scope.orgunits = orgunits;
							
							// Print data in table when table is ready
							// Data.rows contains an array of values. Each value is an array with this structure:
							// 0. Organization unit id
							// 1. Period (for example 201501)
							// 2. Value
							$scope.$on('onRepeatLast', function(scope, element, attrs){
								for(var i = 0; i < values.length; i++){
									$("." + values[i][0] + "." + values[i][1])
										.html("X <small>(" + Math.round(values[i][2]) + ")</small>");
								}
																
								// Hide progressBar and show table
								$scope.tableDisplayed = true;
								$scope.progressbarDisplayed = false;
								
								// Refresh scope
								$scope.$apply();
							});
							
						}
						
					}).
					error(function(data){
						// TODO Handle error
						$scope.progressbarDisplayed = false;
					});

				
			});
		});
	
	});
 */
			
	$scope.clickOrgunit = function(orgunitUID){
		var showChildren = $parse(orgunitUID);
		
		// Check current state of parameter
		if(showChildren($scope) === true){
			showChildren.assign($scope, false);
		} else {
			showChildren.assign($scope, true);			
		}
		
		// Toggle between plus and minus icons
		$("#ou_" + orgunitUID).find("span").toggleClass("glyphicon-plus glyphicon-minus ");
	}
	
	var getMaxLevel = function(levels){
		var max = 1;
		angular.forEach(levels, function(level){
			if(level.level > max) {max = level.level};
		});
		return max;
	}
	
}]);

// Directive to emit an event when a repeat process is in the last item
Dhis2Api.directive('onLastRepeat', function(){
	return function(scope, element, attrs) {
        if (scope.$last) setTimeout(function(){
            scope.$emit('onRepeatLast', element, attrs);
        }, 1);
    };
});