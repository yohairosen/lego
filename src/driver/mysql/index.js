// @flow

import mysql from 'mysql';
import url from 'url';

import type Client from '../index'

export function setPoolIdleTimeout(timeout: number) {
    // pg.defaults.poolIdleTimeout = timeout;
}

const queryFormat = function (query, values) {
    if (!values) return query;
    return query.replace(/\$(\d+)/g, function (match, index) {
        if (values[index - 1] !== undefined) {
            return this.escape(values[index - 1]);
        }
        return match;
    }.bind(this));
};


export type MysqlPool = {
    getConnection: (error: ?Error, connection: Client) => void;
}

export class MysqlDriver {
    pool: MysqlPool;

    constructor(databaseURL: string, options: Object) {
        this.createPool(databaseURL, options);
    }


    connect() {
        return new Promise(resolve => {
            this.pool.getConnection((err, client) => {
                client.config.queryFormat = queryFormat;
                resolve(client);
            })
        })
    }


    createPool(databaseUrl: string, options: Object) {
        const {auth, hostname, port, pathname} = url.parse(databaseUrl);
        const [user, password] = (auth || '').split(':');

        const config = {
            ...options,
            user: user,
            password: password,
            host: hostname,
            port: port,
            database: (pathname || '').slice(1),
            debug: false

        };

        this.pool = new mysql.createPool(config);
        // this.pool.on('error', () => {
        // 	//
        // });
    }

    query(client: Client, text: string, parameters: any[]): Promise<number | any[]> {
        return new Promise((resolve, reject) => {

            client.config.queryFormat = queryFormat;
            client.query(text, parameters, (err, result, fields) => {

                // console.log(text.split(' ')[0], 'has feilds:', fields != null, '| has rows:', '| count:', result && result.affectedRows)
                // if (text.split(' ')[0] === 'DROP') {
                //     console.log(client.config)
                // }
                if (err) {
                    err.query = text;
                    reject(err);
                }
                else {
                    resolve({
                        rowCount: result.affectedRows,
                        rows: result,
                        fields: fields
                    });
                }
            })
        })
            .then((result) => {
                if (!result.rows[0] && !result.fields && result.rowCount !== undefined) {
                    return result.rows.insertId;
                }
                else {
                    return result.rows;
                }
            })

    }

    exec(text: string, parameters: any[]) {
        return this.connect()
            .then((client) => {
                return this.query(client, text, parameters)
                    .then((result) => {
                        client.release();

                        return result;
                    })
                    .catch((error) => {
                        client.release();

                        return Promise.reject(error);
                    });
            });
    }

    beginTransaction() {
        return this.connect()
            .then((client) => {
                return this.query(client, 'START TRANSACTION', [])
                    .then(function () {
                        return client;
                    });
            });
    }

    commitTransaction(client: Client) {
        return this.query(client, 'COMMIT', []);
    }

    rollbackTransaction(client: Client) {
        return this.query(client, 'ROLLBACK', []);
    }
}
