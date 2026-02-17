export type TodoNode = {
  id: string
  parentId: string | null
  title: string
  order?: number
}

export type TodoTreeNode = TodoNode & {
  children: TodoTreeNode[]
}
