appManagerMSF.factory("OrgunitGroupSetService", ['OrganisationUnitGroupSet','OrganisationUnitGroup','$q', function(OrganisationUnitGroupSet, OrganisationUnitGroup, $q) {

    /**
     * It returns and array of organisationUnitGroupsSets. The structure of each groupSet is the same that querying
     * the endpoint "api/organisationUnitGroupSets/:uid", and the names for both groupSet and groups are translated.
     *
     * @param groupSets - Array of organisationUnitGroupSets. OrgunitGroupSet = {"id": "ddslkfjdfsjk",...}
     * @returns {*} - Array of organisationUnitGroupSets with name and children[id, name]
     */
    var getOrgunitGroupSets = function(groupSets){
        var promiseArray = [];
        angular.forEach(groupSets, function(groupSet){
            promiseArray.push(getTranslatedOrgunitGroupSet(groupSet).then(getTranslatedOrgunitGroups));
        });

        return $q.all(promiseArray)
            .then(function(data){
                return data;
            });
    };

    var getTranslatedOrgunitGroupSet = function(groupSet){
        return OrganisationUnitGroupSet.get({
            groupsetid: groupSet.id,
            fields: "displayName|rename(name),id,organisationUnitGroups[id]",
            paging: false,
            translate: true
        }).$promise
            .then(function(groupSetInfo){
                return groupSetInfo;
            });
    };

    var getTranslatedOrgunitGroups = function(groupSetInfo){
        var groups = groupSetInfo.organisationUnitGroups;
        return OrganisationUnitGroup.get({
            filter: "id:in:[" + groups.map(function(group){return group.id;}).join(",") + "]",
            fields: "displayName|rename(name),id",
            paging: false,
            translate: true
        }).$promise
            .then(function(groupsInfo){
                // In GroupSetInfo, replace 'organisationUnitGroups' attribute with the translated values
                groupSetInfo.organisationUnitGroups = groupsInfo.organisationUnitGroups;
                return groupSetInfo;
            });
    };

    return {
        getOrgunitGroupSets: getOrgunitGroupSets
    }

}]);