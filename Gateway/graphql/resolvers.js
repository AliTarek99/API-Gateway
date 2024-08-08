const validation = require('express-validator');
const users = require('../models/users');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../util/util');
const { PrismaClient: compdb_client } = require('../prisma/clients/generated/comp-prisma-client');
const { PrismaClient: custdb_client } = require('../prisma/clients/generated/cust-prisma-client');

exports.register = async (args) => {
    const { password, email, type } = args.registerregisterInput;

    // validate inputs
    if (!email || !validation.isEmail(email)) {
        let err = new Error('Invalid email');
        err.statusCode = 400;
        throw err;
    }

    if (!password || password.length < 6) {
        let err = new Error('Password must be at least 6 characters');
        err.statusCode = 400;
        throw err;
    }

    if (!type || !['customer', 'company'].includes(type)) {
        let err = new Error('Invalid type');
        err.statusCode = 400;
        throw err;
    }


    // check if user exists
    let promises = [];
    promises.push(compdb_client.users.findFirst({
        where: {
            email: email,
            password: password
        },
        select: {
            id: true,
            type: true,
            secret: true,
            auth: true
        }
    }));
    promises.push(custdb_client.users.findFirst({
        where: {
            email: email,
            password: password
        },
        select: {
            id: true,
            type: true,
        }
    }));

    await Promise.all(promises);

    let check = promises[0] || promises[1];


    if (check) {
        let err = new Error('User already exists');
        err.statusCode = 400;
        throw err;
    }
    // hash password
    const hash = await bcrypt.hash(password, 10);
    let db = custdb_client;

    if (type === 'company') {
        // generate secret for authenticator app
        let secret = speakeasy.generateSecret({
            name: "api-gateway"
        }).ascii;

        // generate qrcode for this secret for better user exprerience
        var qr = await qrcode.toDataURL(secret);
        db = compdb_client;
    }

    // save user to database
    const user = await db.users.create({
        data: {
            password: hash,
            email: email,
            type: type,
            secret: secret,
        }
    });
    user.qrcode = qr;
    return user;
};

exports.login = async (args) => {
    const { email, password } = args.loginInput;

    // validate inputs
    if (!email || !validation.isEmail(email)) {
        let err = new Error('Invalid email');
        err.statusCode = 400;
        throw err;
    }

    // check if user exists
    let promises = [];
    promises.push(compdb_client.users.findFirst({
        where: {
            email: email,
            password: password
        },
        select: {
            id: true,
            type: true,
            secret: true,
            auth: true
        }
    }));
    promises.push(custdb_client.users.findFirst({
        where: {
            email: email,
            password: password
        },
        select: {
            id: true,
            type: true,
        }
    }));

    await Promise.all(promises);

    let user = promises[0] || promises[1];

    if (!user) {
        let err = new Error('Invalid credentials');;
        err.statusCode = 400;
        throw err;
    }

    if(user.type === 'company' && user.auth === false){
        let err = new Error('Account not verified');
        err.statusCode = 400;
        err.qrcode = await qrcode.toDataURL(user.secret);
        throw err;
    }


    // generate jwt
    const token = jwt.sign({
        id: user.id,
        type: user.type,
        verified: type === 'customer' ? true : false
    }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
    return {
        token: token,
        ...user
    };
};

exports.verifyCode = async (args, req) => {
    const user = req.user;

    if (!user || user.type !== 'company') {
        let err = new Error('Not Found!');
        err.statusCode = 404;
        throw err;
    }

    // get secret from database
    const secret = await users.findOne({
        where: {
            id: user.id
        },
        attributes: ['secret']
    });


    const { code } = args;
    // check if code is valid
    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'ascii',
        token: code
    });
    if (!verified) {
        throw new Error('Invalid code');
    }
    // generate jwt
    const token = jwt.sign({
        id: user.id,
        type: user.type,
        verified: true
    }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
    return {
        token: token,
        ...user
    };
}

exports.getDummy = async (args, req) => {
    const { id } = args;
    let user = req.user;

    // check if user is authorized to access this
    if (!user || !user.verified) {
        let err = new Error('UnAuthorized');
        err.statusCode = 401;
        throw err;
    }

    // choose which database to handle user request
    let db;
    if (user.type === 'customer') {
        db = custdb_client;
    }
    else {
        db = compdb_client;
    }

    // get dummy from database
    const dummy = await db.dummy.findFirst({
        where: {
            id: id
        }
    });

    // check if dummy exists
    if (!dummy) {
        let err = new Error('Not Found');
        err.statusCode = 404;
        throw err;
    }

    return dummy;
}

exports.insertDummy = async (args, req) => {
    const { text } = args;
    let user = req.user;

    // check if user is verified
    if (!user || !user.verified) {
        let err = new Error('UnAuthorized');
        err.statusCode = 401;
        throw err;
    }

    // choose which database to handle user request
    let db;
    if (user.type === 'customer') {
        db = custdb_client;
    }
    else {
        db = compdb_client;
    }

    // insert dummy to database
    const dummy = await db.dummy.create({
        text: text
    });

    return dummy;
}