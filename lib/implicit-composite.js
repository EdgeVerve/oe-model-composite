const async = require('async');
const util = require('./util');

module.exports.getChildDataAndRelations = function getChildDataAndRelations(self, data){
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

  return {childData, relations};
}

//Atul : Perform implicit composite
module.exports.create = function implicitCompositeCreate(self, data, childData, relations, options, cb) {
  //var responseData = {};
  //var m = self.modelName;
  var deleteRelations = [];
  options.childData = childData;
  function createModelChildData(self, data, childData, relations, options, deleteRelations, cb) {
      var responseData = {};
      //var m = self.modelName;

      deleteRelations.forEach(r => {
          delete childData[r];
          delete relations[r];
      });

      function createChildModelRecordInner(childModel2, cr, options, done4, relationName) {
        try {
          childModel2.create(cr, options, function (err3, createdRecord2) {
            if (err3) {
              return done4(err3);
            }

            if (!createdRecord2) {
              return done4();
            }

            if (!responseData.__data[relationName]) {
              responseData.__data[relationName] = [];
            }
            responseData.__data[relationName].push(createdRecord2);
            done4(err3);
          });
        } catch (err) {
          done4(err);
        }
      }
      options.skipIdempotent = true;
      try {
        self.create(data, options, function (err, createdRecord) {
          if (err) {
            return cb(err, createdRecord);
          }
          responseData = createdRecord; //createdRecord.__data;
          async.forEachOfSeries(childData, function (childRows, relationName, done3) {
            var relatedModel = relations[relationName];
            var childModel = self.dataSource.modelBuilder.models[relatedModel];
            var keyTo = self.relations[relationName].keyTo;
            var keyFrom = self.relations[relationName].keyFrom;
            async.eachSeries(childRows, function (cr, done4) {
              cr[keyTo] = createdRecord[keyFrom];
              var childModel2 = childModel;
              if (childModel.getOverridenModel) {
                  childModel2 = childModel.getOverridenModel(options);
              }
              createChildModelRecordInner(childModel2, cr, options, done4, relationName);
            },
              function (err) {
                return done3(err);
            });
          },
          function (err) {
              return cb(err, responseData);
          });
        });
      } 
      catch (err) {
          return cb(err);
      }
  }

  async.forEachOfSeries(childData, function (childRows, relationName, doneBTo) {
    if (self.relations[relationName].type === 'belongsTo') {
      var relatedModel = relations[relationName];
      var childModel = self.dataSource.modelBuilder.models[relatedModel];
      var keyTo = self.relations[relationName].keyTo;
      var keyFrom = self.relations[relationName].keyFrom;
      options[relationName] = childRows;

      // Add for multiple and also for put and get as is possible

      // Making object into an array
      if (Array.isArray(childRows)) {
        return doneBTo(new Error("child data must be an object. Found of type array"));
      } else {
        childModel.create(childRows, options, function (err, createdRecord) {
          if (err) {
              return cb(err);
          }
          childModelData = createdRecord.__data;
          data[keyFrom] = childModelData[keyTo];
          deleteRelations.push(relationName);
          return doneBTo(err);
        });
      }
    } else {
        return doneBTo();
    }
  }, 
  function (err) {
    if (err) {
        cb(err);
    } else {
        createModelChildData(self, data, childData, relations, options, deleteRelations, cb);
    }
  });
}


