/**
 *
 * 2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
var oecloud = require('oe-cloud');
var loopback = require('loopback');

oecloud.observe('loaded', function (ctx, next) {
  return next();
});

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
  var userModel = loopback.findModel('User');
  userModel.destroyAll({}, {}, function (err) {
    if (err) {
      return done(err);
    }
    userModel.find({}, {}, function (err2, r2) {
      if (err2) {
        return done(err2);
      }
      if (r2 && r2.length > 0) {
        return done(new Error('Error : users were not deleted'));
      }
    });
    return done(err);
  });
}

var globalCtx = {
  ignoreAutoScope: true,
  ctx: { tenantId: '/default' }
};

var iciciCtx = {
  ctx: { tenantId: '/default/icici' }
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
      }
    }, globalCtx, function (err2, model2) {
      expect(err2).to.be.not.ok;
      done(err2);
    });
  });
}

function createCustomerEnrollmentModels(done) {
  models.ModelDefinition.create({
    'name': 'CustomerEnrollment',
    'description': 'customer desc',
    'plural': 'CustomerEnrollments',
    'base': 'BaseEntity',
    'relations': {
      'emailRel': {
        'type': 'hasOne',
        'model': 'OfficeEmail',
        'foreignKey': 'customerId'
      }
    },
    'properties': {
      'name': {
        'type': 'string'
      },
      'city': {
        'type': 'string'
      }
    }
  }, globalCtx, function (err, model) {
    if (err) {
      return done(err);
    }
    models.ModelDefinition.create({
      'name': 'OfficeEmail',
      'description': 'email desc',
      'plural': 'OfficeEmails',
      'base': 'BaseEntity',
      'relations': {
        'emailRel': {
          'type': 'belongsTo',
          'model': 'CustomerEnrollment',
          'foreignKey': 'customerId'
        }
      },
      'properties': {
        'username': {
          'type': 'string'
        },
        'password': {
          'type': 'string'
        }
      }
    }, globalCtx, function (err2, model2) {
      expect(err2).to.be.not.ok;
      done(err2);
    });
  });
}

describe(chalk.blue('Composite Model Test Started'), function (done) {
  this.timeout(10000);
  before('wait for boot scripts to complete', function (done) {
    app.on('test-start', function () {
      Customer = loopback.findModel('Customer');
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
      .send([{ username: 'admin', password: 'admin', email: 'admin@admin.com' },
        { username: 'evuser', password: 'evuser', email: 'evuser@evuser.com' },
        { username: 'infyuser', password: 'infyuser', email: 'infyuser@infyuser.com' },
        { username: 'bpouser', password: 'bpouser', email: 'bpouser@bpouser.com' }
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
      .send({ username: 'admin', password: 'admin' })
      .end(function (err, response) {
        var result = response.body;
        adminToken = result.id;
        expect(adminToken).to.be.defined;
        done();
      });
  });

  it('t3-1 clean up Customer models', function (done) {
    Customer.destroyAll({}, {}, function (err) {
      if (err) {return done(err);}
      var CustomerAddress = loopback.getModel('CustomerAddress', defaultContext);
      CustomerAddress.destroyAll({}, {}, function (err) {
        return done(err);
      });
    });
  });

  it('t3-2 clean up Employee models', function (done) {
    var Employee = loopback.getModel('Employee', defaultContext);
    Employee.destroyAll({}, { ignoreAutoScope: true }, function (err) {
      if (err) {return done(err);}
      var EmployeeAddress = loopback.getModel('EmployeeAddress', defaultContext);
      EmployeeAddress.destroyAll({}, { ignoreAutoScope: true }, function (err) {
        return done(err);
      });
    });
  });

  it('t4 create record in Customer and CustomerAddress models using single POST operation', function (done) {
    var customerData = {
      'name': 'Atul',
      'age': 10,
      'address': [
        {
          'city': 'delhi'
        },
        {
          'city': 'mumbai'
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
        expect(result.name).to.be.equal('Atul');
        expect(result.address.length).to.be.equal(2);
        expect(result.address[0].city).to.be.equal('delhi');
        expect(result.address[1].city).to.be.equal('mumbai');
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
        expect(result[0].name).be.equal('Atul');
        expect(result[0].address.length).be.equal(2);


        var customerData = result[0];
        customerData.name = 'Atul Modified';
        customerData.address[0].__row_status = 'modified';
        customerData.address[0].city = 'delhi modified';

        customerData.address.push({ city: 'Bangalore', '__row_status': 'added' });


        var url = basePath + '/customers?access_token=' + adminToken;
        api.set('Accept', 'application/json')
          .put(url)
          .send(customerData)
          .end(function (err, response) {
            expect(response.status).to.be.equal(200);
            var result = response.body;
            expect(result.name).to.be.equal('Atul Modified');
            expect(result.address.length).to.be.equal(2);
            expect(result.address[0].city).to.be.equal('delhi modified');
            expect(result.address[1].city).to.be.equal('Bangalore');
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
        expect(result[0].name).be.equal('Atul Modified');
        expect(result[0].address.length).be.equal(3);
        expect(result[0].address.find(function (item) {
          return (item.city === 'delhi modified');
        }).city).to.equal('delhi modified');

        Customer.replaceOrCreate({name:"Smith", age: 40, id : "Smith", address : [{city : "SmithTown"}]}, function(err, inst){
          if(err){
            return done(err);
          }
          expect(inst.name).to.be.equal("Smith");
          return done();
        });



        //return done();
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
          return (item.name === 'Tom' && item.address.city === 'Denver');
        }).name).to.equal('Tom');
        expect(result.find(function (item) {
          return (item.name === 'Harry' && item.address.city === 'London');
        }).name).to.equal('Harry');
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
          return (item.name === 'Tom' && item.address.city === 'Denver');
        }).name).to.equal('Tom');
        expect(result.find(function (item) {
          return (item.name === 'Harry' && item.address.city === 'London');
        }).name).to.equal('Harry');

        var rcd = result[0];
        rcd.name = 'Tom Changed';
        rcd.address.city = 'Denver Changed';
        rcd.address.__row_status = 'modified';
        var id = rcd.id;
        var url = basePath + '/employees/' + id + '?access_token=' + adminToken;
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
      'num': 2,
      'pageRel': {
        'name': 'Inside Java'
      }
    }];

    var url = basePath + '/pages?access_token=' + adminToken;
    api.set('Accept', 'application/json')
      .post(url)
      .send(pageData)
      .end(function (err, response) {
        expect(response.status).to.be.equal(200);
        var results = response.body;

        expect(results.find(function (item) { return item.num === 1; }).num).to.equal(1);
        expect(results.find(function (item) { return item.num === 2; }).num).to.equal(2);
        done();
      });
  });

  it('t6-2 retreive data for belongs to relations (HTTP)', function (done) {
    var url = basePath + '/pages?filter={"include" : "pageRel"}';
    api.set('Accept', 'application/json')
      .get(url)
      .send()
      .end(function (err, response) {
        expect(response.status).to.be.equal(200);
        var results = response.body;

        expect(results.find(function (item) { return (item.num === 1 && item.pageRel.name === 'Inside JavaScript'); }).num).to.equal(1);
        expect(results.find(function (item) { return (item.num === 2 && item.pageRel.name === 'Inside Java'); }).num).to.equal(2);
        done();
      });
  });


  var models = app.models;
  it('t7-1 create composite model', function (done) {
    models.ModelDefinition.create({
      name: 'UpcomingEvent',
      'idInjection': false,
      base: 'BaseEntity',
      'mixins': {
        'VersionMixin': false,
        'IdempotentMixin': false
      },
      properties: {
        'eventName': {
          'type': 'string',
          'required': true
        },
        'eventDescription': {
          'type': 'string'
        },
        'activeFlag': {
          'type': 'boolean'
        }
      },
      relations: {},
      filebased: false
    }, globalCtx, function (err, upcomingEventrcd) {
      if (err) {
        return done(err);
      }
      models.ModelDefinition.create({
        name: 'CompositeModel',
        base: 'BaseEntity',
        'mixins': {
          'VersionMixin': false,
          'IdempotentMixin': false
        },
        strict: false,
        properties: {},
        filebased: false,
        CompositeTransaction: true,
        compositeModels: {
          'Customer': {},
          'UpcomingEvent': {}
        }
      }, globalCtx, function (err, model) {
        return done(err);
      });
    });
  });


  it('t7-2 Composite Model test - should create nested 1 record in customer & 2 record in address and 1 record in UpcomingEvent model ', function (done) {
    var compositeModel = loopback.getModel('CompositeModel', globalCtx);
    compositeModel.create({
      'Customer': [{
        'name': 'Smith',
        'id': 1,
        '__row_status': 'added',
        'address': [{
          'city': 'Delhi',
          'id': 11,
          '__row_status': 'added'
        }, {
          'id': 12,
          'city': 'Mumbai',
          '__row_status': 'added'
        }]
      }],
      'UpcomingEvent': [{
        'eventName': 'A.R. Raheman concert',
        'eventDescription': 'Concert is free for all Icici bank users',
        'activeFlag': true,
        '__row_status': 'added',
        'id': 1
      }]

    }, globalCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results).to.have.property('Customer');
      expect(results.Customer[0]).to.have.property('name');
      expect(results.Customer[0]).to.have.property('address');
      expect(results.Customer[0].name).to.equal('Smith');
      expect(results.Customer[0].address[0].city).to.equal('Delhi');
      expect(results.Customer[0].address[1].city).to.equal('Mumbai');
      expect(results).to.have.property('UpcomingEvent');
      expect(results.UpcomingEvent[0]).to.have.property('eventName');
      expect(results.UpcomingEvent[0].eventName).to.equal('A.R. Raheman concert');

      done();
    });
  });

  it('t7-3 Composite Model test - should create nested 2 record in customer & 4 record in address ', function (done) {
    var compositeModel = loopback.getModel('CompositeModel', globalCtx);
    compositeModel.create({
      'Customer': [{
        'name': 'Williams',
        'id': 2,
        '__row_status': 'added',
        'address': [{
          'city': 'Hyderabad',
          'id': 13,
          '__row_status': 'added'
        }, {
          'id': 14,
          'city': 'Secunderabad',
          '__row_status': 'added'
        }]
      }, {
        'name': 'John',
        'id': 3,
        '__row_status': 'added',
        'address': [{
          'city': 'Bangalore',
          'id': 15,
          '__row_status': 'added'
        }, {
          'id': 16,
          'city': 'Chennai',
          '__row_status': 'added'
        }]
      }],
      'UpcomingEvent': [{
        'eventName': 'India vs Australia match',
        'eventDescription': '50% discount for all Icici bank users',
        'activeFlag': true,
        '__row_status': 'added',
        'id': 2
      },
      {
        'eventName': 'New year celebration',
        'eventDescription': '50% discount for all Icici bank users',
        'activeFlag': true,
        '__row_status': 'added',
        'id': 3
      }
      ]
    }, globalCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results).to.have.property('Customer');
      expect(results.Customer[0]).to.have.property('name');
      expect(results.Customer[0]).to.have.property('address');
      expect(results.Customer[0].name).to.equal('Williams');
      expect(results.Customer[0].address[0].city).to.equal('Hyderabad');
      expect(results.Customer[0].address[1].city).to.equal('Secunderabad');
      expect(results.Customer[1].name).to.equal('John');
      expect(results.Customer[1].address[0].city).to.equal('Bangalore');
      expect(results.Customer[1].address[1].city).to.equal('Chennai');

      expect(results).to.have.property('UpcomingEvent');
      expect(results.UpcomingEvent[0]).to.have.property('eventName');
      expect(results.UpcomingEvent[0].eventName).to.equal('India vs Australia match');
      expect(results.UpcomingEvent[1]).to.have.property('eventName');
      expect(results.UpcomingEvent[1].eventName).to.equal('New year celebration');
      done();
    });
  });


  it('t7-4 should get the customer based on where condition', function (done) {
    var customer = loopback.getModel('Customer', globalCtx);
    customer.find({
      where: {
        'name': 'Smith'
      }
    },
    globalCtx,
    function (err, results) {
      expect(results[0].name).to.equal('Smith');
      done();
    });
  });

  it('t7-4 Composite Model test - 1 customer record should be updated, 1 address recourd should be updated', function (done) {
    var compositeModel = loopback.getModel('CompositeModel', globalCtx);
    compositeModel.create({
      'Customer': [{
        'name': 'Smith_Changed',
        'id': 1,
        '__row_status': 'modified',
        'address': [{
          'city': 'DELHI_CAPITAL',
          'id': 11,
          '__row_status': 'modified'
        }]
      }],
      'UpcomingEvent': [{
        'eventName': 'India vs Australia match - Expired',
        'activeFlag': false,
        '__row_status': 'modified',
        'id': 2
      },
      {
        'eventName': 'New year celebration',
        'eventDescription': '50% discount for all Icici bank users',
        'activeFlag': false,
        '__row_status': 'deleted',
        'id': 3
      }]
    }, globalCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      expect(results).to.have.property('Customer');
      expect(results.Customer[0]).to.have.property('name');
      expect(results.Customer[0]).to.have.property('address');
      expect(results.Customer[0].name).to.equal('Smith_Changed');
      expect(results.Customer[0].address[0].city).to.equal('DELHI_CAPITAL');
      expect(results).to.have.property('UpcomingEvent');
      expect(results.UpcomingEvent[0]).to.have.property('eventName');
      expect(results.UpcomingEvent[0].eventName).to.equal('India vs Australia match - Expired');
      done();
    });
  });


  it('t7-5 should get the customer based on where condition', function (done) {
    var customer = loopback.getModel('Customer', globalCtx);
    customer.find({
      where: {
        'name': 'Smith_Changed'
      }
    }, globalCtx,
    function (err, results) {
      expect(results[0].name).to.equal('Smith_Changed');
      done();
    });
  });

  it('t7-6 should get the CustomerAddress based on where condition', function (done) {
    var customerAddress = loopback.getModel('CustomerAddress', globalCtx);
    customerAddress.find({
      where: {
        'city': 'DELHI_CAPITAL'
      }
    }, globalCtx,
    function (err, results) {
      expect(results[0].city).to.equal('DELHI_CAPITAL');
      // console.log(results[0]);
      expect(results[0].CustomerId.toString()).to.be.equal('1');
      // expect(results[0].customerId === "1" || results[0].customerId === 1).to.be.ok;
      done();
    });
  });

  it('t7-7 do Composite Get', function (done) {
    var compositeModel = loopback.getModel('CompositeModel', globalCtx);
    compositeModel.find({}, globalCtx, function (err, results) {
      // expect(results[0].city).to.equal('DELHI_CAPITAL');
      // console.log(results);
      expect(results.Customer.length).to.be.equal(5);
      expect(results.UpcomingEvent.length).to.be.equal(2);
      return done();
    });
  });

  it('t7-8 create CustomerEnrollment models tenant', function (done) {
    createCustomerEnrollmentModels(done);
  });

  it('t7-9 should insert data in Customer Enrollment Model successfully', function (done) {
    var customerEnrollmentModel = loopback.getModel('CustomerEnrollment', globalCtx);
    customerEnrollmentModel.create({
      'name': 'Prisi',
      'city': 'Patna',
      'id': 1,
      'emailRel':
      {
        'username': 'pri1',
        'password': 'pri1'
      }
    },
    globalCtx, function (err, results) {
      expect(err).to.be.null;
      done();
    });
  });

  it('t7-10 should fail to insert data in Customer Enrollment Model', function (done) {
    var customerEnrollmentModel = loopback.getModel('CustomerEnrollment', globalCtx);
    customerEnrollmentModel.create({
      'name': 'Atul',
      'city': 'Ranchi',
      'id': 2,
      'emailRel': [
        {
          'username': 'kAtul_1',
          'password': 'ArunArun'
        },
        {
          'username': 'kAtul_2',
          'password': 'ArunArun'
        }]
    },
    globalCtx, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });
});
