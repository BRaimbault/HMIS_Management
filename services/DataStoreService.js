appManagerMSF.factory("DataStoreService", ['DataStore','meUser', '$q', function(DataStore, meUser, $q) {

    var namespace = "project_manager";
    var userid = null;

    var getUserId = function() {
        // Get current user id
        if (userid != null){
            return $q.when(userid);
        } else {
            return meUser.get({fields: 'id'}).$promise
                .then(function (user) {
                    userid = user.id;
                    return userid;
                });
        }
    };

    var getCurrentUserSettings = function() {
        return getUserId().then(function(userid){
            console.log("userId got " + userid);
            return DataStore.get({namespace: namespace, key: userid}).$promise
        });
    };

    /**
     *
     * @param module Module name (like "availableData", "resetpasswd",...)
     * @param property With the syntax {"key": "property-name", "value": "property-value"}
     * @returns {*}
     */
    var updateCurrentUserSettings = function(module, property){
        var userSettings = {};
        return getCurrentUserSettings()
            .then(function(successResult){
                userSettings = successResult;
                // Update userSettings with new property, without modifying the others
                if(userSettings[module] == undefined)
                    userSettings[module] = {};
                userSettings[module][property.key] = property.value;
                console.log("updating user settings");
                console.log(userSettings);
                return getUserId().then(function(userid){
                    return DataStore.put({namespace:namespace, key:userid}, userSettings);
                });
            },
            function(){
                userSettings[module] = {};
                userSettings[module][property.key] = property.value;
                console.log("creating new user settings");
                console.log(userSettings);
                return getUserId().then(function(userid){
                    return DataStore.post({namespace:namespace, key:userid}, userSettings);
                });
            });
    };

    return {
        getCurrentUserSettings: getCurrentUserSettings
    };
}]);