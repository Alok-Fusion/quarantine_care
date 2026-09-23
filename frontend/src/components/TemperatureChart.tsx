'use client';

import React from 'react';
import { TemperatureLog } from '../types';

interface TemperatureChartProps {
  logs: TemperatureLog[];
}

export function TemperatureChart({ logs }: TemperatureChartProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-text-muted border border-border bg-ink rounded-[3px]">
        No temperature readings recorded yet.
      </div>
    );
  }

  // Sort chronological for chart display
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );

  const values = sortedLogs.map((l) => l.value);
  const minTemp = Math.min(96, Math.floor(Math.min(...values) - 0.5));
  const maxTemp = Math.max(104, Math.ceil(Math.max(...values) + 0.5));
  const tempRange = maxTemp - minTemp || 1;

  const chartHeight = 120;
  const chartWidth = 500;
  const paddingX = 30;
  const paddingY = 15;

  const getX = (index: number) => {
    if (sortedLogs.length <= 1) return chartWidth / 2;
    return (
      paddingX +
      (index / (sortedLogs.length - 1)) * (chartWidth - paddingX * 2)
    );
  };

  const getY = (val: number) => {
    const norm = (val - minTemp) / tempRange;
    return chartHeight - paddingY - norm * (chartHeight - paddingY * 2);
  };

  // Fever line at 100.4°F
  const feverY = getY(100.4);

  // Generate SVG path for line
  const points = sortedLogs.map((log, i) => `${getX(i)},${getY(log.value)}`);
  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';

  return (
    <div className="border border-border bg-ink p-3 rounded-[3px] space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>Vitals Trend Chart</span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-0.5 bg-status-fever" />
          <span>Fever threshold: 100.4°F</span>
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-32 overflow-visible"
        >
          {/* Baseline Grid lines */}
          <line
            x1={paddingX}
            y1={getY(98.6)}
            x2={chartWidth - paddingX}
            y2={getY(98.6)}
            stroke="#2A3844"
            strokeDasharray="2,2"
            strokeWidth="1"
          />
          <text
            x={paddingX - 4}
            y={getY(98.6) + 3}
            fill="#8FA1AF"
            fontSize="9"
            fontFamily="var(--font-ibm-plex-mono), monospace"
            textAnchor="end"
          >
            98.6
          </text>

          {/* Fever line 100.4 */}
          <line
            x1={paddingX}
            y1={feverY}
            x2={chartWidth - paddingX}
            y2={feverY}
            stroke="#C4472F"
            strokeDasharray="3,3"
            strokeWidth="1"
          />
          <text
            x={paddingX - 4}
            y={feverY + 3}
            fill="#C4472F"
            fontSize="9"
            fontFamily="var(--font-ibm-plex-mono), monospace"
            textAnchor="end"
          >
            100.4
          </text>

          {/* Connecting Step/Trend Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#8FA1AF"
              strokeWidth="1.5"
            />
          )}

          {/* Data Points */}
          {sortedLogs.map((log, i) => {
            const cx = getX(i);
            const cy = getY(log.value);
            const isFever = log.hasFever || log.value >= 100.4;
            const color = isFever ? '#C4472F' : '#4F9D69';

            return (
              <g key={log._id || i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill={color}
                  stroke="#0F1720"
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={cy - 6}
                  fill={color}
                  fontSize="9"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                  textAnchor="middle"
                  className="font-mono font-bold"
                >
                  {log.value}°
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
