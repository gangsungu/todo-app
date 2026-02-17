import { useMemo, useState } from 'react'

export function useTreeState() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return useMemo(
      () => ({ expandedIds, toggleExpanded, selectedId, setSelectedId }),
      [expandedIds, selectedId],
  )
}
