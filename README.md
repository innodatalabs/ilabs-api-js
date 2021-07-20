# ilabs-api-js

NodeJS client for InnodataLabs prediction microservices.

## Installation
```bash
npm i @innodatalabs/ilabs-api
```

## Example
```js
const Client = require('@innodatalabs/ilabs-api');

const userKey = ...;  // this is your secret API access key
const domain = ...;   // prediction domain to use

const client = new Client({userKey});

async function predict(domain, content) {
    const result = await client.call(domain, content);
    return result.toString();
}

predict(domain, 'Some input text (or file, or Buffer)').then(console.log).catch(console.error);
```

## API

### Concepts
InnodataLabs prediction microservices are RESTful services. Each service takes one binary string (e.g. NodeJS Buffer object), and
returns binary string (another NodeJS Buffer object). Input/output types are typically UTF-8 encoded strings, but please consult
the documentation of the particular prediction domain for the explanation of input/output format.

InnodataLabs RESTful endpoint lives at https://ilabs-api.innodata.com/v1. This endpoints hosts multiple services. A string that we
call **prediction domain** identifies concrete service.

### Client

Constructor arguments:

* `userKey` - required to access the API
* `endpoint` - (optional) can be used to switch to the alternative endpoint (staging, testing)
* `userAgent` - (optional) user agent string to send to the endpoint

### async Client.call(domain, content)
Asynchronous method that does the prediction.

Arguments:

* `domain` - prediction domain (required)
* `content` - the content. Can be one of:
    - string - will be encoded with UTF-8
    - NodeJS Buffer object - its content will be sent to the endpoint
    - NodeJS Stream - stream content will be piped into the remote endpoint

Returns:

NodeJS Buffer object
