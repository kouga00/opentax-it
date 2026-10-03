import { SetMetadata } from '@nestjs/common';

export const ALLOW_READ_ONLY_KEY = 'allowReadOnly';
/** A non-GET route that does not change the tenant's data (preview, logout, tenant switch): open to read-only members too. */
export const AllowReadOnly = () => SetMetadata(ALLOW_READ_ONLY_KEY, true);
