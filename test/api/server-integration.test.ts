import { ApiServer } from "../../src/api/server.ts";
import { CoreServiceImpl } from "../../src/services/core-service.ts";
import { MqttClientImpl } from "../../src/mqtt/mqtt-client-impl.ts";
import { InMemoryStatusRepository } from "../../src/repositories/status-repository.ts";
import { AppConfig } from "../../src/models/app-config.ts";
import {
  createDefaultMqttStatus,
  MqttStatus,
  updateConnectedStatus,
} from "../../src/models/mqtt-status.ts";

// Simple assertion function for testing
function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${
        msg || ""
      }\nexpected: ${expected}\nactual: ${actual}`,
    );
  }
}

// Mock MqttClient for integration testing
class MockMqttClient extends MqttClientImpl {
  private statusCallback: ((status: MqttStatus) => void) | null = null;

  override connect(): Promise<void> {
    // Simulate successful connection
    if (this.statusCallback) {
      const status = createDefaultMqttStatus();
      this.statusCallback(updateConnectedStatus(status, 100));
    }
    return Promise.resolve();
  }

  override disconnect(): Promise<void> {
    return Promise.resolve();
  }

  override onStatusChange(callback: (status: MqttStatus) => void): void {
    this.statusCallback = callback;
  }

  override destroy(): void {
    // Do nothing for tests
  }
}

// Mock config for testing
const mockConfig: AppConfig = {
  server: {
    host: "localhost",
    port: 8080,
  },
  mqtt: {
    url: "mqtt://localhost",
    port: 1883,
    clientId: "test-client",
    keepAlive: 60,
  },
};

Deno.test("ApiServer Integration - MQTT status endpoint returns status from Core Service", async () => {
  // Arrange
  const mqttClient = new MockMqttClient();
  const statusRepository = new InMemoryStatusRepository();
  const coreService = new CoreServiceImpl(
    mqttClient,
    statusRepository,
    mockConfig,
  );

  // Initialize core service
  await coreService.initialize();

  const apiServer = new ApiServer(coreService);
  const req = new Request("http://localhost/mqtt/status");

  // Act
  const res = await apiServer.getFetchHandler()(req);
  const body = await res.json();

  // Assert
  assertEquals(res.status, 200);
  assertEquals(body.connected, true);
  assertEquals(typeof body.latency, "number");
  assertEquals(typeof body.lastConnected, "string");

  // Clean up
  await coreService.shutdown();
});
