export type FileSpecLayer =
  | 'db'
  | 'config'
  | 'middleware'
  | 'service'
  | 'controller'
  | 'route'
  | 'frontend-page'
  | 'frontend-component'
  | 'frontend-hook'
  | 'frontend-config'
  | 'test'
  | 'ci'
  | 'misc'

export interface FileSpec {
  path: string
  description: string
  layer: FileSpecLayer | string
  batchNumber: number
  complexity: 'simple' | 'medium' | 'complex'
  estimatedLines: number
  dependencies: string[]
}
