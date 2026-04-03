# CLAUDE.md

## Project Overview

**学生成绩分析工具** — A browser-based student exam score analytics tool for teachers. Teachers upload grade files (CSV/XLSX), then view class-level and student-level analysis with auto-generated Chinese-language comments.

All data is stored locally in the browser (IndexedDB + localStorage). No backend server.

## Tech Stack

- **Framework**: React 19 + TypeScript 5.9
- **Build**: Vite 7.3
- **Routing**: React Router 7
- **Excel parsing**: SheetJS (xlsx 0.18)
- **State management**: React Context + useState (no Redux/Zustand)
- **Storage**: IndexedDB (`students_analysis_db`) + localStorage cache
- **Styling**: Plain CSS with CSS custom properties (no CSS-in-JS or Tailwind)
- **Language**: UI is entirely in Chinese (zh-CN)

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (Vite HMR)
npm run build      # Production build (tsc -b && vite build)
npm run lint       # ESLint check
npm run preview    # Preview production build
```

No test framework is configured. There are no unit tests.

## Project Structure

```
src/
├── app/                    # App shell
│   ├── providers/          # AppProvider — bootstraps all 3 context stores
│   ├── layout/             # AppLayout — header, nav, main outlet, toasts
│   └── router/             # Route definitions (React Router)
├── components/             # Shared UI components
│   ├── common/             # EmptyState
│   ├── feedback/           # ToastList
│   ├── charts/             # PlaceholderChart (unused)
│   ├── filters/            # PlaceholderFilter (unused)
│   └── tables/             # PlaceholderTable (unused)
├── modules/                # Feature modules (pure logic, no React)
│   ├── upload/             # File parsing pipeline
│   │   ├── parser/         # csvParser.ts, excelParser.ts
│   │   ├── mapper/         # columnMapping.ts (alias resolution)
│   │   ├── validator/      # recordValidator.ts
│   │   └── model/          # uploadTypes.ts
│   ├── analysis/           # Data analysis functions
│   │   ├── shared/         # aggregation.ts, selectors.ts
│   │   ├── class/          # classMetrics.ts, classTrend.ts
│   │   └── student/        # studentTrend.ts, studentComparison.ts
│   └── comments/           # Comment generation
│       ├── generator/      # commentGenerator.ts
│       ├── rules/          # trendRules.ts, weakSubjectRules.ts
│       └── templates/      # zhCN.ts (Chinese text templates)
├── pages/                  # Route pages (contain most business logic + inline charts)
│   ├── UploadPage/         # File upload, parsing, preview, save
│   ├── ClassDashboard/     # Radar chart, exam summary table
│   ├── ClassAnalysisPage/  # (Redirects to ClassDashboard)
│   ├── StudentAnalysisPage/# Per-student progress, rankings, comparisons
│   ├── CommentsPage/       # Auto-generated student feedback
│   └── SettingsPage/       # Analysis threshold configuration
├── services/               # Infrastructure services
│   ├── storage/            # indexedDb.ts, localCache.ts
│   ├── export/             # exportCsv.ts
│   └── logger/             # appLogger.ts
├── store/                  # React Context stores
│   ├── datasetStore.tsx    # Dataset CRUD, active dataset, records
│   ├── settingsStore.tsx   # Analysis thresholds (trend, weak subject)
│   └── uiStore.tsx         # Toast notifications
├── types/                  # TypeScript type definitions
│   ├── domain.ts           # Core entities (ScoreRecord, DatasetMeta, etc.)
│   ├── dto.ts              # Import/export data contracts
│   └── ui.ts               # UI state types (Toast, etc.)
├── utils/                  # Pure utility functions
│   ├── date.ts             # toIsoDate, compareIsoDate
│   ├── text.ts             # normalizeText, unique
│   └── number.ts           # round1, toNumber
├── styles/                 # Global CSS
│   ├── tokens.css          # CSS custom properties (colors, spacing, fonts)
│   └── global.css          # App shell, panels, tables, charts, responsive
├── main.tsx                # Vite entry point
└── App.tsx                 # (Unused legacy template)
```

## Data Flow

```
File Upload → Parse (CSV/XLSX) → Validate → Save to IndexedDB
                                                    ↓
                              Pages read from DatasetStore (Context)
                                                    ↓
                              Analysis modules compute derived data
                                                    ↓
                              Pages render inline SVG charts + tables
