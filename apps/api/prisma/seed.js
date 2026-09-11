"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const seed_database_1 = require("../src/db/seed-database");
const prisma_client_1 = require("../src/prisma/prisma.client");
const prisma = (0, prisma_client_1.createPrismaClient)();
(0, seed_database_1.seedDatabase)(prisma)
    .catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown seed error";
    console.error(`[seed] ${message}`);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map