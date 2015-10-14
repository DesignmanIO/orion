var initSelect = function(template, dataContext, schema, options) {
  var element = template.$('select').selectize({
    valueField: '_id',
    labelField: _.isArray(options.titleField) ? options.titleField[0] : options.titleField,
    items: _.isArray(dataContext.value) ? dataContext.value : [dataContext.value],
    searchField: schema.orion.fields,
    sortField: _.union(
      (_.isArray(schema.orion.sortFields) ?
          _.map(schema.orion.sortFields, function(sort_field) { return { field: sort_field, direction: 'asc' }; }) :
          _.map(schema.orion.sortFields, function(sort_order, sort_field) { return { field: sort_field, direction: sort_order }; })),
      [{field: '$score'}]
    ),
    plugins: ['remove_button'],
    createFilter: schema.orion.createFilter,
    create: schema.orion.create && function(input, callback) {
      schema.orion.create(input, function(value) {
        callback(value);
        setValue(value);
      });
    },
    options: options,
    render: schema.orion.render,
  });
  var currentValue = element.val();
  element[0].selectize.clearOptions();
  element[0].selectize.load(function(callback) {
    callback(options);
    element[0].selectize.setValue(currentValue);
  });
  var setValue = function(value) {
    if (element[0].selectize.settings.mode == 'multi') {
      element[0].selectize.setTextboxValue('');
      element[0].selectize.addItem(value);
    } else {
      element[0].selectize.setValue(value);
    }
  };
};

var onRendered = function() {
  var template = this;
  template.autorun(function() {
    RouterLayer.isActiveRoute('admin');
    template.$('select')[0].selectize && template.$('select')[0].selectize.destroy();
  });
  template.autorun(function () {
    var dataContext = Template.currentData();
    var schema = AutoForm.getSchemaForField(dataContext.name);
    var subscription = template.subscribe(schema.orion.publicationName);
    if (subscription.ready()) {
      var filter = schema.orion.filter(Meteor.userId());
      var options = schema.orion.collection.find(filter).map(function(item) {
        var newItem = { _id: item._id };
        for (var i = 0; i < schema.orion.fields.length; i++) {
          var field = schema.orion.fields[i];
          newItem[field] = orion.helpers.searchObjectWithDots(item, field, true);
        };
        return newItem;
      });
      initSelect(template, dataContext, schema, options)
    }
  });
}

var onDestroyed = function() {
  this.$('select')[0].selectize && this.$('select')[0].selectize.destroy();
};

ReactiveTemplates.onRendered('attribute.hasMany', onRendered);
ReactiveTemplates.onRendered('attribute.hasOne', onRendered);
ReactiveTemplates.onDestroyed('attribute.hasMany', onDestroyed);
ReactiveTemplates.onDestroyed('attribute.hasOne', onDestroyed);

ReactiveTemplates.helpers('attributePreview.hasMany', {
  val: function() {
    var count = this.value.length;
    if (!this.schema) {
      return '';
    }
    if (count != 1) {
      return count + ' ' + this.schema.orion.pluralName;
    }
    return count + ' ' + this.schema.orion.singularName;
  }
});

ReactiveTemplates.onRendered('attributePreview.hasOne', function() {
  this.subscribe(this.data.schema.orion.publicationName + '_row', this.data.value);
});

ReactiveTemplates.helpers('attributePreview.hasOne', {
  val: function () {
    var item = this.schema && this.schema.orion.collection.findOne(this.value);
    return item && orion.helpers.searchObjectWithDots(item, this.schema.orion.titleField, true);
  }
});
