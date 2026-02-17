import Tree from '@/features/tree/components/Tree'
import { buildTree } from '@/features/tree/utils/buildTree'
import { useTreeState } from '@/features/tree/hooks/useTreeState'
import type { TodoNode } from '@/features/tree/types'

const mock: TodoNode[] = [
  { id: '1', parentId: null, title: '프로젝트' },
  { id: '2', parentId: '1', title: '백엔드' },
  { id: '3', parentId: '1', title: '프론트' },
  { id: '4', parentId: '2', title: 'DB 스키마' },
  { id: '5', parentId: '2', title: 'API 설계' },
  { id: '6', parentId: '3', title: '트리 렌더링' },
]

export default function TodoPage() {
  const tree = buildTree(mock)
  const { expandedIds, toggleExpanded, selectedId, setSelectedId } = useTreeState()

  return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Todo Tree</h1>

        <Tree
            nodes={tree}
            expandedIds={expandedIds}
            onToggle={toggleExpanded}
            selectedId={selectedId}
            onSelect={setSelectedId}
        />

        <div style={{ marginTop: 12, opacity: 0.7 }}>
          selectedId: {selectedId ?? '(none)'}
        </div>
      </div>
  )
}
