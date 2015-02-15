/**
 * jQuery-DataEntry Knockout connector.
 * https://github.com/RobertoPrevato/jQuery-DataEntry
 *
 * Copyright 2015, Roberto Prevato
 * http://ugrose.com
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

ko.bindingHandlers.dataentry = {
	init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
		var elem = $(element);

		if (!viewModel.schema)
			throw new Error('missing schema definition inside the model. cannot define a dataentry without a schema.');

		//add reference to the dataentry business logic to the model
		viewModel.dataentry = new $.Forms.DataEntry({
			$el: elem,
			schema: viewModel.schema,
			context: viewModel
		});

		//extend the model with proxy functions
		_.extend(viewModel, {
			validate: function (params) {
				return this.dataentry.validate(params);
			},
			validateSync: function (params) {
				return this.dataentry.validateSync(params);
			}
		});

		//trigger focus on the first active input element
		_.delay(function () {
			elem.find(":input[type='text']:not(:disabled):not([readonly]):first").trigger('focus');
		}, 200);

		ko.utils.domNodeDisposal.addDisposeCallback(element, _.partial(function (model, element) {
			// This will be called when the element is removed by Knockout or
			// if some other part of your code calls ko.removeNode(element)
			// Remove validation and undelegate dataentry events
			model.dataentry.removeValidation().undelegateEvents();
		}, viewModel));
	}
};