const fs = require("fs");
const mkdirs = (dirs) => {
    const paths = dirs.split("/");
    let current = "";
    paths.forEach((p) => {
        current += `${p}/`;
        if (!fs.existsSync(current)) {
            fs.mkdirSync(current);
        }
    });
}
const parseKey = (key, value, obj) => {
    const [path, ...rest] = key.split(".");
    if (rest.length === 0) {
        //if the value is null, delete the key
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
     * The Key of the Data Fetched.
     * @param {string}
     */
    ID = this.ID;

    /**
     * The Data Fetched.
     * @param {string}
     */
    data = this.data;
}

class FSDB {
    /**
     * Create a New FSDB Database.
     * @param {string} path You can specify a path to a file location where your database should be located. (Defaults to `database.json`)
     * @param {boolean} compact Whether or not to store the database contents in a compact format. It won't be easily readable to humans, but it will save storage space. (Defaults to `true`)
     * @example
     * const db = new FSDB("./db.json", false); 
     * // Creates a database at `./db.json` and doesn't compact it, making it easier for humans to read.
     */
    constructor(path, compact) {
        if (!path) path = "database.json";
        path = path.replace(/\\/g, "/");
        let parsedPath = require("path").parse(path);
        if (parsedPath.ext !== ".json") path = path + ".json";
        if (parsedPath.dir) mkdirs(parsedPath.dir);
        if (!fs.existsSync(path)) fs.writeFileSync(path, "{}");
        this.path = path;
        this.compact = compact === undefined ? true : compact;
    }

    /**
     * Fetch All Data from the Database.
     * @returns {DataSet[]} All Data in the Database.
     * @example
     * db.all();
     * // => [{ ID: "key", data: "value" }, { ID: "foo.bar", data: "value" }]
     */
    all() {
        try {
            let data = JSON.parse(fs.readFileSync(this.path));
            let parsed = convertToDotNotation(data);
            return Object.keys(parsed).map((key) => {
                return {
                    ID: key,
                    data: parsed[key]
                };
            });
        } catch {
            return console.log("FS.DB Error: Failed to get data from database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#all()");
        }
    }
    /**
     * Retrieve a Value from the Database.
     * @param {string} key The Key of the Data you want to Retrieve.
     * @returns {any} The Data Found. (`null` if not found)
     * @example
     * db.get("key");
     * // => "value"
    */

    get(key) {
        if (!key) return console.log("FS.DB Error: Cannot get data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#get()");
        let data = JSON.parse(fs.readFileSync(this.path));
        let keys = key.split(".");
        for (let i = 0; i < keys.length; i++) {
            if (data[keys[i]] === undefined || data[keys[i]] === null) return null;
            data = data[keys[i]];
        }
        return data;
    }

    //get all items starting with a certain sequence of characters in the key. push them into an array with the format {ID: key, data: value}

    /**
     * Retrieve a List of Entries Starting With a Specific Key.
     * @param {string} key The key to search for.
     * @returns {DataSet[]} The List of Entries.
     * @example
     * db.startsWith("key");
     * // => [{ ID: "key.foo", data: "value" }, { ID: "key.bar", data: "value" }]
     */

    startsWith(key) {
        if (!key) return console.log("FS.DB Error: Cannot search for data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#startsWith()");
        return this.all().filter(entry => entry.ID.startsWith(key));
    }

    /**
     * Check if a Key Exists in the Database.
     * @param {string} key The Key to Check.
     * @returns {boolean} Whether the Key Exists.
     * @example
     * db.has("key");
     * // => true
     */
    has(key) {
        if (!key) return console.log("FS.DB Error: Cannot get data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#has()");
        let data = this.get(key);
        return data !== null;
    }

    /**
     * Save a Value to the Database.
     * @param {string} key The Key of the Data you want to Save.
     * @param {any} value The Value you want to Save.
     * @returns {boolean} Whether the Save was Successful or Not.
     * @example
     * db.set("key", "value");
     * // => { key: "value" }
     * 
     * db.set("foo.bar", "value");
     * // => { foo: { bar: "value" } }
     */
    set(key, value) {
        if (!key) {
            console.log("FS.DB Error: Cannot save data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#set()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot save data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#set()");
            return false;
        }
        if (value === undefined || value === null || value === "") {
            console.log("FS.DB Error: Cannot save data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#set()");
            return false;
        }
        let data = JSON.parse(fs.readFileSync(this.path));
        let parsed = parseKey(key, value, data);
        this.compact ? fs.writeFileSync(this.path, JSON.stringify(parsed)) : fs.writeFileSync(this.path, JSON.stringify(parsed, null, 4));
        return true;
    }

    /**
     * Push Value(s) to an Array in the Database.
     * @param {string} key The Key of the Array you want to Push to.
     * @param {any|any[]} value The Value(s) you want to Push.
     * @returns {boolean} Whether the Push was Successful or Not.
     * @example
     * db.push("key", "value");
     * // => { key: ["value"] }
     * 
     * db.push("key", ["foo", "bar"]);
     * // => { key: ["value", "foo", "bar"] }
     */

    push(key, value) {
        if (!key) {
            console.log("FS.DB Error: Cannot push data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot push data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()");
            return false;
        }
        if (value === undefined || value === null || value === "") {
            console.log("FS.DB Error: Cannot push data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()");
            return false;
        }
        try {
            let data = this.get(key);
            if (data == null) {
                if (!Array.isArray(value)) return this.set(key, [value]);
                return this.set(key, value);
            }
            if (!Array.isArray(data)) {
                console.log("FS.DB Error: Cannot push data, as the key does not point to an array.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()");
                return false;
            }
            if (Array.isArray(value)) return this.set(key, data.concat(value));
            data.push(value);
            return this.set(key, data);
        } catch {
            console.log("FS.DB Error: Failed to push data to an array in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#push()");
            return false;
        }
    }

    /**
     * Remove Value(s) from an Array in the Database.
     * @param {string} key The Key of the Array you want to Remove from.
     * @param {any|any[]} value The Value(s) you want to Remove.
     * @returns {boolean} Whether the Pull was Successful or Not.
     * @example
     * db.pull("key", "value");
     * // => { key: [] }
     */

    pull(key, value) {
        if (!key) {
            console.log("FS.DB Error: Cannot pull data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot pull data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()");
            return false;
        }
        if (value === undefined || value === null || value === "") {
            console.log("FS.DB Error: Cannot pull data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()");
            return false;
        }
        try {
            let data = this.get(key);
            if (data == null) {
                if (!Array.isArray(value)) return this.set(key, []);
                return this.set(key, value);
            }
            if (!Array.isArray(data)) {
                console.log("FS.DB Error: Cannot pull data, as the key does not point to an array.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()");
                return false;
            }
            if (Array.isArray(value)) return this.set(key, data.filter(entry => !value.includes(entry)));
            return this.set(key, data.filter(entry => entry !== value));
        } catch {
            console.log("FS.DB Error: Failed to pull data from an array in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#pull()");
            return false;
        }
    }

    /**
     * Add to a Number Value in the Database.
     * @param {string} key The Key of the Number you want to Add to.
     * @param {number} value The Value you want to Add.
     * @returns {boolean} Whether the Addition was Successful or Not.
     * @example
     * //Assuming the Database contains: { key: 500 }
     * db.add("key", 250);
     * // => { key: 750 }
     */

    add(key, value) {
        if (!key) {
            console.log("FS.DB Error: Cannot add data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot add data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()");
            return false;
        }
        if (value === undefined || value === null || value === "") {
            console.log("FS.DB Error: Cannot add data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()");
            return false;
        }
        if (isNaN(value)) {
            console.log("FS.DB Error: Cannot add data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()");
            return false;
        }
        try {
            let data = this.get(key);
            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log("FS.DB Error: Cannot add data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()");
                return false;
            }
            return this.set(key, data + value);
        } catch {
            console.log("FS.DB Error: Failed to add to a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#add()");
            return false;
        }
    }

    /**
     * Subtract from a Number Value in the Database.
     * @param {string} key The Key of the Number you want to Subtract from.
     * @param {number} value The Value you want to Subtract.
     * @returns {boolean} Whether the Subtraction was Successful or Not.
     * @example
     * //Assuming the Database contains: { key: 500 }
     * db.subtract("key", 100);
     * // => { key: 400 }
     */

    subtract(key, value) {
        if (!key) {
            console.log("FS.DB Error: Cannot subtract data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot subtract data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()");
            return false;
        }
        if (value === undefined || value === null || value === "") {
            console.log("FS.DB Error: Cannot subtract data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()");
            return false;
        }
        if (isNaN(value)) {
            console.log("FS.DB Error: Cannot subtract data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()");
            return false;
        }
        try {
            let data = this.get(key);
            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log("FS.DB Error: Cannot subtract data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()");
                return false;
            }
            return this.set(key, data - value);
        }
        catch {
            console.log("FS.DB Error: Failed to subtract from a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#subtract()");
            return false;
        }
    }

    /**
     * Multiply a Number Value in the Database.
     * @param {string} key The Key of the Number you want to Multiply.
     * @param {number} value The Value you want to Multiply by.
     * @returns {boolean} Whether the Multiplication was Successful or Not.
     * @example
     * //Assuming the Database contains: { key: 500 }
     * db.multiply("key", 2);
     * // => { key: 1000 }
     */

    multiply(key, value) {
        if (!key) {
            console.log("FS.DB Error: Cannot multiply data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot multiply data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()");
            return false;
        }
        if (value === undefined || value === null || value === "") {
            console.log("FS.DB Error: Cannot multiply data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()");
            return false;
        }
        if (isNaN(value)) {
            console.log("FS.DB Error: Cannot multiply data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()");
            return false;
        }
        try {
            let data = this.get(key);
            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log("FS.DB Error: Cannot multiply data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()");
                return false;
            }
            return this.set(key, data * value);
        } catch {
            console.log("FS.DB Error: Failed to multiply a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#multiply()");
            return false;
        }
    }

    /**
     * Divide a Number Value in the Database.
     * @param {string} key The Key of the Number you want to Divide.
     * @param {number} value The Value you want to Divide by.
     * @returns {boolean} Whether the Division was Successful or Not.
     * @example
     * //Assuming the Database contains: { key: 500 }
     * db.divide("key", 2);
     * // => { key: 250 }
     */

    divide(key, value) {
        if (!key) {
            console.log("FS.DB Error: Cannot divide data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot divide data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()");
            return false;
        }
        if (value === undefined || value === null || value === "") {
            console.log("FS.DB Error: Cannot divide data, as none was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()");
            return false;
        }
        if (isNaN(value)) {
            console.log("FS.DB Error: Cannot divide data, as the value is not a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()");
            return false;
        }
        if (value == 0) {
            console.log("FS.DB Error: Cannot divide data, as it looks like you're trying to end the world. (Dividing by 0)\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()");
            return false;
        }
        try {
            let data = this.get(key);
            if (data == null) return this.set(key, value);
            if (isNaN(data)) {
                console.log("FS.DB Error: Cannot divide data, as the key does not point to a number.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()");
                return false;
            }
            return this.set(key, data / value);
        } catch {
            console.log("FS.DB Error: Failed to divide a number in the database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#divide()");
            return false;
        }
    }

    /**
     * Delete a Value from the Database.
     * @param {string} key The Key of the Data you want to Delete.
     * @returns {boolean} Whether the Deletion was Successful or Not.
     * @example
     * db.delete("key");
     * 
     * db.delete("foo.bar");
     */
    delete(key) {
        if (!key) {
            console.log("FS.DB Error: Cannot delete data, as no key was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#delete()");
            return false;
        }
        if (typeof key !== "string") {
            console.log("FS.DB Error: Cannot delete data, as the key is not a string.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#delete()");
            return false;
        }
        try {
            let data = JSON.parse(fs.readFileSync(this.path));
            let parsed = parseKey(key, null, data);
            this.compact ? fs.writeFileSync(this.path, JSON.stringify(parsed)) : fs.writeFileSync(this.path, JSON.stringify(parsed, null, 4));
            return true;
        } catch {
            console.log("FS.DB Error: Failed to delete data from database. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#delete()");
            return false;
        }
    }

    /**
     * Delete All Data from the Database. (This cannot be undone!)
     * @returns {boolean} Whether the Deletion was Successful or Not.
     * @example
     * db.deleteAll();
     */

    deleteAll() {
        try {
            fs.writeFileSync(this.path, "{}");
            return true;
        } catch {
            console.log("FS.DB Error: Failed to delete data from database. This may be because the JSON file could not be accessed.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#deleteAll()");
            return false;
        }
    }

    /**
     * Backup all Database Contents to another JSON File. Compact Mode is used on all backups to keep the file size minimal.
     * @param {string} path The Path to the JSON File you want to Backup to.
     * @returns {boolean} Whether the Backup was Successful or Not.
     * @example
     * db.backup("./Backups/db-backup.json");
     */

    backup(path) {
        if (!path) {
            console.log("FS.DB Error: Cannot backup data, as no path was provided.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#backup()");
            return false;
        }
        if (path == this.path) {
            console.log("FS.DB Error: Cannot backup data, as the path is the same as the database's path.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#backup()");
            return false;
        }
        try {
            if (this.all().length == 0) console.log("FS.DB Warning: Attempting to backup an empty database.\nMethod: FSDB#backup()");
            path = path.replace(/\\/g, "/");
            let parsedPath = require("path").parse(path);
            if (parsedPath.ext !== ".json") path = path + ".json";
            if (parsedPath.dir) mkdirs(parsedPath.dir);
            fs.writeFileSync(path, JSON.stringify(JSON.parse(fs.readFileSync(this.path))));
            return true;
        } catch {
            console.log("FS.DB Error: Failed to backup data. This may be because the JSON could not be parsed correctly.\nNeed Help? Join Our Discord Server at https://discord.gg/P2g24jp\nMethod: FSDB#backup()");
            return false;
        }
    }
}

module.exports = FSDB;