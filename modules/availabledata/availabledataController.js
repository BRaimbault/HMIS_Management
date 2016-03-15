
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

		$scope.availablePeriods = [
			{key: "LAST_3_MONTHS", value: 3},
			{key: "LAST_6_MONTHS", value: 6},
			{key: "LAST_12_MONTHS", value: 12}
		];
		$scope.selectedPeriod = "LAST_12_MONTHS";

		var orgunitsInfo = {};

		var loadTable = function(){

			// Initialize common variables
			$scope.tableRows = [];
			orgunitsInfo = {};

			// Initialize visibility of table and progressBar
			$scope.tableDisplayed = false;
			$scope.progressbarDisplayed = true;

			// Definition of meUser promise
			var meUserPromise = meUser.get({fields: 'dataViewOrganisationUnits[id,level,children[id,level,children]]'}).$promise;

			meUserPromise.then(function(meUser){
				var dataViewOrgUnits = meUser.dataViewOrganisationUnits;

				var k = dataViewOrgUnits.length;
				var currentOu = 0;
				angular.forEach(dataViewOrgUnits, function(dataViewOrgUnit){
					var queryParent = constructQuerySingleOrgunit(dataViewOrgUnit);
					var queryChildren = constructQuery(dataViewOrgUnit.children);

					// Add orgunits to orgunitsInfo. That info will be required later.
					orgunitsInfo[dataViewOrgUnit.id] = dataViewOrgUnit;
					$.map(dataViewOrgUnit.children, function(child){orgunitsInfo[child.id] = child;});

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

								// Make visible orgunits under dataViewOrgunit
								$parse(dataViewOrgUnit.id).assign($scope, true);
							}
						});
				});
			});
		};



		var formatAnalyticsResult = function (analytics) {
			var orgunits = {};
			angular.forEach(analytics.metaData.ou, function(orgunit) {
				var parents = analytics.metaData.ouHierarchy[orgunit];

				var parentArray = parents.split("/");
				parentArray.shift();

				var fullName = parentArray.map(function (parent) {
					return analytics.metaData.names[parent];
				}).join("/").concat("/" + analytics.metaData.names[orgunit])
					.replace(/\ /g, "_");

				orgunits[orgunit] = {
					id: orgunit,
					name: analytics.metaData.names[orgunit],
					fullName: fullName,
					parents: parentArray.join(" && "),
					level: orgunitsInfo[orgunit].level,
					relativeLevel: parentArray.length,
					isLastLevel: orgunitsInfo[orgunit].children.length === 0,
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
			query = query + "&dimension=pe:" + $scope.selectedPeriod;
			// Add the aggregation type: count
			query = query + "&aggregationType=COUNT";
			// Show complete hierarchy
			query = query + "&hierarchyMeta=true&displayProperty=NAME";

			return query;
		};
			
		$scope.clickOrgunit = function(orgunitId){

			var showChildren = $parse(orgunitId);

			// Check current state of parameter
			if(showChildren($scope) === true){
				showChildren.assign($scope, false);
			} else {
				showChildren.assign($scope, true);
				if(!childrenLoaded(orgunitId)){
					loadChildren(orgunitId);
				}
			}

			// Toggle between plus and minus icons
			$("#ou_" + orgunitId).find("span.ou-prefix").toggleClass("glyphicon-plus glyphicon-minus ");
		};

		var loadChildren = function(orgunitId) {
			// Add a loading icon and save the reference
			var loadingIcon = addLoadingIcon(orgunitId);

			var childrenInfo = Organisationunit.get({
				paging: false,
				fields: "id,name,level,children",
				filter: "id:in:[" + orgunitsInfo[orgunitId].children.map(function(child){return child.id;}).join(",") + "]"
			}).$promise;

			var childrenQuery = $http.get(constructQuery(orgunitsInfo[orgunitId].children));

			$q.all([childrenInfo, childrenQuery])
				.then(function(data){
					var childrenInfo = data[0].organisationUnits;
					// Add children information to orgunitsInfo
					$.map(childrenInfo, function(child){
						orgunitsInfo[child.id] = child;
					});

					// Add analytics information to table
					var childrenResult = data[1].data;
					var childrenRows = formatAnalyticsResult(childrenResult);
					$scope.tableRows = $scope.tableRows.concat(childrenRows);

				})
				.finally(function(){
					// Once finished, remove loadingIcon
					loadingIcon.remove();
				});
		};

		var childrenLoaded = function(orgunitId){
			var children = orgunitsInfo[orgunitId].children;
			for(i = 0; i < children.length; i++){
				if(orgunitsInfo[children[i].id] != undefined) {
					return true;
				}
			}
			return false;
		};

		var addLoadingIcon = function(orgunitId){
			var orgunitRow = $("#ou_" + orgunitId);
			orgunitRow.append("<span class='children-loading-icon glyphicon glyphicon-repeat'></span>");
			return (orgunitRow.find(".children-loading-icon"));
		};

		$scope.showSettings = function(){
			$("#availableDataSettings").modal();

			// Preselect period
			var periodLabel = $("#" + $scope.selectedPeriod);
			periodLabel.addClass("active");
			periodLabel.find("input").attr('checked', 'checked');
		};

		$scope.updateSettings = function() {
			// Update period information
			var periodId = $("#periodSelector").find("label.active").attr("id");
			console.log(periodId);
			$scope.selectedPeriod = periodId;

			$("#availableDataSettings").modal("hide");
			loadTable();
		};

		// Initialize table
		loadTable();
}]);
