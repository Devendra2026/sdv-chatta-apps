# Chhata Tax Rate Formula Alignment

**Date:** 2026-08-25  
**Status:** Approved  
**Scope:** Align house / water / drainage calculation with official Chhata rules; ULB commercial assessable on Tax Config.

## Decisions

| Topic                   | Choice                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| Rate period             | Matrix rate is **monthly** ₹/sq ft; ALV uses **× 12** (house, water, drainage)  |
| Water / drainage base   | Same assessable ALV as house tax (includes ×12)                                 |
| Defaults                | Property 10%, water **7.5%**, drainage **2.5%**, residential assessable **80%** |
| Commercial assessable   | ULB setting on Tax Config; Chhata = **80%**                                     |
| Open land               | Assessable **100%**; water + drainage = **0**                                   |
| Commercial ×2 rate mult | **Removed** — assessable % only                                                 |

## Formulas

```text
grossAlv      = Area × monthlyRate(zone, construction) × 12
assessablePct = residential → assessablePct (80)
              | commercial  → commercialAssessablePct (ULB; Chhata 80)
              | open land   → 100
assessableAlv = grossAlv × assessablePct / 100

House     = assessableAlv × propertyTaxPct / 100   // default 10
Water     = open land ? 0 : assessableAlv × waterTaxPct / 100     // default 7.5 (not gated on municipal connection)
Drainage  = open land ? 0 : assessableAlv × drainageTaxPct / 100  // default 2.5
Total     = House + Water + Drainage (+ penalty if configured)
```

## Data model

- Add `TaxConfig.commercialAssessablePct` Decimal default 80
- Schema defaults: `waterTaxPct=7.5`, `drainageTaxPct=2.5`
- Safe backfill: set water/drainage to 7.5/2.5 only where currently 0; set commercialAssessablePct=80

## Calc

- Replace `resolveUsageRateMult` with `resolveAssessablePct`
- `computeFloorAlv` takes per-property assessable % (no usageMult)
- Consumers: export, dues, tax-config preview

## Portal

- “Residential assessable %” + “Commercial assessable %”
- Water / drainage show new defaults for new configs

## Out of scope

- Official matrix rate seed values
- Multi-ULB org model
- Reference catalog CRUD
- Excel column layout changes
