A Javascript wrapper based on "myFMApiLibrary for Javascript" by Lesterius (Claris) and using axios library to perform REST request to the FileMaker Data Api
=======================

# Presentation


## Description
This library is a rework of this very good [library](https://github.com/myFMbutler/myFMApiLibrary-for-JS).
The addition of this present library is to use axios in order to generate Promises. It is also available on npm


You will be able to use every functions like it's documented in your FileMaker server Data Api documentation (accessible via https://[your server domain]/fmi/data/apidoc).
General Claris document on the Data API is available [here](https://help.claris.com/en/data-api-guide/)


## Installation

The recommended way to install it is with :

```bash
npm install fm-data-api
```

After installing, you can call this javascript library by adding:

```js
import DataApi from 'fm-data-api'
```

In your Javascript application.

# Usage

## Prepare your FileMaker solution

1. Enable the FileMaker Data API option on your FileMaker server admin console.
2. Create a specific user in your FileMaker database with the 'fmrest' privilege
3. Define records & layouts access for this user

## Use the library

### Login

Login with credentials:
```javascript
let options = {
        'apiUrl': 'https://test.fmconnection.com/fmi/data',
        'databaseName' : 'MyDatabase',
        'login' : 'filemaker api user',
        'password' : 'filemaker api password'
    };

let api = new DataApi(options);
```

Login with oauth:
```javascript
let options = {
        'apiUrl': 'https://test.fmconnection.com/fmi/data',
        'databaseName' : 'MyDatabase',
        'oAuthRequestId' : 'oAuthIdentifier',
        'oAuthIdentifier' : 'oAuthIdentifier'
    };

let api = new DataApi(options);
```

Use only generated token:
```javascript
let options = {
        'apiUrl': 'https://test.fmconnection.com/fmi/data',
        'databaseName' : 'MyDatabase',
        'token' : 'generated token'
    };

let api = new DataApi(options);
```

To re generate a token, use 'login' function.

*/!\\* **Not available with 'Login with token' method, use 'setApiToken' function.**

### Logout

```javascript
dataApi.logout();
```

### Validate Session

```javascript
dataApi.validateSession();
```

### Create record

```javascript
let data = {
    'FirstName'         : 'John',
    'LastName'          : 'Doe',
    'email'             : 'johndoe@acme.inc'
};

let scripts = [
    {
        'name'  : 'ValidateUser',
        'param' : 'johndoe@acme.inc',
        'type'  : SCRIPT_PREREQUEST
    },
    {
        'name'  : 'SendEmail',
        'param' : 'johndoe@acme.inc',
        'type'  : SCRIPT_POSTREQUEST
    }
];

let portalData = {
  'portalName or OccurenceName' : [
      {
          "Occurence::PortalField 1" : "Value",
          "Occurence::PortalField 2" : "Value",
      }
  ]
 };

dataApi.createRecord('layout name', data, scripts, portalData).then((recordId) => {
    console.log(recordId)
    // display the recordId's new record.
});
```

### Delete record

```javascript
dataApi.deleteRecord('layout name', recordId, script);
```

### Edit record

```javascript
  dataApi.editRecord('layout name', recordId, data, lastModificationId, portalData, scripts).then((recordId) => {
    console.log(recordId)
    // display the recordId's edit record.
});
```

### Duplicate record

```javascript
  dataApi.duplicateRecord('layout name', recordId, scripts).then((recordId) => {
    console.log(recordId)
    // display the recordId's new record.
});
```

### Get record

```javascript
let portals = [
    {
        'name'  : 'Portal1',
        'limit' : 10
    },
    { 
        'name'   : 'Portal2',
        'offset' : 3
    }
];

dataApi.getRecord('layout name', recordId, portals, scripts).then((record) => {
    console.log(record)
    // display the wished record.
});
```

### Get records

```javascript

let sort = [
    {
        'fieldName' : 'FirstName',
        'sortOrder' : 'ascend'
    },
    {
        'fieldName' : 'City',
        'sortOrder' : 'descend'
    }
];

dataApi.getRecords('layout name', sort, offset, limit, portals, scripts).then((record) =>{
    console.log(record)
    // display the wished records.
});
```

### Find records

```javascript

let query = [
    {
        'fields'  : [
            {'fieldname' : 'FirstName', 'fieldvalue' : '==Test'},
            {'fieldname' : 'LastName', 'fieldvalue' : '==Test'},
        ],
        'options' : {'omit': false}
    }
];

dataApi.findRecords('layout name', query, sort, offset, limit,  portals, scripts, dataInfo, responseLayout).then((record) => {
    console.log(record)
    // display the wished record.
});
```

### Set global fields

```javascript

let data = {
  'FieldName1'	: 'value',
  'FieldName2'	: 'value'
};

dataApi.setGlobalFields('layout name', data);
```

### Execute script

```javascript
dataApi.executeScript('script name', scriptsParams).then((result) => {
    console.log(result)
    // display the script result.
});
```

### Upload file to container

```javascript
dataApi.uploadToContainer('layout name', recordId, containerFieldName, containerFieldRepetition, file);

```

### Metadata Info

#### Product Info
```javascript
dataApi.getProductInfo();
```

#### Database Names

*/!\\* **Not available with 'Login with token' method**

```javascript
dataApi.getDatabaseNames();
```

#### Layout Names
```javascript
dataApi.getLayoutNames();
```

#### Script Names
```javascript
dataApi.getScriptNames();
```

#### Layout Metadata
```javascript
dataApi.getLayoutMetadata('layout name', recordId);
```
