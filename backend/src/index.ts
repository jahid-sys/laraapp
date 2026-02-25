import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { registerTaskRoutes } from './routes/tasks.js';

const schema = { ...appSchema, ...authSchema };

export const app = await createApplication(schema);
export type App = typeof app;

app.withAuth();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerTaskRoutes(app);

await app.run();
app.logger.info('Application running');
