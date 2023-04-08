/// <reference path="index.d.ts" />

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { parse } = require("path");

/**
 * @param {string} key
 * @param {*} value
 * @param {Record<string, any>} object
 */
const parseKey = (key, value, object) => {
    const [currentKey, path] = key.split(".", 2);

    if (!path) {
        // if the value is null, delete the key
        if (value === null) delete object[currentKey];
        else object[currentKey] = value;
    } else {
        if (!object[currentKey]) object[currentKey] = {};
        parseKey(path, value, object[currentKey]);
    }

    return object;
};

/** @param {Record<string, any>} object */
const convertToDotNotation = (object) => {
    /** @type {Record<string, any>} */
    const result = {};

    Object.entries(object).forEach(([currentKey, currentValue]) => {
        if (
            typeof currentValue === "object" ||
            !Array.isArray(currentValue) ||
            currentValue !== null
        ) {
            Object.entries(convertToDotNotation(currentValue)).forEach(
                ([key, value]) => result[`${currentKey}.${key}`] = value
            );
        } else {
            result[currentKey] = currentValue;
        }
    });

    return result;
};

class FSDBError extends Error {
    /**
     * Create a new FSDBError
     * @param {object} options The options for the error
     * @param {string} options.message The error message
     * @param {`FSDB#${string}()`} options.method The method that threw the error
     * @param {unknown=} options.cause The cause of the error
     */
    constructor({ message, method, cause }) {
        super(message);
        this.name = "FSDBError";
        this.message = `${message}\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: ${method}`;
        this.method = method;
        this.cause = cause;
    }
}

class FSDB {
    /**
     * Create a new FSDB database
     * @param {string} [path="database.json"] You can specify a path to a file location where your
     * database should be located (defaults to `database.json`)
     * @param {boolean} [compact=true] Whether or not to store the database contents in
     * a compact format. It won't be easily readable to humans, but it will save
     * storage space (defaults to `true`)
     * @example <caption>Creating a human-readable database</caption>
     * const db = new FSDB("./db.json", false);
     */
    constructor(path = "database.json", compact = true) {
        path = path.replace(/\\/g, "/");
        const { dir, ext } = parse(path);

        if (ext !== ".json") path = `${path}.json`;
        if (dir) mkdirSync(dir, { recursive: true });
        if (!existsSync(path)) writeFileSync(path, "{}", "utf8");

        this.path = path;
        this.compact = compact;
    }

    /**
     * Fetch all data from the database
     * @param {boolean=} verbose Whether or not to escape dot notation and class
     * those as individual entries (defaults to `false`)
     * @returns {DatabaseEntry[]} All data in the database
     * @throws {FSDBError} If the database could not be parsed
     * @example <caption>With `verbose` disabled</caption>
     * db.all(false);
     * // => [{ key: "key", value: "value" }, { key: "foo", value: { "bar": "value" } }]
     * @example <caption>With `verbose` enabled</caption>
     * db.all(true);
     * // => [{ key: "key", value: "value" }, { key: "foo.bar", value: "value" }]
     */
    all(verbose) {
        try {
            const data = JSON.parse(readFileSync(this.path, "utf8"));
            const parsedData = verbose ? convertToDotNotation(data) : data;
            return Object.entries(parsedData).map(([key, value]) => ({
                key,
                value,
            }));
        } catch (error) {
            throw new FSDBError({
                message:
                    "Failed to get data from database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#all()",
                cause: error,
            });
        }
    }

    /**
     * Retrieve a value from the database
     * @param {string} key The key of the data you want to retrieve
     * @returns {any} The data found (`null` if not found)
     * @throws {FSDBError} If no key was provided
     * @example <caption>Retrieving a value</caption>
     * db.get("key");
     * // => "value"
     */
    get(key) {
        if (!key) {
            throw new FSDBError({
                message: "Cannot get data, as no key was provided.",
                method: "FSDB#get()",
            });
        }

        return key
            .split(".")
            .reduce(
                (obj, key) => (obj && obj[key] ? obj[key] : null),
                JSON.parse(readFileSync(this.path, "utf8"))
            );
    }

