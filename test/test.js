/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */


var oecloud = require('oe-cloud');
var loopback = require('loopback');

oecloud.observe('loaded', function (ctx, next) {
  return next();
})

oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  oecloud.start();
  oecloud.emit('test-start');
});


var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));

var expect = chai.expect;

var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var Customer;
var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');
var url = basePath + '/Employees';

var models = oecloud.models;

function deleteAllUsers(done) {
  var userModel = loopback.findModel("User");
  userModel.destroyAll({}, {}, function (err) {
    if (err) {
      return done(err);
    }
    userModel.find({}, {}, function (err2, r2) {
      if (err2) {
        return done(err2);
      }
      if (r2 && r2.length > 0) {
        return done(new Error("Error : users were not deleted"));
      }
    });
    return done(err);
  });
}

var globalCtx = {
  ignoreAutoScope: true,
  ctx: { tenantId : '/default'}
};

var iciciCtx = {
  ctx: { tenantId : '/default/icici'}
};

var citiCtx = {
  ctx: { tenantId: '/default/citi' }
};

var defaultContext = {
  ctx: { tenantId: '/default' }
};

function createEmployeeModels(done) {
  models.ModelDefinition.create({
    'name': 'Employee',
    'base': 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    'relations': {
      'address': {
        'type': 'hasOne',
        'model': 'EmployeeAddress',
        'foreignKey': 'EmployeeId'
      }
    },
    mongodb: {
      collection: 'employee'
    },
    'acls': [{
      'principalType': 'ROLE',
      'principalId': '$everyone',
      'permission': 'ALLOW',
      'accessType': '*'
    }]
  }, globalCtx, function (err, model) {
    if (err) {
      return done(err);
    }
    models.ModelDefinition.create({
      name: 'EmployeeAddress',
      base: 'BaseEntity',
      properties: {
        'city': {
          'type': 'string',
          'required': true
        }
      },
      'relations': {}
    }, globalCtx, function (err2, model2) {
      expect(err2).to.be.not.ok;
      done(err2);
    });
  });
}



function createBookModels(done) {
  models.ModelDefinition.create({
    'name': 'Book',
    'base': 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    'acls': [{
      'principalType': 'ROLE',
      'principalId': '$everyone',
      'permission': 'ALLOW',
      'accessType': '*'
    }]
  }, globalCtx, function (err, model) {
    if (err) {
      return done(err);
    }
    models.ModelDefinition.create({
      name: 'Page',
      base: 'BaseEntity',
      properties: {
        'num': {
          'type': 'number',
          'required': true
        }
      },
      'relations': {
        'pageRel': {
          'type': 'belongsTo',
          'model': 'Book',
          'foreignKey': 'bookId'
        }
      },
    }, globalCtx, function (err2, model2) {
      expect(err2).to.be.not.ok;
      done(err2);
    });
  });
}

