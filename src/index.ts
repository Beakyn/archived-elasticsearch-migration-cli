import { MigrationContext } from "./core/migration.context";
import { MigrationFn } from "umzug";

export * from "./core/migration.context";
export * from "./core/umzug";

export type Migration = MigrationFn<MigrationContext>