require("dotenv").config(); const { testConnection } = require("./db/pool"); testConnection().then(() => process.exit(0)).catch(() => process.exit(1));
