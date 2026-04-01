┌──────────────────────────────────────────────┐
│              LEVEL 0: UNIVERSE               │
│         Companies House (~2.26m)             │
└──────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────┐
│         LEVEL 2: CORE SCREENING              │
│----------------------------------------------│
│ Inputs:                                      │
│ - Company name                               │
│ - SIC codes                                  │
│ - Postcode                                   │
│                                              │
│ Scoring:                                     │
│ - SIC score (compressed)                     │
│ - Keyword score                              │
│ - Cluster score                              │
│                                              │
│ Output:                                      │
│ → core_score                                 │
│ → confidence_band                            │
└──────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ PROMOTION LOGIC      │
              │----------------------│
              │ core_score ≥ 45      │
              │ OR signal combos     │
              └──────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ ~10,000 COMPANIES SELECTED     │
        └────────────────────────────────┘
                         │
                         │
        ───────── PARALLEL PIPELINE ─────────
                         │
                         ▼
┌──────────────────────────────────────────────┐
│        CROSS-REFERENCE (OVERRIDE)            │
│----------------------------------------------│
│ Input: curated list (110 companies)          │
│                                              │
│ Matching:                                    │
│ - company_number                             │
│ - legal_name                                 │
│ - trading_name                               │
│                                              │
│ Output:                                      │
│ → cross_ref_promote = TRUE                   │
└──────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────┐
│         LEVEL 3 INPUT SET                    │
│----------------------------------------------│
│ Companies where:                             │
│ - promoted_to_enrichment = TRUE              │
│ OR                                           │
│ - cross_ref_promote = TRUE                   │
└──────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────┐
│        RAW ENRICHMENT (DATA LAYER)           │
│----------------------------------------------│
│ Fetch from Companies House API:              │
│ - filings                                    │
│ - officers                                   │
│ - PSCs                                       │
│ - charges                                    │
│                                              │
│ Stored in DB                                 │
└──────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────┐
│        LEVEL 3: ALIGNMENT SCORING            │
│----------------------------------------------│
│ Inputs:                                      │
│ - filings                                    │
│ - officers                                   │
│ - PSCs                                       │
│ - charges                                    │
│                                              │
│ Scores:                                      │
│ - team_score                                 │
│ - cap_table_score                            │
│ - activity_score                             │
│                                              │
│ Output:                                      │
│ → alignment_score                            │
│ → stage_estimate                             │
│ → stage_confidence                           │
│ → why_selected / risk_flags                  │
└──────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────┐
│            FINAL RANKING                     │
│----------------------------------------------│
│ combined_score =                             │
│   core_score + alignment_score               │
└──────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────┐
│           USER OUTPUT LAYER                  │
│----------------------------------------------│
│ Filter + Explore:                            │
│ - stage (seed / post-seed)                   │
│ - geography (clusters)                       │
│ - domain (future)                            │
│ - cross-ref flag                             │
│                                              │
│ Output: ranked shortlist                     │
└──────────────────────────────────────────────┘