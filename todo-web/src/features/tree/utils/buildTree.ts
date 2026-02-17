import type { TodoNode, TodoTreeNode } from '../types'

export function buildTree(list: TodoNode[]): TodoTreeNode[] {
  const map = new Map<string, TodoTreeNode>()

  // 1) 노드 생성
  for (const n of list) {
    map.set(n.id, { ...n, children: [] })
  }

  // 2) 부모-자식 연결
  const roots: TodoTreeNode[] = []
  for (const n of list) {
    const node = map.get(n.id)!
    if (!n.parentId) {
      roots.push(node)
      continue
    }
    const parent = map.get(n.parentId)
    if (!parent) {
      // 부모가 없으면 루트로 취급(데이터 깨져도 UI는 살아야 함)
      roots.push(node)
      continue
    }
    parent.children.push(node)
  }

  // 3) 정렬(옵션)
  const sortRec = (arr: TodoTreeNode[]) => {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (const x of arr) sortRec(x.children)
  }
  sortRec(roots)

  return roots
}