import { Client } from '@elastic/elasticsearch'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module';

import { Umzug, memoryStorage } from 'umzug'

import { ElasticsearchStorage } from '../storage/elasticsearch.storage'
import { createInitialContext, MigrationContext } from './migration.context'

const require = createRequire(import.meta.url);

require('ts-node/register')

export const createUmzugInstance = (
  elasticsearchClient: Client,
  isSaving: boolean,
  appVersion?: string
): {
  umzugInstance: Umzug<MigrationContext>
  elasticsearchStorage: ElasticsearchStorage<MigrationContext>
} => {
  const elasticsearchStorage = new ElasticsearchStorage(
    elasticsearchClient,
    'onsmart-core-migrations-metadata'
  )
  const umzugInstance = new Umzug<MigrationContext>({
    migrations: {
      glob: 'migrations/indexes/**/*.ts',
      resolve: ({ path: filepath, context }) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // @ts-ignore
        const migration = require(filepath)
        
        // @ts-ignore
        const folders = path.dirname(filepath).split('/')
        const currentFolder = folders[folders.length - 1]

        // ------------------------- getAlias
        const identifier = currentFolder

        const configBuffer = fs.readFileSync('migrations/migration.config.json')
        const config = JSON.parse(configBuffer.toString())

        const alias = config.alias[identifier]

        if (!alias) throw new Error(`Alias is not setup: ${path}`)

        context.alias = alias
        // -------------------------

        // ------------------------- getCurrentIndexName
        const getVersionData = (file: string) => {
          const version = file.split('-')[1]
          return {
            versionId: Number(version.replace('v', '').replace('.', '')),
            version
          }
        }
        
        // @ts-ignore
        const currentFilename = path.basename(filepath, '.ts')
        const currentVersionData = getVersionData(currentFilename)

        const indexName = `${alias}-${currentVersionData.version}`

        context.indexName = indexName
        // -------------------------

        // ------------------------- getOldIndexName

        const files = fs.readdirSync(`migrations/indexes/${currentFolder}`)
        const oldVersions = files
          .map((file) => getVersionData(file))
          .sort((oldVersionData, currentVersionData) =>
            currentVersionData.versionId < oldVersionData.versionId ? 1 : -1
          )
          .filter((versionData) => versionData.versionId < currentVersionData.versionId)

        if (oldVersions.length > 0) {
          const lastVersion = oldVersions[oldVersions.length - 1]

          context.oldIndexName = `${alias}-${lastVersion.version}`
        }

        // -------------------------

        // ------------------------- SetAppVersion
        if (appVersion) {
          context.appVersion = appVersion
        }
        // -------------------------

        const params = {
          context: {...context},
          name: migration.name,
          path: filepath
        }

        return {
          name: migration.name,
          up: async () => migration.up(params),
          down: async () => migration.down(params)
        }
      }
    },
    context: createInitialContext(elasticsearchClient),
    storage: isSaving ? elasticsearchStorage : memoryStorage(),
    logger: console
  })

  return { umzugInstance, elasticsearchStorage }
}
