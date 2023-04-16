const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { join, parse, resolve } = require("path");

/**
 * @typedef FSDBEntry A database entry
 * @property {string} key The unique accessor (id) for the stored data
 * @property {*} value The data corresponding with the database entry
 */

/**
 * Create a new JSON file
 * @param {string} path The path to the file
 * @param {string} [content="{}"] The content to write to the file
 * @return {string} The resolved path to the file
 */
function createJsonFile(path, content = "{}") {
    const { dir, name } = parse(resolve(path));
    if (dir) mkdirSync(dir, { recursive: true });

    const filepath = join(dir, `${name}.json`);
    if (!existsSync(filepath)) writeFileSync(filepath, content, "utf8");
    return filepath;
}

/**
 * Iterates over the provided key potentially in dot-notation
 * @param {string} key The key to iterate over
 * @yields {{ currentKey: string, isLast?: boolean }} A tuple of the current key
 * and whether the next key is the last key
 */
function* iterateKey(key) {
    if (key.includes(".")) {
        const iterator = key.split(".")[Symbol.iterator]();
        let [current, next] = [iterator.next(), iterator.next()];

        while (!current.done) {
            yield { currentKey: current.value, isLast: next.done };
            [current, next] = [next, iterator.next()];
        }
    } else {
        yield { currentKey: key, isLast: true };
    }
}

/**
 * Flattens a provided object into a single level object
 * @param {Record<string, any>} object The object to flatten
 * @returns {Record<string, any>} The flattened object
 */
function flattenObject(object) {
    /** @type {typeof object} */
    const result = {};

    for (const [currentKey, currentValue] of Object.entries(object)) {
        if (typeof currentValue === "object" && currentValue !== null) {
            Object.entries(flattenObject(currentValue)).forEach(
                ([key, value]) => {
                    result[`${currentKey}.${key}`] = value;
                }
            );
        } else {
            result[currentKey] = currentValue;
        }
    }

    return result;
}

/** A custom error class for handling errors within an FSDB instance */
class FSDBError extends Error {
    /**
     * Create a new FSDBError instance
     * @param {object} options The options for the error
     * @param {string} options.message The error message
     * @param {string} options.method The method that threw the error
     * @param {unknown=} options.cause The cause of the error
     */
    constructor({ message, method, cause }) {
        super(message);
        this.name = "FSDBError";
        this.message = `${message}\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp`;
        this.method = `FSDB#${method}()`;
        this.cause = cause;
    }
}

/**
 * Safely executes a given function and handles any errors as an "FSDBError"
 * @template T The return type of the function
 * @param {string} method The name of the method that called this function
 * @param {(errorCallback: (message: string, cause?: *) => FSDBError) => T} fn
 * The function to execute
 * @returns {T} The return value of the function
 * @throws {FSDBError} If the function throws an error
 */
function executeSafely(method, fn) {
    try {
        return fn((message, cause) => {
            return new FSDBError({
                message: `Failed to perform "${method}" operation. ${message}`,
                method,
                cause,
            });
        });
    } catch (error) {
        throw new FSDBError({
            message: "Failed to perform internal operation.",
            method,
            cause: error,
        });
    }
}

/**
 * A simple, file-based database
 * @see {@link https://github.com/WillTDA/File-System-DB#readme}
 */
class FSDB {
    /**
     * Create a new FSDB database
     * @param {string} [path="database.json"] You can specify a path to a file
     * location where your database should be located (defaults to
     * "database.json")
     * @param {boolean} [compact=true] Whether or not to store the database
     * contents in a compact format. It won't be easily readable to humans, but
     * it will save storage space (defaults to "true")
     * @example <caption>Creating a human-readable database</caption>
     * const db = new FSDB("./db.json", false);
     */
    constructor(path = "database.json", compact = true) {
        executeSafely(this.constructor.name, (createError) => {
            if (typeof path !== "string")
                throw createError("Path must be a string.");
            if (!path) throw createError("No path provided.");

            this.path = createJsonFile(path);
            /** @private */
            this.compact = compact;
        });
    }

    /**
     * @private
     * Retrieves the current data from the database
     * @returns {*} The parsed data from the database
     */
    readData() {
        return executeSafely(this.readData.name, () => {
            return JSON.parse(readFileSync(this.path, "utf8"));
        });
    }

    /**
     * @private
     * Writes the provided data to the database
     * @param {Record<string, any>} data The data to write to the database
     */
    writeData(data) {
        executeSafely(this.writeData.name, () => {
            const content = JSON.stringify(data, null, this.compact ? 0 : 4);
            writeFileSync(this.path, content, "utf8");
        });
    }

