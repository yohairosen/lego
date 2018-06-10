'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['CREATE SCHEMA lego'], ['CREATE SCHEMA lego']),
    _templateObject2 = _taggedTemplateLiteral(['CREATE TABLE lego.migrations (\n                    id INTEGER NOT NULL AUTO_INCREMENT,\n                    version INTEGER,\n                    KEY (id))'], ['CREATE TABLE lego.migrations (\n                    id INTEGER NOT NULL AUTO_INCREMENT,\n                    version INTEGER,\n                    KEY (id))']),
    _templateObject3 = _taggedTemplateLiteral(['CREATE SCHEMA lego\n\t\t\tCREATE TABLE migrations (\n\t\t\t\tversion INTEGER,\n\t\t\t\tid SERIAL\n\t\t\t)'], ['CREATE SCHEMA lego\n\t\t\tCREATE TABLE migrations (\n\t\t\t\tversion INTEGER,\n\t\t\t\tid SERIAL\n\t\t\t)']),
    _templateObject4 = _taggedTemplateLiteral(['SELECT version FROM lego.migrations ORDER BY id DESC LIMIT 1'], ['SELECT version FROM lego.migrations ORDER BY id DESC LIMIT 1']),
    _templateObject5 = _taggedTemplateLiteral(['INSERT INTO lego.migrations (version) VALUES (', ')'], ['INSERT INTO lego.migrations (version) VALUES (', ')']);

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var fs = require('fs');
var path = require('path');


var zeroPad = function zeroPad(number, base) {
    var length = String(base).length - String(number).length + 1;
    return length > 0 ? new Array(length).join('0') + number : number;
};

var PROTOCOL = _url2.default.parse(process.env.DATABASE_URL).protocol.slice(0, -1);

var getProtocolData = function getProtocolData(name) {
    return {
        mysql: {
            RELATION_DOES_NOT_EXIST_ERR: '42S02',
            CREATE_SCHEMA_QUERY: function CREATE_SCHEMA_QUERY() {
                return _index2.default.sql(_templateObject).then(function () {
                    return _index2.default.sql(_templateObject2);
                });
            },
            DUP_ENTRY_ERR: 'ER_DUP_ENTRY',
            SCHEMA_EXISTS_ERR: 'ER_DB_CREATE_EXISTS'
        }
    }[name] || {
        RELATION_DOES_NOT_EXIST_ERR: '42P01',
        CREATE_SCHEMA_QUERY: function CREATE_SCHEMA_QUERY() {
            return _index2.default.sql(_templateObject3);
        },
        DUP_ENTRY_ERR: '23505',
        SCHEMA_EXISTS_ERR: '42P06'
    };
};

var Migrations = function () {
    function Migrations() {
        _classCallCheck(this, Migrations);
    }

    _createClass(Migrations, null, [{
        key: 'getCurrentVersion',
        value: function getCurrentVersion() {
            return new Promise(function (resolve, reject) {
                fs.readdir(path.join(process.cwd(), 'migrations'), function (error, files) {
                    if (error) {
                        if (error.errno === -2) {
                            // The directory does not exist.
                            resolve(0);
                        } else {
                            reject(error);
                        }
                    } else {
                        var currentVersion = files.map(function (fileName) {
                            var baseName = path.basename(fileName);
                            var matches = baseName.match(/^([0-9]+).*\.js$/);

                            if (matches && matches.length > 1) {
                                return parseInt(matches[1]);
                            } else {
                                reject(new Error('Unknown file `' + baseName + '` in migrations folder.'));
                            }
                        }).reduce(function (current, value) {
                            if (value > current) {
                                return value;
                            } else {
                                return current;
                            }
                        }, 0);
                        resolve(currentVersion);
                    }
                });
            });
        }
    }, {
        key: 'getDatabaseVersion',
        value: function getDatabaseVersion() {
            var _getProtocolData = getProtocolData(PROTOCOL),
                RELATION_DOES_NOT_EXIST_ERR = _getProtocolData.RELATION_DOES_NOT_EXIST_ERR;

            return _index2.default.sql(_templateObject4).first().then(function (row) {
                if (row) {
                    return row.version;
                } else {
                    return 0;
                }
            }).catch(function (error) {
                var relationDoesNotExistErrorCode = RELATION_DOES_NOT_EXIST_ERR;

                if (error.code === relationDoesNotExistErrorCode || error.sqlState === relationDoesNotExistErrorCode) {
                    return 0;
                } else {
                    return Promise.reject(error);
                }
            });
        }
    }, {
        key: 'createMigration',
        value: function createMigration(version) {
            return new Promise(function (resolve, reject) {
                var migrationsDir = path.join(process.cwd(), 'migrations');
                fs.mkdir(migrationsDir, function (error) {
                    if (error && error.code != 'EEXIST') {
                        reject(error);
                    } else {
                        var versionString = zeroPad(version, 100);
                        var fileName = versionString + '.js';
                        fs.writeFile(path.join(migrationsDir, versionString + '.js'), 'export function up(transaction) {\n\t//\n}\n\nexport function down(transaction) {\n\t//\n}', function (error) {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(fileName);
                            }
                        });
                    }
                });
            });
        }
    }, {
        key: 'createMigrationsTable',
        value: function createMigrationsTable() {
            var _getProtocolData2 = getProtocolData(PROTOCOL),
                CREATE_SCHEMA_QUERY = _getProtocolData2.CREATE_SCHEMA_QUERY,
                SCHEMA_EXISTS_ERR = _getProtocolData2.SCHEMA_EXISTS_ERR;

            return CREATE_SCHEMA_QUERY().catch(function (error) {
                var schemaAlreadyExistsErrorCode = SCHEMA_EXISTS_ERR;

                if (error.code == schemaAlreadyExistsErrorCode || error.sqlState === schemaAlreadyExistsErrorCode) {
                    // The schema already exists. That's fine.
                } else {
                    return Promise.reject(error);
                }
            });
        }
    }, {
        key: 'loadMigration',
        value: function loadMigration(version) {
            return require(path.join(process.cwd(), 'migrations', zeroPad(version, 100) + '.js'));
        }
    }, {
        key: 'migrate',
        value: function migrate(from, to) {
            var _this = this;

            var _migrate = function _migrate(version, direction) {
                var migration = _this.loadMigration(version);

                return _index2.default.transaction(function (transaction) {
                    var returnValue = migration[direction](transaction);
                    var newVersion = direction == 'up' ? version : version - 1;

                    if (!returnValue || !returnValue.then) {
                        return transaction.sql(_templateObject5, newVersion);
                    } else {
                        return returnValue.then(function (result) {
                            return _index2.default.sql(_templateObject5, newVersion).transacting(transaction).then(function () {
                                return result;
                            });
                        });
                    }
                });
            };

            var result = this.createMigrationsTable();
            var direction = '';

            var versions = [];

            if (from > to) {
                direction = 'down';

                for (var i = from - to; i > 0; i--) {
                    var version = to + i;
                    versions.push(version);
                }
            } else if (from < to) {
                direction = 'up';

                for (var _i = 0; _i < to - from; _i++) {
                    var _version = from + 1 + _i;
                    versions.push(_version);
                }
            }

            versions.forEach(function (version) {
                result = result.then(function () {
                    return _migrate(version, direction);
                });
            });

            return result;
        }
    }]);

    return Migrations;
}();

exports.default = Migrations;
;