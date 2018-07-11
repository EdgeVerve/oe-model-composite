/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

const async = require('async');
const util = require('./util');
const oecloudutil = require('oe-cloud/lib/common/util');


function createBelongsToRecords(childModel, data, self, payload, options, cb) {
  var keyTo = self[payload.relationName].keyTo;
  var keyFrom = self[payload.relationName].keyFrom;
  var deleteRelations = [];

  // Check with Atul about the purpose of this assignment
  options[payload.relationName] = payload.data;

  // Making object into an array
  var recs = Array.isArray(payload.data) === false ? [payload.data] : payload.data;
  var createOrModify = (payload.action === 'create') ? 'create' : 'updateOrCreate';

  async.eachSeries(recs, function (cr, asyncCb) {
    childModel[createOrModify](cr, options, function (err, createdRecord) {
      if (err) {
        return cb(err);
      }
      var childModelData = createdRecord.__data;
      if (!data[keyFrom]) {
        data[keyFrom] = [];
      }
      data[keyFrom].push(childModelData[keyTo]);
      asyncCb();
    });
  }, function (err) {
    if (!err) {
      deleteRelations.push(payload.relationName);
    }
    return cb(err, deleteRelations);
  });
}


function executeImplicitComposite(self, action, data, childData, relations, options, cb) {
  options.skipIdempotent = true;

  function createChildModelRecord(parentData, childModelName, cr, options, childRecCb) {
    try {
      var childModelCreate = util.getChildModelCreateFunc(parentData, childModelName, cr);
      childModelCreate.func(childModelCreate.payload, options, function (err1, childRecord) {
        return childRecCb(err1, childRecord);
      });
    } catch (exErr) {
      return childRecCb(exErr);
    }
  }

  var responseData = {};
  function addRelationDataToResponse(recInst, rltns, relationName, cb) {
    if (rltns[relationName].type === 'hasOne') {
      responseData.__data[relationName] = recInst;
    } else {
      if (!responseData.__data[relationName]) {
        responseData.__data[relationName] = [];
      }
      responseData.__data[relationName].push(recInst);
    }
    cb();
  }

  try {
    // CreateOrUpdate Parent Model Record
    var operation;
    if (action.toLowerCase() === 'post') {
      operation = 'create';
    } else if (action.toLowerCase() === 'put') {
      operation = 'updateOrCreate';
    } else if (action.toLowerCase() === 'putbyid') {
      operation = 'replaceById';
    }

    // var operation = (action === 'create') ? 'create' : ((action === 'put') ? 'updateOrCreate' : 'updateAttributes');
    self[operation](data, options, function respHndlr(err, createdRecord) {
      if (err) {
        return cb(err, createdRecord);
      }
      responseData = createdRecord;
      // Iterate All Relation Models Record
      async.forEachOfSeries(childData, function oneRltnHndlr(childRows, relationName, done) {
        // var relatedModel = relations[relationName];
        var realSelf = (action === 'putbyid') ? self.constructor : self;
        // var childModel = realSelf.dataSource.modelBuilder.models[relatedModel];
        var childModel = realSelf.relations[relationName].modelTo;
        var keyTo = realSelf.relations[relationName].keyTo;
        var keyFrom = realSelf.relations[relationName].keyFrom;
        if (realSelf.relations[relationName].type === 'hasOne' && !Array.isArray(childRows)) {
          childRows = [childRows];
        }
        // CreateOrUpdate Single Relation Model Record and Process its recs one by one 
        async.eachSeries(childRows, function oneRecHndlr(cr, done2) {
          cr[keyTo] = createdRecord[keyFrom];
          var parentData = { inst: createdRecord, relationName: relationName };
          if (realSelf.settings.relations[relationName].through) {
            parentData.hasManyThrough = realSelf.settings.relations[relationName].through;
          }
          if (action === 'post') {
            createChildModelRecord(parentData, childModel, cr, options, function (err1, childRecord) {
              if (err1) {
                return done2(err1);
              }
              addRelationDataToResponse(childRecord, realSelf.relations, relationName, done2);
            });
          } else {
            // updateChildModel based on row_status('added','modified','deleted')
            var pk = util.getIdFields(childModel);
            util.applyRecord(parentData, childModel, pk, options, cr, function (err2, childRecord) {
              if (err2) {
                return done2(err2);
              }
              if (!childRecord) {
                return done2();
              }
              addRelationDataToResponse(childRecord, realSelf.relations, relationName, done2);
            });
          }
        }, function (err) {
          return done(err);
        }
        );
      }, function (err) {
        return cb(err, responseData);
      }
      );
    });
  } catch (exErr) {
    return cb(exErr);
  }
}

module.exports.execute = function implicitComposite(self, action, data, childData, relations, options, cb) {
  var dataToDelete = [];
  options.childData = childData;

  async.forEachOfSeries(childData, function rltnHndlr(childRows, relationName, doneBlngsTo) {
    var realSelf = (action === 'putbyid') ? self.constructor.relations : self.relations;
    if (realSelf[relationName].type === 'belongsTo') {
      var payload = {
        data: childRows, action: action,
        relationName: relationName, relatedModelName: relations[relationName]
      };
      var childModel = self.dataSource.modelBuilder.models[payload.relatedModelName];
      createBelongsToRecords(childModel, data, realSelf, payload, options, function (err, relationToDelete) {
        if (err) {
          return cb(err);
        }
        dataToDelete = dataToDelete.push(relationToDelete);
        doneBlngsTo();
      });
    } else {
      doneBlngsTo();
    }
  }, function (err) {
    if (err) {
      cb(err);
    } else {
      dataToDelete.forEach(r => {
        delete childData[r];
        delete relations[r];
      });
      executeImplicitComposite(self, action, data, childData, relations, options, cb);
    }
  });
};
