const validator = require('validator');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const compdb_class = require('../prisma/src/generated/comp-prisma-client/index.js').PrismaClient;
const custdb_class = require('../prisma/src/generated/cust-prisma-client/index.js').PrismaClient;

const compdb_client = new compdb_class();
const custdb_client = new custdb_class();


exports.register = async (args) => {
    const { password, email, type } = args.registerInput;
    let errors = [];
    // validate inputs
    if (!email || !validator.isEmail(email)) {
        errors.push({message: 'Invalid email', code: 1});
    }

    if (!password || password.length < 6) {
        errors.push({message: 'Password must be at least 6 characters', code: 2});
    }

    if (!type || !['customer', 'company'].includes(type)) {
        errors.push({message: 'Invalid type', code: 3});
    }

    // if there are errors return them
    if(errors.length > 0)
        return {
            errors: errors
        };


    // check if user exists
    let promises = [];
    promises.push(compdb_client.users.findFirst({
        where: {
            email: email,
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
        },
        select: {
            id: true,
            type: true,
        }
    }));

    promises = await Promise.all(promises);

    let check = promises[0] || promises[1];


    if (check) {
        errors.push({message: 'Email already exists', code: 4});
        return {
            errors: errors
        };
    }
    // hash password
    const hash = await bcrypt.hash(password, 10);
    let db = custdb_client;

    if (type === 'company') {
        // generate secret for authenticator app
        var secret = speakeasy.generateSecret({
            name: "api-gateway"
        }).ascii;

        // generate qrcode for this secret for better user exprerience
        var qr = await qrcode.toDataURL(secret);
        db = compdb_client;
    }

    // save user to database
    let data = {
        password: hash,
        email: email,
        type: type,
    }
    if(type === 'company') {
        data.secret = secret;
        data.auth = false;
    }

    const res = await db.users.create({
        data: data,
        select: {
            id: true
        }
    });
    res.errors = errors;
    res.qrcode = qr;
    res.token = jwt.sign({
        id: res.id,
        type: type,
        verified: type === 'customer' ? true : false
    }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
    return res;
};

exports.login = async (args) => {
    const { email, password } = args.loginInput;
    let errors = [];
    // validate inputs
    if (!email || !validator.isEmail(email)) {
        errors.push({message: 'Invalid email', code: 1});
        return {
            errors: errors
        };
    }

    // check if user exists
    let promises = [];
    promises.push(compdb_client.users.findFirst({
        where: {
            email: email,
        },
        select: {
            id: true,
            type: true,
            secret: true,
            auth: true,
            password: true
        }
    }));
    promises.push(custdb_client.users.findFirst({
        where: {
            email: email,
        },
        select: {
            id: true,
            type: true,
            password: true
        }
    }));

    promises = await Promise.all(promises);

    let user = promises[0] || promises[1];


    if (!user || !(await bcrypt.compare(password, user.password))) {
        errors.push({message: 'Invalid credentials', code: 5});
        return {
            errors: errors
        };
    }

    // check if user is verified
    if(user.type === 'company' && user.auth === false){
        errors.push({message: 'Account not verified', code: 6});
        return {
            errors: errors,
            qrcode: await qrcode.toDataURL(user.secret)
        }
    }


    // generate jwt
    const token = jwt.sign({
        id: user.id,
        type: user.type,
        verified: user.type === 'customer' ? true : false
    }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });

    delete user.secret;
    delete user.auth;
    delete user.password;
    delete user.type;

    return {
        errors: [],
        token: token,
        ...user
    };
};

exports.verifyCode = async (args, req) => {
    let user = req.user;
    let errors = [];
    if (!user || user.type !== 'company') {
        errors.push({message: 'Not Found!', code: 404});
        return {
            errors: errors
        };
    }

    // get secret from database
    user = await compdb_client.users.findFirst({
        where: {
            id: user.id
        },
        select: {
            id: true,
            secret: true,
            auth: true
        }
    });


    const { code } = args;
    // check if code is valid
    const verified = speakeasy.totp.verify({
        secret: user.secret,
        encoding: 'ascii',
        token: code
    });
    if (!verified) {
        errors.push({message: 'Invalid code', code: 8});
        return {
            errors: errors
        };
    }

    if(!user.auth) {
        // update user in database
        await compdb_client.users.update({
            where: {
                id: user.id
            },
            data: {
                auth: true
            }
        });
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
        errors: [],
        token: token,
        ...user
    };
}

exports.getDummy = async (args, req) => {
    const { id } = args;
    let user = req.user, errors = [];

    // check if user is authorized to access this
    if (!user || !user.verified) {
        errors.push({message: 'UnAuthorized', code: 401});
        return {
            errors: errors
        };
    }

    // choose which database to handle user request
    let db;
    if (user.type === 'customer') {
        db = custdb_client;
    }
    else if (user.type === 'company') {
        db = compdb_client;
    }
    else {
        errors.push({message: 'UnAuthorized', code: 401});
        return {
            errors: errors
        };
    }

    // get dummy from database
    const dummy = await db.dummy.findFirst({
        where: {
            id: id
        }
    });

    // check if dummy exists
    if (!dummy) {
        errors.push({message: 'Not Found!', code: 404});
        return {
            errors: errors
        };
    }

    return {
        errors: [],
        ...dummy
    }
}

exports.insertDummy = async (args, req) => {
    const { text } = args;
    let user = req.user;
    let errors = [];
    // check if user is verified
    if (!user || !user.verified) {
        errors.push({message: 'UnAuthorized', code: 401});
        return {
            errors: errors
        };
    }

    // choose which database to handle user request
    let db;
    if (user.type === 'customer') {
        db = custdb_client;
    }
    else if (user.type === 'company') {
        db = compdb_client;
    }
    else {
        errors.push({message: 'UnAuthorized', code: 401});
        return {
            errors: errors
        };
    }


    // insert dummy to database
    const dummy = await db.dummy.create({
        data: {
            text: text
        }
    });

    if (!dummy) {
        errors.push({message: 'Not Found', code: 404});
        return {
            errors: errors
        };
    }

    return {
        errors: [],
        ...dummy
    }
}