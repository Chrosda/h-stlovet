import {env} from 'cloudflare:workers';
export function database():D1Database {if(!env.DB)throw new Error('Databasen är inte tillgänglig. Försök igen senare.');return env.DB;}
