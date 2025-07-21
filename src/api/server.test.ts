import { ApiServer } from "./server.ts";
import { CoreService } from "../services/core-service.ts";
import { MqttStatus } from "../models/mqtt-status.ts";

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

// Mock CoreService for testing
class MockCoreService implements CoreService {
  private mockStatus: MqttStatus = {
    connected: true,
    latency: 50,
    lastConnected: "2023-01-01T00:00:00.000Z",
    lastDisconnected: null,
  };

  async initialize(): Promise<void> {
    // Do nothing for tests
  }

  getMqttStatus(): MqttStatus {
    return this.mockStatus;
  }

  async shutdown(): Promise<void> {
    // Do nothing for tests
  }
}

Deno.test("ApiServer - Health endpoint returns 200", async () => {
  // Arrange
  const mockCoreService = new MockCoreService();
  const apiServer = new ApiServer(mockCoreService);
  const req = new Request("http://localhost/health");

  // Act
  const res = await apiServer.getFetchHandler()(req);
  const body = await res.json();

  // Assert
  assertEquals(res.status, 200);
  assertEquals(body.status, "ok");
  assertEquals(typeof body.timestamp, "string");
});

Deno.test("ApiServer - Version endpoint returns correct version", async () => {
  // Arrange
  const mockCoreService = new MockCoreService();
  const apiServer = new ApiServer(mockCoreService);
  const req = new Request("http://localhost/version");

  // Act
  const res = await apiServer.getFetchHandler()(req);
  const body = await res.json();

  // Assert
  assertEquals(res.status, 200);
  assertEquals(body.version, "1.0.0");
  assertEquals(body.name, "Alert MQTT Monitoring Service");
});

Deno.test("ApiServer - Non-existent endpoint returns 404", async () => {
  // Arrange
  const mockCoreService = new MockCoreService();
  const apiServer = new ApiServer(mockCoreService);
  const req = new Request("http://localhost/non-existent");

  // Act
  const res = await apiServer.getFetchHandler()(req);

  // Assert
  assertEquals(res.status, 404);
});

Deno.test("ApiServer - MQTT status endpoint returns correct status", async () => {
  // Arrange
  const mockCoreService = new MockCoreService();
  const apiServer = new ApiServer(mockCoreService);
  const req = new Request("http://localhost/mqtt/status");

  // Act
  const res = await apiServer.getFetchHandler()(req);
  const body = await res.json();

  // Assert
  assertEquals(res.status, 200);
  assertEquals(body.connected, true);
  assertEquals(body.latency, 50);
  assertEquals(body.lastConnected, "2023-01-01T00:00:00.000Z");
  assertEquals(body.lastDisconnected, null);
});
