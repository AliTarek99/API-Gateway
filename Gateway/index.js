const express = require('express');
const app = express();
const schema = require('./graphql/schema');
const resolver = require('./graphql/resolvers.js');
const { graphqlHTTP } = require('express-graphql');
const { verifyToken, errorhandler } = require('./util/util');

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

app.listen(process.env.port || 3000);