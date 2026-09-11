"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const imports_service_1 = require("../src/imports/imports.service");
async function main() {
    const jobId = process.argv[2];
    if (!jobId) {
        console.error("Usage: tsx scripts/repair-import.ts <importJobId>");
        process.exit(1);
    }
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ["error", "warn", "log"],
    });
    try {
        const imports = app.get(imports_service_1.ImportsService);
        console.log(`Re-processing import job ${jobId} with UPDATE strategy…`);
        const result = await imports.reprocessJob(jobId, client_1.DuplicateStrategy.UPDATE);
        console.log("Repair complete:", {
            status: result.status,
            processedRows: result.processedRows,
            insertedRows: result.insertedRows,
            updatedRows: result.updatedRows,
            skippedRows: result.skippedRows,
            failedRows: result.failedRows,
        });
    }
    finally {
        await app.close();
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=repair-import.js.map