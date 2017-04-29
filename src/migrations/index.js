import fs from 'fs';
import path from 'path';
import Lego from '../index.js';

const zeroPad = function (number, base) {
	const length = String(base).length - String(number).length + 1;
	return new Array(length).join('0') + number;
};

export default class Migrations {
	static getMigrationFileNames() {
		return new Promise((resolve, reject) => {
			fs.readdir(path.join(process.cwd(), 'migrations'), function (error, fileNames) {
				if (error) {
					if (error.errno === -2) {
						// The directory does not exist.
						resolve([]);
					}
					else {
						reject(error);
					}
				}
				else {
					resolve(fileNames);
				}
			});
		});
	}

	static async getCurrentVersion() {
		const migrationFileNames = await this.getMigrationFileNames();

		return migrationFileNames
			.map(function (fileName) {
				const baseName = path.basename(fileName);
				const matches = baseName.match(/^([0-9]+).*\.js$/);

				if (matches && matches.length > 1) {
					return parseInt(matches[1]);
				}
				else {
					return 0;
				}
			})
			.reduce(function (current, value) {
				if (value > current) {
					return value;
				}
				else {
					return current;
				}
			}, 0);
	}

	static getDatabaseVersion() {
		return Lego.sql `SELECT version FROM lego.migrations ORDER BY created_at DESC LIMIT 1`
			.first()
			.then(function (row) {
				if (row) {
					return row.version;
				}
				else {
					return 0;
				}
			})
			.catch(function (error) {
				const relationDoesNotExistErrorCode = '42P01';

				if (error.code === relationDoesNotExistErrorCode || error.sqlState === relationDoesNotExistErrorCode) {
					return 0;
				}
				else {
					return Promise.reject(error);
				}
			});
	}

	static writeMigration(version, up, down) {
		return new Promise(function (resolve, reject) {
			let migrationsDir = path.join(process.cwd(), 'migrations');
			fs.mkdir(migrationsDir, function (error) {
				if (error && error.code != 'EEXIST') {
					reject(error);
				}
				else {
					const versionString = zeroPad(version, 100);
					const fileName = versionString + '.js';
					fs.writeFile(path.join(migrationsDir, versionString + '.js'), `export function up(transaction) {
${up}
}

export function down(transaction) {
${down}
}
`,
					function (error) {
						if (error) {
							reject(error);
						}
						else {
							resolve(fileName);
						}
					});
				}
			});
		});
	}

	static createMigration(version) {
		return this.writeMigration(version, '	//', '	//');
	}

	static createMigrationsTable() {
		return Lego.sql `CREATE SCHEMA lego
			CREATE TABLE migrations (
				version INTEGER,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)`
			.catch(function (error) {
				const schemaAlreadyExistsErrorCode = '42P06';

				if (error.code == schemaAlreadyExistsErrorCode || error.sqlState === schemaAlreadyExistsErrorCode) {
					// The schema already exists. That's fine.
				}
				else {
					return Promise.reject(error);
				}
			});
	}

	static loadMigration(version) {
		return require(path.join(process.cwd(), 'migrations', zeroPad(version, 100) + '.js'));
	}

	static migrate(from, to) {
		const _migrate = (version, direction) => {
			const migration = this.loadMigration(version);

			return Lego.transaction((transaction) => {
				const returnValue = migration[direction](transaction);
				const newVersion = direction == 'up' ? version : version - 1;

				if (!returnValue || !returnValue.then) {
					return transaction.sql `INSERT INTO lego.migrations (version) VALUES (${newVersion})`;
				}
				else {
					return returnValue
						.then((result) => {
							return Lego
								.sql `INSERT INTO lego.migrations (version) VALUES (${newVersion})`
								.transacting(transaction)
								.then(() => {
									return result;
								});
						});
				}
			});
		};

		let result = this.createMigrationsTable();
		let direction = '';

		const versions = [];

		if (from > to) {
			direction = 'down';

			for (let i = from - to; i > 0; i--) {
				let version = to + i;
				versions.push(version);
			}
		}
		else if (from < to) {
			direction = 'up';

			for (let i = 0; i < (to - from); i++) {
				let version = from + 1 + i;
				versions.push(version);
			}
		}

		versions.forEach(function (version) {
			result = result.then(function () {
				return _migrate(version, direction);
			});
		});

		return result;
	}
};
