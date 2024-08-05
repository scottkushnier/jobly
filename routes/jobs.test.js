"use strict";

const request = require("supertest");

const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "guy",
    salary: 56000,
    equity: 0.01,
    companyHandle: "c2",
  };

  test("not ok for plain users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`); // not an admin
    expect(resp.statusCode).toEqual(401);
  });

  test("ok for admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u2Token}`); // an admin
    delete resp.body.job.id; // remove id before try match
    resp.body.job.equity = +resp.body.job.equity; // convert returned equity (string) back to number
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
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
          companyHandle: "c3",
        },
      ],
    });
  });

  test("filter by title", async function () {
    const resp = await request(app).get("/jobs?titleFilter=2");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "title-2",
          salary: 60000,
          equity: "0.01",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("filter by salary", async function () {
    const resp = await request(app).get("/jobs?minSalary=65000");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "title-3",
          salary: 70000,
          equity: "0.02",
          companyHandle: "c3",
        },
      ],
    });
  });

  test("filter by equity", async function () {
    const resp = await request(app).get("/jobs?hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
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
          companyHandle: "c3",
        },
      ],
    });
  });

  test("filter by salary & equity", async function () {
    const resp = await request(app).get("/jobs?minSalary=65000&hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "title-3",
          salary: 70000,
          equity: "0.02",
          companyHandle: "c3",
        },
      ],
    });
  });

  test("filter, bad query param", async function () {
    const resp = await request(app).get("/jobs?apples=6");
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const jobs = (await request(app).get("/jobs")).body.jobs;
    const jobId = jobs[2].id;
    const resp = await request(app).get(`/jobs/${jobId}`);
    delete resp.body.job.id; // remove id before try match
    resp.body.job.equity = +resp.body.job.equity; // convert returned equity (string) back to number
    expect(resp.body).toEqual({
      job: {
        title: "title-3",
        salary: 70000,
        equity: 0.02,
        companyHandle: "c3",
      },
    });
  });

  test("works for anon: job w/o jobs", async function () {
    const jobs = (await request(app).get("/jobs")).body.jobs;
    const jobId = jobs[1].id;
    const resp = await request(app).get(`/jobs/${jobId}`);
    delete resp.body.job.id; // remove id before try match
    resp.body.job.equity = +resp.body.job.equity; // convert returned equity (string) back to number
    expect(resp.body).toEqual({
      job: {
        title: "title-2",
        salary: 60000,
        equity: 0.01,
        companyHandle: "c1",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

// /************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("patch just title", async function () {
    const jobs = (await request(app).get("/jobs")).body.jobs;
    const jobId = jobs[1].id;
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "even more important guy",
      })
      .set("authorization", `Bearer ${u2Token}`);
    delete resp.body.job.id; // remove id before try match
    resp.body.job.equity = +resp.body.job.equity; // convert returned equity (string) back to number
    expect(resp.body).toEqual({
      job: {
        title: "even more important guy",
        salary: 60000,
        equity: 0.01,
        companyHandle: "c1",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/c1`).send({
      name: "C1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/0`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for users", async function () {
    const jobs = (await request(app).get("/jobs")).body.jobs;
    // console.log("jobs: ", jobs);
    const jobId = jobs[1].id;
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ deleted: `${jobId}` });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
