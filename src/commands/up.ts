import { Command } from 'commander'
import { createConnection } from '../core/elasticsearch.connection'

import { createUmzugInstance } from '../core/umzug'

/**
 * CLI
 */

export const addProgram = (program: Command) => {
  program
    .command('up')
    .option('--migration <string>')
    .option('--appVersion <string>')
    .option('--elasticsearchCluster <string>')
    .option('--elasticsearchApiKey <string>')
    .option('--save')
    .action(async (options) => {
      const { migration, appVersion, save, elasticsearchCluster, elasticsearchApiKey } = options

      if (save && !elasticsearchCluster) {
        throw new Error(`Elasticsearch Cluster URL is required`)
      }
      
      const elasticsearchClient = createConnection(elasticsearchCluster, elasticsearchApiKey)
      const { umzugInstance } = createUmzugInstance(elasticsearchClient, save, appVersion)
  
      if (migration) {
        await umzugInstance.up({ migrations: [migration], rerun: 'ALLOW' })
      } else {
        await umzugInstance.up()
      }
    })
}
