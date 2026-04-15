import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { C } from '../lib/theme';

export type RankingRow = {
  id: string;
  first_name: string;
  last_name: string;
  avgScore: number;
  lastSessionScore: number | null;
  secondLastScore: number | null;
  delta: number | null;
  sessionsLast30Days: number;
  lastSessionDate: string | null;
  daysSinceLastSession: number;
};

type SortConfig = {
  key: keyof RankingRow;
  direction: 'asc' | 'desc';
};

interface RankingsTableProps {
  data: RankingRow[];
  onRowClick?: (alumnoId: string) => void;
}

const scoreColor = (score: number | null): string => {
  if (score === null) return C.textMut;
  if (score >= 80) return C.accentDark;
  if (score >= 65) return C.blue;
  if (score >= 50) return C.amber;
  return C.red;
};

const deltaColor = (delta: number | null): string => {
  if (delta === null) return C.textMut;
  if (delta >= 0) return C.green;
  return C.red;
};

export const RankingsTable: React.FC<RankingsTableProps> = ({ data, onRowClick }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'avgScore',
    direction: 'desc',
  });

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const handleSort = (key: keyof RankingRow) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const HeaderCell = ({ label, sortKey }: { label: string; sortKey: keyof RankingRow }) => (
    <th
      onClick={() => handleSort(sortKey)}
      style={{
        padding: '12px 10px',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 600,
        color: C.textSec,
        borderBottom: `1px solid ${C.border}`,
        cursor: 'pointer',
        userSelect: 'none',
        background: C.panel,
        display: 'table-cell',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'desc' ? <ChevronDown size={13} /> : <ChevronUp size={13} />
        )}
      </div>
    </th>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <HeaderCell label="Alumno" sortKey="first_name" />
            <HeaderCell label="Promedio" sortKey="avgScore" />
            <HeaderCell label="Última sesión" sortKey="lastSessionScore" />
            <HeaderCell label="Penúltima" sortKey="secondLastScore" />
            <HeaderCell label="Delta" sortKey="delta" />
            <HeaderCell label="Sesiones 30d" sortKey="sessionsLast30Days" />
            <HeaderCell label="Días sin sesión" sortKey="daysSinceLastSession" />
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: C.textMut, fontSize: 13 }}>
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            sortedData.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.id)}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    (e.currentTarget as HTMLTableRowElement).style.background = C.panel;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                }}
              >
                <td style={{ padding: '12px 10px', fontSize: 13, color: C.textPri, fontWeight: 500 }}>
                  {row.first_name} {row.last_name}
                </td>
                <td style={{ padding: '12px 10px', fontSize: 13, color: scoreColor(row.avgScore), fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                  {row.avgScore.toFixed(1)}
                </td>
                <td style={{ padding: '12px 10px', fontSize: 13, color: scoreColor(row.lastSessionScore), fontFamily: "'DM Mono', monospace" }}>
                  {row.lastSessionScore ?? '—'}
                </td>
                <td style={{ padding: '12px 10px', fontSize: 13, color: scoreColor(row.secondLastScore), fontFamily: "'DM Mono', monospace" }}>
                  {row.secondLastScore ?? '—'}
                </td>
                <td style={{ padding: '12px 10px', fontSize: 13, color: deltaColor(row.delta), fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                  {row.delta !== null ? `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}` : '—'}
                </td>
                <td style={{ padding: '12px 10px', fontSize: 13, color: C.textPri, textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>
                  {row.sessionsLast30Days}
                </td>
                <td style={{ padding: '12px 10px', fontSize: 13, color: C.textPri, textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>
                  {row.daysSinceLastSession === Infinity ? '—' : `${row.daysSinceLastSession}d`}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
