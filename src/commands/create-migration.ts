import fs from 'fs'

import inquirer from 'inquirer'
import { Command } from 'commander'

/**
 * Global Variables
 */
const MIGRATION_BASE_PATH = './migrations/indexes'
const MIGRATION_FILE_PATH = './migrations/migration.config.json'
const CREATE_NEW_INDEX_OPTION = 'Create a new index'
const SEPARATOR = '-'

/**
 * Functions
 */
// @ts-ignore
const isNewIndex = (answers) => answers.index === CREATE_NEW_INDEX_OPTION

const getLastVersion = (indexName: string) => {
  const files = fs.readdirSync(`${MIGRATION_BASE_PATH}/${indexName}`)
  const sorted = files
    .map((file) => {
      const [__, version, timestamp] = file.replace('.ts', '').split(SEPARATOR)

      return { version: version.replace('v', ''), timestamp: Number(timestamp) }
    })
    .sort((oldData, data) => (oldData.timestamp < data.timestamp ? -1 : 1))

  if (sorted.length <= 0) throw new Error(`There isn't migration files`)

  return sorted[sorted.length - 1].version
}

const bumpVersion = (version: string, semantic: string): string => {
  const [major, minor, patch] = version.split('.')

  let _major = Number(major)
  let _minor = Number(minor)
  let _patch = Number(patch)

  switch (semantic) {
    case 'major':
      _major++
      _minor = 0
      _patch = 0
      break
    case 'minor':
      _minor++
      _patch = 0
      break
    case 'patch':
    default:
      _patch++
      break
  }

  return [_major, _minor, _patch].join('.')
}

const createFilename = (version: string): string => {
  const timestamp = new Date().getTime()

  return `migration-v${version}-${timestamp}`
}

const createName = (index: string, version: string) => {
  return `${index}-migration-v${version}`
}

const createTemplate = (name: string) => `import { MigrationFn } from 'umzug'

import { MigrationContext } from '../../commands/core/migration.context'

export const name = '${name}'

export const up: MigrationFn<MigrationContext> = async ({ context }) => {
  // Write your migration here
}

export const down: MigrationFn<MigrationContext> = async ({ context }) => {
  // Write your migration here
}

`
const addAliasToMigrationConfigFile = (folder: string, alias: string) => {
  if (fs.existsSync(MIGRATION_FILE_PATH)) {
    const buffer = fs.readFileSync(MIGRATION_FILE_PATH)
    const config = JSON.parse(buffer.toString())

    config['alias'][folder] = alias

    fs.writeFileSync(MIGRATION_FILE_PATH, JSON.stringify(config, null, 2))
  } else {
    const config = {
      alias: {
        [folder]: alias
      }
    }

    fs.writeFileSync(MIGRATION_FILE_PATH, JSON.stringify(config, null, 2))
  }
}

/**
 * CLI
 */
const createMigration = () => {
  const indexes = fs.readdirSync(MIGRATION_BASE_PATH)
  
  inquirer
    .prompt([
      {
        type: 'list',
        name: 'index',
        message: `Which index do you want to create the migration for?`,
        choices: [...indexes, new inquirer.Separator(), CREATE_NEW_INDEX_OPTION]
      },
      {
        type: 'input',
        name: 'folder',
        message: 'What is folder name?',
        when: (answers) => isNewIndex(answers)
      },
      {
        type: 'input',
        name: 'newIndex',
        message: 'What is the index name?',
        when: (answers) => isNewIndex(answers)
      },
      {
        type: 'list',
        name: 'semantic-version',
        message: 'Which version should be incremented?',
        choices: ['major', 'minor', 'patch'],
        when: (answers) => !isNewIndex(answers)
      }
    ])
    .then((answers) => {
      if (!isNewIndex(answers)) {
        const lastVersion = getLastVersion(answers.index)
        const nextVersion = bumpVersion(lastVersion, answers['semantic-version'])
        const filename = createFilename(nextVersion)
  
        fs.writeFileSync(
          `${MIGRATION_BASE_PATH}/${answers.index}/${filename}.ts`,
          createTemplate(createName(answers.index, nextVersion))
        )
      } else {
        const firstVersion = '1.0.0'
        const filename = createFilename(firstVersion)
        const dir = `${MIGRATION_BASE_PATH}/${answers.folder}`
  
        fs.mkdirSync(dir)
        fs.writeFileSync(
          `${dir}/${filename}.ts`,
          createTemplate(createName(answers.folder, firstVersion))
        )
        addAliasToMigrationConfigFile(answers.folder, answers.newIndex)
      }
    })
}

export const addProgram = (program: Command) => {
  program
    .command('create-migration')
    .action(() => {
      createMigration()
    })
}