    /**
     * @private
     * Retrieves the value of a key in the database
     * @param {string} key The key of the value to retrieve
     * @param {Record<string, any>} data The object reference
     * @returns {*} The value of the key
     */
    readEntry(key, data = this.readData()) {
        return executeSafely(this.readEntry.name, () => {
            for (const { currentKey, isLast } of Array.from(iterateKey(key))) {
                if (isLast) return data[currentKey];
                if (!data[currentKey]) return;
                data = data[currentKey];
            }
        });
    }

    /**
     * @private
     * Overwrites the value of a key in the database with the provided value. If
     * the value is `undefined`, the key will be deleted.
     * @param {string} key The key of the value to change, potentially in
     * dot-notation
     * @param {any=} value The new value to change set the key to
     * @param {Record<string, any>} [data=any] The object to write to
     * @param {any} [refEntry=data] The object reference
     */
    writeEntry(key, value, data = this.readData(), refEntry = data) {
        executeSafely(this.writeEntry.name, () => {
            for (const { currentKey, isLast } of Array.from(iterateKey(key))) {
                if (!isLast) {
                    if (!refEntry[currentKey]) refEntry[currentKey] = {};
                    refEntry = refEntry[currentKey];
                } else {
                    if (value !== undefined) refEntry[currentKey] = value;
                    else if (refEntry.hasOwnProperty(currentKey))
                        delete refEntry[currentKey];
                }
            }

            this.writeData(data);
        });
    }

    /**
     * @private
     * Performs an operation on an array in the database
     * @param {string} method The method that called this function (used for
     * error messages)
     * @param {string} key The key of the array to perform the operation on
     * @param {(currentValue: any[]) => any[]} fn A function that takes the
     * current value and returns the new value (the array operation)
     * @throws {FSDBError} When a parsing or another error occurs
     */
    setArray(method, key, fn) {
        executeSafely(method, (createError) => {
            if (!key) throw createError("No key provided.");
            const data = this.get(key);

            if (!Array.isArray(data))
                throw createError("Value is not an array.");

            this.set(key, fn(data));
        });
    }

    /**
     * @private
     * Performs an operation on a numeric value in the database
     * @param {string} method The method that called this function (used for
     * error messages)
     * @param {string} key The key of the number to perform the operation on
     * @param {(currentValue: number) => number} fn A function that takes the
     * current value and returns the new value (the arithmetic operation)
     * @throws {FSDBError} When a parsing or another error occurs
     */
    setNumber(method, key, fn) {
        executeSafely(method, (createError) => {
            if (!key) throw createError("No key provided.");
            const data = this.get(key);

            if (typeof data !== "number" || isNaN(data))
                throw createError("Value is not a number.");

            const result = fn(data);
            if (isNaN(result)) throw createError("Result is not a number.");

            this.set(key, result);
        });
    }

    /**
     * Backup all database contents to another JSON file. Compact mode is used
     * on all backups to keep the file size minimal
     * @param {string} path The path to the JSON file you want to backup to
     * @throws {FSDBError} When a file or another error occurs
     * @example <caption>Backing up the database</caption>
     * db.backup("./Backups/db-backup.json");
     */
    backup(path) {
        executeSafely(this.backup.name, (createError) => {
            if (!path) throw createError("No path provided.");
            if (path === this.path)
                throw createError("Path is same as database.");

            if (this.getAll(true).length === 0)
                console.warn("Backing up empty database.");

            createJsonFile(path, JSON.stringify(this.readData()));
        });
    }

    /**
     * Delete a value from the database
     * @param {string} key The key of the data you want to delete
     * @throws {FSDBError} When a parsing or another error occurs
     * @example <caption>Deleting a value</caption>
     * db.delete("key");
     * @example <caption>Deleting a value using dot notation</caption>
     * db.delete("foo.bar");
     */
    delete(key) {
        executeSafely(this.delete.name, (createError) => {
            if (!key) throw createError("No key provided.");
            this.writeEntry(key);
        });
    }

    /**
     * Delete all data from the database (this CANNOT be undone!)
     * @throws {FSDBError} When a file or another error occurs
     * @example <caption>Deleting all data</caption>
     * db.deleteAll();
     */
    deleteAll() {
        executeSafely(this.deleteAll.name, () => this.writeData({}));
    }

    /**
     * Retrieve a value from the database
     * @param {string} key The key of the data you want to retrieve
     * @returns {any} The data found (`undefined` if not found)
     * @throws {FSDBError} If no key was provided
     * @example <caption>Retrieving a value</caption>
     * db.get("key");
     * // => "value"
     */
    get(key) {
        return executeSafely(this.getAll.name, (createError) => {
            if (!key) throw createError("No key provided.");
            return this.readEntry(key);
        });
    }

