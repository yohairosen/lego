import Lego from '../src';
import assert from 'assert';
import url from 'url';

const getProtocolData =
    name => ({
        mysql: {
            CREATE_TABLE_SQL: 'CREATE TABLE tests (text VARCHAR(100), value INTEGER, UNIQUE KEY(text))',
            INSERT_ROW_SQL: `INSERT INTO tests (text, value) VALUES ('Martijn', 123)`,
            DUP_ENTRY_ERR: 'ER_DUP_ENTRY'
        }
    }[name] || {
        CREATE_TABLE_SQL: 'CREATE TABLE tests (text TEXT UNIQUE, value INTEGER)',
        INSERT_ROW_SQL: `INSERT INTO tests (text, value) VALUES ('Martijn', 123) RETURNING *`,
        DUP_ENTRY_ERR: '23505'
    });


describe('transaction', function () {
    const PROTOCOL = url.parse(process.env.DATABASE_URL).protocol.slice(0, -1);

    const {CREATE_TABLE_SQL, INSERT_ROW_SQL, DUP_ENTRY_ERR} = getProtocolData(PROTOCOL);

    const returning = fn => {
        return PROTOCOL === 'mysql' ? fn : res => res;
    };

    beforeEach(function () {
        return Lego.sql `${Lego.raw(CREATE_TABLE_SQL)}`;
    });

    afterEach(function () {
        return Lego.sql `DROP TABLE IF EXISTS tests`;
    });

    it('can commit', function () {
        return Lego.transaction(function (transaction) {
            return transaction.sql `${Lego.raw(INSERT_ROW_SQL)}`
                .then(returning(() => transaction.sql `SELECT * FROM tests`))
                .then(function (tests) {
                    assert.equal(tests.length, 1);
                    assert.equal(tests[0].text, 'Martijn');
                    assert.equal(tests[0].value, 123);
                });
        })
            .then(function () {
                return Lego.sql `SELECT * FROM tests`;
            })
            .then(function (tests) {
                assert.equal(tests.length, 1);
                assert.equal(tests[0].text, 'Martijn');
                assert.equal(tests[0].value, 123);
            });
    });

    it('can rollback', function () {
        return Lego.transaction(function (transaction) {
            return transaction.sql `${Lego.raw(INSERT_ROW_SQL)}`
                .then(returning(() => transaction.sql `SELECT * FROM tests`))
                .then(function (tests) {
                    assert.equal(tests.length, 1);
                    assert.equal(tests[0].text, 'Martijn');
                    assert.equal(tests[0].value, 123);

                    return transaction.sql `${Lego.raw(INSERT_ROW_SQL)}`;
                });
        })
            .then(assert.fail)
            .catch(function (error) {
                assert.equal(error.code, DUP_ENTRY_ERR);

                return Lego.sql `SELECT * FROM tests`
                    .then(function (tests) {
                        assert.equal(tests.length, 0);
                    });
            });
    });

    it('should throw error in empty transaction', function () {
        return Lego.transaction(function () {
            // We return nothing so this fails.
        })
            .then(assert.fail)
            .catch(function (error) {
                assert.equal(error.message, '0 queries were found in Lego#transaction\'s callback.');
            });
    });

    it('can execute multiple statements', function () {
        return Lego
            .transaction((transaction) => {
                transaction.sql `INSERT INTO tests (text, value) VALUES ('Martijn', 1)`;
                transaction.sql `UPDATE tests SET value = 2 WHERE value = 1`;
                transaction.sql `UPDATE tests SET value = 3 WHERE value = 2`;
            })
            .then(() => {
                return Lego.sql `SELECT * FROM tests`.first();
            })
            .then((test) => {
                assert.equal(test.value, 3);
                assert.equal(test.text, 'Martijn');
            });
    });

    it('should execute in series with return value', function () {
        return Lego
            .transaction((transaction) => {
                transaction.sql `INSERT INTO tests (text, value) VALUES ('Martijn', 1)`;
                return transaction.sql `UPDATE tests SET value = 2 WHERE value = 1`;
            })
            .then(() => {
                return Lego.sql `SELECT * FROM tests`.first();
            })
            .then((test) => {
                assert.equal(test.value, 2);
                assert.equal(test.text, 'Martijn');
            });
    });
});
