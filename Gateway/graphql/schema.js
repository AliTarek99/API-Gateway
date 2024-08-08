const { buildSchema } = require('graphql');

const schema = buildSchema(`
    type error {
        message: String
        code: Int
    }

    type User {
        errors: [error]!
        id: ID
        qrcode: String
        token: String
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
        id: ID
        text: String
        errors: [error]!
    }


    type Query {
        getDummy(id: ID): dummy
    }


    type Mutation {
        register(registerInput: registerInput): User
        login(loginInput: LoginInput): User
        verifyCode(code: String): User
        insertDummy(text: String): dummy
    }

`);

module.exports = schema;