    /**
     * Fetch all data from the database
     * @param {boolean=} verbose Whether or not to escape dot notation and class
     * those as individual entries (defaults to "false")
     * @returns {FSDBEntry[]} All data in the database
     * @throws {FSDBError} If the database could not be parsed
     * @example <caption>With "verbose" disabled</caption>
     * db.getAll(false);
     * // => [{ key: "key", value: "value" }, { key: "foo", value: { "bar": "value" } }]
     * @example <caption>With "verbose" enabled</caption>
     * db.getAll(true);
     * // => [{ key: "key", value: "value" }, { key: "foo.bar", value: "value" }]
     */
    getAll(verbose) {
        return executeSafely(this.getAll.name, () => {
            const data = this.readData();
            return Object.entries(verbose ? flattenObject(data) : data).map(
                ([key, value]) => ({ key, value })
            );
        });
    }

    /**
     * Check if a key exists in the database
     * @param {string} key The key to check
     * @returns {boolean} Whether the key exists
     * @throws {FSDBError} If no key was provided
     * @example <caption>Check if ""key"" exists</caption>
     * db.has("key");
     * // => true
     */
    has(key) {
        return executeSafely(this.has.name, (createError) => {
            if (!key) throw createError("No key provided.");
            return this.get(key) !== undefined;
        });
    }

    /**
     * Save a value to the database
     * @param {string} key The key of the data you want to save
     * @param {any} value The value you want to save
     * @example <caption>Saving a value</caption>
     * db.set("key", "value");
     * // => { key: "value" }
     * @example <caption>Saving a value with dot notation</caption>
     * db.set("foo.bar", "value");
     * // => { foo: { bar: "value" } }
     */
    set(key, value) {
        executeSafely(this.set.name, (createError) => {
            if (!key) throw createError("No key provided.");
            this.writeEntry(key, value);
        });
    }

    /**
     * Retrieve a list of entries starting with a provided query
     * @param {string} query The search query to filter against
     * @returns {FSDBEntry[]} A list of entries starting with the provided query
     * @throws {FSDBError}
     * @example <caption>Retrieve entries starting with `"key"`</caption>
     * db.startsWith("key");
     * // => [{ key: "key.foo", value: "value" }, { key: "key.bar", value: "value" }]
     */
    startsWith(query) {
        return executeSafely(this.startsWith.name, (createError) => {
            if (!query) throw createError("No query provided.");
            return this.getAll(true).filter(({ key }) => key.startsWith(query));
        });
    }

    /**
     * Push value(s) to an array in the database
     * @param {string} key The key of the array you want to push to
     * @param {any[]} items The value(s) you want to push
     * @throws {FSDBError}
     * @example <caption>Pushing a value</caption>
     * db.push("key", "value");
     * // => { key: ["value"] }
     * @example <caption>Pushing multiple values</caption>
     * db.push("key", "foo", "bar");
     * // => { key: ["value", "foo", "bar"] }
     */
    push(key, ...items) {
        this.setArray(this.push.name, key, (currentValue) => {
            return currentValue.concat(items);
        });
    }

    /**
     * Remove value(s) from an array in the database
     * @param {string} key The key of the array you want to remove from
     * @param {any[]} items The value(s) you want to remove
     * @throws {FSDBError}
     * @example <caption>Removing a value</caption>
     * db.pull("key", "value");
     * // => { key: [] }
     */
    pull(key, ...items) {
        this.setArray(this.pull.name, key, (currentValue) => {
            return currentValue.filter((item) => !items.includes(item));
        });
    }

    /**
     * Add to a numeric value in the database
     * @param {string} key The key of the number you want to add to
     * @param {number} value The value you want to add
     * @throws {FSDBError}
     * @example <caption>Adding to a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.add("key", 250);
     * // => { key: 750 }
     */
    add(key, value) {
        this.setNumber(this.add.name, key, (currentValue) => {
            return currentValue + value;
        });
    }

    /**
     * Subtract from a numeric value in the database
     * @param {string} key The key of the number you want to subtract from
     * @param {number} value The value you want to subtract
     * @throws {FSDBError}
     * @example <caption>Subtracting from a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.subtract("key", 100);
     * // => { key: 400 }
     */
    subtract(key, value) {
        this.setNumber(this.subtract.name, key, (currentValue) => {
            return currentValue - value;
        });
    }

    /**
     * Multiply a numeric value in the database
     * @param {string} key The key of the number you want to multiply
     * @param {number} value The value you want to multiply by
     * @throws {FSDBError}
     * @example <caption>Multiplying a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.multiply("key", 2);
     * // => { key: 1000 }
     */
    multiply(key, value) {
        this.setNumber(this.multiply.name, key, (currentValue) => {
            return currentValue * value;
        });
    }

    /**
     * Divide a numeric value in the database
     * @param {string} key The key of the number you want to divide
     * @param {number} value The value you want to divide by
     * @throws {FSDBError}
     * @example <caption>Dividing a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.divide("key", 2);
     * // => { key: 250 }
     */
    divide(key, value) {
        this.setNumber(this.divide.name, key, (currentValue) => {
            return currentValue / value;
        });
    }
}

module.exports = { FSDB, FSDBError };
