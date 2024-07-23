"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newjob = {
    title: "important-guy",
    salary: 75000,
    equity: "0",
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newjob);
    delete job.id; // ignore resulting id as unpredictable
    job.equity += ""; // convert equity to string as that's how it's returned from pg (from NUMERIC type)
    expect(job).toEqual(newjob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'important-guy'`
    );
    expect(result.rows).toEqual([
      {
        title: "important-guy",
        salary: 75000,
        equity: "0",
        company_handle: "c1",
      },
    ]);
  });
});

// /************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "title-1",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "title-2",
        salary: 60000,
        equity: "0.01",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "title-3",
        salary: 70000,
        equity: "0.02",
        companyHandle: "c2",
      },
    ]);
  });
  //   test("works: filter name", async function () {
  //     let jobs = await job.findAll("2", null, null);
  //     expect(jobs).toEqual([
  //       {
  //         handle: "c2",
  //         name: "C2",
  //         description: "Desc2",
  //         numEmployees: 2,
  //         logoUrl: "http://c2.img",
  //       },
  //     ]);
  //   });
  //   test("works: filter to num employees >= 2", async function () {
  //     let jobs = await job.findAll(null, 2, null);
  //     expect(jobs).toEqual([
  //       {
  //         handle: "c2",
  //         name: "C2",
  //         description: "Desc2",
  //         numEmployees: 2,
  //         logoUrl: "http://c2.img",
  //       },
  //       {
  //         handle: "c3",
  //         name: "C3",
  //         description: "Desc3",
  //         numEmployees: 3,
  //         logoUrl: "http://c3.img",
  //       },
  //     ]);
  //   });
  //   test("works: filter to num employees between 3 & 5", async function () {
  //     let jobs = await job.findAll(null, 3, 5);
  //     expect(jobs).toEqual([
  //       {
  //         handle: "c3",
  //         name: "C3",
  //         description: "Desc3",
  //         numEmployees: 3,
  //         logoUrl: "http://c3.img",
  //       },
  //     ]);
  //   });
  //   test("works: filter name * num employees", async function () {
  //     let jobs = await job.findAll("1", 1, 1);
  //     expect(jobs).toEqual([
  //       {
  //         handle: "c1",
  //         name: "C1",
  //         description: "Desc1",
  //         numEmployees: 1,
  //         logoUrl: "http://c1.img",
  //       },
  //     ]);
  //   });
  //   test("should fail: min > max", async function () {
  //     try {
  //       let jobs = await job.findAll(null, 20, 10);
  //     } catch (err) {
  //       // console.log("err:", err);
  //       expect(err instanceof BadRequestError).toBeTruthy();
  //     }
  //   });
});

// /************************************** get */

describe("get", function () {
  test("works", async function () {
    let jobs = await Job.findAll();
    console.log("jobs: ", jobs);
    const jobId = jobs[1].id;
    console.log("jobId: ", jobId);
    let job = await Job.get(jobId);
    expect(job).toEqual({
      id: jobId,
      title: "title-2",
      salary: 60000,
      equity: "0.01",
      companyHandle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

// /************************************** update */

describe("update", function () {
  const updateData = {
    title: "new-title",
    salary: 123456,
    equity: "0.04",
    companyHandle: "c1",
  };

  test("works", async function () {
    let jobs = await Job.findAll();
    console.log("jobs: ", jobs);
    const jobId = jobs[0].id;

    const job = await Job.update(jobId, updateData);

    console.log("job returned: ", job);
    console.log("expected: ", {
      id: expect.any(Number),
      ...updateData,
    });
    expect(job).toEqual({
      id: expect.any(Number),
      ...updateData,
    });
  });

  //   test("works, just change job name", async function () {
  //     const newName = "ABC job";
  //     const origjob = await job.get("c1");
  //     // console.log(origjob);
  //     let job = await job.update("c1", { name: newName });
  //     job = await job.get("c1");
  //     expect(job.name).toEqual(newName); // check new name
  //     delete origjob.name; // then, check that all else is same
  //     delete job.name;
  //     expect(job).toEqual(origjob);
  //   });

  //   test("works, change job description and number of employees", async function () {
  //     const origjob = await job.get("c1");
  //     const newDesc = origjob.description + " - a wonderful job"; // ensure that new values != old values
  //     const newNumEmployees = origjob.numEmployees + 15;
  //     // console.log(origjob);
  //     let job = await job.update("c1", {
  //       description: newDesc,
  //       num_employees: newNumEmployees,
  //     });
  //     job = await job.get("c1");
  //     expect(job.description).toEqual(newDesc); // check new desc
  //     expect(job.numEmployees).toEqual(newNumEmployees); // check new # employees
  //     delete origjob.description; // then, check that all else is same
  //     delete job.description;
  //     delete origjob.numEmployees;
  //     delete job.numEmployees;
  //     expect(job).toEqual(origjob);
  //   });

  //   test("works: null fields", async function () {
  //     const updateDataSetNulls = {
  //       name: "New",
  //       description: "New Description",
  //       numEmployees: null,
  //       logoUrl: null,
  //     };

  //     let job = await job.update("c1", updateDataSetNulls);
  //     expect(job).toEqual({
  //       handle: "c1",
  //       ...updateDataSetNulls,
  //     });

  //     const result = await db.query(
  //       `SELECT handle, name, description, num_employees, logo_url
  //            FROM jobs
  //            WHERE handle = 'c1'`
  //     );
  //     expect(result.rows).toEqual([
  //       {
  //         handle: "c1",
  //         name: "New",
  //         description: "New Description",
  //         num_employees: null,
  //         logo_url: null,
  //       },
  //     ]);
  //   });

  //   test("not found if no such job", async function () {
  //     try {
  //       await job.update("nope", updateData);
  //       fail();
  //     } catch (err) {
  //       expect(err instanceof NotFoundError).toBeTruthy();
  //     }
  //   });

  //   test("bad request with no data", async function () {
  //     try {
  //       await job.update("c1", {});
  //       fail();
  //     } catch (err) {
  //       expect(err instanceof BadRequestError).toBeTruthy();
  //     }
  //   });
});

// /************************************** remove */

describe("remove", function () {
  test("works", async function () {
    let jobs = await Job.findAll();
    console.log("jobs: ", jobs);
    const jobId = jobs[2].id;

    await Job.remove(jobId);
    const res = await db.query("SELECT * FROM jobs");
    expect(res.rows.length).toEqual(2);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
