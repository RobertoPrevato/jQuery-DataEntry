ug.controller("demo", ['$scope', function (scope) {

  _.extend(scope, {

    person: {
      name: "Roberto Prevato",
      age: 28,
      favoriteBand: "Sunn O)))"
    },

    editing: false,

    edit: function () {
      scope.personEdit = _.clone(scope.person);
      scope.editing = true;
    },

    save: function () {
      //validate
      //NB: it is important to use the context here, and not "scope"; because the ng-if creates a child scope, and scope.$$childHead would be necessary ;(
      this.validate().done(function () {
        //validation success
        scope.person = scope.personEdit;
        scope.editing = false;
      }).fail(function () {
        //the fail callback is generally not needed; this is just a demonstration
        console.log("%cThere are errors in the form", "color:darkred;");
      });
    },

    cancel: function () {
      scope.editing = false;
      return false;
    },

    //the validation schema in this case is defined inside the scope
    schema: {
      name: {
        validation: ["required"],
        format: ["cleanSpaces"]
      },
      age: {
        validation: ["required", "integer"]
      },
      band: {
        validation: ["none"],
        format: ["cleanSpaces"]
      }
    }

  });

}]);