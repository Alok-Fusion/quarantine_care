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
      <div className="py-8 text-center text-xs text-text-muted border border-border/80 bg-subpanel/50 rounded-xl font-mono">
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

  const chartHeight = 160;
  const chartWidth = 580;
  const paddingX = 45;
  const paddingY = 25;

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

  // Generate SVG path for line & area
  const points = sortedLogs.map((log, i) => `${getX(i)},${getY(log.value)}`);
  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';
  const areaD = points.length > 1
    ? `M ${getX(0)},${chartHeight - paddingY} L ${points.join(' L ')} L ${getX(sortedLogs.length - 1)},${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="border border-border/80 bg-subpanel/80 p-4 rounded-xl space-y-3 shadow-inner">
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-text-muted border-b border-border/60 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-text">Vital Signs Trajectory</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-panel border border-border text-accent">
            {sortedLogs.length} readings
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 font-semibold text-status-fever">
            <span className="w-2.5 h-0.5 bg-status-fever rounded-full" />
            <span>100.4°F Fever Alert</span>
          </span>
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-2.5 h-0.5 bg-border rounded-full" />
            <span>98.6°F Baseline</span>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto py-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-40 overflow-visible"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Baseline 98.6 Reference Line */}
          <line
            x1={paddingX}
            y1={baselineY}
            x2={chartWidth - paddingX}
            y2={baselineY}
            stroke="var(--border)"
            strokeDasharray="3,3"
            strokeWidth="1.5"
          />
          <text
            x={paddingX - 8}
            y={baselineY + 3}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-ibm-plex-mono), monospace"
            textAnchor="end"
            fontWeight="500"
          >
            98.6°
          </text>

          {/* Fever Line 100.4 */}
          <line
            x1={paddingX}
            y1={feverY}
            x2={chartWidth - paddingX}
            y2={feverY}
            stroke="var(--status-fever)"
            strokeDasharray="4,4"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <text
            x={paddingX - 8}
            y={feverY + 3}
            fill="var(--status-fever)"
            fontSize="10"
            fontFamily="var(--font-ibm-plex-mono), monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            100.4°
          </text>

          {/* Area Gradient Under Curve */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#areaGradient)"
            />
          )}

          {/* Connecting Curve Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Point Markers */}
          {sortedLogs.map((log, i) => {
            const cx = getX(i);
            const cy = getY(log.value);
            const isFever = log.hasFever || log.value >= 100.4;
            const colorVar = isFever ? 'var(--status-fever)' : 'var(--status-stable)';

            return (
              <g
                key={log._id || i}
                className="cursor-pointer transition-transform hover:scale-125"
                onMouseEnter={() => setHoveredLog(log)}
                onMouseLeave={() => setHoveredLog(null)}
              >
                {/* Glow ring on hover / fever */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill={colorVar}
                  fillOpacity="0.2"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill={colorVar}
                  stroke="var(--bg)"
                  strokeWidth="2"
                />
                <text
                  x={cx}
                  y={cy - 8}
                  fill={colorVar}
                  fontSize="10"
                  fontFamily="var(--font-ibm-plex-mono), monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {log.value.toFixed(1)}°
                </text>
                <text
                  x={cx}
                  y={chartHeight - 6}
                  fill="var(--text-muted)"
                  fontSize="9"
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
        <div className="text-xs font-mono text-text-muted glass-panel p-2.5 rounded-lg flex items-center justify-between shadow-sm">
          <span>
            Reading: <strong className="text-text">{hoveredLog.value.toFixed(1)}°F</strong>{' '}
            ({hoveredLog.hasFever ? 'Febrile Alert' : 'Normal / Stable'})
          </span>
          <span>
            Logged by:{' '}
            <span className="text-accent font-semibold">
              {hoveredLog.loggedBy?.name || hoveredLog.loggedBy?.staffId || 'Nurse'}
            </span>{' '}
            at {new Date(hoveredLog.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}
