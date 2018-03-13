const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const utils = require('loopback-datasource-juggler/lib/utils');
const implicitComposite = require('./lib/implicit-composite');

const _create = DataAccessObject.create;
DataAccessObject.create = function (data, options, cb) {
  var self = this;

  if (!cb){
    cb = options;
  }

  cb = cb || utils.createPromiseCallback();

  //Atul : relation is object that fetches all child relation of model for which data is being posted.
  var relations = {};
  for (var r in self.relations) {
      if (self.relations[r].type === 'hasMany' || self.relations[r].type === 'hasOne' || self.relations[r].type === 'belongsTo') {
          if (self.relations[r].modelTo) {
              relations[r] = self.relations[r].modelTo.modelName;
          }
      }
  }
  // Atul : childData holds nested related data of model. only one level nesting is supported
  var childData = false;
  for (var relName in relations) {
      if (!data[relName])
          continue;
      if (typeof data[relName] == 'function')
          continue;
      if (!childData)
          childData = {};
      childData[relName] = data[relName];
      delete data[relName];
  }

  // Atul : if nested data exist, fall in to this if and create records recursively for nested child
  if (childData) {
    var m = self.modelName;
    implicitComposite.create(self, data, childData, relations, options, cb);
    return cb.promise;
  }

  return _create.apply(this, [].slice.call(arguments));
}



