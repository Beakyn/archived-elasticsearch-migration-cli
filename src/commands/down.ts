import { Command } from 'commander'

import { createUmzugInstance } from '../core/umzug'

/**
 * Functions
 */
function getIdentifierByVersion(version: string) {
  const id = Number(version.replace('v', '').split('.').join(''))

  if (Number.isNaN(id)) throw new Error('This version is invalid')

  return id
}

/**
 * CLI
 */
 export const addProgram = (program: Command) => {
   program
     .command('down')
     .option('--migration <string>')
     .option('--appVersion <string>')
     .option('--save')
     .action(async (options) => {
       const { migration, appVersion, save } = options
       const { umzugInstance, elasticsearchStorage } = createUmzugInstance(save, appVersion)
   
       if (!migration && !appVersion) throw new Error('The parameters are required')
   
       if (migration) {
         await umzugInstance.down({ migrations: [migration], rerun: 'ALLOW' })
       } else {
         const migrationsMetadata = await elasticsearchStorage.findByAppVersion(appVersion)
   
         if (migrationsMetadata.length > 0) {
           const migrations = migrationsMetadata
             .flatMap((migrationMetadata) => migrationMetadata.migrations)
             .filter((migrationData) => migrationData.appVersion === appVersion)
             .map((migrationData) => {
               return {
                 name: migrationData.name,
                 appVersion: migrationData.appVersion,
                 appVersionId: getIdentifierByVersion(migrationData.appVersion)
               }
             })
             .sort((versionDataPrevious, versionData) => {
               return versionDataPrevious.appVersionId < versionData.appVersionId ? 1 : -1
             })
             .map((migrationData) => migrationData.name)
   
           umzugInstance.down({ migrations })
         }
       }
     })
 }