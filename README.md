<h1 align="center">
💿 File System DB 💿
</h1>

File System DB (or "FSDB" for short) is a Lightweight, Synchronous, Key-Value Based JSON File Database System.

**Please Note:** This package saves data persistently. This means that this will not work on places like Heroku and similar services.

## Features

- 📦 <b>Works Out of the Box</b> | Only two lines of code are required to set up and start using your own database.

- 🤹‍♂️ <b>Unlimited Databases</b> | You can create as many databases as you want, whenever you want.

- 🗃️ <b>Saved as JSON Files</b> | This package uses JSON files to act as databases, so you can easily understand, edit and backup/export the data.

- 📝 <b>Key-Value Based</b> | Designed with beginners in mind, so you can store any type of data in your database with ease.

- 📔 <b>Dot Notation Support</b> | You can use dot notation to store and retrieve JSON fields and data.

- ⚡ <b>Fast and Synchronous</b> | All operations are synchronous, so saving and retrieving data takes less than few milliseconds.

- 🚫 <b>No Dependencies</b> | This package is built on top of the [File System](https://nodejs.org/api/fs.html) module built into Node.js, making the package size very small.


## Install Package

File System DB's size footprint is tiny, making the installation process really quick and easy.

`npm install file-system-db --save`

## Setup and Usage

To set up your database, you only need to write two lines of code.

First of all, let's import the package.
```js
const FSDB = require("file-system-db");
```
Now for the fun part, let's create a database. Creating one only takes a single line of code, and the best part is you can make as many as you want! You don't need to worry about making sure the JSON file and directory path exists, as File System DB can handle that for you.

It's as simple as creating a variable and assigning it to a new FSDB instance.

```js
const db = new FSDB();
```

There are also two optional parameters that can be passed to the constructor. Those are:

- `path` - The file path to the JSON file that will act as the database. (Defaults to `./database.json`)

- `compact` - This determines whether the database should be compacted after every save. This won't look easily readable to humans, but it will save you unnecessary storage space. (Defaults to `true`)

Example:
```js
const db = new FSDB("./db.json", false); 
// Creates a database at `./db.json` and doesn't compact it, making it easier for humans to read.
```

If at any point you want to backup your database in the case of having to undo something later, you can use `db.backup()`. Simply pass the path to the file you want to save the backup to. Please note that all backups are saved with `compact` set to `true` to save space.

```js
db.backup("./db-backup.json");
// Saves entire contents of the database to `./db-backup.json`
```

Here are some examples of how to use the database.

```js
db.set("player", "WillTDA");
// Saves as JSON: { "player": "WillTDA" }

db.get("player");
// => "WillTDA"
```
You can also use dot notation to store and retrieve JSON data.

```js
db.set("player.name", "WillTDA");
db.set("player.level", 15);
// Saves as JSON: { "player": { "name": "WillTDA", "level": 15 } }

// A better way to do this
db.set("player", { name: "WillTDA", level: 15 });

db.get("player");
// => { "name": "WillTDA", "level": 15 }
```

You can get all data in the database with `db.all()`.

```js
db.all();
// => [{ "ID": "player.name", "data": "WillTDA" }, { "ID": "player.level", "data": 15 }]
```

To get all data starting with a certain key, you can use `db.startsWith()`.

```js
db.startsWith("play");
// => [{ "ID": "player.name", "data": "WillTDA" }, { "ID": "player.level", "data": 15 }]
```

To see if a key exists, use `db.has()`.

```js
db.has("player.name");
// => true
```

To delete data, you can use `db.delete()`.

```js
db.delete("player.level");
// Saves as JSON: { "player": { "name": "WillTDA" } }
```

You can delete all data in the database with `db.deleteAll()`.

```js
db.deleteAll();
// Becomes an Empty JSON: {}
```

Pushing and pulling data on arrays is also supported.

```js
// Pushing data one by one
db.push("inventory", "Diamond Sword");
db.push("inventory", "Diamond Pickaxe");
// Saves as JSON: { "inventory": [ "Diamond Sword", "Diamond Pickaxe" ] }

// Pulling data
db.pull("inventory", "Diamond Pickaxe");
// Saves as JSON: { "inventory": [ "Diamond Sword" ] }

// A better way to do this
db.push("inventory", ["Diamond Sword", "Diamond Pickaxe"]);
// Saves as JSON: { "inventory": [ "Diamond Sword", "Diamond Pickaxe" ] }

db.pull("inventory", ["Diamond Sword", "Diamond Pickaxe"]);
// Saves as JSON: { "inventory": [] }
```

Mathematical operations on numbers can also be done.

```js
db.add("coins", 500);
// Saves as JSON: { "coins": 500 }

db.subtract("coins", 100);
// Saves as JSON: { "coins": 400 }

db.multiply("coins", 2);
// Saves as JSON: { "coins": 800 }

db.divide("coins", 4);
// Saves as JSON: { "coins": 200 }
```

## Contact Me

- 👋 Need Help? [Join Our Discord Server](https://discord.gg/P2g24jp)!

- 👾 Found a Bug? [Open an Issue](https://github.com/WillTDA/File-System-DB/issues), or Fork and [Submit a Pull Request](https://github.com/WillTDA/File-System-DB/pulls) on our [GitHub Repository](https://github.com/WillTDA/File-System-DB)!