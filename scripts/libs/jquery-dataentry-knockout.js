/*
 * jQuery-DataEntry Knockout connector.
 * https://github.com/RobertoPrevato/jQuery-DataEntry
 *
 * Copyright 2014, Roberto Prevato
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

ko.bindingHandlers.dataentry = {
	init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
		var elem = $(element);
		elem.addClass("ui-dataentry");
		if (!viewModel.schema)
			throw new Error('missing schema definition inside the model. cannot define a dataentry without a schema.');
		var options = _.extend({ focus: true }, valueAccessor());
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
			validateTouched: function (params) {
				return this.dataentry.validate(params, {
					onlyIfTouched: true
				});
			},
			validateSync: function (params) {
				return this.dataentry.validateSync(params);
			},
			validateTouchedSync: function (params) {
				return this.dataentry.validateSync(params, {
					onlyIfTouched: true
				});
			},
		});

		//trigger focus on the first active input element
		if (options.focus)
			_.delay(function () {
				elem.find(":input:not(:disabled):not([readonly]):first").trigger('focus');
			}, 200);

		if (options.validationActive)
			viewModel.dataentry.validationActive = true;

		ko.utils.domNodeDisposal.addDisposeCallback(element, _.partial(function (model, element) {
			// This will be called when the element is removed by Knockout or
			// if some other part of your code calls ko.removeNode(element)
			// Remove validation and undelegate dataentry events
			model.dataentry.removeValidation().undelegateEvents();
		}, viewModel));
	}
};