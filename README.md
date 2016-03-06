# jQuery-DataEntry
Forms validation plugin that supports AJAX requests, automatic decoration of fields, localized error messages. Integrable with Angular, Backbone, Knockout, [React](https://github.com/RobertoPrevato/jQuery-DataEntry/wiki/Integration-with-ReactJs).

## Objectives
The objectives of the jQuery-DataEntry library are:
* allow the implementation of application-wide validation strategy: centralizing the logic that displays error messages, and marks fields in valid or invalid state, and applies validation rules
* Deferred based validation of fields and forms, therefore supporting AJAX calls as part of validation process
* validation of fields implemented in a declarative way
* provide a way to implement form validation with (relatively) little amount of code
* support multiple validation rules for every field: the validation of every field stops at the first rule that is not respected - in order to avoid useless AJAX calls, whenever AJAX is necessary
* support for formatting rules upon focus and upon blur, constraints rules, all configurable in a declarative way
* allow to define custom validation, formatting and constraint rules in a simple way
* support older browsers: using jQuery to perform DOM operations, Deferred logic, handle special situations when registering and removing event handlers

## New DataEntry version
A newer implementation of the DataEntry library, independent from jQuery and Lodash, using the ES6 Promise object and targeting newer browsers, is [available here](https://github.com/RobertoPrevato/DataEntry).
If the support for older browsers is required, though, the jQuery-DataEntry is still recommended, as it delegates to jQuery DOM manipulation logic, Deferred implementation, handling of specific event handling situations.

[Live demo](http://ugrose.com/content/demos/jqdataentry/index.html)

**Dependencies**:
- jQuery
- Lodash
- A library for client side localization: either [i18n-js](https://github.com/fnando/i18n-js) or [I.js](https://github.com/RobertoPrevato/I.js)

**Features**:
- Provides a way to implement form validation with little coding
- Provides a strategy to manage the client side validation at application level: keeping it consistent in every form
- Provides a flexible way to define validation rules, also involving AJAX calls or other asynchronous operations
- Automatic field decoration
- Automatic formatting logic
- Automatic constraints logic
- Connectors for Angular, Knockout, [React](https://github.com/RobertoPrevato/jQuery-DataEntry/wiki/Integration-with-ReactJs)
- Easily customizable

**Examples**:
- Simply download the code and open the index.html in a browser (examples don't require a local web server)
- External libraries in the demo and examples are loaded using CDN



