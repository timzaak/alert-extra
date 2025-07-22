import {
  createDefaultMqttStatus,
  MqttStatus,
  updateConnectedStatus,
  updateDisconnectedStatus,
  updateLatency,
} from "../../src/models/mqtt-status.ts";

// Simple assertion function
function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${expected}, but got ${actual}`);
  }
}

Deno.test("createDefaultMqttStatus should create a status with default values", () => {
  const status = createDefaultMqttStatus();

  assertEquals(status.connected, false);
  assertEquals(status.latency, 0);
  assertEquals(status.lastConnected, null);
  assertEquals(status.lastDisconnected, null);
});

Deno.test("updateConnectedStatus should update status to connected state", () => {
  const status = createDefaultMqttStatus();
  const updatedStatus = updateConnectedStatus(status, 100);

  assertEquals(updatedStatus.connected, true);
  assertEquals(updatedStatus.latency, 100);
  assertEquals(typeof updatedStatus.lastConnected, "string");
  assertEquals(updatedStatus.lastDisconnected, null);
});

Deno.test("updateConnectedStatus should preserve latency if not provided", () => {
  const status: MqttStatus = {
    connected: false,
    latency: 150,
    lastConnected: null,
    lastDisconnected: null,
  };

  const updatedStatus = updateConnectedStatus(status);

  assertEquals(updatedStatus.connected, true);
  assertEquals(updatedStatus.latency, 150);
});

Deno.test("updateDisconnectedStatus should update status to disconnected state", () => {
  const status: MqttStatus = {
    connected: true,
    latency: 100,
    lastConnected: "2023-01-01T00:00:00.000Z",
    lastDisconnected: null,
  };

  const updatedStatus = updateDisconnectedStatus(status);

  assertEquals(updatedStatus.connected, false);
  assertEquals(updatedStatus.latency, 100);
  assertEquals(updatedStatus.lastConnected, "2023-01-01T00:00:00.000Z");
  assertEquals(typeof updatedStatus.lastDisconnected, "string");
});

Deno.test("updateLatency should update only the latency value", () => {
  const status = createDefaultMqttStatus();
  const updatedStatus = updateLatency(status, 200);

  assertEquals(updatedStatus.connected, false);
  assertEquals(updatedStatus.latency, 200);
  assertEquals(updatedStatus.lastConnected, null);
  assertEquals(updatedStatus.lastDisconnected, null);
});
