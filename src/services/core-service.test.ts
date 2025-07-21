import { CoreServiceImpl } from "./core-service.ts";
import { MqttClient } from "../mqtt/mqtt-client.ts";
import { StatusRepository } from "../repositories/status-repository.ts";
import { AppConfig, MqttStatus } from "../models/index.ts";

// Mock implementations
class MockMqttClient implements MqttClient {
  connected = false;
  statusCallbacks: ((status: MqttStatus) => void)[] = [];
  connectCalled = 0;
  disconnectCalled = 0;
  onStatusChangeCalled = 0;
  destroyCalled = 0;

  connect(): Promise<void> {
    this.connectCalled++;
    this.connected = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.disconnectCalled++;
    this.connected = false;
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getLatency(): number {
    return 100;
  }

  onStatusChange(callback: (status: MqttStatus) => void): void {
    this.onStatusChangeCalled++;
    this.statusCallbacks.push(callback);
  }

  destroy(): void {
    this.destroyCalled++;
  }

  // Helper method for tests to trigger status change
  triggerStatusChange(status: MqttStatus): void {
    for (const callback of this.statusCallbacks) {
      callback(status);
    }
  }
}

class MockStatusRepository implements StatusRepository {
  private status: MqttStatus = {
    connected: false,
    latency: 0,
    lastConnected: null,
    lastDisconnected: null,
  };
  updateStatusCalled = 0;
  getCurrentStatusCalled = 0;

  updateStatus(status: MqttStatus): void {
    this.updateStatusCalled++;
    this.status = { ...status };
  }

  getCurrentStatus(): MqttStatus {
    this.getCurrentStatusCalled++;
    return { ...this.status };
  }
}

// Test suite for CoreServiceImpl
Deno.test("CoreServiceImpl - initialization", async () => {
  const mqttClient = new MockMqttClient();
  const statusRepository = new MockStatusRepository();
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

  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  await coreService.initialize();

  assertEquals(mqttClient.connectCalled, 1);
  assertEquals(mqttClient.onStatusChangeCalled, 1);
  assertEquals(mqttClient.connected, true);
});

Deno.test("CoreServiceImpl - should not initialize twice", async () => {
  const mqttClient = new MockMqttClient();
  const statusRepository = new MockStatusRepository();
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

  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  await coreService.initialize();
  await coreService.initialize(); // Second call should be ignored

  assertEquals(mqttClient.connectCalled, 1); // Connect should only be called once
});

Deno.test("CoreServiceImpl - update status repository when MQTT status changes", async () => {
  const mqttClient = new MockMqttClient();
  const statusRepository = new MockStatusRepository();
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

  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  await coreService.initialize();

  const newStatus: MqttStatus = {
    connected: true,
    latency: 150,
    lastConnected: new Date().toISOString(),
    lastDisconnected: null,
  };

  mqttClient.triggerStatusChange(newStatus);

  assertEquals(statusRepository.updateStatusCalled, 1);

  const currentStatus = statusRepository.getCurrentStatus();
  assertEquals(currentStatus.connected, newStatus.connected);
  assertEquals(currentStatus.latency, newStatus.latency);
  assertEquals(currentStatus.lastConnected, newStatus.lastConnected);
  assertEquals(currentStatus.lastDisconnected, newStatus.lastDisconnected);
});

Deno.test("CoreServiceImpl - return current status from repository", () => {
  const mqttClient = new MockMqttClient();
  const statusRepository = new MockStatusRepository();
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

  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  const expectedStatus: MqttStatus = {
    connected: true,
    latency: 200,
    lastConnected: new Date().toISOString(),
    lastDisconnected: null,
  };

  statusRepository.updateStatus(expectedStatus);

  const status = coreService.getMqttStatus();
  assertEquals(statusRepository.getCurrentStatusCalled, 1);
  assertEquals(status.connected, expectedStatus.connected);
  assertEquals(status.latency, expectedStatus.latency);
  assertEquals(status.lastConnected, expectedStatus.lastConnected);
  assertEquals(status.lastDisconnected, expectedStatus.lastDisconnected);
});

Deno.test("CoreServiceImpl - shutdown and disconnect from MQTT server", async () => {
  const mqttClient = new MockMqttClient();
  const statusRepository = new MockStatusRepository();
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

  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  await coreService.initialize();
  await coreService.shutdown();

  assertEquals(mqttClient.disconnectCalled, 1);
  assertEquals(mqttClient.destroyCalled, 1);
  assertEquals(mqttClient.connected, false);
});

Deno.test("CoreServiceImpl - should not shutdown if not initialized", async () => {
  const mqttClient = new MockMqttClient();
  const statusRepository = new MockStatusRepository();
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

  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  await coreService.shutdown(); // Should not call disconnect

  assertEquals(mqttClient.disconnectCalled, 0);
});

Deno.test("CoreServiceImpl - throw error if initialization fails", async () => {
  const mqttClient = new MockMqttClient();
  const statusRepository = new MockStatusRepository();
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

  // Make connect throw an error
  mqttClient.connect = () => {
    throw new Error("Connection failed");
  };

  const coreService = new CoreServiceImpl(mqttClient, statusRepository, config);

  let errorThrown = false;
  try {
    await coreService.initialize();
  } catch (error) {
    errorThrown = true;
    if (error instanceof Error) {
      assertEquals(
        error.message.includes("Core service initialization failed"),
        true,
      );
    } else {
      throw new Error("Expected an Error instance");
    }
  }

  assertEquals(errorThrown, true);
});

// Helper assertion functions
function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} but got ${actual}`);
  }
}
