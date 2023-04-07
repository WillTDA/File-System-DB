const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { parse } = require("path");

const mkdirs = (dirs) => {
    const paths = dirs.split("/");
    let current = "";

    paths.forEach((p) => {
        current += `${p}/`;
        if (!existsSync(current)) {
            mkdirSync(current);
        }
    });
};

const parseKey = (key, value, obj) => {
    const [path, ...rest] = key.split(".");

    if (rest.length === 0) {
        // if the value is null, delete the key
        if (value === null) delete obj[path];
        else obj[path] = value;
    } else {
        if (!obj[path]) {
            obj[path] = {};
        }
        parseKey(rest.join("."), value, obj[path]);
    }

    return obj;
};

const convertToDotNotation = (obj) => {
    const keys = Object.keys(obj);
    const result = {};

    keys.forEach((key) => {
        const value = obj[key];

        if (typeof value === "object") {
            const subKeys = convertToDotNotation(value);
            Object.keys(subKeys).forEach((subKey) => {
                result[`${key}.${subKey}`] = subKeys[subKey];
            });
        } else {
            result[key] = value;
        }
    });

    return result;
};

class DataSet {
    /**
     * The key of the data fetched
     * @param {string}
     */
    ID = this.ID;

    /**
     * The data fetched
     * @param {string}
     */
    data = this.data;
}

class FSDB {
    /**
     * Create a new FSDB database
     * @param {string} path You can specify a path to a file location where your
     * database should be located (defaults to `database.json`)
     * @param {boolean} compact Whether or not to store the database contents in
     * a compact format. It won't be easily readable to humans, but it will save
     * storage space (defaults to `true`)
     * @example <caption>Creating a human-readable database</caption>
     * const db = new FSDB("./db.json", false);
     */
    constructor(path, compact) {
        if (!path) path = "database.json";
        path = path.replace(/\\/g, "/");
        let parsedPath = parse(path);

        if (parsedPath.ext !== ".json") path = path + ".json";
        if (parsedPath.dir) mkdirs(parsedPath.dir);
        if (!existsSync(path)) writeFileSync(path, "{}");

        this.path = path;
        this.compact = compact === undefined ? true : compact;
    }

    /**
     * Fetch all data from the database
     * @param {boolean} verbose Whether or not to escape dot notation and class
     * those as individual entries (defaults to `false`)
     * @returns {DataSet[]} All data in the database
     * @example <caption>With `verbose` disabled</caption>
     * db.all(false);
     * // => [{ ID: "key", data: "value" }, { ID: "foo", data: { "bar": "value" } }]
     * @example <caption>With `verbose` enabled</caption>
     * db.all(true);
     * // => [{ ID: "key", data: "value" }, { ID: "foo.bar", data: "value" }]
     */
    all(verbose) {
        try {
            let data = JSON.parse(readFileSync(this.path));

            if (verbose) {
                let parsed = convertToDotNotation(data);

                return Object.keys(parsed).map((key) => {
                    return {
                        ID: key,
                        data: parsed[key],
                    };
                });
            } else {
                return Object.keys(data).map((key) => {
                    return {
                        ID: key,
                        data: data[key],
                    };
                });
            }
        } catch {
            return console.log(
                "File System DB Error: Failed to get data from database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#all()"
            );
        }
    }

    /**
     * Retrieve a value from the database
     * @param {string} key The key of the data you want to retrieve
     * @returns {any} The data found (`null` if not found)
     * @example <caption>Retrieving a value</caption>
     * db.get("key");
     * // => "value"
     */
    get(key) {
        if (!key)
            return console.log(
                "File System DB Error: Cannot get data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#get()"
            );

        let data = JSON.parse(readFileSync(this.path));
        let keys = key.split(".");

        for (let i = 0; i < keys.length; i++) {
            if (data[keys[i]] === undefined || data[keys[i]] === null)
                return null;
            data = data[keys[i]];
        }

        return data;
    }

    // get all items starting with a certain sequence of characters in the key
    // push them into an array with the format { ID: key, data: value }

    /**
     * Retrieve a list of entries starting with a specific key
     * @param {string} key The key to search for
     * @returns {DataSet[]} The list of entries
     * @example <caption>Retrieve entries starting with `"key"`</caption>
     * db.startsWith("key");
     * // => [{ ID: "key.foo", data: "value" }, { ID: "key.bar", data: "value" }]
     */
    startsWith(key) {
        if (!key)
            return console.log(
                "File System DB Error: Cannot search for data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#startsWith()"
            );
        return this.all(true).filter((entry) => entry.ID.startsWith(key));
    }

