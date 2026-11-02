import "./setup";

// Integration test setup
process.env.EMAIL_MOCK = "1";
if (process.env.E2E_EMAIL) {
  process.env.ALLOWED_EMAIL = process.env.E2E_EMAIL;
}
