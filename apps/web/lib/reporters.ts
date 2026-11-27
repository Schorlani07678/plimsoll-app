import type { IndexerReporter } from "@plimsoll/sdk";

/** The three registry roles, in the order they carry weight in a report. */
export type ReporterRole = IndexerReporter["role"];

export const REPORTER_ROLES: readonly ReporterRole[] = ["auditor", "transcriber", "supply_poster"];

export const ROLE_HEADINGS: Record<ReporterRole, string> = {
  auditor: "Auditors",
  transcriber: "Transcribers",
  supply_poster: "Supply posters",
};

export const ROLE_DESCRIPTIONS: Record<ReporterRole, string> = {
  auditor: "Registered auditors can sign a reserve report at the Auditor-signed tier.",
  transcriber: "Transcribers copy a published reserve figure; their reports are Transcribed.",
  supply_poster: "Supply posters post the circulating supply of listed assets.",
};

export interface ReporterGroup {
  role: ReporterRole;
  heading: string;
  description: string;
  reporters: IndexerReporter[];
}

export function isReporterRole(value: string): value is ReporterRole {
  return (REPORTER_ROLES as readonly string[]).includes(value);
}

/**
 * Split the registry into one group per role, in a fixed order so the page
 * does not reshuffle between loads. Names are sorted case-insensitively, with
 * the address as a tie-break. A role this build does not know (a newer
 * indexer) is skipped rather than shown without a heading.
 */
export function groupReporters(list: readonly IndexerReporter[]): ReporterGroup[] {
  const groups: ReporterGroup[] = REPORTER_ROLES.map((role) => ({
    role,
    heading: ROLE_HEADINGS[role],
    description: ROLE_DESCRIPTIONS[role],
    reporters: [],
  }));
  for (const reporter of list) {
    if (!isReporterRole(reporter.role)) continue;
    groups.find((g) => g.role === reporter.role)?.reporters.push(reporter);
  }
  for (const group of groups) {
    group.reporters.sort(
      (a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
        a.address.localeCompare(b.address),
    );
  }
  return groups;
}

/**
 * The registry timestamp as unix seconds, or null when the indexer sent an
 * empty or unparseable value, so the page can show a dash instead of "Invalid
 * Date".
 */
export function updatedAt(iso: string | undefined): { iso: string; epoch: number } | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return { iso, epoch: Math.floor(ms / 1000) };
}

/** Orderings offered by the reporter directory. The page groups by role, so
 * the sort applies inside a group. */
export type ReporterSort = "name" | "recent";

export const REPORTER_SORTS: readonly ReporterSort[] = ["name", "recent"];

export const SORT_LABELS: Record<ReporterSort, string> = {
  name: "Name (A–Z)",
  recent: "Recently updated",
};

/** The search text and the order chosen in the filter panel. */
export interface ReporterFilter {
  query: string;
  sort: ReporterSort;
}

export const DEFAULT_REPORTER_FILTER: ReporterFilter = { query: "", sort: "name" };

/** Keeps a value read from a `<select>` or storage inside the known sorts. */
export function parseReporterSort(value: string | null | undefined): ReporterSort {
  return (REPORTER_SORTS as readonly string[]).includes(value ?? "")
    ? (value as ReporterSort)
    : DEFAULT_REPORTER_FILTER.sort;
}

/**
 * How many of the panel's controls are narrowing the list. The badge on the
 * collapsed header uses this; a sort that is not the default counts too,
 * because it changes what the reader sees.
 */
export function activeFilterCount(filter: ReporterFilter): number {
  return (filter.query.trim() ? 1 : 0) + (filter.sort !== DEFAULT_REPORTER_FILTER.sort ? 1 : 0);
}

/** True when a reporter's name, address or role heading contains the query. */
export function matchesReporterQuery(
  reporter: IndexerReporter,
  query: string,
  headings: Partial<Record<string, string>> = ROLE_HEADINGS,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [reporter.name, reporter.address, headings[reporter.role] ?? reporter.role].some((value) =>
    value.toLowerCase().includes(q),
  );
}

const byName = (a: IndexerReporter, b: IndexerReporter) =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.address.localeCompare(b.address);

/** Unix seconds for sorting, with an unparseable date pushed to the end. */
const updatedEpoch = (reporter: IndexerReporter): number => {
  const at = updatedAt(reporter.updated_at);
  return at ? at.epoch : Number.NEGATIVE_INFINITY;
};

/** Apply the panel's search and sort without changing the input list. */
export function filterReporters(
  list: readonly IndexerReporter[],
  filter: ReporterFilter,
): IndexerReporter[] {
  const out = list.filter((reporter) => matchesReporterQuery(reporter, filter.query));
  out.sort((a, b) =>
    filter.sort === "recent" ? updatedEpoch(b) - updatedEpoch(a) || byName(a, b) : byName(a, b),
  );
  return out;
}

/** localStorage key for whether the filter panel is expanded. */
export const FILTER_PANEL_STORAGE_KEY = "plimsoll:reporters:filter-panel";

/** The slice of localStorage this module needs, so tests can pass a fake. */
export type FilterPanelStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * The saved panel state, or null when none has been saved (first visit) or
 * storage is unavailable or corrupt. Null means "use the viewport default".
 */
export function readFilterPanelOpen(
  storage: FilterPanelStorage | null | undefined,
): boolean | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(FILTER_PANEL_STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

/** Persist the panel state; storage being full or blocked is not an error. */
export function writeFilterPanelOpen(
  storage: FilterPanelStorage | null | undefined,
  open: boolean,
): void {
  if (!storage) return;
  try {
    storage.setItem(FILTER_PANEL_STORAGE_KEY, open ? "true" : "false");
  } catch {
    // A blocked or full localStorage must not stop the panel working.
  }
}

/** First-visit default: open on desktop, closed on narrow screens. */
export function defaultFilterPanelOpen(desktop: boolean): boolean {
  return desktop;
}
