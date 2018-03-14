/// Atul : applyRecord() will check the status of the record and actually call model's method to do create/update/delete operation on model.
/// it will put id field (pk) in where clause for update and delete operation.
// model - model object
// pk - primarky keys of model
// options - whatever is passed - mostly to do with begin/end transaction
// r - actual record to create/delete/update
// cb - callbackck
module.exports.applyRecord = function applyRecord(modelParameter, pk, options, r, cb) {
  var modelParameter2 = modelParameter;
  if (modelParameter.getOverridenModel) {
    modelParameter2 = modelParameter.getOverridenModel(modelParameter.modelName, options);
  }

  applyRecordInner(modelParameter2, pk, options, r, cb);

  function applyRecordInner(model, pk, options, r, cb) {
    var rowStatus = r.__row_status;
    delete r.__row_status;
    try {
      if (rowStatus == 'added') {
        model.create(r, options, function (err, instance) {
          cb(err, instance);
        });
      } else if (rowStatus == 'modified' || rowStatus == 'deleted') {
        if (pk.length > 0) {
          var w = []; //where clause
          for (var j = 0; j < pk.length; ++j) {
            var x = Object.keys(pk[j])[0];
            var o = {};
            o[x] = r[x];
            //w[x] = r[x];
            w.push(o);
          }
          if (rowStatus == 'modified') {
            model.upsert(r, options, function (err, instance) {
              cb(err, instance); //instance);cb(err, instance);
            });
          } else { // if transaction is deleted
            if (w.length == 1) {
              var whereClause = w[0].id;
              model.deleteById(whereClause, options, function (err, instance) {
                cb(err, instance);
              });
            } else {
              var whereClause = {
                and: w
              };
              model.destroyAll(whereClause, options, function (err, instance) {
                cb(err, instance);
              });
            }
          }
        } else {
          if (rowStatus == 'modified') {
            model.updateAttributes(r, options, function (err, instance) {
              cb(err, instance);
            });
          }
        }
      } else {
        return cb();
      }
    } catch (err) {
      return cb(err);
    }
  }
}



/// Atul : this function returns a list of id fields of model.
/// we can use idNames() also. but i kept it for a while. once tested, it can be removed and better method can be used.
// TODO : use of idNames().
module.exports.getIdFields = function getIdFields(model) {

  var flagIdField = false;
  var pk = [];

  if (typeof model === 'string') {
    model = loopback.getModel(model);
  }

  var pkNames = model.definition.idNames();
  for (var p in model.definition.properties) {
    var property = model.definition.properties[p];

    if (p === 'id') {
      flagIdField = true;
    }

    if (property.id) {
      var x = {};
      x[p] = property;
      pk.push(x);
    }
  }
  if (pk.length == 0) {
    if (!flagIdField)
      return pk;
    else
      return [{
        id: model.definition.properties['id']
      }];
  }
  return pk;
}

/// Atul : This is helper function to retrieve child relations. so far hasMany and hasOne being retrieved
// TODO : Is there any better way of getting relations?
module.exports.getChildRelations = function getChildRelations(model) {

  var relations = {};

  for (var r in model.relations) {
    if (model.relations[r].type === 'hasMany' || model.relations[r].type === 'hasOne') {
      relations[r] = model.relations[r].modelTo.modelName;
    }
  }
  return relations;
}
