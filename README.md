# Model Composite

- [Model Composite](#model-composite)
- [Introduction](#introduction)
  * [Implicit Composite](#implicit-composite)
  * [Explicit Composite](#explicit-composite)
- [Getting Started](#getting-started)
  * [Dependency](#dependency)
  * [Testing and Code coverage](#testing-and-code-coverage)
  * [Installation](#installation)
    + [Attaching to Application](#attaching-to-application)
- [Design](#design)
  * [Wrapper](#wrapper)
- [Implicit Composite](#implicit-composite-1)
  * [Implicit Composite for PUT Operation](#implicit-composite-for-put-operation)
- [Explicit Composite Model](#explicit-composite-model)
- [Using Model Implicit Composite](#using-model-implicit-composite)
  * [Step 1 - Prepare](#step-1---prepare)
  * [Step 2 - Implicit composite in action](#step-2---implicit-composite-in-action)
  * [Step 3 (Test)](#step-3--test-)
  * [Step 4 - PUT operation](#step-4---put-operation)
- [Using Explicit Composite](#using-explicit-composite)
  * [Step 1 - Prepare](#step-1---prepare-1)
  * [Step 2 - Explicit Composite in Action](#step-2---explicit-composite-in-action)
  * [Step 3 ( Test )](#step-3---test--)

# Introduction

In simple words, Model composition is the ability to treat multiple models together as a single entity. This should allow user to do certain operations on multiple models same as you do on single model.
It also allows user to combine non related models and do similar operation you do with single model.

There are two types of model composition. Implicit Composite model and Explicit Composite model.

## Implicit Composite
Loopback provides a way to relate one or more models using relations. oeCloud.io can use these relations while doing get/post operation to retrieve/save data from/to model. For example, you can get or post data to parent model and it's children in single Web API call.

## Explicit Composite
If models are not related and you wish to get or post data of those unrelated model using single operation, you require to construct explicit composite model where you have to tell that newly constructed composite model consists of what all other models.


# Getting Started

In this section, we will see how we can use install this module in your project. To use this feature in project from this module, you must install this module.


## Dependency
* oe-cloud

## Testing and Code coverage

```sh
$ git clone https://github.com/EdgeVerve/oe-model-composite.git
$ cd oe-model-composite
$ npm install --no-optional
$ npm run grunt-cover
```
you should see coverage report in coverage folder.


## Installation

To use oe-model-composite in your project, you must include this package into your package.json as shown below. So when you do **npm install** this package will be made available. Please ensure the source of this package is right and updated. Also, please note that, to use this module, your project must be **oeCloud** based project.


```javascript
"oe-model-composite": "git+https://github.com/EdgeVerve/oe-model-composite.git#2.0.0"
```


```sh
$ npm install <git path oe-model-composite> --no-optional
```


### Attaching to Application

Once you have included into package.json, this module will get installed as part of npm install. However you need to load this module. For that you need to create entry in **app-list.json** file of application.

app-list.json

```javascript

  {
    "path": "oe-model-composite",
    "enabled": true
  }
```


# Design


## Wrapper

This module overrides create, replaceById, updateAttributes etc function of DataAccessObject of loopback-datasource-juggler, Each of these function opens the payload and see if any related model data is present in payload.
If it finds related model data in payload, it executes that first along with actual model payload.




# Implicit Composite

In example below, you have Customer model and CustomerAddress model as child model of it. As a developer, you can use

```javascript
/api/Customers?filter={"include" : "addressRel" }
```

get Customer and CustomerAddress records together with single web API call.
Loopback will internally get CustomerAddress records for each Customer record and embed it as collection (javascript Array)

The response will looks like below


```javascript
[
  {
    "name": "john",
    "age": 35,
    "id": 1,
    "addressRel": [
      {
        "id": 1,
        "customerId": 1,
        "city": "london",
        "country": "UK"
      },
      {
        "id": 2,
        "customerId": 1,
        "city": "new york"
      }
    ]
  },
  {
    "name": "dave",
    "age": 35,
    "id": 2,
    "addressRel": [
      {
        "id": 3,
        "customerId": 2,
        "city": "delhi",
        "country": "India"
      },
      {
        "id": 4,
        "customerId": 2,
        "city": "Mumbai"
      }
    ]
  }
]
```


Please note that URL shown above is in decoded format for better understanding. Actual URL will look like
```
http://localhost:1444/api/Customers?filter=%7B%22include%22%20%3A%20%22accountsRel%22%20%7D
```

With the current features of loopback we can GET the data from customer model as well as from customerAddress and customerEmail models altogether in single Web API call. This can be done using include filter.

```
api/Customer?filter={"include" : ["addressRel", "emailRel"] }
```

*Note that we use relation name when use in 'include' clause.*

Thus, internally, even when there is single get call to Customer, you also get data for two models ( Customer and CustomerAddress ). This is important. Most of the times, in UI screen is driven by parent model entity. (eg Customer with CustomerId=1234).

Usually, you want to bring and show one Customer data and all it's related child data. (eg all his addresses, family members, phone numbers ) on screen.

It would make sense to get driving model data and all related data of child models in single Web service call. And thus user (Browser) will make such request as shown above.

Typically, end user will modify data of parent model and child models records from the screen. Lets assume that user has modified name of Customer model and created new CustomerAddress.

With plain loopback, browser(or equivalent client application) needs to do 'PUT' request on Customer and 'POST' request on 'CustomerAddress'. Therefore, browser will have to make at least two calls to web Server. If there are more child models, for each update on model, browser has to make PUT or POST.


With Implicit Composite models, we can POST an entire model object along with the related model data and execute against the database.
```
{
    "id": 3,
    "name": "Smith",
    "age": 31,
    "customerAddress": [{
        "id": 11,
        "line1": "12, Mountain Ave",
        "city": "Fremont",
        "state": "CA"
    }],
    "customerEmail": [{
        "domain": "xyz",
        "email": "Smith@xyz.com"
    }]
}
```

As shown in above example, if you post the data as above, Customer, CustomerAddress and CustomerEmail  - all of these models will be populated with data posted. Relations will be taken into account and hence in actual database, you could see foreign keys being populated in child tables.


## Implicit Composite for PUT Operation

You may want to update parent and child records together. This can be achieved using implicit composite. Parent model operation is implicit defined, however child models, you have to set operation explicitly using **__row_status** field.

Typical implicit PUT operation would be
```
{
    "id": 3,
    "name": "Smith Modified",
    "age": 35,
    "customerAddress": [{
        "id": 11,
        "line1": "12, Mountain Ave",
        "city": "Fremont",
        "state": "CA",
		"__row_status" : "modified"
    }],
    "customerEmail": [{
        "domain": "xyz",
        "email": "Smith@xyz.com",
		"__row_status" : "deleted"
    },
	{
        "domain": "new",
        "email": "New@xyz.com",
		"__row_status" : "added"
    }
	]
}
```
As shown above for PUT operation on Customer, customerAddress record is modified while one email address is deleted and new one gets added.


# Explicit Composite Model

Consider an example of home page screen where you want to data from multiple models. Consider landing page your typical banking website. When you see your home screen, usually you see following
* Your profile name and other details (coming from UserProfile model)
* All your accounts with account types (savings, current, FD, loan accounts etc) and account balance ( coming from account + accountBalance models)
* Notification and reminders (coming from notification model)
* Your last n transactions (coming from transaction Model )
* List of bank offers and promotions (coming from promotion model)
* List of upcoming events like webinars (coming from upcomingEvents model )

As shown above, customer has many accounts. Account has one accountBalance while each account having multiple transactions.
There are unrelated models like promotion and upcomingEvents.
If you want to construct home page with all this data from all the models shown above, you need to create composite. Specifically, it will be explicit composite model. We will show how this can be done in another section of ‘Using Composite’.


# Using Model Implicit Composite

## Step 1 - Prepare

* Create Customer Model by posting following data to ModelDefinition model using swagger. For simplicity, this model has got only one property 'name'. Note that custoemrAddressRel is being created with 'hasMany' type.

```javascript
{
  "properties": {
  "name"  : {
	"type": "string"
	}
  },
  "readonly": false,
  "name": "customer",
  "description": "customer desc",
  "plural": "customers",
  "base": "BaseEntity",
  "strict": false,
  "public": true,
  "idInjection": false,
  "validateUpsert": false,
  "validations": [
    {}
  ],
  "relations": {

    "addressRel": {
	  "type": "hasMany",
	  "model": "CustomerAddress",
	  "foreignKey": "customerId"
	  }
  },
  "acls": [
    {}
  ],
  "methods": {},
  "id": 1
}
```

* Create CustomerAddress model by posting following to ModelDefinition model using swagger. For simplicity, this model has got only one property 'city'.

```javascript
{
  "properties": {
  "city"  : {
	"type": "string"
	}
  },
  "readonly": false,
  "name": "CustomerAddress",
  "description": "customer desc",
  "plural": "customers",
  "base": "BaseEntity",
  "strict": false,
  "public": true,
  "idInjection": false,
  "validateUpsert": false,
  "validations": [
    {}
  ],
  "relations": {},
  "acls": [
    {}
  ],
  "methods": {},
  "id": 2
}
```

* Refresh swagger UI Page so that and see that both of these models appear.

* Post data to Customer model and customerAddress model as shown

**Customer data**
```javascript
{
	name : 'john',
	id: 1
}
```
CustomerAddress data - two records posted for customerId : 1

```javascript
[
  {
    "city": "new york",
    "id": 1,
    "customerId": 1
  },
  {
    "city": "chicago",
    "id": 2,
    "customerId": 1
  }
]
```
* Get data for customer as well as address using single API call

```javascript
/api/Customers?filter={"include" : "addressRel" }
filter : {"include" : "addressRel" }
```

above, you can execute by putting {"include" : "addressRel" } in filter section.

* you should get data as shown below.

```javascript
[
  {
    "name": "john",
    "id": 1,
    "addressRel": [
      {
        "city": "new york",
        "id": 1,
        "customerId": 1
      },
      {
        "city": "chicago",
        "id": 2,
        "customerId": 1
      }
    ]
  }
]
```

## Step 2 - Implicit composite in action

* Now you try creating new customer and his addresses all together in single post. Remember, we did posted twice before. one for customer and one for addresses.

```javascript
[
  {
    "name": "dave",
    "id": 2,
    "addressRel": [
      {
        "city": "LA",
        "id": 21
      },
      {
        "city": "DC",
        "id": 22
      }
    ]
  }
]
```

Note in above that, with single post, we posted data of customer and addresses. Also tying addresses to customer was implicit.

## Step 3 (Test)

* You should get two records for customerId : 2 (dave) when you query customerAddress. Note customerId : 2 was added

/get/CustomerAddress
filter : {"customerId" : 2 }

```javascript
[
  {
    "name": "john",
    "id": 1,
    "addressRel": [
      {
        "city": "new york",
        "id": 1,
        "customerId": 1
      },
      {
        "city": "chicago",
        "id": 2,
        "customerId": 1
      }
    ]
  },
  {
    "name": "dave",
    "id": 2,
    "addressRel": [
      {
        "city": "LA",
        "customerId": 2,
        "id": 21
      },
      {
        "city": "DC",
        "customerId": 2,
        "id": 22
      }
    ]
  }
]
```

## Step 4 - PUT operation

* You can use PUT operation to update customer record as usual. But implicit composite allows you to post related model data in PUT operation as well. But this time, you need to tell exactly what you want to do with record.


```javascript
{
  "name": "john name changed",
  "id": 1,
  "addressRel": [
    {
      "city": "New York changed",
      "id": 1,
      "customerId": 1,
      "__row_status": "modified"
    },
    {
      "city": "chicago",
      "id": 2,
      "customerId": 1,
      "__row_status": "deleted"
    },
    {
      "city": "SFO",
      "id": 3,
      "customerId": 1,
      "__row_status": "added"
    }
  ]
}
```

* AS you can see above, main customer record (with id=1) is being updated - because of PUT operation. However, for child address records, you need to explicitly give the **__row_status** value to indicate what to do with record. In above example, for the PUT operation, customer's name is updated. Along with it, new record for customer will be created (SFO) while one record (chicago) deleted and one record (new york) is modified. This feature of implicit composite is used in many front end use cases.

# Using Explicit Composite

Let’s consider home page screen we discussed in earlier section where you want to show data from various different models on single screen. This will let you make single web API call and fetch all data of related and unrelated models in one go.

As far as models are unrelated, you need to make composite model. Composite model definition is shown below. It consists of three models. Customer, Promotions and UpcomingEvents.


## Step 1 - Prepare

* Create Customer, Account, AccountTransaction, Promotion and UpcomingEvents model by posting following data to modelDefinition model one by one.

**Customer Model**

```javascript
{
  "properties": {
  "name"  : {
	"type: "string"
	}
  },
  "readonly": false,
  "name": "customer",
  "description": "customer desc",
  "plural": "customers",
  "base": "BaseEntity",
  "strict": false,
  "public": true,
  "idInjection": false,
  "validateUpsert": false,
  "validations": [
    {}
  ],
  "relations": {
    "accountRel": {
	  "type": "hasMany",
	  "model": "Account",
	  "foreignKey": "customerId"
	  }
  },
  "acls": [
    {}
  ],
  "methods": {},
  "id": 1
}
```

**Account Model**

```javascript
{
  "properties": {
  "accountType"  : {
	"type: "string"
	},
  "accountBalance"  : {
	"type: "number"
	}
  },
  "readonly": false,
  "name": "Account",
  "description": "Account desc",
  "plural": "Accounts",
  "base": "BaseEntity",
  "strict": false,
  "public": true,
  "idInjection": false,
  "validateUpsert": false,
  "validations": [
    {}
  ],
  "relations": {

    "transactionRel": {
	  "type": "hasMany",
	  "model": "AccountTransaction",
	  "foreignKey": "accountId"
	  }
  },
  "acls": [
    {}
  ],
  "methods": {},
  "id": 2
}
```

**Account Transaction Model**

```javascript
{
  "properties": {
  "transactionType"  : {
	"type: "string"
	},
  "amount"  : {
	"type: "number"
	}
  },
  "readonly": false,
  "name": "AccountTransaction",
  "description": "Account Transaction desc",
  "plural": "AccountTransactions",
  "base": "BaseEntity",
  "strict": false,
  "public": true,
  "idInjection": false,
  "validateUpsert": false,
  "validations": [
    {}
  ],
  "relations": {  },
  "acls": [
    {}
  ],
  "methods": {},
  "id": 3
}
```

**Upcoming Events**

```javascript
{
  "properties": {
  "eventName"  : {
	"type: "string"
	},
  "active"  : {
	"type: "boolean"
	}
  },
  "readonly": false,
  "name": "UpcomingEvents",
  "description": "Upcoming Events desc",
  "plural": "UpcomingEvents",
  "base": "BaseEntity",
  "strict": false,
  "public": true,
  "idInjection": false,
  "validateUpsert": false,
  "validations": [
    {}
  ],
  "relations": {  },
  "acls": [
    {}
  ],
  "methods": {},
  "id": 4
}
```

**Promotion**

```javascript
{
  "properties": {
  "name"  : {
	"type: "string"
	},
  "active"  : {
	"type: "boolean"
	}
  },
  "readonly": false,
  "name": "Promotion",
  "description": "Promotions desc",
  "plural": "Promotions",
  "base": "BaseEntity",
  "strict": false,
  "public": true,
  "idInjection": false,
  "validateUpsert": false,
  "validations": [
    {}
  ],
  "relations": {  },
  "acls": [
    {}
  ],
  "methods": {},
  "id": 5
}
```

* Creating Composite Model

Use following data to create model. Post following data to ModelDefinition model. Name of the model is HomePageModel. It consists of three models - **Customer**, **UpcomingEvents** and **Promotion**. End user should able to post / get data to all these models together by making single get/post call.


```javascript
{
  "name": "HomePageModel",
  "properties": {},
  "filebased": false,
  "CompositeTransaction": true,
  "compositeModels": {
    "Customer": {},
    "Promotions": {},
    "UpcomingEvents": {}
  }
}
```

* Posting data to Customer, account and Account Transaction model (this is where implicit composite will come into picture as all of these models are related ). Here you will see that we are creating two customers, accounts of those customer and transactions for those accounts in single post.

```javascript
[
  {
    "name": "dave",
    "id": 1,
    "accountRel": [
      {
        "accountType": "savings",
        "id": 1,
        "accountBalance": 800,
        "transactionRel": [
          {
            "transactionType": "credit",
            "amount": 1000
          },
          {
            "transactionType": "debit",
            "amount": 100
          },
          {
            "transactionType": "debit",
            "amount": 100
          }
        ]
      },
      {
        "accountType": "loan",
        "id": 2,
        "accountBalance": 4700,
        "transactionRel": [
          {
            "transactionType": "credit",
            "amount": 5000
          },
          {
            "transactionType": "debit",
            "amount": 200
          }
        ]
      },
      {
        "accountType": "fd",
        "accountBalance": 10000,
        "id": 3
      }
    ]
  },
  {
    "name": "john",
    "id": 2,
    "accountRel": [
      {
        "accountType": "savings",
        "id": 21,
        "accountBalance": 9800,
        "transactionRel": [
          {
            "transactionType": "credit",
            "amount": 10000
          },
          {
            "transactionType": "debit",
            "amount": 100
          },
          {
            "transactionType": "debit",
            "amount": 100
          }
        ]
      },
      {
        "accountType": "fd",
        "accountBalance": 50000,
        "id": 23
      }
    ]
  }
]
```

* Posting data to Upcoming Events and Promotions **one after other**

**Upcoming Event Data**

```javascript
[
    {
        "eventName" : "Property Exhibition",
        "active" :true
    },
    {
        "eventName" : "Webinar on house buying",
        "active" :false
    }
]
```

**Promotion Data**

```javascript
[
    {
        "name" : "Interest Discount Sale for xmas",
        "active" : true
    }
]
```

## Step 2 - Explicit Composite in Action

* Fetching data of Composite Model

/get/HomepageModel

```javascript
filter = { "Customer" : {"where": {"id" : 1 }, "include" : {"accountRel" : "accountTransactionRel"} }, "Promotions" : { "where" : { "active" : true }}, "UpcomingEvent" : {"where" :{"active" : true } } }
```

Note the above format of filter. Filter has object with name of Model in composite. For example, above, it has three objects. Customer, Promotions and UpcomingEvents. Each object has got filter which is same as what is supported by loopback. Here, customer object has filter where clause which returns record for customer id : 1. Also include clause to include accountRel and accountTransactionRel. Promotion and UpcomingEvents has filter to ensure active:true records. This will return data of all the models defined in composite.

```javascript
{
  "Customer": [
    {
      "name": "dave",
      "id": 1,
      "accountRel": [
        {
          "accountType": "savings",
          "id": 1,
          "customerId": 1,
          "accountBalance": 800,
          "transactionRel": [
            {
              "transactionType": "credit",
              "accountId": 1,
              "id": 1,
              "amount": 1000
            },
            {
              "transactionType": "debit",
              "accountId": 1,
              "id": 2,
              "amount": 100
            },
            {
              "transactionType": "debit",
              "accountId": 1,
              "amount": 100
            }
          ]
        },
        {
          "accountType": "loan",
          "id": 2,
          "customerId": 1,
          "accountBalance": 4700,
          "transactionRel": [
            {
              "transactionType": "credit",
              "accountId": 2,
              "id": 3,
              "amount": 5000
            },
            {
              "transactionType": "debit",
              "accountId": 2,
              "id": 4,
              "amount": 200
            }
          ]
        },
        {
          "accountType": "fd",
          "accountBalance": 10000,
          "customerId": 1,
          "id": 3
        }
      ]
    }
  ],
  "UpcomingEvents": [
    {
      "eventName": "Property Exhibition",
      "active": true,
      "id": 1
    }
  ],
  "Promotions": [
    {
      "name": "Interest Discount Sale for xmas",
      "active": true,
      "id": 1
    }
  ]
}
```

* Posting data to Composite Model

This is very tricky part of explicit composite. With this, you should able to add, update or remove records of models using single post. The key is, you must tell what to do with the record by having **__row_status** field for each record.  Consider following post data.

```javascript
{
  "Customer": [
    {
      "name": "dave changed",
      "id": 1,
      "__row_status": "modified",
      "accountRel": [
        {
          "accountType": "savings",
          "id": 1,
          "customerId": 1,
          "accountBalance": 1800,
          "__row_status": "modified",
          "transactionRel": [
            {
              "transactionType": "credit",
              "id": 1,
              "amount": 1000,
              "__row_status": "added"
            }
          ]
        },
        {
          "accountType": "loan",
          "id": 2,
          "customerId": 1,
          "accountBalance": 4600,
          "__row_status": "modified",
          "transactionRel": [
            {
              "transactionType": "debit",
              "accountId": 2,
              "id": 3,
              "amount": 100,
              "__row_status": "added"
            }
          ]
        }
      ]
    }
  ],
  "UpcomingEvents": [
    {
      "eventName": "Property Exhibition",
      "active": true,
      "__row_status": "deleted",
      "id": 1
    }
  ],
  "Promotions": [
    {
      "name": "Interest Discount Sale for xmas",
      "active": false,
      "__row_status": "modified",
      "id": 1
    }
  ]
}
```
If you see above, we removed upcomingEvent record as __row_status was set to **deleted**.
Promotion record was updated with active status set to false.
Customer record was updated with name was changed.
Account records of customer was updated with new balance.
AccountTransaction model has new records created as row_status was added.

This entire operation would run in single transaction and any of that is failed, transaction would be rolled back.

## Step 3 ( Test )

* You should see in mongo database directly and see Customer record is changed
* You should see Account collection of mongo db to see AccountBalance is updated
* You should see in AccountTransaction collection that new entries are created.

Same you can see by querying following in swagger.


```javascript
filter = { "Customer" : {"where": {"id" : 1 }, "include" : {"accountRel" : "accountTransactionRel"} }, "Promotions" : { "where" : { "active" : true }}, "UpcomingEvent" : {"where" :{"active" : true } } }
```

You should not get anything in Promotion and UpcomingEvent model.

