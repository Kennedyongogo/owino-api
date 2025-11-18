const { app, appInitialized } = require("./app");
const config = require("./config/config");
const { testConnections } = require("./config/database");

const PORT = process.env.PORT || 4000;

// Keep server reference in module scope to prevent garbage collection
let server = null;

async function createServer() {
  try {
    // Test database connections
    await testConnections();

    // Wait for app initialization to complete
    await appInitialized;

    server = app.listen(PORT, () => {
      console.log(`🚀 Worker ${process.pid} listening on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(
        `🗄️  Database: ${config.database.direct.database}@${config.database.direct.host}:${config.database.direct.port}`
      );
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`✅ Server is running and ready to accept connections`);
    });

    // Verify server is listening
    server.on("listening", () => {
      console.log(`✅ Server is listening on port ${PORT}`);
    });

    server.on("close", () => {
      console.log(`⚠️  Server closed`);
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("❌ Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        throw error;
      }
    });

    // Graceful shutdown for individual workers
    process.on("SIGTERM", () => {
      console.log(
        `🔄 Worker ${process.pid} received SIGTERM, shutting down...`
      );
      if (server) {
        server.close(() => {
          console.log(`✅ Worker ${process.pid} closed`);
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });

    process.on("SIGINT", () => {
      console.log(`🔄 Worker ${process.pid} received SIGINT, shutting down...`);
      if (server) {
        server.close(() => {
          console.log(`✅ Worker ${process.pid} closed`);
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      // Don't exit on unhandled rejection - just log it
      // The server should continue running
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      if (server) {
        server.close(() => {
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    });

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("❌ Error stack:", error.stack);
    process.exit(1);
  }
}

// Export for cluster mode
module.exports = { createServer };

// If running directly (not in cluster), start the server
if (require.main === module) {
  createServer().catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });
}
