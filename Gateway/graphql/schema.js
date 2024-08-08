const { buildSchema } = require('graphql');

const schema = buildSchema(`
    type User {
        id: ID!
        qrcode: String
        type: String!
        jwt: String
    }

    input registerInput {
        password: String!
        email: String!
        type: String!
    }

    input LoginInput {
        email: String!
        password: String!
    }

    type dummy {
        id: ID!
        text: String!
    }


    type Query {
        getDummy(id: ID): dummy;
    }


    type Mutation {
        register(registerInput: registerInput): User
        login(loginInput: LoginInput): User
        verifyCode(code: String): User
        insertDummy(text: String): dummy;
    }

`);

module.exports = schema;