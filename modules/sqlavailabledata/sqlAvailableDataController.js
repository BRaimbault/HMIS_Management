appManagerMSF.controller('sqlAvailableDataController', ['$scope', 'sqlService', 'meUser', 'Organisationunit',
    function($scope, sqlService, meUser, Organisationunit) {

    var dataViewOrgunits;

    // First of all, get user orgunits
    meUser.get().$promise.then(function(user) {
        dataViewOrgunits = user.dataViewOrganisationUnits;

        angular.forEach(dataViewOrgunits, function(dataViewOrgunit) {
            var dataViewOrgUnitPromise = Organisationunit.get({filter: 'id:eq:' + dataViewOrgunit.id}).$promise;

            dataViewOrgUnitPromise.then(function(orgunitResult) {
                // Orgunit contains "id" and "level" fields
                var orgunit = orgunitResult.organisationUnits[0];
                console.log(orgunitResult);

                var query = constructQuery(orgunit);
                console.log(query);

                sqlService.executeSqlView(query).then(function(queryResult) {
                    console.log(queryResult);
                    var result = queryResult.headers[0].column;
                    $scope.array = $scope.array + result;
                    console.log($scope.array);
                });
            });


        });
    });

    var constructQuery = function(orgunit) {
        var orgunitId = orgunit.id;
        var orgunitLevel = orgunit.level;
        var dataLevel = parseInt(orgunitLevel) + 1;

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
        return periods.join(",");
    }

    $scope.execute = function() {
        sqlService.executeSqlView($scope.query).then(function(queryResult) {
            var result = queryResult.headers[0].column;
            $scope.array = $scope.array + result;
            console.log($scope.array);
        });
    }

}]);