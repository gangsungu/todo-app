import type { TodoTreeNode } from '../types'

type Props = {
  node: TodoTreeNode
  depth: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function TreeItem({
                                   node,
                                   depth,
                                   expandedIds,
                                   onToggle,
                                   selectedId,
                                   onSelect,
                                 }: Props) {
  const hasChildren = node.children.length > 0
  const expanded = expandedIds.has(node.id)
  const selected = selectedId === node.id

  return (
      <div>
        <div
            onClick={() => onSelect(node.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              marginLeft: depth * 14,
              borderRadius: 8,
              cursor: 'pointer',
              userSelect: 'none',
              border: selected ? '1px solid rgba(0,0,0,0.25)' : '1px solid transparent',
              background: selected ? 'rgba(0,0,0,0.06)' : 'transparent',
            }}
        >
          <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (hasChildren) onToggle(node.id)
              }}
              disabled={!hasChildren}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.15)',
                background: 'white',
                cursor: hasChildren ? 'pointer' : 'default',
                opacity: hasChildren ? 1 : 0.4,
              }}
              aria-label={expanded ? 'collapse' : 'expand'}
          >
            {hasChildren ? (expanded ? '▾' : '▸') : '·'}
          </button>

          <div style={{ flex: 1 }}>{node.title}</div>
        </div>

        {hasChildren && expanded && (
            <div>
              {node.children.map(c => (
                  <TreeItem
                      key={c.id}
                      node={c}
                      depth={depth + 1}
                      expandedIds={expandedIds}
                      onToggle={onToggle}
                      selectedId={selectedId}
                      onSelect={onSelect}
                  />
              ))}
            </div>
        )}
      </div>
  )
}
