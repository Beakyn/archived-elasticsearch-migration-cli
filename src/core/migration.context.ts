import { Client } from '@elastic/elasticsearch'

export interface MigrationContext {
  elasticsearchClient: Client
  alias: string
  indexName: string
  oldIndexName?: string
  appVersion?: string
}

export const createInitialContext = (elasticsearchClient: Client): MigrationContext => ({
  elasticsearchClient,
  // It be will injecting in execution time
  alias: '',
  indexName: ''
})
