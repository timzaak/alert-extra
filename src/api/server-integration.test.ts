import { ApiServer } from "./server.ts";
import { CoreServiceImpl } from "../services/core-service.ts";
import { MqttClientImpl } from "../mqtt/mqtt-client-impl.ts";
import { InMemoryStatusRepository } from "../repositories/status-repository.ts";
import { AppConfig } from "../models/app-config.ts";
import {
  createDefaultMqttStatus,
  updateConnectedStatus,
} from "../models/mqtt-status.ts";

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
  private statusCallback: ((status: any) => void) | null = null;

  async connect(): Promise<void> {
    // Simulate successful connection
    if (this.statusCallback) {
      const status = createDefaultMqttStatus();
      this.statusCallback(updateConnectedStatus(status, 100));
    }
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  onStatusChange(callback: (status: any) => void): void {
    this.statusCallback = callback;
  }

  destroy(): void {
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
