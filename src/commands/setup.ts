import { Command } from 'commander'
import { Client } from '@elastic/elasticsearch'
import { createConnection } from 'core/elasticsearch.connection'

/**
 * CLI
 */
export const addProgram = (program: Command) => {
  program
    .command('setup')
    .option('--elasticsearchCluster <string>')
    .option('--elasticsearchApiKey <string>')
    .option('--migrationMetadataAlias <string>')
    .action(async ({ elasticsearchCluster, elasticsearchApiKey, migrationMetadataAlias }) => {
      if (!elasticsearchCluster) {
        throw new Error(`Elasticsearch Cluster URL is required`)
      }
  
      const elasticsearchClient = createConnection(elasticsearchCluster, elasticsearchApiKey)
  
      migrationMetadataAlias = migrationMetadataAlias ?? 'onsmart-core-migrations-metadata'
  
      const migrationMetadataIndex = `${migrationMetadataAlias}-v1.0.0`
  
      const { statusCode } = await elasticsearchClient.indices.exists({
        index: migrationMetadataIndex
      })
  
      if (statusCode === 404) {
        // Create migration-metadata index
        await elasticsearchClient.indices.create({
          index: migrationMetadataIndex,
          body: {
            mappings: {
              dynamic: 'strict',
              properties: {
                alias: {
                  type: 'keyword'
                },
                migrations: {
                  properties: {
                    name: {
                      type: 'text',
                      fields: {
                        keyword: {
                          type: 'keyword'
                        }
                      }
                    },
                    appVersion: {
                      type: 'keyword'
                    },
                    createdAt: {
                      type: 'date'
                    }
                  }
                }
              }
            }
          }
        })
  
        // Create users alias
        await elasticsearchClient.indices.putAlias({
          index: migrationMetadataIndex,
          name: migrationMetadataAlias
        })
      }
  
      console.log('Success: Elasticsearch Metadata')
    })
}