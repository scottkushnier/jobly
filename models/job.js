"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  // allow user to specify a desired substring in title, minimum salary, and specify whether to filter
  // only jobs that include market equity in the company
  static async findAll(titleFilter = null, minSalary = null, hasEquity = null) {
    let whereClause = "";
    let args = [];
    let argIndex = 1;

    // SDK - build WHERE clause for filtering of results
    if (titleFilter) {
      // SDK - for each filter, use WHERE or AND as appropriate, add to clause, add to args list, & note index++ for $n
      whereClause += argIndex == 1 ? "WHERE " : "AND ";
      whereClause += `title ILIKE $${argIndex} `;
      args.push(`%${titleFilter}%`);
      argIndex++;
    }
    if (minSalary) {
      whereClause += argIndex == 1 ? "WHERE " : "AND ";
      whereClause += `salary >= $${argIndex} `;
      args.push(`${minSalary}`);
      argIndex++;
    }
    if (hasEquity) {
      whereClause += argIndex == 1 ? "WHERE " : "AND ";
      whereClause += `equity > 0 `;
    }
    // console.log("clause: ", whereClause);
    // console.log("args:", args);
    // SDK - filter jobs by criteria
    const jobsRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             ${whereClause}
             ORDER BY id`,
      args
    );
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    // console.log("id: ", id);
    const jobRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  static async update(id, data) {
    // console.log("id: ", id, "data", data);
    const dataToChange = { ...data }; // copy object, so can remove some items
    delete dataToChange.companyHandle; // don't allow to change company handle

    const { setCols, values } = sqlForPartialUpdate(dataToChange, {
      companyHandle: "company_handle",
    });

    const idx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                        SET ${setCols}
                        WHERE id = ${idx}
                        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    // console.log("job for update: ", job);

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
             FROM jobs
             WHERE id = $1
             RETURNING id`,
      [id]
    );
    const job = result.rows[0];
    if (job) return { removed: job };

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
