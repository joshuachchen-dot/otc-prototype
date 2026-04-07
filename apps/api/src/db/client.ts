import { Pool } from 'pg';
import { ENV } from '../env';

// db is null when DATABASE_URL is not configured (KYC routes will return 503)
export const db = ENV.DATABASE_URL ? new Pool({ connectionString: ENV.DATABASE_URL }) : null;
