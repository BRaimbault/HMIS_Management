appManagerMSF.factory('sqlService',["SqlView", "SqlViewData", function(SqlView, SqlViewData){

    var sqlQuery = "SELECT organisationunitid FROM organisationunit;";

    var createPayload = function(sqlQuery) {
        // Generate a random name, based on a random integer.
        // Probability of duplicity: 1 / 100.000
        var name = "query" + Math.floor(Math.random() * 100000);

        return {"name":name,"sqlQuery":sqlQuery,
            "displayName":name,
            "publicAccess":"rw------",
            "type":"QUERY",
            "externalAccess":false,
            "cacheStrategy":"RESPECT_SYSTEM_SETTING",
            "access":{
                "read":true,
                "update":true,
                "externalize":true,
                "delete":true,
                "write":true,
                "manage":true},
            "userGroupAccesses":[]}
    }

    var sqlView = function(payload) {
        return SqlView.save(payload).$promise.then( function(data) {
           return data.response.lastImported;
        },{});
    };

    var getSqlViewData = function(queryId) {
        return SqlViewData.get({viewId:queryId}).$promise.then(function(queryResult) {
            SqlView.delete({viewId:queryId});
            return queryResult;
        })
    };

    function executeSqlView(query) {
        var payload = createPayload(query);
        return sqlView(payload)
            .then(getSqlViewData);
    };

    return {
        executeSqlView: executeSqlView
    };

}]);