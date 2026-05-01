import * as migration_20260501_160443_init from './20260501_160443_init';

export const migrations = [
  {
    up: migration_20260501_160443_init.up,
    down: migration_20260501_160443_init.down,
    name: '20260501_160443_init'
  },
];
