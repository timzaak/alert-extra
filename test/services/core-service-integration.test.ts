import { MqttClientImpl } from "../../src/mqtt/mqtt-client-impl.ts";
import { InMemoryStatusRepository } from "../../src/repositories/status-repository.ts";
import { CoreServiceImpl } from "../../src/services/core-service.ts";
import { AppConfig } from "../../src/models/index.ts";

// Integration test for CoreServiceImpl with real implementations
Deno.test("CoreServiceImpl - Integration - MQTT client updates status repository", async () => {
  // Create real implementations
  const mqttClient = new MqttClientImpl();
  const statusRepository = new InMemoryStatusRepository();

  // Create a test config
  const config: AppConfig = {
    server: {
      port: 3000,
      host: "localhost",
    },
    mqtt: {
      url: "localhost",
      port: 1883,
      clientId: "test-client",
    },
  };

  // Create core service with real implementations
  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  // Mock the connect method to avoid actual MQTT connection
  // @ts-ignore - accessing private property for testing
  mqttClient.connect = () => {
    console.log("Mock connect called");
    // Simulate connection established
    // @ts-ignore - accessing private method for testing
    mqttClient["handleConnect"]();
    return Promise.resolve();
  };

  // Initialize the core service
  await coreService.initialize();

  // Get the status from the repository via core service
  const status = coreService.getMqttStatus();

  // Verify that the status was updated in the repository
  assertEquals(status.connected, true);
  assertNotNull(status.lastConnected);

  // Simulate a disconnection
  // @ts-ignore - accessing private method for testing
  mqttClient["handleDisconnect"]();

  // Get the updated status
  const updatedStatus = coreService.getMqttStatus();

  // Verify that the status was updated in the repository
  assertEquals(updatedStatus.connected, false);
  assertNotNull(updatedStatus.lastDisconnected);

  // Clean up
  await coreService.shutdown();
});

// Helper assertion functions
function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} but got ${actual}`);
  }
}

function assertNotNull(value: unknown) {
  if (value === null || value === undefined) {
    throw new Error(
      `Expected value to not be null or undefined, but got ${value}`,
    );
  }
}
