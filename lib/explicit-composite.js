// Atul : compositePost() will take entire composite model data and execute against database
// Data should be form as below for composite model Customer, CustomerAddress and Country. you can post customer and customerAddress in nested structure
// Every record should have status field indicating what to do with the record.
//var x =
//{
//    "Customer" : [
//        {
//            "id" : 1,
//            "name" : "Smith",
//            "age" : 30,
//            "__row_status" : "added"
//        },
//        {
//            "id" : 3,
//            "name" : "Smith",
//            "age" : 31,
//            "customerAddress" : [
//                {
//                    "id" : 11,
//                    "line1" : "12, Mountain Ave",
//                    "city" : "Fremont",
//                    "state" : "CA",
//                    "__row_status" : "added"
//                },
//                {
//                    "id" : 11,
//                    "line1" : "44, Mountain Ave",
//                    "city" : "Fremont",
//                    "state" : "CA",
//                    "__row_status" : "added"
//                }
//                ],
//            "__row_status" : "added"
//        },
//        {
//            "id" : 3,
//            "age" : 35,
//            "__row_status" : "udpated"
//        }
//    ],
//    "Country" : [
//        {
//            "id" : 1,
//            "code" : "ind",
//            "name" : "India",
//            "__row_status" : "added"
//        },
//        {
//            "id" : 2,
//            "code" : "us",
//            "name" : "United States",
//            "__row_status" : "added"
//        }
//    ]
//};

const async = require('async');
const util = require('./util');
var debug = require('debug')('loopback:dao');

function compositePostInner(self, data, options, cb) {
  var uow = data.Uow || data.uow || data;
  var responseData = {};

  async.forEachOfSeries(uow, function (rows, m, done) {
    if (!self.settings.compositeModels[m]) {
      debug('Warning : ' + m + ' model is not part of composite model : ');
      return done();
    }
    var model = self.getOverridenModel(m, options);
    //var model = self.dataSource.modelBuilder.models[m]; //loopback.getModel(m);
    var pk = getIdFields(model);
    var relations = getChildRelations(model);

    async.eachSeries(rows, function (r, done2) {
      var childData = {};
      for (var relName in relations) {
        childData[relName] = r[relName];
        delete r[relName];
      }
      util.applyRecord(model, pk, options, r, function (err, createdRecord) {
        if (err) {
          return done2(err);
        }
        if (!createdRecord)
          return done2();
        if (!responseData[m]) {
          responseData[m] = [];
        }
        responseData[m].push(createdRecord.__data);
        async.forEachOfSeries(childData, function (childRows, relationName, done3) {
          if (!childRows) {
            return done3();
          }
          var relatedModel = relations[relationName];
          var childModel = self.dataSource.modelBuilder.models[relatedModel]; //loopback.getModel(relatedModel);
          var pk2 = getIdFields(childModel);
          var keyTo = model.relations[relationName].keyTo;
          var keyFrom = model.relations[relationName].keyFrom;
          async.eachSeries(childRows, function (cr, done4) {
            cr[keyTo] = createdRecord[keyFrom];
            util.applyRecord(childModel, pk2, options, cr, function (err2, createdRecord2) {
              if (err2) {
                return done4(err2);
              }
              if (!createdRecord2)
                return done4();
              var len = responseData[m].length - 1;
              var parentResponseRecord = responseData[m][len];
              if (!parentResponseRecord[relationName]) {
                parentResponseRecord[relationName] = [];
              }
              parentResponseRecord[relationName].push(createdRecord2.__data);
              done4(err2);
            });
          },
            function (err5) {
              done3(err5);
            });
        },
          function (err4) {
            done2(err4);
          }
        );
      });
    }, function (err) {
      debug('Error while creating record for composite model ', err);
      done(err);
    });
  },
    function (err2) {
      debug('Error while creating record for composite model ', err2);
      if (err2)
        return cb(err2, null);
      return cb(null, responseData);
    });
}

module.exports.compositePost = function compositePost(self, data, options, cb) {
  compositePostInner(self, data, options, cb);
}

// Atul : compositeGet() method retreive all the composite model data
// data format is very similar to what is shown above in postModel()
module.exports.compositeGet = function compositeGet(self, query, options, cb) {

  var data = query;
  var resultSet = {};

  var included = [];

  async.forEachOfSeries(self.settings.compositeModels, function (m, modelName, done) {

    if (included.indexOf(modelName) >= 0) {
      return done();
    }
    var model;
    if (self.getOverridenModel) {
      model = self.getOverridenModel(modelName, options);
    }
    else {
      model = self.dataSource.modelBuilder.models[modelName]; //loopback.getModel(modelName);
    }
    if (!model) {
      return done(new Error("Composite model not found", self.clientModelName, '.', modelName));
    }

    //var model = self.dataSource.modelBuilder.models[modelName]; //loopback.getModel(modelName);
    var relations = getChildRelations(model);

    if (!data)
      data = {};
    if (!data[modelName])
      data[modelName] = {};

    for (var r in relations) {
      if (!data[modelName].include)
        data[modelName].include = [];
      if (self.settings.compositeModels[relations[r]]) {
        data[modelName].include.push(r);
        included.push(relations[r]);
      }
    }
    var model2 = model;
    if (model.getOverridenModel) {
      model2 = model.getOverridenModel(options);
    }
    model2.find(data[modelName], options, function (err, result) {
      resultSet[modelName] = result;
      done(err);
    });

  },
    function (err) {
      if (err)
        return cb(err);
      cb(null, resultSet);
    });
}

