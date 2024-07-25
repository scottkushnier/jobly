"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureLoggedInAsAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.post("/", ensureLoggedInAsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

function checkCompanyGetQuery(queries) {
  for (let query of Object.keys(queries)) {
    // console.log("checking: ", query);
    if (query != "maxEmployees" && query != "minEmployees" && query != "name") {
      return { error: `bad query: ${query}` };
    }
    if (query == "minEmployees" || query == "maxEmployees") {
      // console.log(`${query} (${queries[query]})`);
      if (isNaN(queries[query])) {
        return { error: `${query} (${queries[query]}) must be a number` };
      }
    }
  }
  return null;
}

router.get("/", async function (req, res, next) {
  try {
    // console.log(Object.keys(req.query));
    // SDK - check if query using only legal filters
    const checkResult = checkCompanyGetQuery(req.query);
    if (checkResult) {
      throw new BadRequestError(checkResult.error);
    }
    // console.log("name: ", req.query.name);
    // console.log("min: ", req.query.minEmployees);
    // console.log("max: ", req.query.maxEmployees);
    const companies = await Company.findAll(
      req.query.name,
      +req.query.minEmployees, // coerce from url string (e.g. the string: "7" in "&maxEmployees=7") to a number
      +req.query.maxEmployees // here too
    );
    // console.log("len: ", companies.length);
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const company = await Company.get(req.params.handle);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

router.patch(
  "/:handle",
  ensureLoggedInAsAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, companyUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const company = await Company.update(req.params.handle, req.body);
      return res.json({ company });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

router.delete(
  "/:handle",
  ensureLoggedInAsAdmin,
  async function (req, res, next) {
    try {
      await Company.remove(req.params.handle);
      return res.json({ deleted: req.params.handle });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