```

### Key Domain Types (`src/types/domain.ts`)

- **`ScoreRecord`**: One score entry — student, exam, examDate, subject, score, className, term, optional rank fields (classRank, gradeRank, classRankDelta, gradeRankDelta)
- **`DatasetMeta`**: Dataset metadata — id, name, className, term, counts
- **`ExamSummary`**: Per-exam/subject aggregate — avg, max, min, count
- **`StudentComment`**: Generated feedback — trend, weakSubjects, commentText, suggestions

### Unique Key

A score record is uniquely identified by: `studentName + examName + examDate + subjectName`

## Architecture Conventions

### File Organization
- **Pages** contain most of the business logic and inline chart rendering (SVG)
- **Modules** are pure TypeScript functions with no React dependency
- **Stores** use React Context + `useState` with a custom hook pattern (`useDatasetStore()`, `useSettingsStore()`, `useUiStore()`)
- Each page directory has an `index.tsx`; upload page also has `schema.ts`

### Naming
- Components/Pages: PascalCase
- Functions: camelCase with action prefix (`get`, `list`, `export`, `generate`, `find`, `decide`)
- Files: camelCase for modules/services/utils, PascalCase directories for pages
- Types: PascalCase interfaces/types in dedicated `.ts` files

### State Management
- Three context stores initialized in `AppProvider` (UI → Settings → Dataset)
- `DatasetStore` persists to IndexedDB, caches index in localStorage
- `SettingsStore` persists thresholds to IndexedDB
- `UiStore` is ephemeral (toasts auto-dismiss after 3 seconds)

### Charts
- All charts are inline SVG rendered directly in page components
- Radar charts and line charts are custom implementations (no charting library)
- Colors defined in `src/styles/tokens.css` and as inline constants in pages

### Internationalization
- All UI text is hardcoded in Chinese — no i18n framework
- Comment templates are in `src/modules/comments/templates/zhCN.ts`

## Analysis Rules (from `docs/design/rule-spec.md`)

| Parameter | Default | Description |
|---|---|---|
| trendUpThreshold | +5 | Score increase to count as "improving" |
| trendDownThreshold | -5 | Score decrease to count as "declining" |
| weakGapThreshold | 8 | Points below class avg to flag weak subject |

- Trend detection compares average scores between consecutive exams
- Weak subject identification uses latest exam only
- Comment generation picks 1 of 3 template variants per trend type using `hash(studentName + avgScore) % 3`

## Upload Parsing Details

The parser handles two table formats:
- **Long table**: Explicit columns for 学生/考试/科目/分数 (one row per score)
- **Wide table**: Student column + subject columns (one row per student per exam)

Column aliases are resolved via `src/modules/upload/mapper/columnMapping.ts`. The parser:
- Auto-detects header row (scans rows 0-11 for "学生" column)
- Validates scores in range [0, 150]
- Recognizes rank columns: 班排, 段排, 班排进退, 段排进退
- Ignores derived columns: 总分, 折算, 座号, etc.
- Supports multi-file and multi-sheet uploads with exam name inference

## CSS Design Tokens (`src/styles/tokens.css`)

- Primary color: `#0d6b8a` (teal)
- Danger: `#b42318`
- Success: `#067647`
- Font family: Microsoft YaHei, PingFang SC
- Base spacing: 8px
- Responsive breakpoint: 768px

## Important Notes for AI Assistants

1. **No test suite** — there are no tests to run. Validate changes by ensuring `npm run build` and `npm run lint` pass.
2. **Chinese UI** — all user-facing strings are in Chinese. Maintain this convention.
3. **Browser-only storage** — no backend. IndexedDB is the primary data store.
4. **Inline SVG charts** — charts are hand-built SVG in page components, not a library.
5. **Score range** — valid scores are 0–150 (Chinese high school uses 150 for major subjects).
6. **Full-mark weighting** — 语文/数学/英语 have full mark of 150; others default to 100. This affects score rate calculations.
7. **Pages are heavy** — most logic lives in page components rather than being extracted into hooks or components. This is the existing pattern; follow it for consistency.
8. **No unused imports** — TypeScript is configured with `noUnusedLocals` and `noUnusedParameters` as errors.
