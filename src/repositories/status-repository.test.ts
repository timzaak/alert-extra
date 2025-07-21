import { InMemoryStatusRepository } from "./status-repository.ts";
import { MqttStatus } from "../models/mqtt-status.ts";

// Simple assertion function
function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
  }
}

Deno.test("InMemoryStatusRepository - constructor initializes with default status", () => {
  const repository = new InMemoryStatusRepository();
  const status = repository.getCurrentStatus();
  
  assertEquals(status.connected, false);
  assertEquals(status.latency, 0);
  assertEquals(status.lastConnected, null);
  assertEquals(status.lastDisconnected, null);
});

Deno.test("InMemoryStatusRepository - updateStatus should store the new status", () => {
  const repository = new InMemoryStatusRepository();
  
  const newStatus: MqttStatus = {
    connected: true,
    latency: 150,
    lastConnected: "2023-01-01T00:00:00.000Z",
    lastDisconnected: null
  };
  
  repository.updateStatus(newStatus);
  const retrievedStatus = repository.getCurrentStatus();
  
  assertEquals(retrievedStatus, newStatus);
});

Deno.test("InMemoryStatusRepository - getCurrentStatus should return a copy of the status", () => {
  const repository = new InMemoryStatusRepository();
  
  const newStatus: MqttStatus = {
    connected: true,
    latency: 150,
    lastConnected: "2023-01-01T00:00:00.000Z",
    lastDisconnected: null
  };
  
  repository.updateStatus(newStatus);
  
  // Get the status and modify it
  const retrievedStatus = repository.getCurrentStatus();
  retrievedStatus.connected = false;
  retrievedStatus.latency = 200;
  
  // Get the status again and verify it wasn't modified
  const retrievedStatus2 = repository.getCurrentStatus();
  assertEquals(retrievedStatus2, newStatus);
});