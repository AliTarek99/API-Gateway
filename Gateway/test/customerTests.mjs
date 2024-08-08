import { expect } from 'chai';
import { register, login, getDummy, insertDummy, verifyCode } from '../graphql/resolvers.js';
import Sinon from 'sinon';
import { PrismaClient as compdb_client } from '../prisma/clients/generated/comp-prisma-client';
import { PrismaClient as custdb_client } from '../prisma/clients/generated/cust-prisma-client';

it('should be able to register customer account', async function () {
    let args = {
        registerregisterInput: {
            email: 'EMAIL@EMAIL.COM',
            password: 'test123',
            type: 'customer'
        }
    };
    Sinon.stub(compdb_client, 'users.findFirst').returns(null);
    Sinon.stub(custdb_client, 'users.findFirst').returns(null);

    Sinon.stub(custdb_client, 'users.create').returns({
        id: 1,
        email: 'EMAIL',
        password: 'test123',
        type: 'customer'
    });

    Sinon.stub(bcrypt, 'hash').returns('hashedpassword');


    expect(register.bind(this, args)).to.be.an('object');
    expect(register.bind(this, args)).to.have.property('id');
    expect(register.bind(this, args)).to.not.have.property('password');
});