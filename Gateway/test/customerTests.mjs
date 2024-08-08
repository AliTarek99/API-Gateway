import { expect } from 'chai';
import { register, login, getDummy, insertDummy, verifyCode } from '../graphql/resolvers.js';
import Sinon from 'sinon';
import bcrypt from 'bcrypt';
import { PrismaClient as compdb_class } from '../prisma/src/generated/comp-prisma-client/index.js';
import { PrismaClient as custdb_class } from '../prisma/src/generated/cust-prisma-client/index.js';

describe('Customer Tests', function () {
    let compdb_client = new compdb_class();
    let custdb_client = new custdb_class();

    beforeEach(async function () {
        let promises = [];
        promises.push(custdb_client.dummy.deleteMany());
        promises.push(custdb_client.users.deleteMany());
        promises.push(compdb_client.users.deleteMany());
        promises.push(compdb_client.dummy.deleteMany());
        await Promise.all(promises);
    });

    afterEach(function () {
        Sinon.restore();
    });

    describe('Register', function() {
        it('should be able to register customer account', async function () {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'customer'
                }
            };
        
            Sinon.stub(bcrypt, 'hash');
            bcrypt.hash.returns('hashedpassword');
        
            const tmp = await register(args);
        
            expect(tmp).to.be.an('object');
            expect(tmp).to.have.property('id');
            expect(tmp).to.not.have.property('password');
            expect(tmp).to.have.property('errors').empty;
        });
    
        it('should not be able to register because of duplicate email', async function () {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'customer'
                }
            };
            await register(args);
            const tmp = await register(args);
    
            expect(tmp).to.be.an('object');
            expect(tmp).to.have.property('errors').that.has.lengthOf(1);
        });
    
        it('should not be able to register because of duplicate email in a different database', async function () {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'customer'
                }
            };
    
            await register(args);
            args.registerInput.type = 'company';
    
            const tmp = await register(args);
    
            expect(tmp).to.be.an('object');
            expect(tmp).to.have.property('errors').that.has.lengthOf(1);
            expect(tmp.errors[0]).to.have.property('message').equal('Email already exists');
        });
    
        it('should not be able to register because of invalid input', async function() {
            let args = {
                registerInput: {
                    email: 'EMAIL',
                    password: 'test3',
                    type: 'customr'
                }
            };
    
            const result = await register(args);
    
            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').that.has.lengthOf(3);
            expect(result.errors[0]).to.have.property('code').equal(1);
            expect(result.errors[1]).to.have.property('code').equal(2);
            expect(result.errors[2]).to.have.property('code').equal(3);
        })
    });

    describe('Login', function() {
        
        it('should be able to login', async function() {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'customer'
                }
            };

            await register(args);
            args.loginInput = args.registerInput;
            delete args.loginInput.type;

            const result = await login(args);

            expect(result).to.be.an('object');
            expect(result).to.have.property('token');
            expect(result).to.have.property('errors').empty;
        });

        it('should not be able to login because of invalid credentials', async function() {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'customer'
                }
            };

            await register(args);
            args.loginInput = args.registerInput;
            delete args.loginInput.type;
            args.loginInput.password = 'test1234';

            const result = await login(args);

            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').that.has.lengthOf(1);
            expect(result.errors[0]).to.have.property('code').equal(5);
        });   
    });

    describe('Dummy', function() {
        it('should be able to insert dummy', async function() {
            let args = {
                text: 'testing dummy'
            }
            let req = {
                user: {
                    verified: true,
                    id: 1,
                    type: 'customer'
                }
            };

            const result = await insertDummy(args, req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').empty;
            expect(result).to.have.property('id');
            expect(result).to.have.property('text');

        });

        it('should not be able to insert dummy because user is not verified', async function() {
            let args = {
                text: 'testing dummy'
            }
            let req = {
                user: {
                    verified: false,
                    id: 1,
                    type: 'customer'
                }
            };

            const result = await insertDummy(args, req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').length(1);
        });
        
        it('should be able to get dummy', async function() {
            let args = {
                text: 'testing dummy'
            }
            let req = {
                user: {
                    verified: true,
                    id: 1,
                    type: 'customer'
                }
            };

            const dummy = await insertDummy(args, req);

            const result = await getDummy({id: dummy.id}, req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').empty;
            expect(result).to.have.property('id');
            expect(result).to.have.property('text');

        });
    });

});
