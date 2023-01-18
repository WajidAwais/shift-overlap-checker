const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { createApp } = require("./app");

const prisma = new PrismaClient();
const app = createApp({
  prisma,
  clientDir: path.join(__dirname, "client", "dist"),
  logFormat: process.env.NODE_ENV === "production" ? "combined" : "dev",
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Shift overlap checker listening on port ${port}`);
});

function shutdown() {
  server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
