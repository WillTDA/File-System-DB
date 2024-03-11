<h1 align="center">
  💿 File System DB 💿
</h1>

<div align="center">

  ![license](https://img.shields.io/npm/l/file-system-db?style=flat-square)
  [![version](https://img.shields.io/npm/v/file-system-db?style=flat-square)](https://npmjs.com/package/file-system-db)
  [![gzipped size](https://img.shields.io/bundlejs/size/file-system-db?style=flat-square)](https://npmjs.com/package/file-system-db)
  [![downloads](https://img.shields.io/npm/dt/file-system-db?style=flat-square)](https://npmjs.com/package/file-system-db)
  ![last commit](https://img.shields.io/github/last-commit/WillTDA/File-System-DB?style=flat-square)

  [![discord](https://img.shields.io/discord/667479986214666272?logo=discord&logoColor=white&style=flat-square)](https://diamonddigital.dev/discord)
  [![buy me a coffee](https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?logo=Buy%20Me%20A%20Coffee&logoColor=000000&style=flat-square)](https://www.buymeacoffee.com/willtda)

</div>

<br />

**Please Note:** This package saves data persistently. This means that this will
not work on places like Heroku and similar services.

**v2 Migration:** If you are migrating from **v1** to **v2**, consider reading the detailed changes on this [pull request](https://github.com/WillTDA/File-System-DB/pull/6).

## Features

- 📦 **Works Out of the Box** | Only two lines of code are required to set up
  and start using your own database.

- 🤹‍♂️ **Unlimited Databases** | You can create as many databases as you want,
  whenever you want.

- 🗃️ **Saved as JSON Files** | This package uses JSON files to act as
  databases, so you can easily understand, edit and backup/export the data.

- 📝 **Key-Value Based** | Designed with beginners in mind, so you can store
  any type of data in your database with ease.

- 📔 **Dot Notation Support** | You can use dot notation to store and
  retrieve JSON fields and data.

- ⚡ **Fast and Synchronous** | All operations are synchronous, so saving and
  retrieving data takes less than few milliseconds.

- 🚫 **No Dependencies** | This package is built on top of the
  [File System](https://nodejs.org/api/fs.html) module built into Node.js, making
  the package size very small.

## Install Package

File System DB's size footprint is tiny, making the installation process really
quick and easy.

```sh
npm install file-system-db --save
```

## Setup and Usage

To set up your database, you only need to write two lines of code.

First of all, let's import the package.

```js
const { FSDB } = require("file-system-db");
```

Now for the fun part, let's create a database. Creating one only takes a single
line of code, and the best part is you can make as many as you want! You don't
need to worry about making sure the JSON file and directory path exists, as FSDB
can handle that for you.

It's as simple as creating a variable and assigning it to a new FSDB instance.

```js
const db = new FSDB();
```

There are also two optional parameters that can be passed to the constructor:

- `path` - The file path to the JSON file that will act as the database.
  (defaults to `"database.json"`)
- `compact` - This determines whether the database should be compacted after
  every save. This won't look easily readable to humans, but it will save you
  unnecessary storage space. (defaults to `true`)

Example:

```js
// Creates a database at `./db.json` and don't compact it
const db = new FSDB("./db.json", false);
```

If at any point you want to backup your database in the case of having to undo
something later, you can use `db.backup()`. Simply pass the path to the file you
want to save the backup to. Please note that all backups are saved with
`compact` set to `true` to save space.

```js
// Saves the current contents of the database to `"./db-backup.json"`
db.backup("./db-backup.json");
```

Here are some examples of how to use the database.

```js
// Saves the JSON: `{ "player": "WillTDA" }`
db.set("player", "WillTDA");

db.get("player");
// => "WillTDA"
```

You can also use dot notation to store and retrieve JSON data.

```js
// Saves the JSON: `{ "player": { "name": "WillTDA", "level": 15 } }`
db.set("player.name", "WillTDA");
db.set("player.level", 15);

// Alternatively, using an object as the value will also work
db.set("player", { name: "WillTDA", level: 15 });

db.get("player");
// => { "name": "WillTDA", "level": 15 }
```

You can get all data in the database with `db.getAll()`.

```js
db.getAll();
// => [{ "key": "player", "value": { "name": "WillTDA", "level": 15 } }]
```

To get all data starting with a certain key, you can use `db.startsWith()`.

```js
db.startsWith("play");
// => [{ "key": "player.name", "value": "WillTDA" }, { "key": "player.level", "value": 15 }]
```

To see if a key exists, use `db.has()`.

```js
db.has("player.name");
// => true
```

To delete data, you can use `db.delete()`.

```js
// Saves the JSON: `{ "player": { "name": "WillTDA" } }`
db.delete("player.level");
```

You can delete all data in the database with `db.deleteAll()`.

```js
// Saves the JSON: `{}`
db.deleteAll();
```

Pushing and pulling data on arrays is also supported.

```js
// Saves the JSON: `{ "inventory": [ "Diamond Sword", "Diamond Pickaxe" ] }`
db.push("inventory", "Diamond Sword");
db.push("inventory", "Diamond Pickaxe");

// Saves the JSON: `{ "inventory": [ "Diamond Sword" ] }`
db.pull("inventory", "Diamond Pickaxe");

// Alternatively, you can also pass multiple values to these methods
// Saves the JSON: `{ "inventory": [ "Diamond Sword", "Diamond Pickaxe" ] }`
db.push("inventory", "Diamond Sword", "Diamond Pickaxe");

// Saves the JSON: `{ "inventory": [] }`
db.pull("inventory", "Diamond Sword", "Diamond Pickaxe");
```

Mathematical operations on numbers can also be done.

```js
// Saves the JSON: `{ "coins": 500 }`
db.add("coins", 500);

// Saves the JSON: `{ "coins": 400 }`
db.subtract("coins", 100);

// Saves the JSON: `{ "coins": 800 }`
db.multiply("coins", 2);

// Saves the JSON: `{ "coins": 200 }`
db.divide("coins", 4);
```

## Contact Us

- 👋 Need Help? [Join Our Discord Server](https://diamonddigital.dev/discord)!
- 👾 Found a Bug? [Open an Issue](https://github.com/WillTDA/File-System-DB/issues),
or Fork and [Submit a Pull Request](https://github.com/WillTDA/File-System-DB/pulls)
on our [GitHub Repository](https://github.com/WillTDA/File-System-DB)!

---

<a href="https://diamonddigital.dev/">
  <strong>Created and maintained by</strong>
  <img align="center" alt="Diamond Digital Development Logo" src="https://diamonddigital.dev/img/png/ddd_logo_text_transparent.png" style="width:25%;height:auto" />
</a>
