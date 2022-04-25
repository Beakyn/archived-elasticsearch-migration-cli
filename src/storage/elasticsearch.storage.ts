import { MigrationParams, UmzugStorage } from 'umzug'
import { Client } from '@elastic/elasticsearch'

import { MigrationContext } from '../core/migration.context'

export interface MigrationMetadata {
  id: string
  alias: string
  migrations: {
    name: string
    appVersion: string
    createdAt: string
  }[]
}

export class ElasticsearchStorage<T extends MigrationContext> implements UmzugStorage<T> {
  constructor(
    private readonly elasticsearchClient: Client,
    private readonly migrationMetadataAlias: string
  ) {}
  private findAllDocument = async (): Promise<MigrationMetadata[]> => {
    const {
      body: {
        hits: { hits: migrationsMetadata }
      }
    } = await this.elasticsearchClient.search({
      index: this.migrationMetadataAlias,
      body: {
        query: { match_all: {} }
      }
    })

    // @ts-ignore
    return migrationsMetadata.map(({ _id, _source }) => ({
      id: _id,
      ..._source
    })) as MigrationMetadata[]
  }

  private existsDocument = async (id: string): Promise<boolean> => {
    const response = await this.elasticsearchClient.count({
      index: this.migrationMetadataAlias,
      body: {
        query: {
          ids: { values: [id] }
        }
      }
    })

    return response.body.count !== 0
  }

  private getDocument = async (alias: string): Promise<MigrationMetadata | undefined> => {
    try {
      const migrationData = await this.elasticsearchClient.get({
        index: this.migrationMetadataAlias,
        id: alias
      })

      return {
        id: migrationData.body._id,
        ...migrationData.body._source
      }
    } catch (error) {
      // @ts-ignore
      if (error.found === false) {
        return undefined
      }

      throw error
    }
  }

  private createDocument = async (
    alias: string,
    migrationName: string,
    appVersion?: string
  ): Promise<void> => {
    const migrationData: Omit<MigrationMetadata, 'id'> = {
      alias,
      migrations: [
        {
          name: migrationName,
          createdAt: new Date().toISOString(),
          appVersion: appVersion ?? ''
        }
      ]
    }

    await this.elasticsearchClient.index({
      index: this.migrationMetadataAlias,
      id: alias,
      body: migrationData
    })
  }

  private updateDocument = async (
    id: string,
    createDoc: (migration: MigrationMetadata) => Partial<MigrationMetadata>
  ): Promise<void> => {
    const migrationData = await this.getDocument(id)

    await this.elasticsearchClient.update({
      index: this.migrationMetadataAlias,
      id: id,
      body: {
        // @ts-ignore
        doc: createDoc(migrationData)
      }
    })
  }

  private addMigrationItem = async (
    id: string,
    migrationName: string,
    appVersion = ''
  ): Promise<void> => {
    await this.updateDocument(id, (migrationData) => {
      const { migrations } = migrationData

      const migrationsUpdated: Pick<MigrationMetadata, 'migrations'> = {
        migrations: [
          ...migrations,
          {
            name: migrationName,
            createdAt: new Date().toISOString(),
            appVersion
          }
        ]
      }

      return migrationsUpdated
    })
  }

  private removeMigrationItem = async (id: string, migrationName: string): Promise<void> => {
    await this.updateDocument(id, (migrationData) => {
      const { migrations } = migrationData

      const migrationsUpdated: Pick<MigrationMetadata, 'migrations'> = {
        migrations: migrations.filter((migrationItem) => migrationItem.name !== migrationName)
      }

      return migrationsUpdated
    })
  }

  logMigration = async (params: MigrationParams<T>): Promise<void> => {
    const { alias, appVersion } = params.context
    const { name: migrationName } = params
    const existsDoc = await this.existsDocument('onsmart-core-sales-aes')

    if (existsDoc) {
      await this.addMigrationItem(alias, migrationName, appVersion)
    } else {
      await this.createDocument(alias, migrationName, appVersion)
    }
  }

  unlogMigration = async (params: MigrationParams<T>): Promise<void> => {
    const { alias } = params.context
    const { name: migrationName } = params

    await this.removeMigrationItem(alias, migrationName)
  }

  executed = async (meta: Pick<MigrationParams<MigrationContext>, 'context'>): Promise<string[]> => {
    const migrationsData = await this.findAllDocument()

    return migrationsData.flatMap(({ migrations }) => {
      return migrations.map(({ name }) => name)
    }, [])
  }

  findByAppVersion = async (appVersion: string): Promise<MigrationMetadata[]> => {
    if (!appVersion) throw new Error('appVersion is required')

    const {
      body: {
        hits: { hits: migrationsMetadata }
      }
    } = await this.elasticsearchClient.search({
      index: this.migrationMetadataAlias,
      body: {
        query: {
          term: {
            'migrations.appVersion': {
              value: appVersion
            }
          }
        }
      }
    })

    // @ts-ignore
    return migrationsMetadata.map(({ _id, _source }) => ({
      id: _id,
      ..._source
    })) as MigrationMetadata[]
  }
}
