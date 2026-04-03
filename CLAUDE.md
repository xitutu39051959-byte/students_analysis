# CLAUDE.md — Students Analysis

## Project Overview

A client-side React application for Chinese K-12 teachers to upload student exam scores, analyze class/student performance trends, and generate per-student comment reports. All data is stored locally in the browser (IndexedDB + localStorage) — there is no backend.

The UI and all user-facing text are in **Simplified Chinese**.

## Tech Stack

- **Framework**: React 19 + TypeScript 5.9 (strict mode)
- **Build**: Vite 7, ES modules (`"type": "module"`)
- **Routing**: react-router-dom v7 (browser router)
- **Spreadsheet parsing**: SheetJS (`xlsx` package) — supports CSV, XLS, XLSX
- **State**: React Context providers (no Redux/Zustand)
- **Storage**: IndexedDB (`students_analysis_db`) for datasets/records, localStorage for settings and active-dataset cache
- **Linting**: ESLint 9 flat config with `typescript-eslint`, `react-hooks`, `react-refresh`
- **No test framework** is configured currently

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint (all .ts/.tsx files)
npm run preview   # Preview production build locally
```

## Directory Structure

```
src/
├── app/
│   ├── layout/AppLayout.tsx      # Sidebar nav + main content wrapper
│   ├── providers/AppProvider.tsx  # Nests UiStore > SettingsStore > DatasetStore
│   └── router/index.tsx          # Route definitions
├── components/                   # Shared presentational components
│   ├── charts/                   # PlaceholderChart
│   ├── common/EmptyState.tsx
│   ├── feedback/ToastList.tsx
│   ├── filters/
│   └── tables/
├── modules/                      # Pure business logic (no React)
│   ├── analysis/
│   │   ├── class/                # classMetrics, classTrend
│   │   ├── student/              # studentTrend, studentComparison
│   │   └── shared/               # aggregation helpers, selectors
│   ├── comments/
│   │   ├── generator/            # commentGenerator — builds StudentComment[]
│   │   ├── rules/                # trendRules, weakSubjectRules
│   │   └── templates/zhCN.ts     # Chinese comment templates
│   └── upload/
│       ├── mapper/columnMapping
│       ├── model/uploadTypes
│       ├── parser/               # csvParser, excelParser
│       └── validator/recordValidator
├── pages/                        # Route-level page components
│   ├── UploadPage/               # File upload + parsing (long/wide table auto-detect)
│   ├── ClassDashboard/           # Radar chart, exam summaries, trend charts
│   ├── ClassAnalysisPage/
│   ├── StudentAnalysisPage/      # Per-student trend + comparison
│   ├── CommentsPage/             # Auto-generated student comments
│   └── SettingsPage/             # Analysis thresholds
├── services/
│   ├── export/exportCsv.ts
│   ├── logger/appLogger.ts
│   └── storage/                  # indexedDb.ts, localCache.ts
├── store/                        # React Context stores
│   ├── datasetStore.tsx          # CRUD for datasets + active selection
│   ├── settingsStore.tsx         # AnalysisOptions persistence
│   └── uiStore.tsx               # Toast notifications
├── styles/                       # global.css, tokens.css
├── types/
│   ├── domain.ts                 # Core types: ScoreRecord, Dataset, StudentComment, etc.
│   ├── dto.ts                    # RawTable for parser output
│   └── ui.ts                     # ToastMessage, ToastType
├── utils/                        # date, number, text helpers
├── main.tsx                      # Entry point
└── App.tsx
docs/
├── design/data-model.md
├── design/rule-spec.md
└── data-template/成绩导入模板.csv
```

## Key Domain Concepts

- **ScoreRecord**: The core data unit — `{ student, exam, subject, score, examDate, className, term, classRank?, gradeRank? }`. Unique key: `student + exam + examDate + subject`.
- **Dataset**: A collection of `ScoreRecord[]` with `DatasetMeta` (name, class, term, counts). Stored in IndexedDB.
- **Upload parsing**: Accepts both "long" tables (student/exam/subject/score columns) and "wide" tables (student + one column per subject). Auto-detected via header scanning. Chinese column aliases are used (e.g., `学生`/`姓名`, `分数`/`成绩`).
- **Analysis**: Pure functions in `src/modules/analysis/` that compute class averages, student trends, comparisons, and weak-subject detection from `ScoreRecord[]`.
- **Comments**: Rule-based generator (`src/modules/comments/`) that produces Chinese-language `StudentComment` objects with trend text, suggestions, and weak/strength subjects.
- **AnalysisOptions**: Configurable thresholds (`trendUpThreshold`, `trendDownThreshold`, `weakGapThreshold`) stored in localStorage.

## Architecture Conventions

1. **No backend** — all processing happens in the browser. IndexedDB for persistence, localStorage for lightweight caches/settings.
2. **Context-based state** — each store is a provider + custom hook pattern (`useDatasetStore()`, `useSettingsStore()`, `useUiStore()`). Provider nesting order matters (defined in `AppProvider.tsx`).
3. **Modules are pure** — `src/modules/` contains business logic as plain TypeScript functions with no React imports. Pages and components call into modules.
4. **Pages own parsing logic** — `UploadPage/index.tsx` contains the full file parsing pipeline inline (header detection, long/wide table parsing, rank extraction). The separate parsers in `src/modules/upload/parser/` are simpler utilities.
5. **Chinese-first UI** — all labels, toasts, error messages, and generated comments are in Simplified Chinese. When adding user-facing text, use Chinese.
6. **Score range**: Scores are validated to 0–150 (accommodating subjects like Chinese/Math/English that use 150-point scales). Full-mark defaults: 150 for `语文/数学/英语`, 100 for others.
7. **Exam ordering** — exams are sorted by `examDate` (ISO string), then by `exam` name. Synthetic dates are assigned at import time based on order.

## TypeScript Configuration

- **Strict mode** enabled with `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`
- Target: ES2022, JSX: react-jsx
- Module resolution: bundler mode with `verbatimModuleSyntax`

## When Making Changes

- Run `npm run lint` after modifying `.ts`/`.tsx` files to catch issues early.
- Run `npm run build` to verify both type-checking and production bundle succeed.
- Keep business logic in `src/modules/` free of React dependencies.
- Preserve the Chinese column-alias mappings in `UploadPage` — they must match real spreadsheet exports from Chinese school systems.
- The `xlsx` library is the only external runtime dependency beyond React/react-router — keep the dependency footprint minimal.
