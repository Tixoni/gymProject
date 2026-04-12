import { useMemo } from 'react'
import { THEME_COLORS } from '../../theme'

const W = 560
const H = 220
const PAD_L = 44
const PAD_R = 12
const PAD_T = 14
const PAD_B = 36

function parseTime(d) {
  const t = Date.parse(String(d))
  return Number.isFinite(t) ? t : NaN
}

/**
 * Простой линейный график по датам (SVG). Несколько серий — разные цвета.
 */
export default function StatisticsHistoryChart({ series = [], emptyHint }) {
  const layout = useMemo(() => {
    const allPoints = series.flatMap((s) => s.points ?? [])
    if (!allPoints.length) {
      return { paths: [], xLabels: [], yTicks: [] }
    }

    const dated = allPoints
      .map((p) => ({ t: parseTime(p.date), v: Number(p.value), date: p.date }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))

    if (!dated.length) {
      return { paths: [], xLabels: [], yTicks: [] }
    }

    const tMin = Math.min(...dated.map((p) => p.t))
    const tMax = Math.max(...dated.map((p) => p.t))
    const vMinRaw = Math.min(...dated.map((p) => p.v))
    const vMaxRaw = Math.max(...dated.map((p) => p.v))
    const padY = vMaxRaw === vMinRaw ? Math.max(vMaxRaw * 0.05, 1) : (vMaxRaw - vMinRaw) * 0.08
    const minY = Math.max(0, vMinRaw - padY)
    const maxY = vMaxRaw + padY
    const tSpan = tMax - tMin || 1

    const xOf = (t) =>
      PAD_L + ((t - tMin) / tSpan) * (W - PAD_L - PAD_R)
    const yOf = (v) =>
      PAD_T + (1 - (v - minY) / (maxY - minY)) * (H - PAD_T - PAD_B)

    const paths = series.map((s) => {
      const pts = (s.points ?? [])
        .map((p) => ({
          t: parseTime(p.date),
          v: Number(p.value),
          date: p.date,
        }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
        .sort((a, b) => a.t - b.t)
      if (!pts.length) return { d: '', color: s.color, id: s.id }
      const d = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(1)} ${yOf(p.v).toFixed(1)}`)
        .join(' ')
      return { d, color: s.color, id: s.id }
    })

    const uniqDates = [...new Set(dated.map((p) => p.date))].sort(
      (a, b) => parseTime(a) - parseTime(b),
    )
    const step = Math.max(1, Math.ceil(uniqDates.length / 6))
    const xLabels = uniqDates.filter((_, i) => i % step === 0).map((date) => {
      const t = parseTime(date)
      return {
        key: String(date),
        x: xOf(t),
        text: String(date).slice(0, 10),
      }
    })

    const yTicks = [minY, (minY + maxY) / 2, maxY].map((v, i) => ({
      key: `y-${i}-${v}`,
      y: yOf(v),
      text: i === 1 ? v.toFixed(1) : Math.round(v).toString(),
    }))

    return { paths, xLabels, yTicks, minY, maxY }
  }, [series])

  if (!series.length || !series.some((s) => (s.points ?? []).length)) {
    return (
      <div
        className={`flex min-h-[200px] items-center justify-center rounded-xl border ${THEME_COLORS.cardSubtleBorder} ${THEME_COLORS.cardSubtleBg} px-4 py-8 text-sm ${THEME_COLORS.contentMuted}`}
      >
        {emptyHint ?? 'Нет данных для графика.'}
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[280px] text-zinc-500"
        role="img"
        aria-label="График динамики"
      >
        <rect
          x={PAD_L}
          y={PAD_T}
          width={W - PAD_L - PAD_R}
          height={H - PAD_T - PAD_B}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.2}
          rx={4}
        />
        {layout.yTicks.map((tk) => (
          <g key={tk.key}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={tk.y}
              y2={tk.y}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <text
              x={PAD_L - 6}
              y={tk.y + 4}
              textAnchor="end"
              className="fill-zinc-500 text-[10px]"
            >
              {tk.text}
            </text>
          </g>
        ))}
        {layout.paths.map(
          (p) =>
            p.d && (
              <path
                key={p.id}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
        )}
        {layout.xLabels.map((lb) => (
          <text
            key={lb.key}
            x={lb.x}
            y={H - 10}
            textAnchor="middle"
            className="fill-zinc-500 text-[9px]"
          >
            {lb.text}
          </text>
        ))}
      </svg>
    </div>
  )
}
