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
    'idInjection': false,
    'base': 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    'relations': {
      'address': {
        'type': 'hasMany',
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
      'idInjection': false,
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

  it('t1 create user admin/admin with /default tenant', function (done) {
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

  it('t3 clean up Employee and EmployeeAddress models', function (done) {
    Customer.destroyAll({}, {}, function (err) {
      if (err)
        return done(err);
      var CustomerAddress = loopback.getModel('CustomerAddress', defaultContext);
      CustomerAddress.destroyAll({}, {}, function (err) {
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


  it('t5 update customer and customer address record using PUT operation', function (done) {

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


       var url = basePath + '/customers?access_token=' + adminToken;
       api.set('Accept', 'application/json')
       .put(url)
       .send(customerData)
       .end(function (err, response) {
         expect(response.status).to.be.equal(200);
         var result = response.body;
         expect(result.name).to.be.equal("Atul Modified");
         expect(result.address.length).to.be.equal(1);
         expect(result.address[0].city).to.be.equal("delhi modified");
         done();
       });
     });
  });

});






