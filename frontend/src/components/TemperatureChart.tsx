'use client';

import React, { useState } from 'react';
import { TemperatureLog } from '../types';

interface TemperatureChartProps {
  logs: TemperatureLog[];
}

export function TemperatureChart({ logs }: TemperatureChartProps) {
  const [hoveredLog, setHoveredLog] = useState<TemperatureLog | null>(null);

  if (!logs || logs.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-text-muted border border-border bg-subpanel rounded-[3px] font-mono">
        NO TEMPERATURE READINGS RECORDED
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

  const chartHeight = 140;
  const chartWidth = 560;
  const paddingX = 40;
  const paddingY = 20;

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
  const baselineY = getY(98.6);

  // Generate SVG path for line
  const points = sortedLogs.map((log, i) => `${getX(i)},${getY(log.value)}`);
  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';

  return (
    <div className="border border-border bg-subpanel p-3.5 rounded-[3px] space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-text">Vital Signs Trend</span>
          <span className="text-[10px] text-text-muted">({sortedLogs.length} readings)</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-status-fever" />
            <span className="text-status-fever font-semibold">100.4°F Threshold</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-border" />
            <span>98.6°F Baseline</span>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto py-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-36 overflow-visible"
        >
          {/* Baseline 98.6 Grid line */}
          <line
            x1={paddingX}
            y1={baselineY}
            x2={chartWidth - paddingX}
            y2={baselineY}
            stroke="var(--border)"
            strokeDasharray="2,2"
            strokeWidth="1"
          />
          <text
            x={paddingX - 6}
            y={baselineY + 3}
            fill="var(--text-muted)"
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
            stroke="var(--status-fever)"
            strokeDasharray="3,3"
            strokeWidth="1"
          />
          <text
            x={paddingX - 6}
            y={feverY + 3}
            fill="var(--status-fever)"
            fontSize="9"
            fontFamily="var(--font-ibm-plex-mono), monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            100.4
          </text>

          {/* Connecting Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            />
          )}

          {/* Data Points */}
          {sortedLogs.map((log, i) => {
            const cx = getX(i);
            const cy = getY(log.value);
            const isFever = log.hasFever || log.value >= 100.4;
            const colorVar = isFever ? 'var(--status-fever)' : 'var(--status-stable)';

            return (
              <g
                key={log._id || i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredLog(log)}
                onMouseLeave={() => setHoveredLog(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill={colorVar}
                  stroke="var(--bg)"
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={cy - 6}
                  fill={colorVar}
                  fontSize="9"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                  textAnchor="middle"
                  className="font-mono font-bold"
                >
                  {log.value.toFixed(1)}°
                </text>
                <text
                  x={cx}
                  y={chartHeight - 4}
                  fill="var(--text-muted)"
                  fontSize="8"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                  textAnchor="middle"
                >
                  {new Date(log.loggedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredLog && (
        <div className="text-[11px] font-mono text-text-muted bg-panel border border-border p-2 rounded-[2px] flex items-center justify-between">
          <span>
            Reading: <strong className="text-text">{hoveredLog.value.toFixed(1)}°F</strong>{' '}
            ({hoveredLog.hasFever ? 'Fever detected' : 'Afebrile / Stable'})
          </span>
          <span>
            Logged by:{' '}
            <span className="text-text">
              {hoveredLog.loggedBy?.name || hoveredLog.loggedBy?.staffId || 'Staff'}
            </span>{' '}
            at {new Date(hoveredLog.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}
