export interface ImportTemplate {
  name: string
  target: string
  description: string
  columns: string[]
  example_row: Record<string, string>
}
