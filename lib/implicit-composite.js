var async = require('async');

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
        async.eachSeries(childRows, function (cr, doneChildBTo) {
          childModel.create(cr, options, function (err, createdRecord) {
            if (err) {
              return cb(err);
            }
            childModelData = createdRecord.__data;
            if (!data[keyFrom]) {
              data[keyFrom] = [];
            }
            data[keyFrom].push(childModelData[keyTo]);
            doneChildBTo(err);
          });
        }, function (err) {
          if (!err) {
              deleteRelations.push(relationName);
          }
          return doneBTo(err);
        });
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
