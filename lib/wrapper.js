﻿/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const daoutils = require('loopback-datasource-juggler/lib/utils');
const implicitComposite = require('./implicit-composite');
const explicitComposite = require('./explicit-composite');
const utils = require('./util');
const log = require('oe-logger')('oe-model-personalization-wrapper');


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
  log.info('Oe model-Personalization Loaded');

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
      /* istanbul ignore if */
      if (!options.transaction && typeof self.dataSource.connector.beginTransaction === 'function') {
        self.beginTransaction({
          isolationLevel: self.Transaction.READ_COMMITTED
        }, function (err, tx) {
          options.transaction = tx;
          implicitComposite.execute(self, 'post', data, d.childData, d.relations, options, function (err, responseData) {
            if (err) {
              tx.rollback(function (cerr) {
                delete options.transaction;
                return cb(err || cerr, null);
              });
              return;
            }
            tx.commit(function (cerr) {
              delete options.transaction;
              return cb(cerr, responseData);
            });
          });
        });
      } else {
        implicitComposite.execute(self, 'post', data, d.childData, d.relations, options, cb);
      }
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
      /* istanbul ignore if */
      if (!options.transaction && typeof self.dataSource.connector.beginTransaction === 'function') {
        self.beginTransaction({
          isolationLevel: self.Transaction.READ_COMMITTED
        }, function (err, tx) {
          options.transaction = tx;
          implicitComposite.execute(self, 'put', data, d.childData, d.relations, options, function (err, responseData) {
            if (err) {
              tx.rollback(function (cerr) {
                delete options.transaction;
                return cb(err || cerr, null);
              });
              return;
            }
            tx.commit(function (cerr) {
              delete options.transaction;
              return cb(cerr, responseData);
            });
          });
        });
      } else {
        implicitComposite.execute(self, 'put', data, d.childData, d.relations, options, cb);
      }
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
      /* istanbul ignore if */
      if (!options.transaction && typeof self.dataSource.connector.beginTransaction === 'function') {
        self.beginTransaction({
          isolationLevel: self.Transaction.READ_COMMITTED
        }, function (err, tx) {
          options.transaction = tx;
          implicitComposite.execute(self, 'putbyid', data, d.childData, d.relations, options, function (err, responseData) {
            if (err) {
              tx.rollback(function (cerr) {
                delete options.transaction;
                return cb(err || cerr, null);
              });
              return;
            }
            tx.commit(function (cerr) {
              delete options.transaction;
              return cb(cerr, responseData);
            });
          });
        });
      } else {
        implicitComposite.execute(self, 'putbyid', data, d.childData, d.relations, options, cb);
      }
      return cb.promise;
    }

    return _replaceById.apply(this, [].slice.call(arguments));
  };


  const _updateAttributes = DataAccessObject.prototype.updateAttributes;

  DataAccessObject.prototype.updateAttributes =
  DataAccessObject.prototype.patchAttributes =
  function (data, options, cb) {
    var self = this;
    var d = utils.getChildDataAndRelations(self.constructor, data);
    // Atul : if nested data exist, fall in to this if and create records recursively for nested child
    if (d.childData) {
      if (!cb && typeof options === 'function') {
        cb = options;
        options = {};
      }
      cb = cb || daoutils.createPromiseCallback();
      /* istanbul ignore if */
      if (!options.transaction && typeof self.constructor.dataSource.connector.beginTransaction === 'function') {
        self.constructor.beginTransaction({
          isolationLevel: self.constructor.Transaction.READ_COMMITTED
        }, function (err, tx) {
          options.transaction = tx;
          implicitComposite.execute(self, 'putbyid', data, d.childData, d.relations, options, function (err, responseData) {
            if (err) {
              tx.rollback(function (cerr) {
                delete options.transaction;
                return cb(err || cerr, null);
              });
              return;
            }
            tx.commit(function (cerr) {
              delete options.transaction;
              return cb(cerr, responseData);
            });
          });
        });
      } else {
        implicitComposite.execute(self, 'putbyid', data, d.childData, d.relations, options, cb);
      }
      return cb.promise;
    }
    return _updateAttributes.apply(this, [].slice.call(arguments));
  };
};


