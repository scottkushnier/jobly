"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll( // SDK - (optional) args for filtering
    nameFilter = null,
    minEmployees = null,
    maxEmployees = null
  ) {
    // SDK - to accumulate data for SQL query string
    let whereClause = "";
    let args = [];
    let argIndex = 1;
    // SDK - check that Max > Min
    if (
      minEmployees != null &&
      maxEmployees != null &&
      maxEmployees < minEmployees
    ) {
      throw new BadRequestError(
        `Filter minimum (${minEmployees}) specified is greater than maximum (${maxEmployees})`
      );
    }
    // SDK - build WHERE clause for filtering of results
    if (nameFilter) {
      // SDK - for each filter, use WHERE or AND as appropriate, add to clause, add to args list, & note index++ for $n
      whereClause += argIndex == 1 ? "WHERE " : "AND ";
      whereClause += `name ILIKE $${argIndex} `;
      args.push(`%${nameFilter}%`);
      argIndex++;
    }
    if (minEmployees) {
      whereClause += argIndex == 1 ? "WHERE " : "AND ";
      whereClause += `num_employees >= $${argIndex} `;
      args.push(minEmployees);
      argIndex++;
    }
    if (maxEmployees) {
      whereClause += argIndex == 1 ? "WHERE " : "AND ";
      whereClause += `num_employees <= $${argIndex} `;
      args.push(maxEmployees);
      argIndex++;
    }
    // console.log("clause: ", whereClause);
    // console.log("args:", args);
    // SDK - insert filtering clauses here
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ${whereClause}
           ORDER BY name`,
      args
    );
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1 `,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    // SDK - collect jobs & associate with company
    const jobRes = await db.query(
      `SELECT id, 
          title,
          salary,
          equity
        FROM jobs
        WHERE company_handle = $1
        ORDER BY id`,
      [handle]
    );
    company.jobs = jobRes.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
