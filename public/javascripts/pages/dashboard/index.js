$(function () {
	var Models 		= window.Models;
	var Collections	= window.Collections;
	var Views 		= window.Views;
	
	var jobSettings = null;
	var job 		= null;

	
	/* MODEL */
	
	Models.JobSettings = Backbone.Model.extend({
		urlRoot : '/job',
		defaults : {
			googleAnalyticsProfile : null,
			salesforceAnalyticsProfile : null
		},
		
		validation : {
			name : {
				required : true
			},
			googleAnalyticsProfile : {
				required : true
			},
			googleAnalyticsProperties_analyticsProfile : {
				required : true
			},
			googleAnalyticsProperties_dimensions : {
				required : true,
				limit : 7
			},
			googleAnalyticsProperties_metrics : {
				required : true,
				limit : 10
			},
			googleAnalyticsProperties_startDate : {
				required : true
			},
			googleAnalyticsProperties_endDate : {
				required : true
			},
			salesforceAnalyticsProfile : {
				required : true
			}
		}
	});


	/* FORM COMPONENTS */

	Views.Accounts = Views.DependSelect.extend({
		
		initialize : function (options) {
			Views.DependSelect.prototype.initialize.call(this, options);
			this.bind("googleProfile.change", this.loadData);
		},
		
		change : function (profileId) {
			var dependSelects = this.options.dependSelects;
			_.each(dependSelects, function (select) {
				select.trigger(this.options._id + '.change', profileId, this.$el.find('select').val());
			}, this);
		},
		
		loadData : function (profileId) {
			var self = this;
			this.collection.fetch({ 
				url : '/google/profile/'+ profileId + '/accounts',
				success : function () {
					self.change(profileId);
				}
			});
		},
		
		render : function () {
			return Views.DependSelect.prototype.render.call(this);
		}
	});
	
	Views.Properties = Views.DependSelect.extend({
		
		initialize : function (options) {
			Views.DependSelect.prototype.initialize.call(this, options);
			this.bind("account.change", this.loadData);
		},
		
		change : function (profileId, accountId) {
			var dependSelects = this.options.dependSelects;
			_.each(dependSelects, function (select) {
				select.trigger(this.options._id + '.change',  profileId, accountId, this.$el.find('select').val());
			}, this);
		},
		
		loadData : function (profileId, accountId) {
			var self = this;
			this.collection.fetch({ 
				url : '/google/profile/'+ profileId + '/properties/' + accountId,
				success : function () {
					self.change(profileId, accountId);
				}
			});
		},
		
		render : function () {
			return Views.DependSelect.prototype.render.call(this);
		}
	});
	
	Views.AnalyticsProfiles = Views.Select.extend({
		
		initialize : function (options) {
			Views.Select.prototype.initialize.call(this, options);
			this.bind("property.change", this.loadData);
			
		},
		
		loadData : function (profileId, accountId, propertyId) {
			this.collection.fetch({ url : '/google/profile/'+ profileId + '/profiles/' + accountId + "/" + propertyId });
		},
		
		render : function () {
			return Views.Select.prototype.render.call(this);
		}
	});
	
	Views.Keys = Views.DependSelect.extend({
		
		initialize : function (options) {
			Views.DependSelect.prototype.initialize.call(this, options);
			this.bind("googleProfile.change", this.loadData);
			this.collection.unbind('all', this.render);
			this.collection.bind('sync', this.render);
		},
		
		loadData : function (profileId) {
			this.collection.fetch({ 
				url : '/google/profile/'+ profileId + '/' + this.options.keyName
			});
		},
		
		render : function () {
			
			Views.DependSelect.prototype.render.call(this);
			
			this.$el.find('select').select2({
				placeholder: "Select " + this.options.title.toLowerCase(),
				templateResult : function (state) {
					if (!state.id) return state.text;
					var $state = $(
						'<span>' + state.text + '</span><i class="source-value">' + state.element.value + '</i>'
					);
					return $state;
				} 
			})
			.on('change', null, this, function (event) {
				
				var self = event.data;
				var values = $(event.currentTarget).val() || [];
				var data = _.filter(self.collection.toJSON(), function (item) { return values.indexOf(item.id) !== -1; });
				
				self.$el.trigger('change:keys', { keys: data, id: self.options.keyName });
			});
			
			return this;
		}
	});
	
	Views.Sorter = Views.Select.extend({
		
		metrics : null,
		
		dimensions : null,
		
		initialize : function (options) {
			
			Views.Select.prototype.initialize.call(this, options);
			
			_.bindAll(this, 'render', 'update');
			
			this.collection.bind('reset', this.update);
			
			_.each(this.options.listenSelects, function (select) {
				select.$el.on('change:keys', null, this, function (event, data) { 
					
					var self = event.data;
					
					if (data.id === 'metrics') self.metrics = data.keys;
					else self.dimensions = data.keys;
					
					self.collection.reset(_.union(self.metrics, self.dimensions));
					
				});
			}, this);
		},
		
		update : function () {
			this.$el.find('select').select2('data', this.collection.toJSON());
		},
		
		render : function () {
			
			Views.Select.prototype.render.call(this);
			
			this.$el.find('select').select2({
				placeholder: "Select " + this.options.title.toLowerCase(),
				templateResult : function (state) {
					if (!state.id) return state.text;
					var $state = $(
						'<span>' + state.text + '</span><i class="source-value">' + state.element.value + '</i>'
					);
					return $state;
				} 
			});
			
			return this;
		}
	});
	
	Views.Scheduler = Backbone.View.extend({
		
		className : 'scheduler form-group job-settings__scheduler col-xs-12',
		
		attributes : {
			role : 'tabpanel'
		},
		
		template : _.template($("#scheduler").html()),
		
		initialize : function () {
			_.bindAll(this, 'render');
			this.render();
		},
		
		render : function () {
			this.$el.html(this.template());
			
			this.$el.find('.scheduler__time')
				.datetimepicker({
					defaultDate: moment(),
					icons: {
						time : "fa fa-clock-o",
		                date : "fa fa-calendar",
		                up   : "fa fa-arrow-up",
		                down : "fa fa-arrow-down",
		                previous: 'fa fa-chevron-left',
		                next: 'fa fa-chevron-right',
		                today: 'fa fa-crosshairs',
		                clear: 'fa fa-trash'
		            }
				});
			
			return this;
		}
		
	});


	/* POPUP */

	Views.JobPopup = Views.Modal.extend({
		
		initialize : function (options) {
			Views.Modal.prototype.initialize.call(this, options);
			_.bindAll(this, 'render', 'successSaving', 'errorSaving');
			Backbone.Validation.bind(this);
		},
		
		bindings: {
			'[name=name]': {
				observe: 'name',
				setOptions: {
					validate: true
				}
			},
			'[name=googleAnalyticsProfile]': {
				observe: 'googleAnalyticsProfile',
				setOptions: {
					validate: true
				}
			},
			'[name=googleAnalyticsProperties_analyticsProfile]': {
				observe: 'googleAnalyticsProperties_analyticsProfile',
				setOptions: {
					validate: true
				}
			},
			'[name=googleAnalyticsProperties_dimensions]': {
				observe: 'googleAnalyticsProperties_dimensions',
				setOptions: {
					validate: true
				}
			},
			'[name=googleAnalyticsProperties_metrics]': {
				observe: 'googleAnalyticsProperties_metrics',
				setOptions: {
					validate: true
				}
			},
			'[name=googleAnalyticsProperties_startDate]': {
				observe: 'googleAnalyticsProperties_startDate',
				setOptions: {
					validate: true
				}
			},
			'[name=googleAnalyticsProperties_endDate]': {
				observe: 'googleAnalyticsProperties_endDate',
				setOptions: {
					validate: true
				}
			},
			'[name=salesforceAnalyticsProfile]': {
				observe: 'salesforceAnalyticsProfile',
				setOptions: {
					validate: true
				}
			}
		},


	    successSaving : function (model, response) {
	    	this.model.trigger('change');
			//Collections.Jobs.add(this.model, { at: 0 });
	    	Collections.Jobs.fetch()
			$('.content__main').prepend(new Views.Alert({
				typeAlert : 'success',
				title : 'Success',
				text  : 'Job is created'
			}).el);
		},
		
		errorSaving : function (model, response) {
			$('.content__main').prepend(new Views.Alert({
				typeAlert : 'danger',
				title : 'Error',
				text  : 'Job is not created'
			}).el);
		},
		
		format : function (data) {

			var type = $('.job-settings__scheduler .nav li.active a').attr('href').replace('#', ''),
				startTime;
			
			switch (type) {
				case "delayed": 
					data.startTime = !!(data.delayStart) ? moment(data.delayStart).valueOf() : null;
					break;
				case "repeated": 
					data.startTime = !!(data.repeatStart) ? moment(data.repeatStart).valueOf() : null;
					break;
				default : 
					data.startTime = null; 
					break;
			}
			
			return data;
/*			return {
				name : data.name.trim(),
	    		googleAnalyticsProfile : Number(data.googleProfile),
				salesforceAnalyticsProfile : Number(data.salesforceProfile),
				googleAnalyticsProperties : {
					analyticsProfile : data["googleAnalyticsProperties_analyticsProfile"],
					dimensions : data["googleAnalyticsProperties_dimensions"],
					metrics : data["googleAnalyticsProperties_metrics"],
					startDate : data["googleAnalyticsProperties_startDate"],
					endDate : data["googleAnalyticsProperties_endDate"],
					sort : data["googleAnalyticsProperties_sorting"] || ""
				},
				'startTime' : startTime,
				repeatPeriod : (data.type === 'repeated') ? data.period : null,
				includePreviousData : (data.type === 'repeated') ? !!(data.previousData) : null
			}*/
		},
		
		save : function () {
			this.model.set(this.format($('.job-settings__form').serializeObject()), { silent : true });
	    	
	    	if (this.model.isValid(true)) {
//	    		if (this.model.hasChanged() || this.model.isNew()) {
	    			this.model.save(null, { success : this.successSaving, error : this.errorSaving });
	    			Views.Modal.prototype.save.call(this);
//	    		}
	    	}
		},
		
		render : function () {
			Views.Modal.prototype.render.call(this);
			this.$el.find('.modal-body').append(new Views.JobForm().el);

			this.stickit();
			formState(this);

			return this;
		}
	});
	
	Views.JobForm = Backbone.View.extend({
		
		tagName : 'form',
		
		className : 'job-settings__form row',
		
		initialize : function (options) {
			
			_.bindAll(this, 'render', 'parseInputDate');
			
			this.options = options;
			this.render();
		},
		
		parseRelativeDate : function (relativeDate) {
			switch (relativeDate) {
				case 'today' : return moment()
				case 'yesterday' : return moment().subtract(1, 'day');
				default : return moment().subtract(Number(relativeDate.replace("days ago", "").trim()), 'days');
			}
		},
		
		parseInputDate : function (inputDate) {
			var relativeDatePattern = /today|yesterday|[0-9]+\s+(days ago)/,
				resultDate;
			
			if (moment.isMoment(inputDate) || inputDate instanceof Date) {
                resultDate = moment(inputDate);
            } else {
            	var relativeDate = inputDate.match(relativeDatePattern),
            		parseDate = null;
            	
            	if (relativeDate !== null) parseDate = this.parseRelativeDate(inputDate.match(relativeDatePattern)[0]);
            	else parseDate = moment();
            	
            	resultDate = moment(parseDate, "YYYY-MM-DD");
            }
			
			return resultDate;
		},
		
		render : function () {
			
			this.JobNameView = new Views.Input({
				_id 		 	: 'name',
				title 	 		: 'Job name',
				type			: 'text',
				classes			: 'job-settings__name col-xs-12',
			});
			
			this.EndDateView = new Views.Input({
				_id 		 	: 'googleAnalyticsProperties_endDate',
				title 	 		: 'End date',
				type			: 'text',
				classes			: 'job-settings__end-date col-xs-6',
			});
			
			this.StartDateView = new Views.Input({
				_id 		 	: 'googleAnalyticsProperties_startDate',
				title 	 		: 'Start date',
				type			: 'text',
				classes			: 'job-settings__start-date col-xs-6',
			});
			
			this.MetricsView = new Views.Keys({
				_id 		 	: 'googleAnalyticsProperties_metrics',
				title 	 		: 'Metrics',
				classes			: 'job-settings__metrics col-xs-12',
				multiple 		: true,
				groupped 		: true,
				groupField		: 'group',
				keyName			: 'metrics',
				collection 		: new Backbone.Collection()
			});
			
			this.DimensionsView = new Views.Keys({
				_id 		 	: 'googleAnalyticsProperties_dimensions',
				title 	 		: 'Dimensions',
				classes			: 'job-settings__dimensions col-xs-12',
				multiple 		: true,
				groupped 		: true,
				groupField		: 'group',
				keyName			: 'dimensions',
				collection 		: new Backbone.Collection()
			});
			
			this.AnalyticsProfilesView = new Views.AnalyticsProfiles({
				_id 		 	: 'googleAnalyticsProperties_analyticsProfile',
				title 	 		: 'Analytics Profile',
				classes			: 'job-settings__analytics-profile col-xs-4',
				multiple 		: false,
				groupped 		: false,
				collection 		: new Backbone.Collection()
			});
			
			this.PropertiesView = new Views.Properties({
				_id 		 	: 'property',
				title 	 		: 'Property',
				classes			: 'job-settings__property col-xs-4',
				multiple 		: false,
				groupped 		: false,
				collection 		: new Backbone.Collection(),
				dependSelects	: [this.AnalyticsProfilesView]
			});

			this.AccountsView = new Views.Accounts({
				_id 		 	: 'account',
				title 	 		: 'Account',
				classes			: 'job-settings__account col-xs-4',
				multiple 		: false,
				groupped 		: false,
				collection 		: new Backbone.Collection(),
				dependSelects	: [this.PropertiesView]
			});
			
			this.GoogleProfilesView = new Views.DependSelect({
				_id 		 	: 'googleProfile',
				title 	 		: 'Google Profile',
				classes			: 'job-settings__google-profile col-xs-12',
				multiple 		: false,
				groupped 		: false,
				collection 		: Collections.GoogleProfiles,
				dependSelects	: [this.AccountsView, this.MetricsView, this.DimensionsView],
				changeAfterInit : true
			});
			
			this.SalesforceProfilesView = new Views.Select({
				_id 		 	: 'salesforceProfile',
				title 	 		: 'Salesforce Profile',
				classes			: 'job-settings__salesforce-profile col-xs-12',
				multiple 		: false,
				groupped 		: false,
				collection 		: Collections.SalesforceProfiles,
			});
			
			this.Sorter = new Views.Sorter({
				_id 		 	: 'googleAnalyticsProperties_sorting',
				title 	 		: 'Sorting',
				classes			: 'job-settings__sorting col-xs-12',
				multiple 		: true,
				groupped 		: false,
				listenSelects	: [this.MetricsView, this.DimensionsView],
				collection 		: new Backbone.Collection()
			});
			
			this.Scheduler = new Views.Scheduler();
			
			$(this.StartDateView.el).find('input')
				.datetimepicker({
					defaultDate: moment(),
					format: "YYYY-MM-DD",
					parseInputDate : this.parseInputDate,
					keepInvalid: true,
					keyBinds : {
						t : null
					},
					icons: {
						time : "fa fa-clock-o",
		                date : "fa fa-calendar",
		                up   : "fa fa-arrow-up",
		                down : "fa fa-arrow-down",
		                previous: 'fa fa-chevron-left',
		                next: 'fa fa-chevron-right',
		                today: 'fa fa-crosshairs',
		                clear: 'fa fa-trash'
		            }
				});
			
			$(this.EndDateView.el).find('input')
				.datetimepicker({
					defaultDate: moment(),
					format: "YYYY-MM-DD",
					parseInputDate : this.parseInputDate,
					keepInvalid: true,
					keyBinds : {
						t : null
					},
					icons: {
		                time : "fa fa-clock-o",
		                date : "fa fa-calendar",
		                up   : "fa fa-arrow-up",
		                down : "fa fa-arrow-down",
		                previous: 'fa fa-chevron-left',
		                next: 'fa fa-chevron-right',
		                today: 'fa fa-crosshairs',
		                clear: 'fa fa-trash'
		            }
				});
			
			this.$el.append(this.JobNameView.el);
			this.$el.append(this.GoogleProfilesView.el);
			this.$el.append(this.AccountsView.el);
			this.$el.append(this.PropertiesView.el);
			this.$el.append(this.AnalyticsProfilesView.el);
			this.$el.append(this.MetricsView.el);
			this.$el.append(this.DimensionsView.el);
			this.$el.append(this.StartDateView.el);
			this.$el.append(this.EndDateView.el);
			this.$el.append(this.Sorter.el);
			this.$el.append(this.SalesforceProfilesView.el);
			this.$el.append(this.Scheduler.el);
			
			return this;
		}
		
	});




	/* BUTTONS */

	Views.AddJobButton = Backbone.View.extend({
		
		className : 'button button_type_add btn btn-primary',
		
		tagName : 'button',
		
		events: {
			'click' : 'openSettings',
		},
		
		initialize : function () {
			_.bindAll(this, 'render');
			this.render();
		},
		
		popup : null,
		
		openSettings : function () {
			
			if (Collections.GoogleProfiles.isEmpty() || Collections.SalesforceProfiles.isEmpty()) {
				BootstrapDialog.alert({
		            title: 'Error',
		            message: "You don't have google or salesforce profiles",
		            type: BootstrapDialog.TYPE_DANGER,
		        });
				return;
			}
			
			job = new Models.JobSettings();
			
			this.popup = new Views.JobPopup({ 
					id   	: 'job-settings',
					title 	: 'Create job',
					classes : 'job-settings',
					model 	: job
			});
			
			this.popup.show();
			
			return this;
		},
		
		render : function () {
			this.$el.html("Add job");
		}
	});
	
	Views.RefreshButton = Backbone.View.extend({
		className : 'button button_type_refresh btn btn-primary',
		tagName : 'button',
		popup : null,
		events : {'click': 'refresh'},
		initialize : function () {
			_.bindAll(this, 'render');
			this.render();
		},
		refresh : function() {
			Collections.Jobs.fetch()
		},
		render : function () {
			this.$el.html('<i class="fa fa-refresh"></i>');
		}
	});



	/* JOBS TABLE */

	Views.JobRow = Backbone.View.extend({
		
		tagName : 'tr',
		
		className : 'job table__row',
		
		model : Models.Job,
		
		template : _.template($("#job").html()),
		
		initialize : function () {
			_.bindAll(this, 'render');
			this.render();
		},
		
		render : function () {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});
	
	Views.Jobs = Views.Table.extend({
		
		headers : [ "ID", "Name", "Google Profile", "Salesforce Profile", "Start date", "Status", "User" ],
		
		render : function () {
			
			Views.Table.prototype.render.call(this);
			
			this.collection.each(function (job) {
				$(this.$el.find('thead th')[5]).addClass('table_align_center');

				this.$el
					.find('tbody')
					.append(new Views.JobRow({ model: job }).el);
			}, this);
			
			return this;
		}
	});
	
	var jobs = new Views.Jobs({ 
		collection  : Collections.Jobs,
		classes 	: 'jobs'
	});
	
	var addJob = new Views.AddJobButton();
	var refreshButton = new Views.RefreshButton();
	
	$('.content__main').append(refreshButton.el).append(addJob.el).append(jobs.el);
	
	
});