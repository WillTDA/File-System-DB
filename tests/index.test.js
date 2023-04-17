const assert = require("assert");
const { readFileSync, unlinkSync, writeFileSync } = require("fs");
const { join } = require("path");
const { FSDB } = require("file-system-db");

describe("FSDB", () => {
    /** @type {FSDB} */
    let db;

    describe("initializing the class", () => {
        describe("usage", () => {
            const filename = "initialization-db.json";
            const filepath = join(__dirname, filename);

            afterEach(() => unlinkSync(db.path));

            it("should handle no arguments", () => {
                db = new FSDB();
                const expectedPath = join(__dirname, "database.json");

                assert(db instanceof FSDB);
                assert.strictEqual(db.path, expectedPath);
                assert.strictEqual(readFileSync(expectedPath, "utf8"), "{}");
            });

            it("should handle a custom, relative path", () => {
                db = new FSDB(`./${filename}`);

                assert(db instanceof FSDB);
                assert.strictEqual(db.path, filepath);
                assert.strictEqual(readFileSync(filepath, "utf8"), "{}");
            });

            it("should handle a custom path, absolute path", () => {
                const { homedir } = require("os");
                const filepath = join(homedir(), filename);
                db = new FSDB(filepath);

                assert(db instanceof FSDB);
                assert.strictEqual(db.path, filepath);
                assert.strictEqual(readFileSync(filepath, "utf8"), "{}");
            });

            it("should handle referencing an existing database", () => {
                db = new FSDB(`./${filename}`);
                const content = JSON.stringify({ foo: "bar" });
                writeFileSync(filepath, content, "utf8");

                assert(db instanceof FSDB);
                assert.strictEqual(db.path, filepath);
                assert.strictEqual(readFileSync(filepath, "utf8"), content);
            });
        });
    });

    describe("performing basic operations", () => {
        const exampleData = {
            foo: "bar",
            bar: 0,
            baz: true,
            qux: [1, 2, 3],
        };

        before(() => {
            db = new FSDB("set-get-db.json");

            // set some values
            db.set("quux", exampleData);
            Object.entries(exampleData).forEach(([key, value]) => {
                db.set(key, value);
            });
        });

        after(() => unlinkSync(db.path));

        describe("setting values", () => {
            it("should set serializable values in the database", () => {
                const data = JSON.parse(readFileSync(db.path, "utf8"));
                const expected = { ...exampleData, quux: exampleData };
                assert.deepStrictEqual(data, expected);
            });

            it("should not set non-serializable values in the database", () => {
                db.set("non-serializable", () => {});
                const data = JSON.parse(readFileSync(db.path, "utf8"));
                assert.strictEqual(data["non-serializable"], undefined);
            });

            it("should set nested values in the database", () => {
                db.set("an.example.nested.key", 42);
                const data = JSON.parse(readFileSync(db.path, "utf8"));
                assert.strictEqual(data.an.example.nested.key, 42);
            });
        });

        describe("getting values", () => {
            it("should get top-level values from the database", () => {
                assert.deepStrictEqual(db.get("quux"), exampleData);
                Object.entries(exampleData).forEach(([key, value]) => {
                    assert.deepStrictEqual(db.get(key), value);
                });
            });

            it("should get nested values from the database", () => {
                Object.entries(exampleData).forEach(([key, value]) => {
                    assert.deepStrictEqual(db.get(`quux.${key}`), value);
                });
            });

            it("should get nested array values from the database", () => {
                assert.deepStrictEqual(db.get("quux.qux.0"), 1);
                assert.deepStrictEqual(db.get("quux.qux.1"), 2);
                assert.deepStrictEqual(db.get("quux.qux.2"), 3);
            });

            it("should get `undefined` for non-existent values", () => {
                assert.strictEqual(db.get("non-existent"), undefined);
            });
        });

        describe("checking for values", () => {
            it("should return `true` for existing values", () => {
                assert.strictEqual(db.has("quux"), true);
                Object.keys(exampleData).forEach((key) => {
                    assert.strictEqual(db.has(key), true);
                });
            });

            it("should return `false` for non-existent values", () => {
                assert.strictEqual(db.has("non-existent"), false);
            });
        });

        describe("deleting values", () => {
            it("should delete top-level values from the database", () => {
                db.delete("foo");
                assert.strictEqual(db.get("foo"), undefined);
            });

            it("should delete nested values from the database", () => {
                db.delete("quux.foo");
                assert.strictEqual(db.get("quux.foo"), undefined);
            });

            it("should not throw for non-existent values", () => {
                assert.doesNotThrow(() => db.delete("non-existent"));
            });
        });

        describe("getting entries", () => {
            it("should get all entries from the database", () => {
                const entries = db.getAll();
                const expected = [
                    { key: "bar", value: 0 },
                    { key: "baz", value: true },
                    { key: "qux", value: [1, 2, 3] },
                    {
                        key: "quux",
                        value: { bar: 0, baz: true, qux: [1, 2, 3] },
                    },
                    { key: "an", value: { example: { nested: { key: 42 } } } },
                ];

                entries.forEach(({ key, value }) => {
                    assert.deepStrictEqual(
                        value,
                        expected.find((entry) => entry.key === key)?.value
                    );
                });
            });

            it("should get all entries when `verbose` is `true`", () => {
                const entries = db.getAll(true);
                const expected = [
                    { key: "bar", value: 0 },
                    { key: "baz", value: true },
                    { key: "qux.0", value: 1 },
                    { key: "qux.1", value: 2 },
                    { key: "qux.2", value: 3 },
                    { key: "quux.bar", value: 0 },
                    { key: "quux.baz", value: true },
                    { key: "quux.qux.0", value: 1 },
                    { key: "quux.qux.1", value: 2 },
                    { key: "quux.qux.2", value: 3 },
                    { key: "an.example.nested.key", value: 42 },
                ];

                entries.forEach(({ key, value }) => {
                    assert.strictEqual(
                        value,
                        expected.find((entry) => entry.key === key)?.value
                    );
                });
            });

            it("should get all entries starting with a given query", () => {
                const entries = db.startsWith("qu");
                const expected = [
                    { key: "qux.0", value: 1 },
                    { key: "qux.1", value: 2 },
                    { key: "qux.2", value: 3 },
                    { key: "quux.bar", value: 0 },
                    { key: "quux.baz", value: true },
                    { key: "quux.qux.0", value: 1 },
                    { key: "quux.qux.1", value: 2 },
                    { key: "quux.qux.2", value: 3 },
                ];

                entries.forEach(({ key, value }) => {
                    assert.deepStrictEqual(
                        value,
                        expected.find((entry) => entry.key === key)?.value
                    );
                });
            });
        });

        describe("backing up content", () => {
            it("should create a backup of the database", () => {
                const expectedPath = join(__dirname, "../backup.json");
                db.backup(expectedPath);
                assert.strictEqual(
                    readFileSync(expectedPath, "utf8"),
                    readFileSync(db.path, "utf8")
                );

                unlinkSync(expectedPath);
            });
        });

        describe("delete all content", () => {
            it("should clear the database", () => {
                db.deleteAll();
                assert.strictEqual(readFileSync(db.path, "utf8"), "{}");
            });
        });
    });

    describe("performing array operations", () => {
        before(() => {
            db = new FSDB("array-db.json");
            db.set("arr1", []);
            db.set("arr2", [1, 2, 3]);
            db.set("arr3", ["a", "b", "c"]);
        });

        after(() => unlinkSync(db.path));

        describe("pushing values", () => {
            it("should push values to array", () => {
                db.push("arr1", "a");
                assert.deepStrictEqual(db.get("arr1"), ["a"]);

                db.push("arr2", 4);
                assert.deepStrictEqual(db.get("arr2"), [1, 2, 3, 4]);

                db.push("arr3", "d");
                assert.deepStrictEqual(db.get("arr3"), ["a", "b", "c", "d"]);
            });

            it("should push multiple values to array", () => {
                db.push("arr1", 1, "b", 2, 3);
                assert.deepStrictEqual(db.get("arr1"), ["a", 1, "b", 2, 3]);

                db.push("arr2", 5, 6, 7);
                assert.deepStrictEqual(db.get("arr2"), [1, 2, 3, 4, 5, 6, 7]);
            });
        });

        describe("removing values", () => {
            it("should remove values from array", () => {
                db.pull("arr1", 3);
                assert.deepStrictEqual(db.get("arr1"), ["a", 1, "b", 2]);

                db.pull("arr2", 7);
                assert.deepStrictEqual(db.get("arr2"), [1, 2, 3, 4, 5, 6]);
            });

            it("should remove multiple values from array", () => {
                db.pull("arr1", 1, 2);
                assert.deepStrictEqual(db.get("arr1"), ["a", "b"]);

                db.pull("arr2", 4, 5, 6);
                assert.deepStrictEqual(db.get("arr2"), [1, 2, 3]);
            });
        });
    });

    describe("performing arithmetic operations", () => {
        before(() => {
            db = new FSDB("arithmetic-db.json");
        });

        after(() => unlinkSync(db.path));

        beforeEach(() => {
            db.set("n1", 0);
            db.set("n2", 1_000);
            db.set("n3", -1_000);
        });

        describe("adding values", () => {
            it("should handle positive numbers", () => {
                db.add("n1", 1);
                assert.strictEqual(db.get("n1"), 1);
                db.add("n1", 50);
                assert.strictEqual(db.get("n1"), 51);
                db.add("n1", 5.125);
                assert.strictEqual(db.get("n1"), 56.125);

                db.add("n2", 1);
                assert.strictEqual(db.get("n2"), 1_001);
                db.add("n2", 500);
                assert.strictEqual(db.get("n2"), 1_501);
                db.add("n2", 25.5);
                assert.strictEqual(db.get("n2"), 1_526.5);

                db.add("n3", 1);
                assert.strictEqual(db.get("n3"), -999);
                db.add("n3", 250);
                assert.strictEqual(db.get("n3"), -749);
                db.add("n3", 12.75);
                assert.strictEqual(db.get("n3"), -736.25);
            });

            it("should handle negative numbers", () => {
                db.add("n1", -1);
                assert.strictEqual(db.get("n1"), -1);
                db.add("n1", -50);
                assert.strictEqual(db.get("n1"), -51);
                db.add("n1", -5.125);
                assert.strictEqual(db.get("n1"), -56.125);

                db.add("n2", -1);
                assert.strictEqual(db.get("n2"), 999);
                db.add("n2", -500);
                assert.strictEqual(db.get("n2"), 499);
                db.add("n2", -25.5);
                assert.strictEqual(db.get("n2"), 473.5);

                db.add("n3", -1);
                assert.strictEqual(db.get("n3"), -1_001);
                db.add("n3", -250);
                assert.strictEqual(db.get("n3"), -1_251);
                db.add("n3", -12.75);
                assert.strictEqual(db.get("n3"), -1_263.75);
            });
        });

        describe("subtracting values", () => {
            it("should handle positive numbers", () => {
                db.subtract("n1", 1);
                assert.strictEqual(db.get("n1"), -1);
                db.subtract("n1", 50);
                assert.strictEqual(db.get("n1"), -51);
                db.subtract("n1", 5.125);
                assert.strictEqual(db.get("n1"), -56.125);

                db.subtract("n2", 1);
                assert.strictEqual(db.get("n2"), 999);
                db.subtract("n2", 500);
                assert.strictEqual(db.get("n2"), 499);
                db.subtract("n2", 25.5);
                assert.strictEqual(db.get("n2"), 473.5);

                db.subtract("n3", 1);
                assert.strictEqual(db.get("n3"), -1_001);
                db.subtract("n3", 250);
                assert.strictEqual(db.get("n3"), -1_251);
                db.subtract("n3", 12.75);
                assert.strictEqual(db.get("n3"), -1_263.75);
            });

            it("should handle negative numbers", () => {
                db.subtract("n1", -1);
                assert.strictEqual(db.get("n1"), 1);
                db.subtract("n1", -50);
                assert.strictEqual(db.get("n1"), 51);
                db.subtract("n1", -5.125);
                assert.strictEqual(db.get("n1"), 56.125);

                db.subtract("n2", -1);
                assert.strictEqual(db.get("n2"), 1_001);
                db.subtract("n2", -500);
                assert.strictEqual(db.get("n2"), 1_501);
                db.subtract("n2", -25.5);
                assert.strictEqual(db.get("n2"), 1_526.5);

                db.subtract("n3", -1);
                assert.strictEqual(db.get("n3"), -999);
                db.subtract("n3", -250);
                assert.strictEqual(db.get("n3"), -749);
                db.subtract("n3", -12.75);
                assert.strictEqual(db.get("n3"), -736.25);
            });
        });

        describe("multiplying values", () => {
            it("should handle positive numbers", () => {
                db.multiply("n1", 1);
                assert.strictEqual(db.get("n1"), 0);
                db.multiply("n1", 50);
                assert.strictEqual(db.get("n1"), 0);
                db.multiply("n1", 5.125);
                assert.strictEqual(db.get("n1"), 0);

                db.multiply("n2", 1);
                assert.strictEqual(db.get("n2"), 1_000);
                db.multiply("n2", 500);
                assert.strictEqual(db.get("n2"), 500_000);
                db.multiply("n2", 25.5);
                assert.strictEqual(db.get("n2"), 12_750_000);

                db.multiply("n3", 1);
                assert.strictEqual(db.get("n3"), -1_000);
                db.multiply("n3", 250);
                assert.strictEqual(db.get("n3"), -250_000);
                db.multiply("n3", 12.75);
                assert.strictEqual(db.get("n3"), -3_187_500);
            });

            it("should handle negative numbers", () => {
                db.multiply("n1", -1);
                assert.strictEqual(db.get("n1"), 0);
                db.multiply("n1", -50);
                assert.strictEqual(db.get("n1"), 0);
                db.multiply("n1", -5.125);
                assert.strictEqual(db.get("n1"), 0);

                db.multiply("n2", -1);
                assert.strictEqual(db.get("n2"), -1_000);
                db.multiply("n2", -500);
                assert.strictEqual(db.get("n2"), 500_000);
                db.multiply("n2", -25.5);
                assert.strictEqual(db.get("n2"), -12_750_000);

                db.multiply("n3", -1);
                assert.strictEqual(db.get("n3"), 1_000);
                db.multiply("n3", -250);
                assert.strictEqual(db.get("n3"), -250_000);
                db.multiply("n3", -12.75);
                assert.strictEqual(db.get("n3"), 3_187_500);
            });
        });

        describe("dividing values", () => {
            it("should handle positive numbers", () => {
                db.divide("n1", 1);
                assert.strictEqual(db.get("n1"), 0);
                db.divide("n1", 50);
                assert.strictEqual(db.get("n1"), 0);
                db.divide("n1", 5.125);
                assert.strictEqual(db.get("n1"), 0);

                db.divide("n2", 1);
                assert.strictEqual(db.get("n2"), 1_000);
                db.divide("n2", 500);
                assert.strictEqual(db.get("n2"), 2);
                db.divide("n2", 0.5);
                assert.strictEqual(db.get("n2"), 4);

                db.divide("n3", 1);
                assert.strictEqual(db.get("n3"), -1_000);
                db.divide("n3", 250);
                assert.strictEqual(db.get("n3"), -4);
                db.divide("n3", 0.5);
                assert.strictEqual(db.get("n3"), -8);
            });

            it("should handle negative numbers", () => {
                db.divide("n1", -1);
                assert.strictEqual(db.get("n1"), 0);
                db.divide("n1", -50);
                assert.strictEqual(db.get("n1"), 0);
                db.divide("n1", -5.125);
                assert.strictEqual(db.get("n1"), 0);

                db.divide("n2", -1);
                assert.strictEqual(db.get("n2"), -1_000);
                db.divide("n2", -500);
                assert.strictEqual(db.get("n2"), 2);
                db.divide("n2", -0.5);
                assert.strictEqual(db.get("n2"), -4);

                db.divide("n3", -1);
                assert.strictEqual(db.get("n3"), 1_000);
                db.divide("n3", -250);
                assert.strictEqual(db.get("n3"), -4);
                db.divide("n3", -0.5);
                assert.strictEqual(db.get("n3"), 8);
            });
        });
    });
});
