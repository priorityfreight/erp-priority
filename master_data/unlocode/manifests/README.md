# UN/LOCODE Country Manifests

This directory stores per-country metadata for incremental UN/LOCODE imports.

Each manifest should describe:

- `country_code`
- `country_name`
- `row_count`
- `source_page_url`
- `source_hash`
- `csv_hash`
- `generated_at`

These manifests are used by the incremental sync flow so new countries can be added safely without rebuilding or pruning unrelated countries.
