/**
 * Minimal client for the Opendatasoft "Explore v2.1" records API, which powers
 * the French government open data portal. It is generic enough to be reused by
 * other country adapters that expose an ODS endpoint.
 */

const DEFAULT_PAGE_SIZE = 100;
const MAX_CONCURRENCY = 6;

export interface OdsRecordsResponse<T> {
  total_count: number;
  results: T[];
}

export interface OdsQueryOptions {
  signal?: AbortSignal;
  /** Number of records per request. ODS caps this at 100. */
  pageSize?: number;
  /** ODS `where` clause, e.g. `within_distance(geom, geom'POINT(2.3 48.8)', 5km)`. */
  where?: string;
  /** ODS `select` clause (comma-separated field list). */
  select?: string;
  /** ODS `order_by` clause. */
  orderBy?: string;
}

/** Fetch a single page of records from an ODS dataset. */
export async function fetchOdsRecordsPage<T>(
  datasetUrl: string,
  offset: number,
  options: OdsQueryOptions = {},
): Promise<OdsRecordsResponse<T>> {
  const {
    signal,
    pageSize = DEFAULT_PAGE_SIZE,
    where,
    select,
    orderBy,
  } = options;

  const url = new URL(datasetUrl);
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(offset));
  if (where) url.searchParams.set("where", where);
  if (select) url.searchParams.set("select", select);
  if (orderBy) url.searchParams.set("order_by", orderBy);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`ODS request failed with status ${response.status}`);
  }
  return (await response.json()) as OdsRecordsResponse<T>;
}

export interface FetchAllOptions extends OdsQueryOptions {
  /** Called after every page with the number of loaded and total records. */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Fetch every record of an ODS dataset using bounded-concurrency pagination.
 * The first page reveals `total_count`, the remaining pages are then fetched in
 * parallel batches.
 */
export async function fetchAllOdsRecords<T>(
  datasetUrl: string,
  options: FetchAllOptions = {},
): Promise<T[]> {
  const { onProgress, pageSize = DEFAULT_PAGE_SIZE } = options;

  const firstPage = await fetchOdsRecordsPage<T>(datasetUrl, 0, options);
  const total = firstPage.total_count;
  const results: T[] = [...firstPage.results];
  onProgress?.(results.length, total);

  const offsets: number[] = [];
  for (let offset = pageSize; offset < total; offset += pageSize) {
    offsets.push(offset);
  }

  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < offsets.length) {
      const currentOffset = offsets[cursor++];
      const page = await fetchOdsRecordsPage<T>(datasetUrl, currentOffset, options);
      results.push(...page.results);
      onProgress?.(results.length, total);
    }
  };

  const workerCount = Math.min(MAX_CONCURRENCY, offsets.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
