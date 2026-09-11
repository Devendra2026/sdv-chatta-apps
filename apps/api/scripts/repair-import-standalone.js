"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const exceljs_1 = __importDefault(require("exceljs"));
const types_1 = require("@workspace/types");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const column_maps_1 = require("../src/imports/column-maps");
const prisma_client_1 = require("../src/prisma/prisma.client");
const floors_util_1 = require("../src/surveys/floors.util");
const survey_id_util_1 = require("../src/surveys/survey-id.util");
const prisma = (0, prisma_client_1.createPrismaClient)();
const storageRoot = node_path_1.default.resolve(process.env.STORAGE_DIR ?? "uploads");
async function getObject(key) {
    const normalized = key.replaceAll("\\", "/").replace(/^\/+/, "");
    if (!normalized || normalized.includes("..")) {
        throw new Error("Invalid object key");
    }
    return (0, promises_1.readFile)(node_path_1.default.join(storageRoot, normalized));
}
async function main() {
    const jobId = process.argv[2];
    if (!jobId) {
        console.error("Usage: tsx scripts/repair-import-standalone.ts <importJobId>");
        process.exit(1);
    }
    const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.objectKey)
        throw new Error("Import job has no objectKey");
    const buffer = await getObject(job.objectKey);
    const workbook = new exceljs_1.default.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Survey Data") ?? workbook.worksheets[0];
    if (!sheet)
        throw new Error("Sheet not found");
    const columnCount = Math.max(sheet.columnCount, 1);
    const headerRow = sheet.getRow(1);
    const headers = [];
    for (let col = 1; col <= columnCount; col++) {
        headers[col - 1] = (0, column_maps_1.cell)([headerRow.getCell(col).value], 0);
    }
    const preset = job.mappingPreset ||
        (0, column_maps_1.detectPresetFromHeaders)(headers, columnCount);
    const map = (0, column_maps_1.getMapping)(preset);
    const wards = await prisma.ward.findMany();
    const wardByNumber = new Map(wards.map((w) => [w.number, w]));
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
        const excelRow = sheet.getRow(rowNumber);
        const values = [];
        for (let col = 1; col <= columnCount; col++) {
            values[col - 1] = excelRow.getCell(col).value;
        }
        const rawSurveyId = (0, column_maps_1.cell)(values, map.surveyId);
        if (!rawSurveyId)
            continue;
        try {
            const wardName = (0, column_maps_1.cell)(values, map.wardName);
            const wardNumber = (0, column_maps_1.extractWardNumber)(wardName, rawSurveyId);
            const ward = wardNumber ? wardByNumber.get(wardNumber) : undefined;
            if (!ward)
                throw new Error(`Ward not found for ${wardName || rawSurveyId}`);
            const mobileRaw = (0, column_maps_1.cell)(values, map.mobile);
            const mobile = !mobileRaw || mobileRaw === "0" ? "" : mobileRaw;
            const floorsRaw = (0, column_maps_1.cell)(values, map.floorsRaw);
            const floors = (0, floors_util_1.parseFloorsRaw)(floorsRaw);
            const parcelNo = (0, column_maps_1.normalizeParcelNo)((0, column_maps_1.cell)(values, map.parcelNo), rawSurveyId);
            const propertyNo = (0, column_maps_1.normalizePropertyNo)((0, column_maps_1.cell)(values, map.propertyNo), rawSurveyId);
            const surveyId = (0, types_1.resolveImportSurveyId)(rawSurveyId, ward.number, parcelNo ?? "", propertyNo ?? "", (0, survey_id_util_1.getUlbCode)());
            const payload = {
                surveyId,
                wardId: ward.id,
                surveyedAt: (0, column_maps_1.parseSurveyedAt)((0, column_maps_1.cell)(values, map.surveyedAt)),
                ownerName: (0, column_maps_1.cell)(values, map.ownerName) || null,
                ownerFatherName: (0, column_maps_1.cell)(values, map.ownerFatherName) || null,
                mobile: mobile || null,
                isSlum: (0, column_maps_1.parseBool)((0, column_maps_1.cell)(values, map.isSlum)) ?? false,
                remark: (0, column_maps_1.cell)(values, map.remark) || null,
                parcelNo,
                propertyNo,
                respondentName: (0, column_maps_1.cell)(values, map.respondentName) || null,
                respondentRelationship: (0, column_maps_1.cell)(values, map.respondentRelationship) || null,
                city: (0, column_maps_1.cell)(values, map.city) || null,
                pincode: (0, column_maps_1.cell)(values, map.pincode) || null,
                houseNo: (0, column_maps_1.cell)(values, map.houseNo) || null,
                streetName: (0, column_maps_1.cell)(values, map.streetName) || null,
                locality: (0, column_maps_1.cell)(values, map.locality) || null,
                colony: (0, column_maps_1.cell)(values, map.colony) || null,
                taxRateZone: (0, column_maps_1.cell)(values, map.taxRateZone) || null,
                propertyOwnership: (0, column_maps_1.cell)(values, map.propertyOwnership) || null,
                propertyUse: (0, column_maps_1.cell)(values, map.propertyUse) || null,
                commercial: (0, column_maps_1.cell)(values, map.commercial) || null,
                yearOfConstruction: (0, column_maps_1.cell)(values, map.yearOfConstruction) || null,
                situation: (0, column_maps_1.cell)(values, map.situation) || null,
                roadType: (0, column_maps_1.cell)(values, map.roadType) || null,
                floorsRaw: floorsRaw || null,
                plotAreaSqFt: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.plotAreaSqFt)),
                plotAreaSqMeter: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.plotAreaSqMeter)),
                plinthAreaSqFt: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.plinthAreaSqFt)),
                plinthAreaSqMeter: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.plinthAreaSqMeter)),
                totalBuiltUpAreaSqFt: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.totalBuiltUpAreaSqFt)),
                totalBuiltUpAreaSqMeter: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.totalBuiltUpAreaSqMeter)),
                hasMunicipalWaterSupply: (0, column_maps_1.parseBool)((0, column_maps_1.cell)(values, map.hasMunicipalWaterSupply)),
                hasAlternateWater: (0, column_maps_1.parseBool)((0, column_maps_1.cell)(values, map.hasAlternateWater)),
                waterSourceType: (0, column_maps_1.cell)(values, map.waterSourceType) || null,
                totalWaterConnections: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.totalWaterConnections)),
                waterConnectionIdType: (0, column_maps_1.cell)(values, map.waterConnectionIdType) || null,
                toiletType: (0, column_maps_1.cell)(values, map.toiletType) || null,
                hasMunicipalWasteService: (0, column_maps_1.parseBool)((0, column_maps_1.cell)(values, map.hasMunicipalWasteService)),
                dataQualityStatus: (0, floors_util_1.computeDataQuality)({
                    mobile,
                    propertyNo,
                    parcelNo,
                    plotAreaSqFt: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.plotAreaSqFt)),
                    totalBuiltUpAreaSqFt: (0, column_maps_1.parseNumber)((0, column_maps_1.cell)(values, map.totalBuiltUpAreaSqFt)),
                }),
                status: "ACTIVE",
            };
            const existing = (await prisma.survey.findUnique({ where: { surveyId } })) ??
                (rawSurveyId !== surveyId
                    ? await prisma.survey.findUnique({ where: { surveyId: rawSurveyId } })
                    : null) ??
                (parcelNo && propertyNo
                    ? await prisma.survey.findFirst({
                        where: {
                            wardId: ward.id,
                            parcelNo,
                            propertyNo,
                            deletedAt: null,
                        },
                    })
                    : null);
            if (!existing || existing.deletedAt) {
                skipped++;
                continue;
            }
            await prisma.$transaction(async (tx) => {
                await tx.surveyFloor.deleteMany({ where: { surveyId: existing.id } });
                await tx.survey.update({
                    where: { id: existing.id },
                    data: {
                        ...payload,
                        floors: {
                            create: floors.map((f) => ({
                                floorLabel: f.floorLabel,
                                areaSqFt: f.areaSqFt,
                                areaSqMeter: f.areaSqMeter,
                                usageType: f.usageType,
                                usageFactor: f.usageFactor,
                                buildingType: f.buildingType,
                                sortOrder: f.sortOrder,
                                rawSegment: f.rawSegment,
                            })),
                        },
                    },
                });
            });
            updated++;
        }
        catch (err) {
            failed++;
            console.error(`Row ${rowNumber} (${rawSurveyId}):`, err);
        }
    }
    await prisma.importJob.update({
        where: { id: jobId },
        data: {
            duplicateStrategy: client_1.DuplicateStrategy.UPDATE,
            status: failed === 0 ? "COMPLETED" : "PARTIAL",
            updatedRows: updated,
            skippedRows: skipped,
            failedRows: failed,
            completedAt: new Date(),
        },
    });
    console.log("Repair complete:", { preset, updated, skipped, failed });
}
main()
    .catch((err) => {
    console.error(err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=repair-import-standalone.js.map