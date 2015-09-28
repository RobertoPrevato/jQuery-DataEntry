/**
 * jQuery-DataEntry Angular connector.
 * https://github.com/RobertoPrevato/jQuery-DataEntry
 *
 * Copyright 2015, Roberto Prevato
 * http://ugrose.com
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

angular.module('ug.dataentry', [])
.directive('dataentry', ["$compile", function ($compile) {
  
  var linker = function (scope, el, attrs) {
    // extend the scope with functions for the form validation
    var element = el[0];
    
    if (scope.dataentry) throw "the scope has already a [dataentry] property. Only one dataentry per scope is supported";
    if (!scope.schema) throw "no schema defined inside the scope";
    
		// supports only one dataentry per scope
		scope.dataentry = new $.Forms.DataEntry({
      $el: $(element),
      schema: scope.schema,
      context: scope
    });
    
    _.extend(scope, {
      validate: function (params) {
        return this.dataentry.validate(params);
      }
    });

    //trigger focus on the first active input element
    _.delay(function () {
      el.find(":input:not(:disabled):not([readonly]):first").trigger('focus');
    }, 200);

    //bind event handler to unbind events
    scope.$on("$destroy", function() {
      //remove validation and undelegate events
      scope.dataentry.removeValidation().undelegateEvents();
    });
  };
  
  return {
    restrict: 'A',
    replace: false,
    link: linker
  };
}]);
