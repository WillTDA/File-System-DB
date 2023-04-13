const assert = require("assert");
const FSDB = require("file-system-db");

describe("FSDB", () => {
    /** @type {FSDB} */
    let db;

    before(() => {
        const { join } = require("path");
        db = new FSDB(join(__dirname, "example"));
    });

    after(() => {
        const { unlinkSync } = require("fs");
        unlinkSync(db.path);
    });

    it("should create a new instance", () => {
        assert(db instanceof FSDB);
    });
});
