ug.directive('appear', [function() {
  return {
    restrict: 'A',
    scope: false,
    link: function (scope, elem, attr, ctrl) {
      elem.show().css({ "visibility": "visible" });
    }
  };
}]);