    /**
     * Check if a key exists in the database
     * @param {string} key The key to check
     * @returns {boolean} Whether the key exists
     * @example <caption>Check if `"key"` exists</caption>
     * db.has("key");
     * // => true
     */
    has(key) {
        if (!key)
            return console.log(
                "File System DB Error: Cannot get data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#has()"
            );

        let data = this.get(key);
        return data !== null;
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
        if (!key) {
            console.log(
                "File System DB Error: Cannot save data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#set()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot save data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#set()"
            );
            return false;
        }

        if (value === undefined || value === null || value === "") {
            console.log(
                "File System DB Error: Cannot save data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#set()"
            );
            return false;
        }

        let data = JSON.parse(readFileSync(this.path));
        let parsed = parseKey(key, value, data);

        this.compact
            ? writeFileSync(this.path, JSON.stringify(parsed))
            : writeFileSync(this.path, JSON.stringify(parsed, null, 4));
        return true;
    }

    /**
     * Push value(s) to an array in the database
     * @param {string} key The key of the array you want to push to
     * @param {any|any[]} value The value(s) you want to push
     * @returns {boolean} Whether the push was successful or not
     * @example <caption>Pushing a value</caption>
     * db.push("key", "value");
     * // => { key: ["value"] }
     * @example <caption>Pushing multiple values</caption>
     * db.push("key", ["foo", "bar"]);
     * // => { key: ["value", "foo", "bar"] }
     */
    push(key, value) {
        if (!key) {
            console.log(
                "File System DB Error: Cannot push data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot push data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()"
            );
            return false;
        }

        if (value === undefined || value === null || value === "") {
            console.log(
                "File System DB Error: Cannot push data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()"
            );
            return false;
        }

        try {
            let data = this.get(key) || [];

            if (data == []) {
                if (!Array.isArray(value)) return this.set(key, [value]);
                return this.set(key, value);
            }

            if (!Array.isArray(data)) {
                console.log(
                    "File System DB Error: Cannot push data, as the key does not point to an array.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()"
                );
                return false;
            }

            if (Array.isArray(value)) return this.set(key, data.concat(value));
            data.push(value);

            return this.set(key, data);
        } catch {
            console.log(
                "File System DB Error: Failed to push data to an array in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()"
            );
            return false;
        }
    }

    /**
     * Remove value(s) from an array in the database
     * @param {string} key The key of the array you want to remove from
     * @param {any|any[]} value The value(s) you want to remove
     * @returns {boolean} Whether the pull was successful or not
     * @example <caption>Removing a value</caption>
     * db.pull("key", "value");
     * // => { key: [] }
     */
    pull(key, value) {
        if (!key) {
            console.log(
                "File System DB Error: Cannot pull data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot pull data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()"
            );
            return false;
        }

        if (value === undefined || value === null || value === "") {
            console.log(
                "File System DB Error: Cannot pull data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()"
            );
            return false;
        }

        try {
            let data = this.get(key) || [];

            if (data == []) {
                if (!Array.isArray(value)) return this.set(key, []);
                return this.set(key, value);
            }

            if (!Array.isArray(data)) {
                console.log(
                    "File System DB Error: Cannot pull data, as the key does not point to an array.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()"
                );
                return false;
            }

            if (Array.isArray(value))
                return this.set(
                    key,
                    data.filter((entry) => !value.includes(entry))
                );

            return this.set(
                key,
                data.filter((entry) => entry !== value)
            );
        } catch {
            console.log(
                "File System DB Error: Failed to pull data from an array in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()"
            );
            return false;
        }
    }

