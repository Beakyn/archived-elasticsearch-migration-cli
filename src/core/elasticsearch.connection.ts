import { Client } from '@elastic/elasticsearch'

export const createConnection = (elasticsearchCluster: string, elasticsearchApiKey: string) =>
  new Client({
    node: elasticsearchCluster,
    auth: {
      // @ts-ignore
      apiKey: elasticsearchApiKey
    }
  })
