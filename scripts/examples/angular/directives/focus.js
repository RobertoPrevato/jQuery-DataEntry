ug.directive('focus', [function() {
  return {
    restrict: 'A',
    scope: false,
    link: function (scope, elem, attr, ctrl) {
      var target = attr.focus;
      _.delay(function () {
        $(target).trigger("focus");
      }, 200);
    }
  };
}]);