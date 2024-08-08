import { expect } from 'chai';
import { register, login, getDummy, insertDummy, verifyCode } from '../graphql/resolvers.js';
import Sinon from 'sinon';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import { PrismaClient as compdb_class } from '../prisma/src/generated/comp-prisma-client/index.js';
import { PrismaClient as custdb_class } from '../prisma/src/generated/cust-prisma-client/index.js';

describe('Company Tests', function () {
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
        it('should be able to register company account', async function () {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'company'
                }
            };

            Sinon.stub(bcrypt, 'hash');
            bcrypt.hash.returns('hashedpassword')

            const tmp = await register(args);

            expect(tmp).to.have.property('id');
            expect(tmp).to.have.property('errors').empty;
            expect(tmp).to.not.have.property('password');
            expect(tmp).to.have.property('qrcode');
        });

        it('should not be able to register because of duplicate email', async function () {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'company'
                }
            };
            await register(args);
            const tmp = await register(args)

            expect(tmp).to.have.property('errors').length(1);
        });

    });

    describe('Login', function() {
        it('should be able to login', async function() {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'company'
                }
            };

            await register(args);
            args.loginInput = args.registerInput;
            delete args.loginInput.type;
            
            Sinon.stub(bcrypt, 'compare');
            bcrypt.compare.returns(true);

            Sinon.stub(Promise, 'all');
            Promise.all.returns([{id: 1, type: 'company', secret: 'secret', auth: true}, null])

            const result = await login(args);

            expect(result).to.be.an('object');
            expect(result).to.has.property('token');
            expect(result).to.have.property('errors').empty;
            expect(result).to.not.have.property('secret');
            expect(result).to.have.property('id');
        });

        it('should not be able to login because of not being verified', async function() {
            let args = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'company'
                }
            };

            await register(args);
            args.loginInput = args.registerInput;
            delete args.loginInput.type;

            Sinon.stub(bcrypt, 'compare');
            bcrypt.compare.returns(true);

            Sinon.stub(Promise, 'all');
            Promise.all.returns([{id: 1, type: 'company', secret: 'secret', auth: false}, null]);

            const result = await login(args);
            
            expect(result).to.have.property('errors').length(1);
            expect(result.errors[0]).to.have.property('code').equal(6)
            expect(result).to.have.property('qrcode');
        });

        it('should be able to verify code', async function() {
            let registerArgs = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'company'
                }
            };
            let args = {
                code: '123456'
            };
            let req = {
                user: {
                    id: 1,
                    type: 'company',
                }
            };

            const tmp = await register(registerArgs);
            req.user.id = tmp.id;

            Sinon.stub(speakeasy.totp, 'verify');
            speakeasy.totp.verify.returns('123456');

            const result = await verifyCode(args, req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('id');
            expect(result).to.have.property('errors').empty;
            expect(result).to.have.property('token');
        });

        it('should not be able to verify code due to invalid code', async function() {
            let registerArgs = {
                registerInput: {
                    email: 'email@gmail.com',
                    password: 'test123',
                    type: 'company'
                }
            };
            let args = {
                code: '123456'
            };
            let req = {
                user: {
                    id: 1,
                    type: 'company',
                }
            };

            const tmp = await register(registerArgs);
            req.user.id = tmp.id;

            Sinon.stub(speakeasy.totp, 'verify');
            speakeasy.totp.verify.returns(false);

            const result = await verifyCode(args, req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').length(1);
            expect(result.errors[0]).to.have.property('code').equal(8);

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
                    type: 'company'
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
                    type: 'company'
                }
            };

            const result = await insertDummy(args, req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').length(1);
        });
        
        it('should not be able to get company dummy using customer account', async function() {
            let args = {
                text: 'testing dummy'
            }
            let req = {
                user: {
                    verified: true,
                    id: 1,
                    type: 'company'
                }
            };

            const dummy = await insertDummy(args, req);

            req.user.type = 'customer';

            const result = await getDummy({id: dummy.id}, req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('errors').length(1);
            expect(result.errors[0]).to.have.property('code').equal(404);
        });

    });

});