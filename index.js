const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const utils = require('loopback-datasource-juggler/lib/utils');
const implicitComposite = require('./lib/implicit-composite');
const explicitComposite = require('./lib/explicit-composite');

const _create = DataAccessObject.create;
DataAccessObject.create = function (data, options, cb) {
  var self = this;
  var settings = self.definition.settings;
  // Atul : If compositeModel is being posted.. call compositePost() helper
  if (settings.compositeModels) {
      explicitComposite.compositePost(self, data, options, cb);
      return data;
  }
  
  var d = implicitComposite.getChildDataAndRelations(self, data);
  // Atul : if nested data exist, fall in to this if and create records recursively for nested child
  if ( d.childData ){
    if(!cb && typeof options === 'function'){
      cb = options;
      options = {};
    }
    cb = cb || utils.createPromiseCallback();
    implicitComposite.create(self, data, d.childData, d.relations, options, cb);
    return cb.promise;
  }

  // call original create function
  return _create.apply(this, [].slice.call(arguments));
}

const _upsert = DataAccessObject.upsert;
DataAccessObject.updateOrCreate = DataAccessObject.upsert = function upsert(data, options, cb) {
  var self=this;
  var d = implicitComposite.getChildDataAndRelations(self, data);
  // Atul : if nested data exist, fall in to this if and create records recursively for nested child
  if ( d.childData ){
    if(!cb && typeof options === 'function'){
      cb = options;
      options = {};
    }
    cb = cb || utils.createPromiseCallback();
    implicitComposite.upsert(self, data, d.childData, d.relations, options, cb);
    return cb.promise;
  }

  // call original create function
  return _upsert.apply(this, [].slice.call(arguments));
}

const _updateAttributes = DataAccessObject.prototype.updateAttributes;
DataAccessObject.prototype.updateAttributes = function updateAttributes(data, options, cb) {
  var self=this;

  var d = implicitComposite.getChildDataAndRelations(self, data);
  // Atul : if nested data exist, fall in to this if and create records recursively for nested child
  if ( d.childData ){
    implicitComposite.updateAttributes(self, data, d.childData, d.relations, options, cb);
    return cb.promise;
  }  

  return _updateAttributes.apply(this, [].slice.call(arguments));
}




