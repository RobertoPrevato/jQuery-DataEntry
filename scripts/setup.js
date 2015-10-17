//common libraries setup
+function () {

  //UnderscoreJS template settings
  _.templateSettings = {
    escape: /\{\{(.+?)\}\}/g,
    evaluate: /\{%(.+?)%\}/g,
    interpolate: /\{#(.+?)#\}/g
  };

}();