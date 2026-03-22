# UN/LOCODE Master Data

This directory stores the first external public dataset adopted by the Priority Logistics ERP.

Dataset:

- UN/LOCODE

Publisher:

- UNECE

Official source pattern:

- `https://service.unece.org/trade/locode/{country}.htm`
- `https://service.unece.org/trade/locode/Service/LocodeColumn.htm`


## Current Scope

Initial snapshot coverage:

- Mexico (`MX`)
- United States (`US`)
- Canada (`CA`)
- Spain (`ES`)
- China (`CN`)
- Germany (`DE`)
- Italy (`IT`)
- France (`FR`)
- Austria (`AT`)
- Denmark (`DK`)

This gives the project a practical core trade-lane baseline while the broader global import strategy stays repeatable.


## Canonical Storage

Database objects:

- `external_data_sources`
- `unlocodes`
- `unlocode_lookup_view`
- `search_unlocodes()`

AI governance:

- [AI_MASTER_DATA.md](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/AI_SYSTEM/AI_MASTER_DATA.md)


## Regeneration

1. Download the source country pages from UNECE.
2. Save them as `{country}.html` files in a temporary folder.
3. Run:

```bash
node scripts/import-unlocode.mjs \
  --countries mx,us,ca,es,cn,de,it,fr,at,dk \
  --input-dir /tmp/unlocode-core \
  --out-prefix master_data/unlocode/snapshots/core-trade-lanes \
  --manifest-dir master_data/unlocode/manifests
```

Generated outputs:

- `master_data/unlocode/snapshots/core-trade-lanes-unlocode.csv`
- `master_data/unlocode/snapshots/core-trade-lanes-summary.json`
- `master_data/unlocode/manifests/{country}.json`


## Incremental Country Sync

The ERP now supports country-by-country UN/LOCODE growth.

Recommended modes:

- `add-country`: upsert one country without touching any other country
- `refresh-country`: re-sync one country
- `refresh-country --prune-country`: reconcile one country against the imported snapshot and remove stale rows only for that country

Example:

```bash
node frontend/scripts/push-unlocode-to-supabase.mjs \
  --csv master_data/unlocode/snapshots/core-trade-lanes-unlocode.csv \
  --mode add-country \
  --country ES \
  --manifest master_data/unlocode/manifests/es.json \
  --manifest-dir master_data/unlocode/sync-reports
```

This keeps `unlocodes` as one global table while allowing the business to add countries gradually without rebuilding the entire dataset.


## Notes

- The snapshot is a source artifact for controlled ingestion, not a substitute for the canonical database tables.
- Future countries should be added incrementally whenever possible instead of forcing a full catalog rebuild.
