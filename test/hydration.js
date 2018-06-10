import Lego from '../src';
import assert from 'assert';
import url from 'url';

const sql = Lego.sql;

describe('hydration', function () {

    // const PROTOCOL = url.parse(process.env.DATABASE_URL).protocol.slice(0, -1);

    beforeEach(() => {

        return sql`CREATE TABLE 
                    tests (
                      country VARCHAR(100),
                      name VARCHAR(100),
                      value INTEGER)`
            .then(() => {
                return sql`INSERT INTO tests VALUES 
                        ('USA', 'Dan', 1), 
                        ('USA', 'Sam', 2), 
                        ('USA', 'Peter', 3),
                        ('Canada', 'Gal', 5),
                        ('Canada', 'Ben', 2),
                        ('Canada', 'Gil', 1),
                        ('Australia', 'Gal', 8),
                        ('Australia', 'Sam', 3),
                        ('Australia', 'Peter', 1)`;
            });
    });

    afterEach(() => {
        return sql `DROP TABLE IF EXISTS tests`;
    });

    it('can nest', function () {
        return sql`SELECT 
                    name AS _firstName,
                    value AS _first_second_value,
                    country AS _countries__name
                FROM tests`
            .nest()
            .then(function (data) {
                assert.equal(data.length, 6);
                assert.equal(data[0].firstName, 'Dan');
                assert.equal(data[0].first.second.value, 1);
                assert.equal(data[0].countries.length, 1);

                assert.equal(data[3].firstName, 'Gal');
                assert.equal(data[3].countries.length, 2);
            });
    });

});
