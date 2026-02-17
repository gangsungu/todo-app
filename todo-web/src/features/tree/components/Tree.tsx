import type { TodoTreeNode } from '../types'
import TreeItem from './TreeItem'

type Props = {
  nodes: TodoTreeNode[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function Tree(props: Props) {
  const { nodes } = props

  return (
      <div style={{ padding: 12 }}>
        {nodes.map(n => (
            <TreeItem key={n.id} node={n} depth={0} {...props} />
        ))}
      </div>
  )
}
