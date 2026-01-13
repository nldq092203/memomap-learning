"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

type DailyPoint = { date: string; minutes: number; sessions: number }

export function ActivityLineChart({
  daily,
  days = 30,
}: {
  daily: DailyPoint[]
  days?: 7 | 30
}) {
  const data = useMemo(
    () => (daily || []).slice(-days).map(d => ({
      date: d.date,
      label: new Date(d.date).toLocaleDateString(),
      minutes: d.minutes,
      sessions: d.sessions,
    })),
    [daily, days]
  )

  const minutesColor = "#22c55e" // tailwind emerald-500
  const sessionsColor = "#f59e0b" // tailwind amber-500

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="minutesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={minutesColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={minutesColor} stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sessionsColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={sessionsColor} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} minTickGap={16} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} width={32} domain={[0, 'dataMax']} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} width={32} domain={[0, 'dataMax']} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
            labelClassName="text-xs"
            formatter={(value: number | string, name: string) => [value, name === 'minutes' ? 'Minutes' : 'Sessions']}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Area yAxisId="left" type="monotone" dataKey="minutes" name="Minutes" stroke={minutesColor} fill="url(#minutesFill)" strokeWidth={2} isAnimationActive />
          <Area yAxisId="right" type="monotone" dataKey="sessions" name="Sessions" stroke={sessionsColor} fill="url(#sessionsFill)" strokeWidth={2} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
