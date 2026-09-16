// Keep unit tests deterministic and independent of developer .env files.
import { fileURLToPath } from 'node:url'

process.env.DOTENV_CONFIG_PATH ||= fileURLToPath(new URL('../.env.test-disabled', import.meta.url))
process.env.DATABASE_URL ||= 'mysql://test:test@127.0.0.1:3306/test'
process.env.RUN_DATABASE_TESTS ||= 'false'
process.env.NODE_ENV ||= 'development'
process.env.DEV_BYPASS_RATE_LIMITS ||= 'true'
