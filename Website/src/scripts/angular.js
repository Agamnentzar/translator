/// <reference path="jquery.min.js" />
/// <reference path="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.17/angular.js"/>

(function () {
	$.postJSON = function (url, data, success, error) {
		$.ajax({ url: url, method: 'post', dataType: 'json', data: data, success: success, error: error });
	};

	var app = angular.module('translatorApp', []);

	app.controller('translatorController', function ($scope, $http) {
		$scope.loaded = false;
		$scope.search = '';
		$scope.ref = null;
		$scope.target = null;

		var data = null;

		$scope.init = function (_data) {
			console.log(_data);

			var set = null;

			$scope.sets = _data.sets;
			$scope.sets.forEach(function (s) {
				if (s._id === localStorage.setId)
					set = s;
			});

			$scope.selectSet(set || $scope.sets[0]);
		};

		$scope.selectSet = function (set) {
			if ($scope.set === set)
				return;

			$scope.loaded = false;
			$scope.set = set;

			localStorage.setId = set._id;

			$http.get('/api/get', { params: { setId: set._id } }).success(function (_data) {
				data = _data;

				console.log(data);

				$scope.loaded = true;
				$scope.langs = data.langs;
				$scope.langs.unshift({ id: 'none', name: 'none' });
				$scope.ref = $scope.langs[0];
				$scope.target = $scope.langs[0];
				$scope.terms = data.terms;

				// ...
			});
		};
	});
})();