describe(chalk.blue('Model Personalization Test Started'), function (done) {
  this.timeout(10000);
  before('wait for boot scripts to complete', function (done) {
    app.on('test-start', function () {
      Customer = loopback.findModel("Customer");
      deleteAllUsers(function () {
        return done();
      });
    });
  });

  afterEach('destroy context', function (done) {
    done();
  });

  it('t1-0 create user admin/admin with /default tenant', function (done) {
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
    .post(url)
    .send([{ username: "admin", password: "admin", email: "admin@admin.com" },
    { username: "evuser", password: "evuser", email: "evuser@evuser.com" },
    { username: "infyuser", password: "infyuser", email: "infyuser@infyuser.com" },
    { username: "bpouser", password: "bpouser", email: "bpouser@bpouser.com" }
    ])
    .end(function (err, response) {

      var result = response.body;
      expect(result[0].id).to.be.defined;
      expect(result[1].id).to.be.defined;
      expect(result[2].id).to.be.defined;
      expect(result[3].id).to.be.defined;
      done();
    });
  });

  it('t1-2 create Employee models tenant', function (done) {
    createEmployeeModels(done);
  });
  it('t1-3 create Book models', function (done) {
    createBookModels(done);
  });
  
  var adminToken;
  it('t2 Login with admin credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "admin", password: "admin" })
    .end(function (err, response) {
      var result = response.body;
      adminToken = result.id;
      expect(adminToken).to.be.defined;
      done();
    });
  });

  it('t3-1 clean up Customer models', function (done) {
    Customer.destroyAll({}, {}, function (err) {
      if (err)
        return done(err);
      var CustomerAddress = loopback.getModel('CustomerAddress', defaultContext);
      CustomerAddress.destroyAll({}, {}, function (err) {
        return done(err);
      });
    });
  });

  it('t3-2 clean up Employee models', function (done) {
    var Employee = loopback.getModel('Employee', defaultContext);
    Employee.destroyAll({}, { ignoreAutoScope: true }, function (err) {
      if (err)
        return done(err);
      var EmployeeAddress = loopback.getModel('EmployeeAddress', defaultContext);
      EmployeeAddress.destroyAll({}, { ignoreAutoScope: true }, function (err) {
        return done(err);
      });
    });
  });

  it('t4 create record in Customer and CustomerAddress models using single POST operation', function (done) {

    var customerData = {
      "name": "Atul",
      "age": 10,
      "address": [
        {
          "city": "delhi"
        },
        {
          "city": "mumbai"
        }
      ]
    };

    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
    .post(url)
    .send(customerData)
    .end(function (err, response) {
      expect(response.status).to.be.equal(200);
      var result = response.body;
      expect(result.name).to.be.equal("Atul");
      expect(result.address.length).to.be.equal(2);
      expect(result.address[0].city).to.be.equal("delhi");
      expect(result.address[1].city).to.be.equal("mumbai");
      done();
    });
  });


  it('t5-1 update customer and customer address record using PUT operation', function (done) {

    api
     .set('Accept', 'application/json')
     .get(basePath + '/Customers' + '?filter={"include" : "address"}')
     .send()
     .end(function (err, res) {
       if (err || res.body.error) {
         return done(err || (new Error(res.body.error)));
       }
       expect(res.status).to.be.equal(200);
       var result = res.body;
       expect(result.length).be.equal(1);
       expect(result[0].name).be.equal("Atul");
       expect(result[0].address.length).be.equal(2);


       var customerData = result[0];
       customerData.name = "Atul Modified";
       customerData.address[0]["__row_status"] = "modified";
       customerData.address[0]["city"] = "delhi modified";

       customerData.address.push({ city: "Bangalore", "__row_status": "added" });


       var url = basePath + '/customers?access_token=' + adminToken;
       api.set('Accept', 'application/json')
       .put(url)
       .send(customerData)
       .end(function (err, response) {
         expect(response.status).to.be.equal(200);
         var result = response.body;
         expect(result.name).to.be.equal("Atul Modified");
         expect(result.address.length).to.be.equal(2);
         expect(result.address[0].city).to.be.equal("delhi modified");
         expect(result.address[1].city).to.be.equal("Bangalore");
         done();
       });
     });
  });
  it('t5-2 retrieve updated records and check if records are really updated', function (done) {

    api
     .set('Accept', 'application/json')
     .get(basePath + '/Customers' + '?filter={"include" : "address"}')
     .send()
     .end(function (err, res) {
       if (err || res.body.error) {
         return done(err || (new Error(res.body.error)));
       }
       expect(res.status).to.be.equal(200);
       var result = res.body;
       expect(result.length).be.equal(1);
       expect(result[0].name).be.equal("Atul Modified");
       expect(result[0].address.length).be.equal(3);
       expect(result[0].address.find(function (item) {
         return (item.city === "delhi modified");
       }).city).to.equal("delhi modified");
       return done();
     });
  });


  it('t6-1 create record in Employee and EmployeeAddress models using single POST operation', function (done) {
    var employeeData = [{
      'name': 'Tom',
      'id': 1,
      'address': [{
        'city': 'Denver',
        'id': 11
      }]
    }, {
      'name': 'Harry',
      'id': 2,
      'address': [{
        'city': 'London',
        'id': 21
      }]
    }];

    var url = basePath + '/employees?access_token=' + adminToken;
    api.set('Accept', 'application/json')
    .post(url)
    .send(employeeData)
    .end(function (err, response) {
      expect(response.status).to.be.equal(200);
      var results = response.body;
      expect(results[0].name).to.equal('Tom');
      expect(results[1].name).to.equal('Harry');
      done();
    });
  });

  it('t6-2 retrieve creted records of employee', function (done) {

    api
     .set('Accept', 'application/json')
     .get(basePath + '/employees' + '?filter={"include" : "address"}')
     .send()
     .end(function (err, res) {
       if (err || res.body.error) {
         return done(err || (new Error(res.body.error)));
       }
       expect(res.status).to.be.equal(200);
       var result = res.body;
       expect(result.length).be.equal(2);
       
       expect(result.find(function (item) {
         return (item.name === "Tom" && item.address.city === "Denver");
       }).name).to.equal("Tom")
       expect(result.find(function (item) {
         return (item.name === "Harry" && item.address.city === "London");
       }).name).to.equal("Harry")
       return done();
     });
  });

  it('t6-2 update record using id', function (done) {
    api
     .set('Accept', 'application/json')
     .get(basePath + '/employees' + '?filter={"include" : "address"}')
     .send()
     .end(function (err, res) {
       if (err || res.body.error) {
         return done(err || (new Error(res.body.error)));
       }
       expect(res.status).to.be.equal(200);
       var result = res.body;
       expect(result.length).be.equal(2);

       expect(result.find(function (item) {
         return (item.name === "Tom" && item.address.city === "Denver");
       }).name).to.equal("Tom")
       expect(result.find(function (item) {
         return (item.name === "Harry" && item.address.city === "London");
       }).name).to.equal("Harry")

       var rcd = result[0];
       rcd.name = "Tom Changed"
       rcd.address.city = "Denver Changed";
       rcd.address.__row_status = "modified";
       var id = rcd.id;
       var url = basePath + '/employees/' +id+ '?access_token=' + adminToken;
       api.set('Accept', 'application/json')
       .put(url)
       .send(rcd)
       .end(function (err, response) {
         expect(response.status).to.be.equal(200);
         var result = response.body;
         expect(result.name).to.equal('Tom Changed');
         expect(result.address.city).to.equal('Denver Changed');
         done();
       });
     });
  });

  it('t6-1 create record in Employee and EmployeeAddress models using single POST operation', function (done) {
    var pageData = [{
      'num': 1,
      'pageRel': [{
        'name': 'Inside JavaScript'
      }]
    }, {
      'num': 1,
      'pageRel': [{
        'name': 'Inside Java'
      }]
    }];

    var url = basePath + '/pages?access_token=' + adminToken;
    api.set('Accept', 'application/json')
    .post(url)
    .send(pageData)
    .end(function (err, response) {
      expect(response.status).to.be.equal(200);
      var results = response.body;
      console.log(results);
      //expect(results[0].name).to.equal('Tom');
      //expect(results[1].name).to.equal('Harry');
      done();
    });
  });
});






