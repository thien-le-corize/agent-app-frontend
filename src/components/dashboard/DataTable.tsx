'use client';

import { useState, useMemo, ReactNode } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  filterable?: boolean;
  filterOptions?: { label: string; value: string }[];
  onFilterChange?: (value: string) => void;
  pageSize?: number;
  actions?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  loading?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

function getValueByPath(row: Record<string, any>, key: string) {
  return key.split('.').reduce<any>((value, part) => value?.[part], row);
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  subtitle,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  filterable = false,
  filterOptions = [],
  onFilterChange,
  pageSize = 10,
  actions,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Filter and search
  const filteredData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // Search
    if (search && searchKeys.length > 0) {
      const lowerSearch = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) =>
          String(getValueByPath(row, key) ?? '')
            .toLowerCase()
            .includes(lowerSearch)
        )
      );
    }

    // Sort
    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const aVal = getValueByPath(a, sortKey);
        const bVal = getValueByPath(b, sortKey);
        if (aVal === bVal) return 0;
        const comparison = aVal < bVal ? -1 : 1;
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, search, searchKeys, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleFilter = (value: string) => {
    setActiveFilter(value);
    onFilterChange?.(value);
    setShowFilter(false);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey)
      return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
    if (sortDir === 'asc') return <ChevronUp className="w-3.5 h-3.5" />;
    return <ChevronDown className="w-3.5 h-3.5" />;
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      {(title || searchable || filterable || actions) && (
        <div
          className="px-5 py-4 flex items-center justify-between gap-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            {title && (
              <h3
                className="text-[14px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="text-[12px] mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            {searchable && (
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 rounded-lg text-[12px] outline-none w-48"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            )}

            {/* Filter */}
            {filterable && filterOptions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
                {showFilter && (
                  <div
                    className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-32"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleFilter(opt.value)}
                        className="w-full px-3 py-2 text-left text-[12px] hover:bg-[var(--bg-hover)] transition-colors"
                        style={{
                          color:
                            activeFilter === opt.value
                              ? 'var(--accent)'
                              : 'var(--text-primary)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {actions}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  style={{
                    color: 'var(--text-secondary)',
                    width: col.width,
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <SortIcon columnKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{
                        borderColor: 'var(--border)',
                        borderTopColor: 'var(--accent)',
                      }}
                    />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-[var(--bg-hover)]'
                      : ''
                  }`}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-5 py-3.5 text-[13px]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <span
            className="text-[12px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Showing {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredData.length)} of{' '}
            {filteredData.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md transition-colors disabled:opacity-30"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background:
                      currentPage === pageNum
                        ? 'var(--bg-elevated)'
                        : 'transparent',
                    color:
                      currentPage === pageNum
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md transition-colors disabled:opacity-30"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
