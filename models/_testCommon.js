const bcrypt = require("bcrypt");

const db = require("../db.js");
const { BCRYPT_WORK_FACTOR } = require("../config");

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM jobs");

  // reset jobs autoinc for ids for testing purposes
  await db.query("ALTER SEQUENCE jobs_id_seq RESTART WITH 1");

  await db.query(`
    INSERT INTO companies(handle, name, num_employees, description, logo_url)
    VALUES ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
           ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
           ('c3', 'C3', 3, 'Desc3', 'http://c3.img')`);

  const jobsResult = await db.query(`
            INSERT INTO jobs (title, salary, equity, company_handle)
            VALUES ('title-1', 50000, 0, 'c1'),
                   ('title-2', 60000, 0.01, 'c1'),
                   ('title-3', 70000, 0.02, 'c2')
                   RETURNING id`);
  const jobIds = jobsResult.rows.map((job) => job.id); // save ids for use later in setting up applications table
  // console.log("ids: ", jobIds);

  await db.query(
    `
        INSERT INTO users(username,
                          password,
                          first_name,
                          last_name,
                          email)
        VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
               ('u2', $2, 'U2F', 'U2L', 'u2@email.com')
        RETURNING username`,
    [
      await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
      await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
    ]
  );

  await db.query(`
    INSERT INTO applications (username, job_id)
    VALUES ('u1', ${jobIds[0]}),
           ('u1', ${jobIds[1]})`);
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
};
