/** Outcomes of a row in the import preview: will be imported, already present, cannot be imported, not a document to import. */
export const IMPORT_PREVIEW_STATUSES = ['NEW', 'DUPLICATE', 'ERROR', 'IGNORED'] as const;

/** Outcomes of an imported row. */
export const IMPORT_RESULT_STATUSES = ['IMPORTED', 'SKIPPED', 'ERROR'] as const;
