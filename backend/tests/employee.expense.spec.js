const request = require("supertest");
const app = require("../index");

describe("Employee expenses flow", () => {
  it("creates a new draft expense", async () => {
    const res = await request(app)
      .post("/api/employee/expenses")
      .field("userId", process.env.TEST_EMPLOYEE_ID)
      .field("description", "Lunch")
      .field("category", "Food")
      .field("amount", "500")
      .field("currency", "INR")
      .field("date", "2025-10-04")
      .attach("receipt", "__tests__/fixtures/sample.jpg");
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("DRAFT");
  });

  it("submits the expense for approval", async () => {
    const res = await request(app)
      .patch(`/api/employee/expenses/${process.env.TEST_EXPENSE_ID}/submit`);
    expect([200, 201]).toContain(res.statusCode);
  });
});
