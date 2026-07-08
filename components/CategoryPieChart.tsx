'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface CategoryChild {
  name: string
  total: number
}

interface CategoryOber extends CategoryChild {
  children: CategoryChild[]
}

interface CategoryPieChartProps {
  title: string
  data: CategoryOber[]
  colors: string[]
  emptyMessage: string
}

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

export default function CategoryPieChart({ title, data, colors, emptyMessage }: CategoryPieChartProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const total = data.reduce((sum, d) => sum + d.total, 0)
  const selectedOber = data.find((d) => d.name === selected)

  function toggle(name: string) {
    setSelected((prev) => (prev === name ? null : name))
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h2 className="font-semibold text-white mb-4">{title}</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm text-center px-4">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-5">
            {/* Donut with centered total */}
            <div className="relative w-56 h-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={2}
                    onClick={(entry) => toggle(entry.name)}
                    style={{ cursor: 'pointer' }}
                    isAnimationActive={false}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={colors[index % colors.length]}
                        opacity={selected && selected !== entry.name ? 0.35 : 1}
                        stroke="#111827"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [formatEur(value), name]}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.75rem',
                      color: '#f9fafb',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-400">Gesamt</span>
                <span className="text-lg font-bold text-white tabular-nums">{formatEur(total)}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-1.5">
              {data.map((entry, index) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => toggle(entry.name)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    selected === entry.name ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2 text-gray-200 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    {entry.name}
                  </span>
                  <span className="font-mono text-gray-300 tabular-nums shrink-0">{formatEur(entry.total)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Expandable Unter-category breakdown */}
          {selectedOber && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">{selectedOber.name} – Details</h3>
              <div className="space-y-1.5">
                {selectedOber.children.map((child) => (
                  <div key={child.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{child.name}</span>
                    <span className="font-mono text-gray-200 tabular-nums">{formatEur(child.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
