"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ago, shortAddress, type IndexerReporter } from "@plimsoll/sdk";
import { Skeleton, nowSecs } from "@/components/ui";
import { config, explorer } from "@/lib/config";
import { indexer, loadReporters } from "@/lib/data";
import {
  DEFAULT_REPORTER_SORT,
  REPORTER_SORTS,
  REPORTER_SORT_LABELS,
  activeFilterCount,
  filterReporters,
  groupReporters,
  isReporterSort,
  updatedAt,
  type ReporterSort,
} from "@/lib/reporters";
import {
  DESKTOP_FILTER_QUERY,
  defaultPanelOpen,
  readPanelPreference,
  writePanelPreference,
} from "@/lib/filter-panel";

export default function ReportersPage() {
  const [reporters, setReporters] = useState<IndexerReporter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(nowSecs());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ReporterSort>(DEFAULT_REPORTER_SORT);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const filterToggle = useRef<HTMLButtonElement>(null);
  const noIndexer = indexer === null;

  useEffect(() => {
    let cancelled = false;
    loadReporters()
      .then((list) => {
        if (cancelled) return;
        setReporters(list);
        setNow(nowSecs());
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Without a stored choice, open on desktop and closed on a narrow screen.
  useEffect(() => {
    const stored = readPanelPreference(window.localStorage);
    setFiltersOpen(stored ?? defaultPanelOpen(window.matchMedia(DESKTOP_FILTER_QUERY).matches));
  }, []);

  const visible = reporters ? filterReporters(reporters, query) : [];
  const groups = groupReporters(visible, sort).filter((g) => g.reporters.length > 0);
  const filterCount = activeFilterCount(query, sort);

  const toggleFilters = () => {
    const next = !filtersOpen;
    setFiltersOpen(next);
    writePanelPreference(window.localStorage, next);
  };

  const closeFilters = () => {
    setFiltersOpen(false);
    writePanelPreference(window.localStorage, false);
    filterToggle.current?.focus();
  };

  return (
    <>
      <div className="eyebrow">Reporter registry</div>
      <h1>Reporters</h1>
      <p className="sub" style={{ maxWidth: 680 }}>
        Reserve figures carry the weight of whoever signed them. These are the auditors,
        transcribers and supply posters registered on {config.networkName}, and when each was last
        updated.
      </p>

      {!noIndexer ? (
        <section className="card filter-panel mt" aria-labelledby="reporter-filters-heading">
          <div className="filter-panel-head">
            <h2 id="reporter-filters-heading" className="sr-only">
              Filter reporters
            </h2>
            <button
              ref={filterToggle}
              type="button"
              className="filter-toggle"
              aria-expanded={filtersOpen}
              aria-controls="reporter-filters"
              onClick={toggleFilters}
            >
              <span className="filter-chevron" aria-hidden="true">
                {filtersOpen ? "▾" : "▸"}
              </span>
              Filters
              {!filtersOpen && filterCount > 0 ? (
                <span
                  className="filter-count"
                  aria-label={`${filterCount} active ${filterCount === 1 ? "filter" : "filters"}`}
                >
                  {filterCount}
                </span>
              ) : null}
            </button>
            {reporters ? (
              <span className="sub filter-summary" aria-live="polite">
                {visible.length} of {reporters.length} shown
              </span>
            ) : null}
          </div>
          <div
            id="reporter-filters"
            className="filter-panel-body"
            hidden={!filtersOpen}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeFilters();
              }
            }}
          >
            <label>
              Search reporters
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or address"
                autoComplete="off"
              />
            </label>
            <label>
              Sort by
              <select
                value={sort}
                onChange={(event) => {
                  if (isReporterSort(event.target.value)) setSort(event.target.value);
                }}
              >
                {REPORTER_SORTS.map((option) => (
                  <option key={option} value={option}>
                    {REPORTER_SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {noIndexer ? (
        <div className="notice notice-info mt">
          <p>
            This list needs the Plimsoll indexer. The reporter registry is keyed by address, so the
            chain can confirm the role of an address you already know but cannot enumerate the
            addresses that have been registered.
          </p>
          <p>
            Set <code>NEXT_PUBLIC_INDEXER_URL</code> to an indexer&apos;s base URL and rebuild the
            site to show it here. <Link href="/about/">How reporters and tiers work</Link>.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="notice notice-bad mt" role="alert">
          Could not load the reporter registry: {error}
        </p>
      ) : null}

      {!noIndexer && !error && reporters === null ? (
        <div className="mt" aria-busy="true" aria-label="Loading reporters">
          {[0, 1].map((i) => (
            <div className="card" key={i} style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <Skeleton height={24} width="30%" />
              <Skeleton height={14} />
              <Skeleton height={14} width="80%" />
              <Skeleton height={14} width="60%" />
            </div>
          ))}
        </div>
      ) : null}

      {reporters && reporters.length === 0 ? (
        <p className="notice notice-info mt">
          No reporters are registered yet. <Link href="/about/">See what each role means</Link>.
        </p>
      ) : null}

      {reporters && reporters.length > 0 && visible.length === 0 ? (
        <p className="notice notice-info mt">
          No reporter matches “{query.trim()}”. Try a different name or address.
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.role} className="mt" aria-labelledby={`role-${group.role}`}>
          <div className="spread">
            <h2 id={`role-${group.role}`} style={{ margin: 0 }}>
              {group.heading}
            </h2>
            <span className="sub">{group.reporters.length} registered</span>
          </div>
          <p className="sub">{group.description}</p>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                Registered {group.heading.toLowerCase()}, with their Stellar account and the last
                update to their entry
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Address</th>
                  <th scope="col">Last update</th>
                </tr>
              </thead>
              <tbody>
                {group.reporters.map((reporter) => {
                  const at = updatedAt(reporter.updated_at);
                  return (
                    <tr key={reporter.address}>
                      <td>{reporter.name || "—"}</td>
                      <td>
                        <a
                          className="mono"
                          href={explorer.account(reporter.address)}
                          target="_blank"
                          rel="noreferrer"
                          title={reporter.address}
                        >
                          {shortAddress(reporter.address, 8)}
                        </a>
                      </td>
                      <td className="num">
                        {at ? (
                          <time dateTime={at.iso} title={new Date(at.epoch * 1000).toUTCString()}>
                            {ago(now - at.epoch)}
                          </time>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
