appManagerMSF.factory("AnalyticsService", ['AnalyticsEngine', function(AnalyticsEngine) {

    var queryAvailableData = function(orgunit, period, filters){
        var analyticsParameters = buildAnalyticsParameters(orgunit, period, filters);

        return AnalyticsEngine.get(analyticsParameters).$promise;
    };

    var buildAnalyticsParameters = function(orgunit, period, filters){
        var parameters = {};

        var orgunits = "";
        if(orgunit instanceof Array){
            orgunits = orgunit.map(function(value, index, array){return value.id;}).join(";")
        } else {
            orgunits = orgunit.id;
        }

        // Build dimension parameter
        parameters.dimension = [
            "ou:" + orgunits,
            "pe:" + period.id
        ];

        parameters.aggregationType = "COUNT";
        parameters.hierarchyMeta = true;
        parameters.displayProperty = "NAME";

        if(filters !== null){
            var filterArray = [];
            angular.forEach(filters, function(option, filterid){
                filterArray.push(filterid + ":" + option.id);
            });
            parameters.filter = filterArray;
        }

        return parameters;
    };

    var formatAnalyticsResult = function(analytics, orgunitsInfo){
        var orgunits = {};
        angular.forEach(analytics.metaData.ou, function(orgunit) {
            var parents = analytics.metaData.ouHierarchy[orgunit];

            console.log(parents);

            if(parents.endsWith("/" + orgunit)){
                parents = "";
            }

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
                parents: parentArray,
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

    return {
        queryAvailableData: queryAvailableData,
        formatAnalyticsResult: formatAnalyticsResult
    }

}]);