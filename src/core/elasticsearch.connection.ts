import { Client } from '@elastic/elasticsearch'

export const createConnection = () =>
  new Client({
    node: process.env.ONSMART_ELASTICSEARCH_CLUSTER_URL,
    auth: {
      // @ts-ignore
      apiKey: process.env.ONSMART_ELASTICSEARCH_API_KEY
    }
  })
