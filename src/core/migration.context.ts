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
  // These values will be injected in runtime
  alias: '',
  indexName: ''
})
