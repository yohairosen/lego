import Lego from '../src';
import assert from 'assert';
import {setPoolIdleTimeout} from '../src/driver/postgres';
import {createDriver, getSingleton} from '../src/driver';
import url from 'url';

const getProtocolData =
    name => ({
        mysql: {
            NO_SUCH_FIELD_ERR: 'ER_BAD_FIELD_ERROR',
            SELECT_WHERE_SQL: 'SELECT 1 FROM DUAL WHERE 1 <> 1',
        }
    }[name] || {
        NO_SUCH_FIELD_ERR: '42703',
        SELECT_WHERE_SQL: 'SELECT 1 WHERE 1 <> 1',
    });

describe('driver', function () {
    const PROTOCOL = url.parse(process.env.DATABASE_URL).protocol.slice(0, -1);
    const {NO_SUCH_FIELD_ERR, SELECT_WHERE_SQL} = getProtocolData(PROTOCOL);
    it('exec and resolves', function () {
        const lego = Lego.sql `SELECT 1 as count`;
        return lego
            .then(function (rows) {
                assert.equal(rows.length, 1);
                assert.equal(rows[0].count, '1');
            });
    });

    it('exec and rejects', function () {
        const lego = Lego.sql`SELECT fail`;
        return lego
            .then(assert.fail)
            .catch(function (error) {
                assert.equal(error.code, NO_SUCH_FIELD_ERR);
            });
    });

    it('resolves first result', function () {
        const lego = Lego.sql `SELECT 1 as count`;
        return lego.first()
            .then(function (row) {
                assert.equal(row.length, undefined);
                assert.equal(row.count, '1');
            });
    });

    it('resolves null result with first on 0 rows', function () {
        return Lego.sql`${Lego.raw(SELECT_WHERE_SQL)}`.first()
            .then(function (row) {
                assert.equal(row, null);
            });
    });

    it('is then-able', function () {
    	return Lego.sql `SELECT 1 as count`
    		.then(function (rows) {
    			assert.equal(rows.length, 1);
    			assert.equal(rows[0].count, '1');
    		});
    });

    it('can set pool idle timeout', function () {
    	assert.doesNotThrow(() => {
    		setPoolIdleTimeout(500);
    	});
    });

    it('undefined database url', function () {
    	assert.throws(function () {
    		createDriver(null);
    	}, function (error) {
    		return error.message === 'No DATABASE_URL provided.';
    	});
    });

    it('get singleton', function () {
    	assert.strictEqual(getSingleton(), getSingleton());
    });
});
