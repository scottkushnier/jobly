"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureLoggedInAsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { id, name, description, numEmployees, logoUrl }
 *
 * Returns { id, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.post("/", ensureLoggedInAsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      console.log("not valid post data");
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }
    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { id, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - substring for title
 * - minimum salary
 * - whether job benefits include market equity
 *
 * Authorization required: none
 */

function checkJobGetQuery(queries) {
  for (let query of Object.keys(queries)) {
    // console.log("checking: ", query);
    if (
      query != "titleFilter" &&
      query != "minSalary" &&
      query != "hasEquity"
    ) {
      return { error: `bad query: ${query}` };
    }
    if (query == "minSalary") {
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
    const checkResult = checkJobGetQuery(req.query);
    if (checkResult) {
      throw new BadRequestError(checkResult.error);
    }
    // console.log("job name: ", req.query.name);
    // console.log("min: ", req.query.minEmployees);
    // console.log("max: ", req.query.maxEmployees);
    const jobs = await Job.findAll(
      req.query.titleFilter,
      req.query.minSalary,
      req.query.hasEquity
    );
    // console.log("len: ", jobs.length);
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[id]  =>  { job }
 *
 *  Job is { id, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { id, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

router.patch("/:id", ensureLoggedInAsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: login
 */

router.delete("/:id", ensureLoggedInAsAdmin, async function (req, res, next) {
  try {
    await Job.remove(req.params.id);
    return res.json({ deleted: req.params.id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
