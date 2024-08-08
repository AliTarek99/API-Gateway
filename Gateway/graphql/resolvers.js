const validation = require('express-validator');
const users = require('../models/users');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../util/util'); 

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
    const check = await users.findOne({
        where: {
            email: email,
        }
    });
    if (check) {
        let err = new Error('User already exists');
        err.statusCode = 400;
        throw err;
    }
    // hash password
    const hash = await bcrypt.hash(password, 10);

    if (type === 'company') {
        // generate secret for authenticator app
        let secret = speakeasy.generateSecret({
            name: "api-gateway"
        }).ascii;

        // generate qrcode for this secret for better user exprerience
        let qr = await qrcode.toDataURL(secret);
        qr.toString('base64');
    }

    // save user to database
    const user = await users.create({
        password: hash,
        email: email,
        type: type,
        secret: secret,
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
    const user = await users.findOne({
        where: {
            email: email,
            password: password
        }
    });
    if (!user) {
        let err = new Error('Invalid credentials');;
        err.statusCode = 400;
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

    if (!user || !user.verified) {
        let err = new Error('UnAuthorized');
        err.statusCode = 401;
        throw err;
    }
    let db;

    if(user.type === 'customer') {
        // db = customer db
    }
    else {
        // db = company db
    }

    const dummy = await db.findOne({
        where: {
            id: id
        }
    });

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

    if(!user || !user.verified) {
        let err = new Error('UnAuthorized');
        err.statusCode = 401;
        throw err;
    }

    let db;

    if(user.type === 'customer') {
        // db = customer db
    }
    else {
        // db = company db
    }

    const dummy = await db.create({
        text: text
    });

    return dummy;
}