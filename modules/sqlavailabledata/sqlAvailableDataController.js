appManagerMSF.controller('sqlAvailableDataController', ['$scope', 'sqlService', 'meUser', 'Organisationunit', function($scope, sqlService, meUser, Organisationunit) {

    $scope.periods = [];
    $scope.tableRows = [];
    var tempChildArray = [];

    // First of all, get user orgunits
    meUser.get().$promise.then(function(user) {
        dataViewOrgunits = user.dataViewOrganisationUnits;

        var dataViewOrgunitNum = dataViewOrgunits.length;
        var index = 0;
        angular.forEach(dataViewOrgunits, function(dataViewOrgunit) {
            var dataViewOrgUnitPromise = Organisationunit.get({filter: 'id:eq:' + dataViewOrgunit.id}).$promise;

            dataViewOrgUnitPromise.then(function(orgunitResult) {
                // Orgunit contains "id" and "level" fields
                var orgunit = orgunitResult.organisationUnits[0];

                var query = getQueryForOrgunit(orgunit);
                sqlService.executeSqlView(query).then(function(queryResult) {
                    var rowArray = readQueryResult(queryResult);
                    $scope.tableRows.push(rowArray[0]);

                    var childQuery = getQueryForChildren(orgunit);
                    sqlService.executeSqlView(childQuery).then(function(childResult){
                        var childArray = readQueryResult(childResult);
                        tempChildArray.push(childArray);

                        // Increment the counter
                        index++;

                        // Check if last orgunit
                        if(index === dataViewOrgunitNum){
                            console.log("get last one");
                            $scope.tableRows = sortByName($scope.tableRows);
                            angular.forEach(tempChildArray, function(child){
                                includeChildren(child, orgunit.id);
                            });
                        }

                    });
                });
            });


        });
    });

    var readQueryResult = function(data){
        var orgunits = {};
        angular.forEach(data.rows, function(row){
            var id = row[0];
            var name = row[1];
            var period = row[2];
            var value = row[3];
            var storedby = row[4];

            if(orgunits[id] === undefined){
                orgunits[id] = {
                    id: id,
                    name: name,
                    data: {}
                }
                angular.forEach($scope.periods, function(pe){
                    // Remove quotes from period
                    pe = pe.replace(/'/g, "");
                    orgunits[id].data[pe] = {others: 0, pentaho: 0};
                });
            }
            orgunits[id].data[period][storedby] = parseInt(value);
        });
        // Convert into an array
        var result = $.map(orgunits, function(value, index){
            return [value];
        });
        return result;
    };

    var sortByName = function(array){
        return array.sort(function(a, b) {
            if(a.name < b.name) return -1;
            else if (a.name > b.name) return 1;
            else return 0;
        });
    };

    var includeChildren = function(children, parentId){
        children = sortByName(children);
        // Look for parent
        var parentIndex;
        angular.forEach($scope.tableRows, function(row, index){
            if(row.id === parentId) {
                parentIndex = index + 1;
            }
        });

        angular.forEach(children, function(child){
            $scope.tableRows.splice(parentIndex, 0, child);
            parentIndex++;
        })
    }

    var getQueryForChildren = function (orgunit){
        var orgunitId = orgunit.id;
        var orgunitLevel = orgunit.level;
        var dataLevel = parseInt(orgunitLevel) + 1;
        return constructQuery(orgunitId, orgunitLevel, dataLevel);
    };

    var getQueryForOrgunit = function (orgunit){
        var orgunitId = orgunit.id;
        var orgunitLevel = orgunit.level;
        var dataLevel = orgunitLevel;
        return constructQuery(orgunitId, orgunitLevel, dataLevel);
    };

    var constructQuery = function(orgunitId, orgunitLevel, dataLevel) {
        var query = "SELECT max(ou.uid) AS uid, max(ou.name) AS name, a.period, sum(a.count), storedby FROM ( " +
                        "SELECT _ou.idlevel" + dataLevel + " AS orgunitid, _pe.monthly AS period, count(*), 'pentaho' AS storedby " +
                            "FROM datavalue dv " +
                            "INNER JOIN _orgunitstructure _ou ON dv.sourceid = _ou.organisationunitid " +
                            "INNER JOIN _periodstructure _pe ON dv.periodid = _pe.periodid " +
                            "WHERE _ou.uidlevel" + orgunitLevel + " = '" + orgunitId + "' " +
                            "AND _pe.monthly IN (" + getPeriodArray() + ") " +
                            "AND storedby = 'pentaho' " +
                            "GROUP BY _ou.idlevel" + dataLevel + ", _pe.monthly " +
                        "UNION " +
                        "SELECT _ou.idlevel" + dataLevel + " AS orgunitid, _pe.monthly AS period, count(*), 'others' AS storedby " +
                            "FROM datavalue dv " +
                            "INNER JOIN _orgunitstructure _ou ON dv.sourceid = _ou.organisationunitid " +
                            "INNER JOIN _periodstructure _pe ON dv.periodid = _pe.periodid " +
                            "WHERE _ou.uidlevel" + orgunitLevel + " = '" + orgunitId + "' " +
                            "AND _pe.monthly IN (" + getPeriodArray() + ") " +
                            "AND storedby != 'pentaho' " +
                            "GROUP BY _ou.idlevel" + dataLevel + ", _pe.monthly " +
                        ") a " +
                        "INNER JOIN organisationunit ou ON a.orgunitid = ou.organisationunitid " +
                        "GROUP BY a.orgunitid, a.period, a.storedby;";

        return query;
    }

    var getPeriodArray = function() {
        var today = new Date();
        var indexMonth = today.getMonth ();
        var indexYear = today.getFullYear();

        var periods = [];

        // Get last 12 months, excluding current month;
        for (var i = 0; i < 12; i ++) {
            indexMonth--;
            if (indexMonth < 0){
                indexYear--;
                indexMonth = 11;
            }
            // Force month number to have the format '01', '02', ..., '12'
            periods.push("'" + indexYear + ("0" + (indexMonth + 1)).slice(-2) + "'");
        }
        $scope.periods = periods.sort();
        return periods.join(",");
    }
    
}]);