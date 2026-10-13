import { default as ts } from 'typescript'
declare let requiredTypescriptAttributes: [
  'createModuleResolutionCache',
  'isExternalModuleNameRelative',
  'parseJsonConfigFileContent',
  'readConfigFile',
  'resolveModuleName',
  'sys',
]
export type TypescriptImport = Pick<
  typeof ts,
  (typeof requiredTypescriptAttributes)[number]
>
/**
 * Dynamically loads the typescript module if it's available and caches it.
 *
 * @returns The TypeScript module or null if it's not available.
 */
export declare function getTypescriptImport(): TypescriptImport | null
export {}