module.exports.upsert = function implicitPut(self, data, childData, relations, options, cb) {
  var deleteRelations = [];
  options.childData = childData;

  function createOrUpdateModelChildData(self, data, childData, relations, options, deleteRelations, cb) {
    //var m = self.modelName;
    var responseData = {};

    for (var r in deleteRelations) {
      delete childData[r];
      delete relations[r];
    }
    try {
      self.updateOrCreate(data, options, function (err, createdRecord) {
        if (err) {
          return cb(err, createdRecord);
        }
        responseData = createdRecord; //createdRecord.__data;
        async.forEachOfSeries(childData, function (childRows, relationName, done3) {
          var relatedModel = relations[relationName];
          var childModel = self.dataSource.modelBuilder.models[relatedModel];
          var keyTo = self.relations[relationName].keyTo;
          var keyFrom = self.relations[relationName].keyFrom;
          var pk2 = getIdFields(childModel);

          async.eachSeries(childRows, function (cr, done4) {
            cr[keyTo] = createdRecord[keyFrom];
            util.applyRecord(childModel, pk2, options, cr, function (err3, createdRecord2) {
              //childModel.create(cr, options, function (err3, createdRecord2) {
              if (err3)
                return done4(err3);
              if (!createdRecord2)
                return done4();

              if (!responseData.__data[relationName]) {
                responseData.__data[relationName] = [];
              }
              responseData.__data[relationName].push(createdRecord2);
              done4(err3);
            });
          },
            function (err) {
              return done3(err);
            });
        },
          function (err) {
            cb(err, responseData);
          });
      });
    } catch (err) {
      cb(err);
    }
  }

  async.forEachOfSeries(childData, function (childRows, relationName, doneBTo) {
    if (self.relations[relationName].type === 'belongsTo') {
      var relatedModel = relations[relationName];
      var childModel = self.dataSource.modelBuilder.models[relatedModel];
      var keyTo = self.relations[relationName].keyTo;
      var keyFrom = self.relations[relationName].keyFrom;
      options[relationName] = childRows;

      try {
        // Checking if object or array
        if (Array.isArray(childRows)) {
          return doneBTo(new Error("child data must be an object. Found of type array"));
        } else {
          childModel.updateOrCreate(childRows, options, function (err, createdRecord) {
            if (err) {
              return cb(err);
            }
            childModelData = createdRecord.__data;
            data[keyFrom] = childModelData[keyTo];
            deleteRelations.push(relationName);
            return doneBTo(err);
          });
        }
      } catch (err) {
        return doneBTo(err);
      }
    } else {
      return doneBTo();
    }
  }, function (err) {
    if (err) {
      cb(err);
    } else {
      createOrUpdateModelChildData(self, data, childData, relations, options, deleteRelations, cb);
    }
  });
}



module.exports.updateAttributes = function implicitPutById(self, data, childData, relations, options, cb) {
  var deleteRelations = [];
  options.childData = childData;
  function createOrUpdateModelChildData2(self, data, childData, relations, options, deleteRelations, cb) {
    //var m = self.modelName;
    var responseData = {};

    for (var r in deleteRelations) {
      delete childData[r];
      delete relations[r];
    }

    self.updateAttributes(data, options, function (err, createdRecord) {
      if (err) {
        return cb(err, createdRecord);
      }
      responseData = createdRecord; //createdRecord.__data;
      async.forEachOfSeries(childData, function (childRows, relationName, done3) {
        var relatedModel = relations[relationName];
        var childModel = self.constructor.dataSource.modelBuilder.models[relatedModel];
        var keyTo = self.constructor.relations[relationName].keyTo;
        var keyFrom = self.constructor.relations[relationName].keyFrom;
        var pk2 = getIdFields(childModel);

        async.eachSeries(childRows, function (cr, done4) {
          cr[keyTo] = createdRecord[keyFrom];
          util.applyRecord(childModel, pk2, options, cr, function (err3, createdRecord2) {
            //childModel.create(cr, options, function (err3, createdRecord2) {
            if (err3)
              return done4(err3);
            if (!createdRecord2)
              return done4();

            if (!responseData.__data[relationName]) {
              responseData.__data[relationName] = [];
            }
            responseData.__data[relationName].push(createdRecord2);
            done4(err3);
          });
        },
          function (err) {
            return done3(err);
          });
      },
        function (err) {
          cb(err, responseData);
        });
    });
  }

  async.forEachOfSeries(childData, function (childRows, relationName, doneBTo) {
    if (self.constructor.relations[relationName].type === 'belongsTo') {
      var relatedModel = relations[relationName];
      var childModel = self.constructor.dataSource.modelBuilder.models[relatedModel];
      var keyTo = self.constructor.relations[relationName].keyTo;
      var keyFrom = self.constructor.relations[relationName].keyFrom;
      options[relationName] = childRows;

      // Checking if object or array
      if (Array.isArray(childRows)) {
        return doneBTo(new Error("child data must be an object. Found of type array"));
      } else {
        childModel.updateAttributes(childRows, options, function (err, createdRecord) {
          if (err) {
            return cb(err);
          }
          childModelData = createdRecord.__data;
          data[keyFrom] = childModelData[keyTo];
          deleteRelations.push(relationName);
          return doneBTo(err);
        });
      }
    } else {
      return doneBTo();
    }
  }, function (err) {
    if (err) {
      cb(err);
    } else {
      createOrUpdateModelChildData2(self, data, childData, relations, options, deleteRelations, cb);
    }
  });

}