    // get all items starting with a certain sequence of characters in the key
    // push them into an array with the format { ID: key, data: value }

    /**
     * Retrieve a list of entries starting with a specific key
     * @param {string} key The key to search for
     * @returns {DatabaseEntry[]} The list of entries
     * @throws {FSDBError} If no key was provided
     * @example <caption>Retrieve entries starting with `"key"`</caption>
     * db.startsWith("key");
     * // => [{ key: "key.foo", value: "value" }, { key: "key.bar", value: "value" }]
     */
    startsWith(key) {
        if (!key) {
            throw new FSDBError({
                message: "Cannot search for data, as no key was provided.",
                method: "FSDB#startsWith()",
            });
        }

        return this.all(true).filter((entry) => entry.key.startsWith(key));
    }

    /**
     * Check if a key exists in the database
     * @param {string} key The key to check
     * @returns {boolean} Whether the key exists
     * @throws {FSDBError} If no key was provided
     * @example <caption>Check if `"key"` exists</caption>
     * db.has("key");
     * // => true
     */
    has(key) {
        if (!key) {
            throw new FSDBError({
                message: "Cannot get data, as no key was provided.",
                method: "FSDB#has()",
            });
        }

        return this.get(key) !== null;
    }

    /**
     * Save a value to the database
     * @param {string} key The key of the data you want to save
     * @param {any} value The value you want to save
     * @returns {boolean} Whether the save was successful or not
     * @example <caption>Saving a value</caption>
     * db.set("key", "value");
     * // => { key: "value" }
     * @example <caption>Saving a value with dot notation</caption>
     * db.set("foo.bar", "value");
     * // => { foo: { bar: "value" } }
     */
    set(key, value) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot save data, as no key was provided.",
                    method: "FSDB#set()",
                });
            }

            if (value === undefined || value === null || value === "") {
                throw new FSDBError({
                    message: "Cannot save data, as none was provided.",
                    method: "FSDB#set()",
                });
            }

            const data = JSON.parse(readFileSync(this.path, "utf8"));
            const parsed = parseKey(key, value, data);
            const spacing = this.compact ? undefined : 4;
            const newData = JSON.stringify(parsed, null, spacing);

            writeFileSync(this.path, newData, "utf8");
            return true;
        } catch (error) {
            if (!(error instanceof FSDBError)) throw error;

            console.error(error.message);
            return false;
        }
    }

    /**
     * Push value(s) to an array in the database
     * @param {string} key The key of the array you want to push to
     * @param {any[]} items The value(s) you want to push
     * @returns {boolean} Whether the push was successful or not
     * @throws {FSDBError} When a parsing error occurs or something else goes wrong
     * @example <caption>Pushing a value</caption>
     * db.push("key", "value");
     * // => { key: ["value"] }
     * @example <caption>Pushing multiple values</caption>
     * db.push("key", "foo", "bar");
     * // => { key: ["value", "foo", "bar"] }
     */
    push(key, ...items) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot push data, as no key was provided.",
                    method: "FSDB#push()",
                });
            }

            items = items.filter(
                (item) => item !== undefined && item !== null && item !== ""
            );

            if (items.length === 0) {
                throw new FSDBError({
                    message: "Cannot push data, as none was provided.",
                    method: "FSDB#push()",
                });
            }

            const data = this.get(key) ?? [];

            if (!Array.isArray(data)) {
                throw new FSDBError({
                    message:
                        "Cannot push data, as the key does not point to an array.",
                    method: "FSDB#push()",
                });
            }

            return this.set(key, data.concat(items));
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to push data to an array in the database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#push()",
                cause: error,
            });
        }
    }

    /**
     * Remove value(s) from an array in the database
     * @param {string} key The key of the array you want to remove from
     * @param {any[]} items The value(s) you want to remove
     * @returns {boolean} Whether the pull was successful or not
     * @throws {FSDBError} When a parsing error occurs or something else goes wrong
     * @example <caption>Removing a value</caption>
     * db.pull("key", "value");
     * // => { key: [] }
     */
    pull(key, ...items) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot pull data, as no key was provided.",
                    method: "FSDB#pull()",
                });
            }

            items = items.filter(
                (item) => item !== undefined && item !== null && item !== ""
            );

            if (items.length === 0) {
                throw new FSDBError({
                    message: "Cannot pull data, as none was provided.",
                    method: "FSDB#pull()",
                });
            }

            const data = this.get(key) ?? [];

            if (!Array.isArray(data)) {
                throw new FSDBError({
                    message:
                        "Cannot pull data, as the key does not point to an array.",
                    method: "FSDB#pull()",
                });
            }

            return this.set(
                key,
                data.filter((entry) => !items.includes(entry))
            );
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to pull data from an array in the database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#pull()",
                cause: error,
            });
        }
    }

    /**
     * Add to a number value in the database
     * @param {string} key The key of the number you want to add to
     * @param {number} value The value you want to add
     * @returns {boolean} Whether the addition was successful or not
     * @throws {FSDBError} When a parsing error occurs or something else goes wrong
     * @example <caption>Adding to a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.add("key", 250);
     * // => { key: 750 }
     */
    add(key, value) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot add data, as no key was provided.",
                    method: "FSDB#add()",
                });
            }

            if (isNaN(value)) {
                throw new FSDBError({
                    message: "Cannot add data, as the value is not a number.",
                    method: "FSDB#add()",
                });
            }

            const data = this.get(key);

            if (data === null) return this.set(key, value);
            if (typeof data !== "number" || isNaN(data)) {
                throw new FSDBError({
                    message:
                        "Cannot add data, as the key does not point to a number.",
                    method: "FSDB#add()",
                });
            }

            return this.set(key, data + value);
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to add to a number in the database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#add()",
                cause: error,
            });
        }
    }

    /**
     * Subtract from a number value in the database
     * @param {string} key The key of the number you want to subtract from
     * @param {number} value The value you want to subtract
     * @returns {boolean} Whether the subtraction was successful or not
     * @throws {FSDBError} When a parsing error occurs or something else goes wrong
     * @example <caption>Subtracting from a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.subtract("key", 100);
     * // => { key: 400 }
     */
    subtract(key, value) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot subtract data, as no key was provided.",
                    method: "FSDB#subtract()",
                });
            }

            if (isNaN(value)) {
                throw new FSDBError({
                    message:
                        "Cannot subtract data, as the value is not a number.",
                    method: "FSDB#subtract()",
                });
            }

            const data = this.get(key);

            if (data === null) return this.set(key, -value);
            if (typeof data !== "number" || isNaN(data)) {
                throw new FSDBError({
                    message:
                        "Cannot subtract data, as the key does not point to a number.",
                    method: "FSDB#subtract()",
                });
            }

            return this.set(key, data - value);
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to subtract from a number in the database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#subtract()",
                cause: error,
            });
        }
    }

    /**
     * Multiply a number value in the database
     * @param {string} key The key of the number you want to multiply
     * @param {number} value The value you want to multiply by
     * @returns {boolean} Whether the multiplication was successful or not
     * @throws {FSDBError} When a parsing error occurs or something else goes wrong
     * @example <caption>Multiplying a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.multiply("key", 2);
     * // => { key: 1000 }
     */
    multiply(key, value) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot multiply data, as no key was provided.",
                    method: "FSDB#multiply()",
                });
            }

            if (isNaN(value)) {
                throw new FSDBError({
                    message:
                        "Cannot multiply data, as the value is not a number.",
                    method: "FSDB#multiply()",
                });
            }

            const data = this.get(key);

            if (data === null) return this.set(key, 0);
            if (typeof data !== "number" || isNaN(data)) {
                throw new FSDBError({
                    message:
                        "Cannot multiply data, as the key does not point to a number.",
                    method: "FSDB#multiply()",
                });
            }

            return this.set(key, data * value);
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to multiply a number in the database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#multiply()",
                cause: error,
            });
        }
    }

    /**
     * Divide a number value in the database
     * @param {string} key The key of the number you want to divide
     * @param {number} value The value you want to divide by
     * @returns {boolean} Whether the division was successful or not
     * @throws {FSDBError} When a parsing error occurs or something else goes wrong
     * @example <caption>Dividing a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.divide("key", 2);
     * // => { key: 250 }
     */
    divide(key, value) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot divide data, as no key was provided.",
                    method: "FSDB#divide()",
                });
            }

            if (isNaN(value)) {
                throw new FSDBError({
                    message:
                        "Cannot divide data, as the value is not a number.",
                    method: "FSDB#divide()",
                });
            }

            const data = this.get(key);

            if (data === null) return this.set(key, 0);
            if (typeof data !== "number" || isNaN(data)) {
                throw new FSDBError({
                    message:
                        "Cannot divide data, as the key does not point to a number.",
                    method: "FSDB#divide()",
                });
            }

            return this.set(key, data / value);
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to divide a number in the database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#divide()",
                cause: error,
            });
        }
    }

    /**
     * Delete a value from the database
     * @param {string} key The key of the data you want to delete
     * @returns {boolean} Whether the deletion was successful or not
     * @throws {FSDBError} When a parsing error occurs or something else goes wrong
     * @example <caption>Deleting a value</caption>
     * db.delete("key");
     * @example <caption>Deleting a value using dot notation</caption>
     * db.delete("foo.bar");
     */
    delete(key) {
        try {
            if (!key) {
                throw new FSDBError({
                    message: "Cannot delete data, as no key was provided.",
                    method: "FSDB#delete()",
                });
            }

            const data = JSON.parse(readFileSync(this.path, "utf8"));
            const parsed = parseKey(key, null, data);
            const spacing = this.compact ? undefined : 4;

            writeFileSync(this.path, JSON.stringify(parsed, null, spacing));
            return true;
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to delete data from database. This may be because the JSON could not be parsed correctly.",
                method: "FSDB#delete()",
                cause: error,
            });
        }
    }

    /**
     * Delete all data from the database (this CANNOT be undone!)
     * @throws {FSDBError} When a file error occurs or something else goes wrong
     * @example <caption>Deleting all data</caption>
     * db.deleteAll();
     */
    deleteAll() {
        try {
            writeFileSync(this.path, "{}");
        } catch (error) {
            throw new FSDBError({
                message:
                    "Failed to delete all data from database. This may be because the JSON file could not be accessed.",
                method: "FSDB#deleteAll()",
                cause: error,
            });
        }
    }

    /**
     * Backup all database contents to another JSON file. Compact mode is used
     * on all backups to keep the file size minimal
     * @param {string} path The path to the JSON file you want to backup to
     * @returns {boolean} Whether the backup was successful or not
     * @throws {FSDBError} When a file error occurs or something else goes wrong
     * @example <caption>Backing up the database</caption>
     * db.backup("./Backups/db-backup.json");
     */
    backup(path) {
        try {
            if (!path) {
                throw new FSDBError({
                    message: "Cannot backup data, as no path was provided.",
                    method: "FSDB#backup()",
                });
            }

            if (path === this.path) {
                throw new FSDBError({
                    message:
                        "Cannot backup data, as the path is the same as the database's path.",
                    method: "FSDB#backup()",
                });
            }

            if (this.all(true).length === 0) {
                console.warn("Attempting to backup an empty database.");
            }

            path = path.replace(/\\/g, "/");
            const { dir, ext } = parse(path);

            if (ext !== ".json") path = `${path}.json`;
            if (dir) mkdirSync(dir, { recursive: true });

            const content = JSON.stringify(readFileSync(this.path, "utf8"));
            writeFileSync(path, content);
            return true;
        } catch (error) {
            if (error instanceof FSDBError) {
                console.error(error.message);
                return false;
            }

            throw new FSDBError({
                message:
                    "Failed to backup database. This may be because the JSON file could not be accessed.",
                method: "FSDB#backup()",
                cause: error,
            });
        }
    }
}

module.exports = FSDB;
