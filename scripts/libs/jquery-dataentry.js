/**
 * jQuery-DataEntry, forms validation plugin that supports AJAX requests, automatic decoration of fields, localized error messages.
 * https://github.com/RobertoPrevato/jQuery-DataEntry
 *
 * Copyright 2015, Roberto Prevato
 * http://ugrose.com
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

+function ($, _) {
	//utility for localization strategy
	if (!window["I"]) window["I"] = { t: function (key, options) { return key; } };

	$.Forms = {};
	$.Forms.Version = "1.0.0";

	//utility functions
	$.Forms.Utils = {};
	//string utility functions
	var S = $.Forms.Utils.String = {
		format: function (s) {
			var args = Array.prototype.slice.call(arguments, 1);
			return s.replace(/{(\d+)}/g, function (match, i) {
				return typeof args[i] != 'undefined' ? args[i] : match;
			});
		},
		trim: function (s) {
			return _.isString(s) ? s.replace(/^[\s]+|[\s]+$/g, '') : s;
		},
		removeSpaces: function (s) {
			return _.isString(s) ? s.replace(/\s/g, '') : s;
		},
		removeMultipleSpaces: function (s) {
			return _.isString(s) ? s.replace(/\s{2,}/g, ' ') : s;
		},
		titleCase: function (s) {
			return _.isString(s) ? s.toLowerCase().replace(/^(.)|\s+(.)/g, function (l) { return l.toUpperCase(); }) : s;
		},
		removeLeadingSpaces: function (s) {
			return _.isString(s) ? s.replace(/^\s+|\s+$/, '') : s;
		}
	};

	//function that actually completes when all promises complete (unlike $.when)
	function when(queue, context) {
		var i = 0, a = [], args = _.toArray(arguments).slice(1, arguments.length), success = true;
		//sanitize the queue
		queue = _.reject(queue, function (o) { return !o || !o.done; });
		var chain = new $.Deferred().progress(function () {
			i++;
			if (i == queue.length)
				//every single promise completed
				chain[success ? "resolveWith" : "rejectWith"](context || this, [_.chain(a.sort(function (a, b) { if (a.ix < b.ix) return -1; if (a.ix > b.ix) return 1; return 0; })).map(function (o) { return o.data; }).flatten().value()]);
		});
		function setPromise(promise, j) {
			promise.done(function (data) {
				a.push({ ix: j, data: data, success: true });
			});
			promise.fail(function (data) {
				a.push({ ix: j, data: Array.prototype.slice.call(arguments), success: false });
				success = false;
			});
			promise.always(function () {
				chain.notify();
			});
		}
		for (var j = 0, l = queue.length; j < l; j++) {
			setPromise(queue[j], j);
		}

		if (!queue.length) {
			//resolve directly
			chain.resolveWith(context || this, a);
		}
		return chain.promise();
	};
	$.Forms.Utils.When = when;
	//marking: to display information over fields
	$.Forms.Marking = {};

	//
	//Markers implement a common interface with functions: markFieldNeutrum; markFieldValid; markFieldInvalid; markFieldInfo;
	//

	//support for chosen js when marking invalid fields
	function checkChosen($el) {
		//fix for chosen selects
		if (!$el.length) return $el;
		var element = $el.get(0);
		if (/select/i.test(element.tagName) && !$el.is(':visible') && $el.hasClass("chosen-select")) {
			//replace the element with the chosen element
			return $el.next();
		}
		return $el;
	}

	//DOM marker: the simplest marker possible: displays information by Injecting or removing Elements inside the DOM
	var DomMarker = $.Forms.Marking.DomMarker = function () { };
	_.extend(DomMarker.prototype, {

		__checkChosen: checkChosen,

		messageElementHtml: "<span></span>",

		messageElementClass: "ui-message-element",

		getMessageElement: function (f, create) {
			var l = f.next("." + this.messageElementClass);
			if (l.length)
				return l;
			if (!create)
				return null;
			return $(this.messageElementHtml).addClass(this.messageElementClass);
		},

		removeMessageElement: function (f) {
			var l = this.getMessageElement(f, false);
			if (l != null)
				l.remove();
			return this;
		},

		//marks the field in neuter state (no success/no error) before validation
		markFieldNeutrum: function (f) {
			f = this.__checkChosen(f);
			f.removeClass('ui-field-invalid ui-field-valid');
			return this.removeMessageElement(f);
		},

		//default function to mark a field as valid or invalid
		markFieldValid: function (f) {
			f = this.__checkChosen(f);
			f.removeClass('ui-field-invalid').addClass('ui-field-valid');
			return this.removeMessageElement(f);
		},

		markFieldInfo: function (f) {
			f = this.__checkChosen(f);
			var l = this.getMessageElement(f, true);
			l.addClass("ui-info").text(options.message);
			f.after(l);
			return this;
		},

		markFieldInvalid: function (f, options) {
			f = this.__checkChosen(f);
			var l = this.getMessageElement(f, true);
			l.addClass("ui-error").text(options.message);
			f.after(l);
			return this;
		}
	});

	//TooltipMarker marker: a marker that makes use of Bootstrap tooltip plugin
	var TooltipMarker = $.Forms.Marking.TooltipMarker = function () { };
	_.extend(TooltipMarker.prototype, {

		__checkChosen: checkChosen,

		tooltipsContainer: 'body',

		//marks the field in neuter state (no success/no error) before validation
		//this is important to avoid the appearing of a green check
		markFieldNeutrum: function (f) {
			f = this.__checkChosen(f);
			f.removeClass('ui-field-invalid ui-field-valid ui-field-info');
			f.tooltip('destroy');
			return this;
		},

		//default function to mark a field as valid or invalid
		markFieldValid: function (f) {
			f = this.__checkChosen(f);
			f.removeClass('ui-field-invalid ui-field-info').addClass('ui-field-valid');
			f.tooltip('destroy');
			return this;
		},

		markFieldInvalid: function (f, options) {
			f = this.__checkChosen(f);
			f.removeClass('ui-field-valid ui-field-info').addClass('ui-field-invalid');
			return this.showLabel(f, options.message || I.t('errors.valueIsInvalid'), options, "validation-tooltip");
		},

		markFieldInfo: function (f, options) {
			f = this.__checkChosen(f);
			f.removeClass('ui-field-valid ui-field-invalid').addClass('ui-field-info');
			return this.showLabel(f, options.message, options, "information-tooltip");
		},

		//function to show label over elements
		showLabel: function (element, message, options, tooltipClass) {
			if (!options) options = {};
			var l = $(element), data = l.data('validation-tooltip'), tooltip = l.data('bs.tooltip');
			//bootstrap tooltip supports 'destroy' in a better way than jQuery UI tooltip
			//check if the element has already a tooltip
			if (tooltip && tooltip.$tip) {
				//the element has already a tooltip
				if (tooltip.$tip.find('.tooltip-inner').text() !== message) {
					//update message
					tooltip.$tip.find('.tooltip-inner').text(message);
				}
				return;
			}
			l.tooltip('destroy');
			//check if the element has defined options for the tooltip
			//this allows developer to have control directly in the HTML
			if (data && data.onShow) data.onShow.apply(this, [element, message]);

			//the first object represents default values
			//its properties can be overridden using data-validation-tooltip=""
			l.addClass('ui-tooltip-caller');
			l.tooltip(_.extend({
				title: message,
				animation: false,
				container: this.tooltipsContainer,
				placement: 'right',
				trigger: 'manual',
				template: '<div class="tooltip ' + tooltipClass + '" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
			}, data || {}, options || {}));

			if (options.events)
				_.each(options.events, function (v, k) {
					l.on(k, v);
				}, this);

			l.tooltip('show');
			_.delay(function () {
				var a = l.data("bs.tooltip");
				if (a && a.$tip) a.$tip.css({ visibility: "visible" }).animate({ opacity: 1 }, 200);
			}, 100);
			return l;
		}
	});

	//set the default marker as TooltipMarker if bootstrap is loaded; otherwise to DomMarker
	var BootstrapLoaded = $.fn.tooltip && /bs\.tooltip/.test($.fn.tooltip.toString());
	var DefaultMarker = BootstrapLoaded ? TooltipMarker : DomMarker;

	//formatting
	$.Forms.Formatting = {
		//formatting rules to apply on blur, after successful validation
		Rules: {
			trim: {
				fn: function (field, value) {
					var rx = /^[\s]+|[\s]+$/g;
					if (value.match(rx)) {
						field.val(value.replace(rx, ''));
						//mark as formatted
						this.formatter.markFieldFormatted(field, I.t('info.leadingSpacesRemoved'));
					}
				}
			},

			removeSpaces: {
				fn: function (field, value) {
					var rx = /\s/g;
					if (value.match(rx)) {
						field.val(value.replace(rx, ''));
					}
				}
			},

			removeMultipleSpaces: {
				fn: function (field, value) {
					var rx = /\s{2,}/g;
					if (value.match(rx)) {
						field.val(value.replace(rx, ' '));
					}
				}
			},

			cleanSpaces: {
				fn: function (field, value) {
					if (!value) return;
					var v = S.trim(S.removeMultipleSpaces(value));
					if (v != value) {
						field.val(v);
					}
				}
			},

			normalCase: {
				fn: function (field, value) {
					if (!value) return;
					var v = value.replace(/^(.)(.*)/, function (a, b, c) { return b.toUpperCase() + c.toLowerCase(); });
					field.val(v);
				}
			},

			titleCase: {
				fn: function (field, value) {
					if (!value) return;
					var v = _.map(value.replace(/\s{2,}/g, ' ').replace(/^[\s]+|[\s]+$/g, '').split(/\s/g),
					function (n) { var m = n.match(/^(.)(.*)/); return m[1].toUpperCase() + m[2].toLowerCase(); });
					field.val(v.join(' '));
				}
			},

			integer: {
				fn: function (field, value) {
					if (!value) return;
					//remove leading zeros
					if (/^0+/.test(value))
						field.val(value.replace(/^0+/, ""));
				}
			}
		},
		//formatting rules to apply on focus, before editing a value
		PreRules: {
			integer: {
				fn: function (field, value) {
					if (/^0+$/.test(value))
						//if the value consists of only zeros, empty automatically the field (some users get confused when imputting numbers in a field with 0)
						field.val("");
				}
			}
		}
	};

	//instantiable formatter
	var Formatter = $.Forms.Formatting.Formatter = function (options) {
		options = _.extend({}, options || {});
		var rules = _.clone($.Forms.Formatting.Rules);
		if (options.rules)
			rules = _.extend(rules, options.rules);

		this.rules = rules
		this.options = options;
		//set marker
		this.marker = new this.markerType();
	};

	_.extend(Formatter.prototype, {

		markerType: DefaultMarker,

		//rules is an array of formatting rules names or a single name
		format: function (rules, view, field, value) {
			if (_.isString(rules)) {
				var name = rules;
				if (this.rules[name])
					this.rules[name].fn.apply(view, [field, value]);
				else
					throw 'missing formatter definition: ' + name;
				return this;
			}
			for (var i = 0, l = rules.length; i < l; i++)
				this.format(rules[i], view, field, value);
			return this;
		},

		//default function to mark a field as formatted
		markFieldFormatted: function (el, text) {
			this.marker.markFieldInfo(el, text);
		}

	});

	//input constraints
	var permittedCharacters = function (e, c) {
		//characters or characters combination always permitted
		if (_.contains([8, 0, 37, 39, 9], c) || (e.ctrlKey && _.contains([120, 118, 99, 97, 88, 86, 67], c))) return true;
		return false;
	}

	var Constraints = $.Forms.Constraints = {

		PermittedCharacters: permittedCharacters,

		//allows to input only numbers
		integer: function (e, c) {
			var c = e.keyCode ? e.keyCode : e.charCode, key = String.fromCharCode(c);
			if (!permittedCharacters(e, c) && !key.match(/[0-9]/)) return false;
			return true;
		},

		//allows to input only letters
		letters: function (e, c) {
			var c = e.keyCode ? e.keyCode : e.charCode, key = String.fromCharCode(c);
			if (!permittedCharacters(e, c) && !key.match(/[a-zA-Z]/)) return false;
			return true;
		},

		digits: function (e, c) {
			var c = e.keyCode ? e.keyCode : e.charCode, key = String.fromCharCode(c);
			if (!permittedCharacters(e, c) && !key.match(/\d/)) return false;
			return true;
		}

	};

	//base validation rules
	function getError(message, args) {
		return {
			error: true,
			message: message,
			field: args[0],
			params: args
		};
	};

	//validation
	$.Forms.Validation = {
		//basic validation rules
		Rules: {
			//no validation: useful when formatting is needed
			none: {
				fn: function () {
					return true;
				}
			},

			noSpaces: {
				fn: function (field, value, forced) {
					if (!value) return true;
					if (value.match(/\s/)) return getError(I.t('errors.spacesInValue'), arguments);
					return true;
				}
			},

			remote: {
				deferred: true,
				fn: function (field, value, forced, deferredProvider) {
					if (!deferredProvider) {
						throw 'missing deferredProvider for remote validator, pass a function that returns a deferred as parameter for this validator.';
					}
					return deferredProvider.apply(field, arguments);
				}
			},

			unique: {
				deferred: true, //validation is server side
				fn: function (field, value, forced, data) {
					if (!data) throw 'missing options';
					var filter = data.filter || "";
					if (_.isFunction(filter)) filter = filter.call(this, field, value);
					_.each(["value"]);
					var d = new $.Deferred();
					$.ajax({
						url: data.url,
						type: "POST",
						data: {
							field: field.attr('name'),
							value: value,
							filter: filter
						},
						//to keep reference to field
						context: field
					}).done(function (data) {
						//support the response to be a boolean
						if (data === true)
							return d.resolveWith(field, [{ field: field }]);
						if (data === false)
							data = { error: true };
						data.field = field;
						if (data.error) {
							data.message = I.t("errors.valueAlreadyTaken")
							d.rejectWith(field, [data]);
						} else {
							d.resolveWith(field, [data]);
						}
					}).fail(function () {
						d.reject({ error: true, message: data.errorMessage ? data.errorMessage : I.t('errors.validationFailed') });
					});
					return d.promise();
				}
			},

			required: {
				fn: function (field, value, forced) {
					if (!value || !!value.toString().match(/^\s+$/))
						return getError(I.t('errors.emptyValue'), arguments);
					return true;
				}
			},

			integer: {
				fn: function (field, value, forced, options) {
					if (!value) return true;
					if (!/^\d+$/.test(value))
						return getError(I.t('errors.notInteger'), arguments);

					if (options) {
						var intVal = parseInt(value);
						if (_.isNumber(options.min) && intVal < options.min)
							return getError(I.t('errors.minValue', options), arguments);
						if (_.isNumber(options.max) && intVal > options.max)
							return getError(I.t('errors.maxValue', options), arguments);
					}
					return true;
				}
			},

			letters: {
				fn: function (field, value, forced) {
					if (!value) return true;
					if (!/^[a-zA-Z]+$/.test(value))
						return getError(I.t('errors.canContainOnlyLetters'), arguments);
					return true;
				}
			},

			digits: {
				fn: function (field, value, forced) {
					if (!value) return true;
					if (!/^\d+$/.test(value))
						return getError(I.t('errors.canContainOnlyDigits'), arguments);
					return true;
				}
			},

			maxLength: {
				fn: function (field, value, forced, limit) {
					if (!value) return true;
					if (value.length > limit) return getError(I.t('errors.maxLength', { length: limit }), arguments);
					return true;
				}
			},

			minLength: {
				fn: function (field, value, forced, limit) {
					if (!value) return true;
					if (value.length < limit) return getError(I.t('errors.minLength', { length: limit }), arguments);
					return true;
				}
			},

			mustCheck: {
				fn: function (field, value, forced, limit) {
					var element = field.get(0);
					if (!element.checked)
						return getError(I.t('errors.mustBeChecked'), arguments);
					return true;
				}
			}
		},
		GetError: getError
	};

	//instantiable validator
	var Validator = $.Forms.Validation.Validator = function (options) {
		options = $.extend({}, options || {});

		var rules = _.clone($.Forms.Validation.Rules);
		if (options.rules)
			rules = $.extend(rules, options.rules);

		this.rules = rules;
		this.options = options;
		//set marker
		this.marker = new this.markerType();
	};

	_.extend(Validator.prototype, {

		ev: 'blur.validation',

		markerType: DefaultMarker,

		defaults: {
			invalidClass: 'ui-field-invalid',
			message: I.t('errors.invalidValue'),
			params: []
		},

		addRule: function (name, rule) {
			if (!name) throw 'missing name';
			if (!rule || (!_.isFunction(rule) && !_.isObject(rule))) throw 'missing rule definition, or rule is not a function or an object';
			if (_.isFunction(rule)) {
				//normalize rule
				var fn = rule;
				rule = { fn: fn };
			}
			if (!rule.name) { rule.name = name; }
			this.rules[name] = rule;
		},

		//validates a validator definition
		checkValidator: function (name) {
			if (!this.rules[name]) {
				throw 'missing validator definition "' + name + '"';
			}
		},

		//gets a single validator rule
		getValidator: function (o) {
			if (_.isString(o)) {
				this.checkValidator(o);
				return $.extend({ name: o }, this.defaults, this.rules[o]);
			}
			if ($.isPlainObject(o)) {
				if (!o.name) {
					throw 'Validator definition missing [name]. ' + o.name;
				}
				this.checkValidator(o.name);
				return $.extend({}, this.defaults, o, this.rules[o.name]);
			}
			throw 'Invalid validator definition';
		},

		//get actual full validators rules from names
		//this is implemented to permit the definition of validation by string names
		getValidators: function (a) {
			//get validators by name, accepts an array of names
			var v = { direct: [], deferred: [] }, t = this;
			_.each(a, function (val) {
				var validator = t.getValidator(val);
				if (validator.deferred) {
					v.deferred.push(validator);
				} else {
					v.direct.push(validator);
				}
			});
			return v;
		},

		//validate asynchrounously
		//first argument is an array of validation rules to apply (array items can be string or objects)
		validate: function (rules, field, val, forced) {
			//field is a jQuery element, val its value
			//returns a full validation queue, by name
			var queue = this.getValidationChain(rules);
			return this.chain(queue, field, val, forced);
		},

		//validate synchrounously
		validateSync: function (validation, field, val, forced) {
			for (var i = 0, l = validation.length; i < l; i++) {
				var a = validation[i];
				this.checkValidator(a);
				var rule = this.rules[a];
				if (rule.deferred) throw new Error(["rule", a, "is deferred, cannot be used for synchronous validation"].join(" "));
				var re = rule.fn.call(this, field, val, forced);
				if (re !== true) return re;
			}
			return true;
		},

		//gets a chain, or queue of functions to apply for validation
		//each one returns a deferred, use this function in conjunction with Chain
		getValidationChain: function (a) {
			var v = this.getValidators(a), chain = [], that = this;
			//client side validation first
			_.each(v.direct, function (validator) {
				validator.fn = that.makeValidatorDeferred(validator.fn);
				chain.push(validator);
			});
			//ajax calls later
			_.each(v.deferred, function (validator) {
				chain.push(validator);
			});
			return chain;
		},

		//makes a synchronous function asynchrounous,
		//useful to make all deferred look the same (AJAX and not AJAX)
		makeValidatorDeferred: function (f) {
			var validator = this;
			return _.wrap(f, function (func) {
				var args = _.toArray(arguments);
				var dfd = new $.Deferred(),
        result = func.apply(validator.context, args.slice(1, args.length));
				if ((_.isBoolean(result) && result) || (_.isObject(result) && !result.error)) {
					dfd.resolve(result);
				} else {
					dfd.reject(result);
				}
				return dfd.promise();
			});
		},

		//executes a series of deferred that need to be executed one after the other.
		//returns a deferred object that completes when every single deferred completes
		//or at the first that fails. Useful for Ajax validation of fields: we do not want to perform useless Ajax calls if one returns an error first.
		chain: function (queue) {
			//normalize queue
			queue = _.map(queue, function (o) {
				if (_.isFunction(o)) {
					return { fn: o, params: [] };
				}
				return o;
			});
			var i = 0,
      a = [],
      validator = this,
      args = _.toArray(arguments).slice(1, arguments.length),
      callbacks = {
      	//callback for successfull validation
      	success: function (data, textStatus, jqXHR) {
      		if (!data.field) {
      			//restore reference to field, set as context for Ajax Calls callbacks
      			data.field = this;
      		}
      		a.push(data);
      		chain.notify();
      	},
      	//callback for not successfull validation
      	failure: function (data) {
      		//check if it was an ajax call ended improperly
      		if (data.statusText && data.statusText.toLowerCase() != 'ok') {
      			a.push({
      				error: true,
      				message: I.t('errors.failedValidation')
      			});
      			//reject chain
      			chain.reject(a);
      		} else {
      			//ajax call completed properly
      			a.push(data);
      		}
      		chain.reject(a);
      	}
      },
      chain = new $.Deferred().progress(function () {
      	i++;
      	if (i == queue.length) {
      		//every single promise completed properly
      		chain.resolve(a);
      	} else {
      		queue[i].fn.apply(validator.context, args.concat(queue[i].params)).then(callbacks.success, callbacks.failure);
      	}
      });
			if (queue.length) {
				queue[i].fn.apply(validator.context, args.concat(queue[i].params)).then(callbacks.success, callbacks.failure);
			} else {
				//everything is fine
				chain.resolve(a);
			}
			return chain;
		}
	});

	//
	// Harvesters are value getters that implement a common interface with a function: getValues; which returns the form values in form of dictionary
	//
	$.Forms.Harvesting = {};

	// Default harvester: it gets values from input elements by their name property; matching the name in model schema and html name attributes.
	var DomHarvester = $.Forms.Harvesting.DomHarvester = function (dataentry) {
		this.$el = dataentry.$el;
	};
	_.extend(DomHarvester.prototype, {

		getValues: function () {
			//base function that returns values from this form
			//override it for other implementations in derived classes of Form.BaseView or in specific views
			return this.getValuesFromElement(this.$el);
		},

		//simple function that gets values from each input inside an element, in form of dictionary
		//name property is required to get a value from an input, elements with class 'ui-silent' are discarded
		getValuesFromElement: function (el) {
			var o = {}, harvester = this;
			if (!el) el = this.$el;
			el.find(':input').each(function () {
				var input = $(this), name = input.attr('name');
				if (name && !input.hasClass('ui-silent')) {
					o[name] = harvester.getValueFromElement(input);
				}
			});
			return o;
		},

		getValueFromElement: function (input) {
			var name = input.attr('name');
			if (name && !input.hasClass('ui-silent')) {
				var val = null;
				switch (input.attr('type')) {
					case 'checkbox':
						val = input.get(0).checked;
						break;
					default:
						//if datepicker, return the date from jQuery datepicker
						var p = "datepicker";
						if (input.data(p))
							return input[p]('getDate');
						val = input.val();
						if (_.isString(val)) {
							//filter values
							val = this.filterValues(val);
						}
						break;
				}
				return val;
			}
		},

		getFieldValue: function (name, field) {
			if (!name) throw 'missing name';
			return this.getValueFromElement(field ? field : this.$el.find('[name="' + name + '"]'));
		},

		filterValues: function (val) {
			return val;
		}

	});

	//Context harvester: it reads values from an object, by their name; matching the name in model schema and object properties.
	var ContextHarvester = $.Forms.Harvesting.ContextHarvester = function (dataentry) {
		this.dataentry = dataentry;
		if (!dataentry.context || !dataentry.context.dataentryObjectGetter)
			throw new Error("Missing dataentryObjectGetter function in dataentry context. When using a ContextHarvester, is necessary to specify a function that returns the form object.");
	};
	_.extend(ContextHarvester.prototype, {

		getValues: function () {
			//base function that returns values from this context
			return this.getValuesFromContext(this.getContext());
		},

		//returns the object from which to read the values
		getContext: function () {
			var ctx = this.dataentry.context.dataentryObjectGetter();
			return _.isFunction(ctx) ? ctx() : ctx;
		},

		//simple function that gets values from each input inside an element, in form of dictionary
		//name property is required to get a value from an input, elements with class 'ui-silent' are discarded
		getValuesFromContext: function (context) {
			var o = {}, schema = this.dataentry.schema, x;
			for (x in schema) {
				if (context.hasOwnProperty(x)) {
					var val = _.isFunction(context[x]) ? context[x]() : context[x];
					o[x] = val;
				}
			}
			return o;
		},

		getFieldValue: function (name) {
			var context = this.getContext();
			if (context.hasOwnProperty(name))
				return _.isFunction(context[name]) ? context[name]() : context[name];
			return null;
		}
	});

	//
	// DataEntry
	//
	var DataEntry = $.Forms.DataEntry = function (options) {
		options = $.extend({}, this.defaults, options || {});
		this.options = options;
		this.initialize(options);
	};

	_.extend(DataEntry.prototype, {

		string: S,

		defaults: {
			//whether to allow implicit constraints by match with validator names, or not
			allowImplicitConstraints: true,
			//whether to allow implicit formatting by match with validator names, or not
			allowImplicitFormat: true
		},

		harvesterType: DomHarvester,

		initialize: function (options) {
			_.extend(this, _.pick(options, this.baseProperties));
			this.harvester = new this.harvesterType(this);
			this.initializeValidatorAndFormatter().checkElement();
		},

		baseProperties: ["$el", "schema", "context", "events"],

		validatorClass: Validator,

		formatterClass: Formatter,

		/**
     * If the bound element is a form, prevents its submission by default
     * @returns {$.Forms.DataEntry}
     */
		checkElement: function () {
			if (this.$el && /form/i.test(this.$el.get(0).tagName))
				this.$el.on("submit", function (e) {
					e.preventDefault();
				});
			return this;
		},

		/**
     * Initializes the validator and formatter objects of this DataEntry
     * @returns {$.Forms.DataEntry}
     */
		initializeValidatorAndFormatter: function () {
			//override this function to implement custom validators or formatters,
			//or simply override validatorClass or formatterClass properties
			this.validator = new this.validatorClass();
			this.formatter = new this.formatterClass();
			//set the validator context to this
			this.validator.context = this;
			//bag for validation functions
			this.fn = {};
			//apply automatic event handlers if this.$el is defined
			if (this.$el) this.bindEvents();
			return this;
		},

		/**
     * Validates the fields defined in the schema of this DataEntry
     * @param fields {array} [null] optionally, defines the fields to be validated
     * @returns {*} promise
     */
		validate: function (fields) {
			if (fields && _.isFunction(fields)) fields = fields.call(this);
			if (fields && !_.isArray(fields)) throw 'invalid parameter: fields must be an array of strings';
			//if this context has no element, throw exception
			if (!this.$el || !this.$el.length) throw 'missing $el property, or missing element';
			//if this context has no schema, throw exception
			if (!this.schema) throw 'missing schema inside scope';

			var def = new $.Deferred(), chain = [];
			for (var x in this.schema) {
				if (fields && !_.contains(fields, x)) continue;
				chain.push(this.validateField(x));
			}
			var context = this.options.context || this, dataentry = this;
			when(chain, context).done(function () {
				def.resolveWith(this, [dataentry.harvester.getValues()]);
			}).fail(function (data) {
				//focus the first invalid field
				if (data && data.length) {
					var firstInvalid = _.find(data, function (o) { return o.error && o.field; });
					if (firstInvalid && firstInvalid.field)
						firstInvalid.field.trigger("focus");
				}
				def.rejectWith(this, [data]);
			});
			return def.promise();
		},

		getFieldValue: function (name, field) {
			//to not be confused with the harvester get field value: the dataentry is checking if a specific getter function is defined inside the field schema
			var fieldSchema = this.schema[name];
			return fieldSchema.valueGetter ? fieldSchema.valueGetter.call(this.context, field) : this.harvester.getFieldValue(name, field);
		},

		/**
     * Validates the fields defined in the schema of this DataEntry, synchronously (throws exception if any validation rule requires asynchronous operations)
     * @param fields {array} [null] optionally, defines the fields to be validated
     * @returns {boolean}
     */
		validateSync: function (fields) {
			if (fields && _.isFunction(fields)) fields = fields.call(this);
			if (fields && !_.isArray(fields)) throw 'invalid parameter: fields must be an array of strings';
			//if this context has no element, throw exception
			if (!this.$el || !this.$el.length) throw 'missing $el property, or missing element';
			//if this context has no schema, throw exception
			if (!this.schema) throw 'missing schema inside scope';

			var x, valid = true;
			for (x in this.schema) {
				if (fields && !_.contains(fields, x)) continue;
				if (valid)
					valid = this.validateFieldSync(x);
				else
					this.validateFieldSync(x);
			}
			return valid;
		},

		//function to validate specific field, by input name
		//it returns a deferred that completes when validation succeedes, or is rejected when validation fails
		validateField: function (fieldName, options) {
			//set options with default values
			options = $.extend({
				elements: null,
				decorateField: true
			}, options || {});

			if (!fieldName)
				throw 'First argument must be a string equals to the value of name property of an element inside the view.';
			if (!this.schema)
				throw 'Cannot validate fields without schema. Set a schema property for this view (when creating the instance, pass an object with schema).';
			if (!this.schema[fieldName] || !this.schema[fieldName].validation)
				throw this.string.format('Cannot validate field "{0}" because schema object does not contain its definition or its validation definition.', fieldName);

			var dataentry = this, field = options.elements ? options.elements : this.$el.find(this.string.format(':input[name="{0}"]', fieldName));
			if (!field.length) return;
			if (options.decorateField) {
				//mark field neutrum before validation
				this.validator.marker.markFieldNeutrum(field);
			}
			var fieldSchema = this.schema[fieldName], validation = this.getFieldValidationDefinition(fieldSchema.validation), d = new $.Deferred(), chain = [];
			//support multiple fields with the same name
			field.each(function () {
				var f = $(this), value = dataentry.getFieldValue(fieldName, f);

				var promise = null;
				//returns deferred object from validator
				if (options.decorateField) {
					var validator = dataentry.validator;

					promise = dataentry.validator.validate(validation, f, value)
					.done(function () {
						//success
						validator.marker.markFieldValid(f);
					})
					.fail(function (arr) {
						//arguments is an array of responses
						var firstError = _.find(arr, function (o) {
							return !!o.message;
						});
						validator.marker.markFieldInvalid(f, {
							message: firstError.message
						});
					});
				} else {
					promise = dataentry.validator.validate(validation, f, value);
				}
				chain.push(promise);
			});
			when(chain).done(function (data) {
				d.resolve(data);
			}).fail(function (data) {
				d.reject(data);
			});
			return d.promise();
		},

		validateFieldSync: function (fieldName, options) {
			//set options with default values
			options = $.extend({
				elements: null,
				decorateField: true
			}, options || {});

			var validation = this.getFieldValidationDefinition(this.schema[fieldName].validation);

			var field = options.elements ? options.elements : this.$el.find(this.string.format(':input[name="{0}"]', fieldName));
			if (!field.length) return;

			if (options.decorateField) {
				//mark field neutrum before validation
				this.validator.marker.markFieldNeutrum(field);
			}

			var re = this.validator.validateSync(validation, field, this.getFieldValue(fieldName), false);

			if (re === true)
				this.validator.marker.markFieldValid(field);
			else
				this.validator.marker.markFieldInvalid(field, {
					message: re.message
				});

			return re === true
		},

		// returns an array of validations to apply on a field
		// it supports the use of arrays or functions, which return arrays
		getFieldValidationDefinition: function (schema) {
			return _.isFunction(schema) ? schema.apply(this.options.context || this, []) : schema;
		},

		bindEvents: function () {
			var evs = this.delegateEvents();
		},

		//returns a selector for all fields that appear inside the Schema of this Form View/Layout
		getSelectorOfValidatedFields: function () {
			if (!this.schema) return '';
			return _.map(_.keys(this.schema), function (key) {
				return '[name="' + key + '"]';
			}).join(',');
		},

		// delegate events
		delegateEvents: function () {
			var events = this.getEvents(),
      delegateEventSplitter = /^(\S+)\s*(.*)$/;
			this.undelegateEvents();
			for (var key in events) {
				var method = events[key];
				if (!_.isFunction(method)) method = this.fn[method];
				if (!method) continue;

				var match = key.match(delegateEventSplitter);
				var eventName = match[1], selector = match[2];
				method = _.bind(method, this);
				eventName += '.delegate';
				if (selector === '') {
					this.$el.on(eventName, method);
				} else {
					this.$el.on(eventName, selector, method);
				}
			}
			return this;
		},

		// Clears all callbacks previously bound to the view with `delegateEvents`
		undelegateEvents: function () {
			this.$el.off('.delegate');
			return this;
		},

		//
		//generates a dynamic definition of events to bind to elements
		//if passing events option when defining the dataentry, there is a base automatically added
		getEvents: function () {
			var events = this.events || {};
			if (_.isFunction(events)) events = events.call(this);
			//extends events object with validation events
			events = _.extend({}, events,
      this.getDynamicValidationDefinition(),
			this.getDynamicPreFormattingDefinition(),
      this.getSpecialEvents(),
			this.getDynamicConstraintsDefinition());
			return events;
		},

		//gets an "events" object that describes on blur validation events for all input inside the given element
		//which appears inside the schema of this object
		getDynamicValidationDefinition: function () {
			if (!this.schema) return {};
			var o = {}, x, dataentry = this;
			for (x in this.schema) {
				var validationEvent = this.schema[x].validationEvent,
        ev = this.string.format('{0} [name="{1}"]', validationEvent || this.validator.ev, x);
				var functionName = 'validation_' + x;
				o[ev] = functionName;
				this.fn[functionName] = function (e, forced) {
					//to validate only after user interaction
					if (!this.validationActive) return true;
					if (forced == undefined) forced = false;
					var f = $(e.target), name = f.attr('name');
					//mark the field neutrum before validation
					dataentry.validator.marker.markFieldNeutrum(f);

					var fieldSchema = dataentry.schema[name], validation = this.getFieldValidationDefinition(fieldSchema.validation);
					var value = dataentry.getFieldValue(name, f);

					//I can easily pass the whole context as parameter, if needed
					dataentry.validator.validate(validation, f, value, forced).done(function () {
						//validation succeeded
						//apply formatters if applicable
						var name = f.attr('name'), format = dataentry.schema[name].format;
						if (_.isFunction(format)) format = format.call(dataentry.options.context || dataentry, f, value);
						if (format) {
							for (var i = 0, l = format.length; i < l; i++) {
								dataentry.formatter.format(format[i], dataentry, f, value);
							}
						} else if (dataentry.options.allowImplicitFormat) {
							//apply format rules implicitly
							for (var i = 0, l = validation.length; i < l; i++) {
								var name = _.isString(validation[i]) ? validation[i] : validation[i].name;
								if (name && dataentry.formatter.rules[name])
									dataentry.formatter.format(name, dataentry, f, value);
							}
						}
					}).fail(function (data) {
						//validation failed
						for (var i = 0, l = data.length; i < l; i++) {
							if (!data[i] || data[i].error) {
								//mark field invalid on the first validation dataentry failed
								dataentry.validator.marker.markFieldInvalid(f, {
									message: data[i].message
								});
							}
						}
					});
				};
			}
			return o;
		},

		//gets an "events" object that describes on focus pre formatting events for all input inside the given element
		getDynamicPreFormattingDefinition: function () {
			if (!this.schema) return {};
			var o = {}, x;
			for (x in this.schema) {
				//get preformat definition
				var preformat = this.getFieldPreformatRules(x);
				if (preformat && preformat.length) {
					var preformattingEvent = "focus.preformat",
						ev = this.string.format('{0} [name="{1}"]', preformattingEvent, x);
					var functionName = 'preformat_' + x;
					o[ev] = functionName;
					this.fn[functionName] = function (e, forced) {
						var $el = $(e.currentTarget), name = $el.attr("name"), preformat = this.getFieldPreformatRules(name);
						for (var i = 0, l = preformat.length; i < l; i++) {
							var a = preformat[i], rule = $.Forms.Formatting.PreRules[a];
							rule.fn.call(this.context || this, $el, $el.val());
						}
					};
				}
			}
			return o;
		},

		getFieldPreformatRules: function (x) {
			var preformat = this.schema[x].preformat, fieldSchema = this.schema[x];
			if (!preformat && this.options.allowImplicitFormat && !_.isFunction(fieldSchema.validation)) {
				preformat = [];
				var validation = this.getFieldValidationDefinition(fieldSchema.validation);
				for (var i = 0, l = validation.length; i < l; i++) {
					var n = validation[i].name || validation[i];
					if ($.Forms.Formatting.PreRules[n])
						preformat.push(n);
				}
			}
			return preformat;
		},

		getSpecialEvents: function () {
			var activationCallback = function () {
				//activate validation after keypress
				this.validationActive = true;
				return true;
			};
			var changeCallback = function (e) {
				this.validationActive = true;
				//trigger validation
				var name = e.target.name;
				if (this.schema.hasOwnProperty(name)) {
					_.defer(_.bind(function () {
						this.validateField(name, {
							elements: $(e.target)
						});
					}, this));
				}
			};
			return {
				'keypress :input': activationCallback,
				'keydown :input': activationCallback,
				'change select': changeCallback,
				'change input[type="checkbox"]': changeCallback
			};
		},

		//auto binds format functions based on names of validators
		//if the view is instantiated with an option strictFormat true, or if the format was already bound, this function does nothing
		autobindFormat: function () {
			if (!this.schema || this.options.strictFormat || this.options.formatBound) { return; }

			for (var x in this.schema) {
				if (!this.schema[x].format) {
					this.schema[x].format = [];
				}
				var format = this.schema[x].format;
				if (this.schema[x].validation) {
					var validation = this.schema[x].validation;
					if (_.isFunction(validation)) {
						//auto binding of format when validation schema is defined as a function
						//is not implemented yet, so continue
						//it is still possible to specify the format
						continue;
					}

					for (var i = 0, l = validation.length; i < l; i++) {
						//by definition validator entries can be string or objects with name property
						var validatorName = _.isString(validation[i]) ? validation[i] : validation[i].name;
						if (this.formatter.rules.hasOwnProperty(validatorName) && !_.contains(format, validatorName)) {
							format.push(validatorName);
						}
					}
				}
			}
			this.options.formatBound = true;
		},

		//gets an "events" object that describes on keypress constraints for all input inside the given element
		getDynamicConstraintsDefinition: function () {
			if (!this.schema) return {};
			var o = {}, x;
			for (x in this.schema) {
				var ev = this.string.format('{0} [name="{1}"]', 'keypress.constraint', x), functionName = 'constraint_' + x;
				var constraint = this.schema[x].constraint;
				if (constraint) {
					//explicit constraint
					if (_.isFunction(constraint)) constraint = constraint.apply(this.options.context || this, []);
					//constraint must be a single function name
					if (Constraints.hasOwnProperty(constraint)) {
						//set reference in events object
						o[ev] = functionName;
						//set function
						this.fn[functionName] = Constraints[constraint];
					} else {
						throw 'missing constraint definition';
					}
				} else if (this.options.allowImplicitConstraints) {
					//set implicit constraints by validator names
					//check validation schema
					var validation = this.schema[x].validation;
					if (validation) {
						//implicit constraint
						if (_.isFunction(validation)) validation = validation.apply(this, []);
						for (var i = 0, l = validation.length; i < l; i++) {
							var name = _.isString(validation[i]) ? validation[i] : validation[i].name;
							if (Constraints.hasOwnProperty(name)) {
								//set reference in events object
								o[ev] = functionName;
								//set function
								this.fn[functionName] = Constraints[name];
							}
						}
					}
				}
			}
			return o;
		},

		removeValidation: function (sel) {
			if (!sel) sel = this.$el.find(this.getSelectorOfValidatedFields());
			this.validator.marker.markFieldNeutrum(sel);
			return this;
		}
	});

	var methods = {
		init: function (data) {
			if (!data)
				throw new Error("missing options to set up a dataentry");
			if (!data.schema)
				throw new Error("missing schema to set up a dataentry: a validation schema is required to set up a dataentry.");

			var dataentry = new DataEntry({
				$el: this,
				schema: data.schema,
				context: data.context || this
			});
			this.data("dataentry", dataentry);
			return this;
		},

		getValues: function () {
			var de = this.data("dataentry");
			return de ? de.harvester.getValues() : null;
		}
	};

	$.fn.dataentry = function (method) {
		if (!this.length)
			return this;
		if (methods[method])
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		else if (typeof method === "object" || !method)
			return methods.init.apply(this, arguments);
		else
			$.error("Method \"" + method + "\" does not exist on jQuery.dataentry.");
	};

}(jQuery, _);