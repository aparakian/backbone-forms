;(function() {
    
    var Form = Backbone.Form,
        Base = Form.editors.Base,
        createTemplate = Form.helpers.createTemplate
        exports = {};
    
    /**
     * Additional editors that depend on jQuery UI
     */
    exports.Date = Base.extend({

        className: 'bbf-date',

        render: function() {
            var el = $(this.el);

            el.html('<input>');

            var input = $('input', el);

            input.datepicker({
                dateFormat: 'dd/mm/yy',
                showButtonPanel: true
            });

            input.datepicker('setDate', this.value);

            return this;
        },

        /**
        * @return {Date}   Selected date
        */
        getValue: function() {
            var input = $('input', this.el),
                date = input.datepicker('getDate');

            return date;
        }

    });



    exports.DateTime = exports.Date.extend({

        className: 'bbf-datetime',

        template: createTemplate('<select>{{hours}}</select> : <select>{{mins}}</select>'),

        render: function() {
            function pad(n) {
                return n < 10 ? '0' + n : n
            }

            //Render the date element first
            exports.Date.prototype.render.call(this);

            //Setup hour options
            var hours = _.range(0, 24),
                hoursOptions = [];

            _.each(hours, function(hour) {
                hoursOptions.push('<option value="'+hour+'">' + pad(hour) + '</option>');
            });

            //Setup minute options
            var mins = _.range(0, 60, 15),
                minsOptions = [];

            _.each(mins, function(min) {
                minsOptions.push('<option value="'+min+'">' + pad(min) + '</option>');
            });

            //Render time selects
            $(this.el).append(this.template({
                hours: hoursOptions.join(),
                mins: minsOptions.join()
            }));

            //Store references to selects
            this.$hours = $('select:eq(0)', this.el);
            this.$mins = $('select:eq(1)', this.el);

            //Set time
            var time = this.value;
            this.$hours.val(time.getHours());
            this.$mins.val(time.getMinutes());

            return this;
        },

        /**
        * @return {Date}   Selected datetime
        */
        getValue: function() {
            var input = $('input', this.el),
                date = input.datepicker('getDate');

            date.setHours(this.$hours.val());
            date.setMinutes(this.$mins.val());
            date.setMilliseconds(0);

            return date;
        }

    });


    exports.List = Base.extend({

        className: 'bbf-list',

        //Note: The extra div around the <ul> is used to limit the drag area
        template: createTemplate('\
            <ul></ul>\
            <div class="cf"><button class="bbf-list-add">Add</div>\
        '),

        itemTemplate: createTemplate('\
            <li class="cf">\
                <span class="bbf-list-text">{{text}}</span>\
                <div class="bbf-list-actions">\
                    <button class="bbf-list-edit">Edit</button>\
                    <button class="bbf-list-del">Delete</button>\
                </div>\
            </li>\
        '),
        
        editorTemplate: createTemplate('\
            <div class="bbf-field">\
                <div class="bbf-list-editor"></div>\
            </div>\
        '),

        events: {
            'click .bbf-list-add':   'addNewItem',
            'click .bbf-list-edit':  'editItem',
            'click .bbf-list-del':   'deleteItem'
        },

        initialize: function(options) {
            Base.prototype.initialize.call(this, options);

            if (!this.schema) throw "Missing required option 'schema'";
            
            this.schema.listType = this.schema.listType || 'Text';
            
            if (this.schema.listType == 'NestedModel' && !this.schema.model)
                throw "Missing required option 'schema.model'";
        },

        render: function() {
            //Main element
            $(this.el).html(this.template());

            //Create list
            var self = this,
                data = this.value || [],
                schema = this.schema,
                itemToString = this.itemToString,
                itemTemplate = this.itemTemplate,
                listEl = $('ul', this.el);

            _.each(data, function(itemData) {     
                var text = itemToString.call(self, itemData);

                //Create DOM element
                var li = $(itemTemplate({ text: text }));

                //Attach data
                $.data(li[0], 'data', itemData);

                listEl.append(li);
            });

            //Make sortable
            listEl.sortable({
                axis: 'y',
                cursor: 'move',
                containment: 'parent'
            });

            //jQuery UI buttonize
            $('button.bbf-list-add', this.el).button({
                text: false,
                icons: { primary: 'ui-icon-plus' }
            });
            $('button.bbf-list-edit', this.el).button({
                text: false,
                icons: { primary: 'ui-icon-pencil' }
            });
            $('button.bbf-list-del', this.el).button({
                text: false,
                icons: { primary: 'ui-icon-trash' }
            });

            return this;
        },

        /**
         * Formats an item for display in the list
         * For example objects, dates etc. can have a custom
         * itemToString method which says how it should be formatted.
         */
        itemToString: function(data) {
            if (!data) return data;
            
            var schema = this.schema;
            
            //If there's a specified toString use that
            if (schema.itemToString)
                return schema.itemToString(data);
            
            //Otherwise check if it's NestedModel with it's own toString() method
            if (this.schema.listType == 'NestedModel') {
                var model = new (this.schema.model)(data);
                
                return model.toString();
            }
            
            //Last resort, just return the data as is
            return data;
        },

        /**
         * Add a new item to the list if it is completed in the editor
         */
        addNewItem: function(event) {            
            var self = this;

            this.openEditor(null, function(value) {
                console.warn(value)
                var text = self.itemToString(value);

                //Create DOM element
                var li = $(self.itemTemplate({ text: text }));

                //Store data
                $.data(li[0], 'data', value);

                $('ul', self.el).append(li);

                //jQuery UI buttonize
                $('button.bbf-list-edit', this.el).button({
                    text: false,
                    icons: { primary: 'ui-icon-pencil' }
                });
                $('button.bbf-list-del', this.el).button({
                    text: false,
                    icons: { primary: 'ui-icon-trash' }
                });
            });
        },

        /**
         * Edit an existing item in the list
         */
        editItem: function(event) {
            event.preventDefault()
            
            var self = this,
                li = $(event.target).closest('li'),
                originalValue = $.data(li[0], 'data');

            this.openEditor(originalValue, function(newValue) {
                //Update display
                $('.text', li).html(self.itemToString(newValue));

                //Store data
                $.data(li[0], 'data', newValue);
            });
        },

        deleteItem: function(event) {
            var li = $(event.target).closest('li');

            li.remove();
        },

        /**
         * Opens the sub editor dialog
         * @param {Mixed}       Data (if editing existing list item, null otherwise)
         * @param {Function}    Save callback. receives: value
         */
        openEditor: function(data, callback) {
            var self = this,
                schema = this.schema,
                listType = schema.listType || 'Text';

            var editor = Form.helpers.createEditor(listType, {
                key: '',
                schema: schema,
                value: data
            }).render();
            
            var container = $(this.editorTemplate());
            $('.bbf-list-editor', container).html(editor.el);

            var close = function() {
                container.dialog('close');

                editor.remove();
                container.remove();
            };

            $(container).dialog({
                resizable:  false,
                modal:      true,
                width:      500,
                title:      data ? 'Edit item' : 'New item',
                buttons: {
                    'OK': function() {
                        callback(editor.getValue());
                        close();
                    }, 
                    'Cancel': close
                }
            });
        },

        getValue: function() {
            var data = [];

            $('li', this.el).each(function(index, li) {
                data.push($.data(li, 'data'));
            });

            return data;
        }

    });


    //Exports
    _.extend(Form.editors, exports);
    
})();
