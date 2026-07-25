'use client'

type ReportChartItem = Record<string, string | number>

interface ReportChartProps {
  data: ReportChartItem[]
  dataKey: string
  nameKey: string
}

const colors = [
  '#64748b',
  '#6b9b84',
  '#c49a5a',
  '#b77979',
  '#8b7aa8',
  '#7c8ea3',
]

export function ReportChart({ data, dataKey, nameKey }: ReportChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Sin datos</p>
  }

  const maxValue = Math.max(...data.map((item) => Number(item[dataKey]) || 0))

  if (maxValue <= 0) {
    return <p className="text-muted-foreground text-center py-8">Sin datos</p>
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item[nameKey]}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-foreground">{item[nameKey]}</span>
            <span className="text-sm font-semibold text-muted-foreground">{item[dataKey]}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((Number(item[dataKey]) || 0) / maxValue) * 100}%`,
                backgroundColor: colors[index % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
