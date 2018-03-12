import { Router } from 'express'
import { User } from '../model/User'
import { Meta } from '../model/Meta'

const uuid = require('node-uuid');
const MongoUtil = require('../MongoUtil');
const users: Router = Router();

// 新規ユーザー登録
users.post('/', function (req, res, next) {
    MongoUtil.connect((err, db) => {
        if (err) {
            res.status(500).send({ meta: new Meta(500, "DB connect err") });
            return;
        }
        var countersTable = db.collection('counters');
        var usersTable = db.collection('users');
        countersTable.findAndModify({ name: "user_id" }, [], { $inc: { seq: 1 } }, { new: true }, (err, ret) => {
            var newUser = new User(process.env.USER_ID_PREFIX + ret.value.seq, "No name");
            newUser.secret = {
                token: uuid.v4()
            };
            usersTable.insert(newUser);
            res.status(201).send({
                meta: new Meta(201),
                data: {
                    user: { newUser }
                }
            });
        });
    });
});

// ログイン（登録済みユーザーからリソースサーバへアクセスすためのセッションを取得）
users.get('/', function (req, res, next) {
    var id: string = req.body.id;
    var token: string = req.body.token;
    if (!id || !token) {
        res.status(400).send({ meta: new Meta(400, "Bad request") });
        return;
    }
    MongoUtil.connect((err, db) => {
        if (err) {
            res.status(500).send({ meta: new Meta(500, "DB connect err") });
            return;
        }
        var usersTable = db.collection('users');
        usersTable.findOne({ id: id, secret: { token: token } }, (err, result) => {
            if (err) {
                res.status(500).send({ meta: new Meta(500, "DB request err") });
                return;
            }
            if (!result) {
                res.status(404).send({ meta: new Meta(404, "Not found") });
                return;
            }
            var session = ""; // TODO: make session
            res.send({ meta: new Meta(200), data: { session: session } });
        });
    });
});

// ユーザー情報（公開情報）を取得
users.get('/:id', function (req, res, next) {
    MongoUtil.connect((err, db) => {
        if (err) {
            res.status(500).send({ meta: new Meta(500, "DB connect err") });
            return;
        }
        var usersTable = db.collection('users');
        usersTable.findOne({ id: req.params.id }, (err, result) => {
            if (err) {
                res.status(500).send({ meta: new Meta(500, "DB request err") });
                return;
            }
            if (!result) {
                res.status(404).send({ meta: new Meta(404, "Not found") });
                return;
            }
            result.secret = undefined;
            res.send({ meta: new Meta(200), data: { user: result } });
        });
    });
});

export default users;
