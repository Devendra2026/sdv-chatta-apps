"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const types_1 = require("@workspace/types");
const prisma_client_1 = require("../src/prisma/prisma.client");
const survey_id_util_1 = require("../src/surveys/survey-id.util");
const prisma = (0, prisma_client_1.createPrismaClient)();
const fix = process.argv.includes("--fix");
async function main() {
    const ulbCode = (0, survey_id_util_1.getUlbCode)();
    const surveys = await prisma.survey.findMany({
        where: { deletedAt: null },
        include: { ward: true },
    });
    let mismatches = 0;
    let fixed = 0;
    let skipped = 0;
    for (const survey of surveys) {
        const parsed = (0, types_1.parseGisSurveyId)(survey.surveyId);
        const expected = (0, types_1.buildSurveyIdFromRecord)({
            surveyId: survey.surveyId,
            wardNumber: survey.ward.number,
            parcelNo: survey.parcelNo,
            propertyNo: survey.propertyNo,
            gisUseCode: parsed?.gisUseCode,
            ulbCode,
        });
        const parcelMismatch = survey.parcelNo != null &&
            parsed?.parcelNo != null &&
            survey.parcelNo !== parsed.parcelNo;
        const propertyMismatch = survey.propertyNo != null &&
            parsed?.propertyNo != null &&
            survey.propertyNo !== parsed.propertyNo;
        const idMismatch = survey.surveyId !== expected;
        if (!idMismatch && !parcelMismatch && !propertyMismatch)
            continue;
        mismatches++;
        console.log(`[mismatch] id=${survey.id} stored=${survey.surveyId} expected=${expected} parcel=${survey.parcelNo} property=${survey.propertyNo}`);
        if (!fix)
            continue;
        const clash = await prisma.survey.findUnique({
            where: { surveyId: expected },
        });
        if (clash && clash.id !== survey.id) {
            skipped++;
            console.warn(`[skip] id=${survey.id} would collide with ${clash.id} for ${expected}`);
            continue;
        }
        await prisma.survey.update({
            where: { id: survey.id },
            data: {
                surveyId: expected,
                parcelNo: parsed?.parcelNo ?? survey.parcelNo,
                propertyNo: parsed?.propertyNo ?? survey.propertyNo,
            },
        });
        fixed++;
        console.log(`[fixed] id=${survey.id} -> ${expected}`);
    }
    console.log(JSON.stringify({
        mode: fix ? "fix" : "dry-run",
        total: surveys.length,
        mismatches,
        fixed,
        skipped,
    }, null, 2));
}
main()
    .catch((err) => {
    console.error(err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=repair-survey-id-consistency.js.map