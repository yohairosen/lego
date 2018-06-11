'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.MysqlDriver = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.setPoolIdleTimeout = setPoolIdleTimeout;

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function setPoolIdleTimeout(timeout) {
    // pg.defaults.poolIdleTimeout = timeout;
}

var queryFormat = function queryFormat(query, values) {
    if (!values) return query;
    return query.replace(/\$(\d+)/g, function (match, index) {
        if (values[index - 1] !== undefined) {
            return this.escape(values[index - 1]);
        }
        return match;
    }.bind(this));
};

var MysqlDriver = exports.MysqlDriver = function () {
    function MysqlDriver(databaseURL, options) {
        _classCallCheck(this, MysqlDriver);

        this.createPool(databaseURL, options);
    }

    _createClass(MysqlDriver, [{
        key: 'connect',
        value: function connect() {
            var _this = this;

            return new Promise(function (resolve) {
                _this.pool.getConnection(function (err, client) {
                    client.config.queryFormat = queryFormat;
                    resolve(client);
                });
            });
        }
    }, {
        key: 'createPool',
        value: function createPool(databaseUrl, options) {
            var _url$parse = _url2.default.parse(databaseUrl),
                auth = _url$parse.auth,
                hostname = _url$parse.hostname,
                port = _url$parse.port,
                pathname = _url$parse.pathname;

            var _split = (auth || '').split(':'),
                _split2 = _slicedToArray(_split, 2),
                user = _split2[0],
                password = _split2[1];

            var config = _extends({}, options, {
                user: user,
                password: password,
                host: hostname,
                port: port,
                database: (pathname || '').slice(1),
                debug: false

            });

            this.pool = new _mysql2.default.createPool(config);
            // this.pool.on('error', () => {
            // 	//
            // });
        }
    }, {
        key: 'query',
        value: function query(client, text, parameters) {
            return new Promise(function (resolve, reject) {

                client.config.queryFormat = queryFormat;
                client.query(text, parameters, function (err, result, fields) {

                    // console.log(text.split(' ')[0], 'has feilds:', fields != null, '| has rows:', '| count:', result && result.affectedRows)
                    // if (text.split(' ')[0] === 'DROP') {
                    //     console.log(client.config)
                    // }
                    if (err) {
                        err.query = text;
                        reject(err);
                    } else {
                        resolve({
                            rowCount: result.affectedRows,
                            rows: result,
                            fields: fields
                        });
                    }
                });
            }).then(function (result) {
                if (!result.rows[0] && !result.fields && result.rowCount !== undefined) {
                    return result.insertId;
                } else {
                    return result.rows;
                }
            });
        }
    }, {
        key: 'exec',
        value: function exec(text, parameters) {
            var _this2 = this;

            return this.connect().then(function (client) {
                return _this2.query(client, text, parameters).then(function (result) {
                    client.release();

                    return result;
                }).catch(function (error) {
                    client.release();

                    return Promise.reject(error);
                });
            });
        }
    }, {
        key: 'beginTransaction',
        value: function beginTransaction() {
            var _this3 = this;

            return this.connect().then(function (client) {
                return _this3.query(client, 'START TRANSACTION', []).then(function () {
                    return client;
                });
            });
        }
    }, {
        key: 'commitTransaction',
        value: function commitTransaction(client) {
            return this.query(client, 'COMMIT', []);
        }
    }, {
        key: 'rollbackTransaction',
        value: function rollbackTransaction(client) {
            return this.query(client, 'ROLLBACK', []);
        }
    }]);

    return MysqlDriver;
}();