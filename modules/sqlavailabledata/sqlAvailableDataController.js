appManagerMSF.controller('sqlAvailableDataController', ['$scope', 'sqlService', function($scope, sqlService) {

    $scope.array = "la fila es ";

    $scope.execute = function() {
        sqlService.executeSqlView($scope.query).then(function(queryResult) {
            var result = queryResult.headers[0].column;
            $scope.array = $scope.array + result;
            console.log($scope.array);
        });
    }

}]);