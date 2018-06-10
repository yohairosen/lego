// @flow

import url from 'url';

import {PostgresDriver} from './postgres';
import {MysqlDriver} from './mysql';

import type {MysqlPool} from './mysql';
import type {PgPool} from './postgres';

export type Result = {
    oid: ?number;
    fields: string[];
    rowCount: number;
    rows: Object[];
}

export type Client = {
    query: (text: string, parameters: any[]) => Promise<Result>;
    release: (error: ?Error) => void;
}

export type Driver = {
    pool: PgPool | MysqlPool;
    createPool: (databaseUrl: string, options: Object) => void;
    query: (client: Client, text: string, parameters: any[]) => Promise<number | any[]>;
    exec: (text: string, parameters: any[]) => void;
    beginTransaction: () => void;
    commitTransaction: (client: Client) => void;
    rollbackTransaction: (client: Client) => void;
}

export function createDriver(databaseURL: ?string, options: any = {}): Driver {
    if (!databaseURL) {
        throw new Error('No DATABASE_URL provided.');
    }

    let parse = url.parse(databaseURL);
    let driver = null;

    switch (parse.protocol) {
        case 'pg:':
        case 'postgres:':
            driver = new PostgresDriver(databaseURL, options);
            break;
        case 'mysql:':
            driver = new MysqlDriver(databaseURL, options);
            break;
    }

    if (!driver) {
        throw new Error(`Unsupported driver '${parse.protocol}' in DATABASE_URL.`);
    }

    return driver;
}

let driver = null;

export function getSingleton() {
    if (driver === null) {
        const {DATABASE_URL, LEGO_MIN_POOL_SIZE, LEGO_MAX_POOL_SIZE} = process.env;

        driver = createDriver(DATABASE_URL, {
            min: LEGO_MIN_POOL_SIZE,
            max: LEGO_MAX_POOL_SIZE,
        });
    }

    return driver;
}
