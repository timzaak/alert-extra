import { MqttClientImpl } from "./mqtt-client-impl.ts";
import { MqttConfig, MqttStatus } from "@/models";

// Simple test implementation that doesn't rely on mocking mqtt module
Deno.test("MqttClientImpl - initialization", () => {
  const client = new MqttClientImpl();
  assertEquals(client.isConnected(), false);
  assertEquals(client.getLatency(), 0);
});

Deno.test("MqttClientImpl - status change callback", () => {
  const client = new MqttClientImpl();
  let callCount = 0;
  let lastStatus: MqttStatus | null = null;
  
  client.onStatusChange((status) => {
    callCount++;
    lastStatus = status;
  });
  
  assertEquals(callCount, 1);
  assertNotNull(lastStatus);
  assertEquals(lastStatus!.connected, false);
});

Deno.test("MqttClientImpl - handle disconnect", () => {
  const client = new MqttClientImpl();
  let callCount = 0;
  let lastStatus: MqttStatus | null = null;
  
  client.onStatusChange((status) => {
    callCount++;
    lastStatus = status;
  });
  
  // Reset tracking after initial status notification
  callCount = 0;
  
  // @ts-ignore - accessing private method for testing
  client["handleDisconnect"]();
  
  assertEquals(callCount, 1);
  assertNotNull(lastStatus);
  assertEquals(lastStatus!.connected, false);
  assertNotNull(lastStatus!.lastDisconnected);
});

// Helper assertion functions
function assertEquals(actual: any, expected: any) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} but got ${actual}`);
  }
}

function assertNotNull(value: any) {
  if (value === null || value === undefined) {
    throw new Error(`Expected value to not be null or undefined, but got ${value}`);
  }
}

function assertNotEquals(actual: any, expected: any) {
  if (actual === expected) {
    throw new Error(`Expected ${actual} to not equal ${expected}`);
  }
}