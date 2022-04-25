import { Command } from 'commander'

import { createUmzugInstance } from '../core/umzug'

/**
 * CLI
 */

export const addProgram = (program: Command) => {
  program
    .command('up')
    .option('--migration <string>')
    .option('--appVersion <string>')
    .option('--save')
    .action(async (options) => {
      const { migration, appVersion, save } = options
      const { umzugInstance } = createUmzugInstance(save, appVersion)
  
      if (migration) {
        await umzugInstance.up({ migrations: [migration], rerun: 'ALLOW' })
      } else {
        await umzugInstance.up()
      }
    })
}
