/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const daoutils = require('loopback-datasource-juggler/lib/utils');
const implicitComposite = require('./implicit-composite');
const explicitComposite = require('./explicit-composite');
const utils = require('./util');


var newProperties = {
  properties: {
    'CompositeTransaction': {
      'type': 'boolean'
    },
    'compositeModels': {
      'type': 'object'
    }
  }
};

module.exports = function (app) {
  app.addSettingsToModelDefinition(newProperties);

  const _find = DataAccessObject.find;
  DataAccessObject.find = function (query, options, cb) {
    var self = this;
    var settings = self.definition.settings;
    // Atul : If compositeModel is being posted.. call compositePost() helper
    if (settings.compositeModels) {
      cb = cb || daoutils.createPromiseCallback();
      explicitComposite.compositeGet(self, query, options, cb);
      return cb.promise;
      // return data;
    }
    // call original create function
    return _find.apply(this, [].slice.call(arguments));
  };


  const _create = DataAccessObject.create;
  DataAccessObject.create = function (data, options, cb) {
    var self = this;
    var settings = self.definition.settings;
    // Atul : If compositeModel is being posted.. call compositePost() helper
    if (settings.compositeModels) {
      explicitComposite.execute(self, data, options, cb);
      return data;
    }

    var d = utils.getChildDataAndRelations(self, data);
    // Atul : if nested data exist, fall in to this if and create records recursively for nested child
    if (d.childData) {
      if (!cb && typeof options === 'function') {
        cb = options;
        options = {};
      }
      cb = cb || daoutils.createPromiseCallback();
      implicitComposite.execute(self, 'post', data, d.childData, d.relations, options, cb);
      return cb.promise;
    }

    // call original create function
    return _create.apply(this, [].slice.call(arguments));
  };

  const _replaceOrCreate = DataAccessObject.replaceOrCreate;
  DataAccessObject.replaceOrCreate = function replaceOrCreate(data, options, cb) {
    var self = this;
    var d = utils.getChildDataAndRelations(self, data);
    // Atul : if nested data exist, fall in to this if and create records recursively for nested child
    if (d.childData) {
      if (!cb && typeof options === 'function') {
        cb = options;
        options = {};
      }
      cb = cb || daoutils.createPromiseCallback();
      implicitComposite.execute(self, 'put', data, d.childData, d.relations, options, cb);
      return cb.promise;
    }

    // call original create function
    return _replaceOrCreate.apply(this, [].slice.call(arguments));
  };

  const _replaceById = DataAccessObject.replaceById;
  DataAccessObject.replaceById = function replaceById(id, data, options, cb) {
    var self = this;

    var d = utils.getChildDataAndRelations(self, data);
    // Atul : if nested data exist, fall in to this if and create records recursively for nested child
    if (d.childData) {
      if (!cb && typeof options === 'function') {
        cb = options;
        options = {};
      }
      cb = cb || daoutils.createPromiseCallback();
      implicitComposite.execute(self, 'putbyid', data, d.childData, d.relations, options, cb);
      return cb.promise;
    }

    return _replaceById.apply(this, [].slice.call(arguments));
  };
};


