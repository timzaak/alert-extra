import { ConfigService } from "../../src/services/config-service.ts";

// Define AppConfig interface for testing
interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  mqtt: {
    url: string;
    port: number;
    username?: string;
    password?: string;
    clientId: string;
    keepAlive?: number;
  };
}

// Simple assertion functions
function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${expected}, but got ${actual}`);
  }
}

async function assertThrows(
  fn: () => Promise<unknown> | unknown,
  errorClass: new () => Error,
  msgIncludes?: string,
): Promise<void> {
  try {
    await fn();
    throw new Error(
      `Expected ${errorClass.name} to be thrown, but nothing was thrown`,
    );
  } catch (error: unknown) {
    if (!(error instanceof errorClass)) {
      throw new Error(
        `Expected ${errorClass.name} to be thrown, but got ${
          error instanceof Error ? error.constructor.name : "unknown error type"
        }`,
      );
    }
    if (msgIncludes && !error.message.includes(msgIncludes)) {
      throw new Error(
        `Expected error message to include "${msgIncludes}", but got "${error.message}"`,
      );
    }
  }
}

Deno.test("ConfigService - loadConfig loads valid configuration", async () => {
  // Create a temporary config file for testing
  const tempConfig: AppConfig = {
    server: {
      port: 3000,
      host: "localhost",
    },
    mqtt: {
      url: "mqtt://localhost",
      port: 1883,
      clientId: "test-client",
    },
  };

  const tempConfigPath = "./temp-config.json";
  await Deno.writeTextFile(tempConfigPath, JSON.stringify(tempConfig));

  try {
    const configService = new ConfigService();
    const config = await configService.loadConfig(tempConfigPath);

    assertEquals(config.server.port, 3000);
    assertEquals(config.server.host, "localhost");
    assertEquals(config.mqtt.url, "mqtt://localhost");
    assertEquals(config.mqtt.port, 1883);
    assertEquals(config.mqtt.clientId, "test-client");
  } finally {
    // Clean up the temporary file
    await Deno.remove(tempConfigPath);
  }
});

Deno.test("ConfigService - validateConfig throws on invalid configuration", async () => {
  const configService = new ConfigService();

  // Missing MQTT URL
  const invalidConfig1 = {
    server: {
      port: 3000,
      host: "localhost",
    },
    mqtt: {
      port: 1883,
      clientId: "test-client",
    },
  };

  const tempConfigPath1 = "./temp-invalid-config1.json";
  await Deno.writeTextFile(tempConfigPath1, JSON.stringify(invalidConfig1));

  try {
    await assertThrows(
      async () => {
        await configService.loadConfig(tempConfigPath1);
      },
      Error,
      "MQTT URL is missing",
    );
  } finally {
    await Deno.remove(tempConfigPath1);
  }

  // Invalid MQTT port
  const invalidConfig2 = {
    server: {
      port: 3000,
      host: "localhost",
    },
    mqtt: {
      url: "mqtt://localhost",
      port: -1,
      clientId: "test-client",
    },
  };

  const tempConfigPath2 = "./temp-invalid-config2.json";
  await Deno.writeTextFile(tempConfigPath2, JSON.stringify(invalidConfig2));

  try {
    await assertThrows(
      async () => {
        await configService.loadConfig(tempConfigPath2);
      },
      Error,
      "MQTT port must be a positive number",
    );
  } finally {
    await Deno.remove(tempConfigPath2);
  }
});

Deno.test("ConfigService - getConfig throws when config not loaded", () => {
  const configService = new ConfigService();

  assertThrows(
    () => {
      configService.getConfig();
    },
    Error,
    "Configuration has not been loaded",
  );
});
