import { Command } from 'commander'

import { addProgram as addUpCommand } from './commands/up'
import { addProgram as addDownCommand } from './commands/down'
import { addProgram as addSetupCommand } from './commands/setup'
import { addProgram as addCreateMigrationCommand } from './commands/create-migration'


const program = new Command()

addUpCommand(program)
addDownCommand(program)
addSetupCommand(program)
addCreateMigrationCommand(program)

program.parse()