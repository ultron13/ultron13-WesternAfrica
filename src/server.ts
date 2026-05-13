import { createApp } from "./app.js";
import { env } from "./infrastructure/config/env.js";
import { logger } from "./infrastructure/logging/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "FarmConnect SA backend listening");
});

