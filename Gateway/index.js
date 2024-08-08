const express = require('express');
const app = express();
const schema = require('./graphql/schema');
const resolver = require('./graphql/resolvers');
const { graphqlHTTP } = require('graphql-http');
const { verifyToken, initDB, errorhandler } = require('./util/util');

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


app.use('/', verifyToken, graphqlHTTP({
    schema: schema,
    rootValue: resolver,
    customFormatErrorFn: errorhandler
}));

app.use(errorhandler);

app.listen(process.env.port || 3000);