    /**
     * Add to a number value in the database
     * @param {string} key The key of the number you want to add to
     * @param {number} value The value you want to add
     * @returns {boolean} Whether the addition was successful or not
     * @example <caption>Adding to a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.add("key", 250);
     * // => { key: 750 }
     */
    add(key, value) {
        if (!key) {
            console.log(
                "File System DB Error: Cannot add data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot add data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()"
            );
            return false;
        }

        if (value === undefined || value === null || value === "") {
            console.log(
                "File System DB Error: Cannot add data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()"
            );
            return false;
        }

        if (isNaN(value)) {
            console.log(
                "File System DB Error: Cannot add data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()"
            );
            return false;
        }

        try {
            let data = this.get(key);

            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log(
                    "File System DB Error: Cannot add data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()"
                );
                return false;
            }
            return this.set(key, data + value);
        } catch {
            console.log(
                "File System DB Error: Failed to add to a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()"
            );
            return false;
        }
    }

    /**
     * Subtract from a number value in the database
     * @param {string} key The key of the number you want to subtract from
     * @param {number} value The value you want to subtract
     * @returns {boolean} Whether the subtraction was successful or not
     * @example <caption>Subtracting from a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.subtract("key", 100);
     * // => { key: 400 }
     */
    subtract(key, value) {
        if (!key) {
            console.log(
                "File System DB Error: Cannot subtract data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot subtract data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()"
            );
            return false;
        }

        if (value === undefined || value === null || value === "") {
            console.log(
                "File System DB Error: Cannot subtract data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()"
            );
            return false;
        }

        if (isNaN(value)) {
            console.log(
                "File System DB Error: Cannot subtract data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()"
            );
            return false;
        }

        try {
            let data = this.get(key);

            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log(
                    "File System DB Error: Cannot subtract data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()"
                );
                return false;
            }

            return this.set(key, data - value);
        } catch {
            console.log(
                "File System DB Error: Failed to subtract from a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()"
            );
            return false;
        }
    }

    /**
     * Multiply a number value in the database
     * @param {string} key The key of the number you want to multiply
     * @param {number} value The value you want to multiply by
     * @returns {boolean} Whether the multiplication was successful or not
     * @example <caption>Multiplying a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.multiply("key", 2);
     * // => { key: 1000 }
     */
    multiply(key, value) {
        if (!key) {
            console.log(
                "File System DB Error: Cannot multiply data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot multiply data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()"
            );
            return false;
        }

        if (value === undefined || value === null || value === "") {
            console.log(
                "File System DB Error: Cannot multiply data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()"
            );
            return false;
        }

        if (isNaN(value)) {
            console.log(
                "File System DB Error: Cannot multiply data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()"
            );
            return false;
        }

        try {
            let data = this.get(key);

            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log(
                    "File System DB Error: Cannot multiply data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()"
                );
                return false;
            }

            return this.set(key, data * value);
        } catch {
            console.log(
                "File System DB Error: Failed to multiply a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()"
            );
            return false;
        }
    }

    /**
     * Divide a number value in the database
     * @param {string} key The key of the number you want to divide
     * @param {number} value The value you want to divide by
     * @returns {boolean} Whether the division was successful or not
     * @example <caption>Dividing a number</caption>
     * // assuming the database contains: { key: 500 }
     * db.divide("key", 2);
     * // => { key: 250 }
     */
    divide(key, value) {
        if (!key) {
            console.log(
                "File System DB Error: Cannot divide data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot divide data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()"
            );
            return false;
        }

        if (value === undefined || value === null || value === "") {
            console.log(
                "File System DB Error: Cannot divide data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()"
            );
            return false;
        }

        if (isNaN(value)) {
            console.log(
                "File System DB Error: Cannot divide data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()"
            );
            return false;
        }

        if (value == 0) {
            console.log(
                "File System DB Error: Cannot divide data, as it looks like you're trying to end the world. (Dividing by 0)\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()"
            );
            return false;
        }

        try {
            let data = this.get(key);

            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log(
                    "File System DB Error: Cannot divide data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()"
                );
                return false;
            }

            return this.set(key, data / value);
        } catch {
            console.log(
                "File System DB Error: Failed to divide a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()"
            );
            return false;
        }
    }

    /**
     * Delete a value from the database
     * @param {string} key The key of the data you want to delete
     * @returns {boolean} Whether the deletion was successful or not
     * @example <caption>Deleting a value</caption>
     * db.delete("key");
     * @example <caption>Deleting a value using dot notation</caption>
     * db.delete("foo.bar");
     */
    delete(key) {
        if (!key) {
            console.log(
                "File System DB Error: Cannot delete data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#delete()"
            );
            return false;
        }

        if (typeof key !== "string") {
            console.log(
                "File System DB Error: Cannot delete data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#delete()"
            );
            return false;
        }

        try {
            let data = JSON.parse(readFileSync(this.path));
            let parsed = parseKey(key, null, data);

            this.compact
                ? writeFileSync(this.path, JSON.stringify(parsed))
                : writeFileSync(this.path, JSON.stringify(parsed, null, 4));
            return true;
        } catch {
            console.log(
                "File System DB Error: Failed to delete data from database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#delete()"
            );
            return false;
        }
    }

    /**
     * Delete all data from the database (this CANNOT be undone!)
     * @returns {boolean} Whether the deletion was successful or not
     * @example <caption>Deleting all data</caption>
     * db.deleteAll();
     */
    deleteAll() {
        try {
            writeFileSync(this.path, "{}");
            return true;
        } catch {
            console.log(
                "File System DB Error: Failed to delete data from database. This may be because the JSON file could not be accessed.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#deleteAll()"
            );
            return false;
        }
    }

    /**
     * Backup all database contents to another JSON file. Compact mode is used
     * on all backups to keep the file size minimal
     * @param {string} path The path to the JSON file you want to backup to
     * @returns {boolean} Whether the backup was successful or not
     * @example <caption>Backing up the database</caption>
     * db.backup("./Backups/db-backup.json");
     */
    backup(path) {
        if (!path) {
            console.log(
                "File System DB Error: Cannot backup data, as no path was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#backup()"
            );
            return false;
        }
        if (path == this.path) {
            console.log(
                "File System DB Error: Cannot backup data, as the path is the same as the database's path.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#backup()"
            );
            return false;
        }
        try {
            if (this.all(true).length == 0)
                console.log(
                    "File System DB Warning: Attempting to backup an empty database.\nMethod: FSDB#backup()"
                );

            path = path.replace(/\\/g, "/");
            let parsedPath = parse(path);

            if (parsedPath.ext !== ".json") path = path + ".json";
            if (parsedPath.dir) mkdirs(parsedPath.dir);

            writeFileSync(
                path,
                JSON.stringify(JSON.parse(readFileSync(this.path)))
            );

            return true;
        } catch {
            console.log(
                "File System DB Error: Failed to backup data. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#backup()"
            );
            return false;
        }
    }
}

module.exports = FSDB;
