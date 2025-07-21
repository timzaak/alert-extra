import { MqttClientImpl } from "./mqtt-client-impl.ts";
import { MqttStatus } from "@/models";

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

Deno.test("MqttClientImpl - latency measurement - handlePongMessage", () => {
  const client = new MqttClientImpl();
  let callCount = 0;
  let lastStatus: MqttStatus | null = null;
  
  client.onStatusChange((status) => {
    callCount++;
    lastStatus = status;
  });
  
  // Reset tracking after initial status notification
  callCount = 0;
  
  // Set up a fake ping timestamp (100ms ago)
  // @ts-ignore - accessing private property for testing
  client["pingTimestamp"] = performance.now() - 100;
  
  // Simulate receiving a pong message
  // @ts-ignore - accessing private method for testing
  client["handlePongMessage"](new Uint8Array([116, 101, 115, 116])); // "test" as Uint8Array
  
  // Verify that status was updated with latency
  assertEquals(callCount, 1);
  assertNotNull(lastStatus);
  assertGreaterThanOrEqual(lastStatus!.latency, 100);
  
  // Verify that pingTimestamp was reset
  // @ts-ignore - accessing private property for testing
  assertEquals(client["pingTimestamp"], null);
});

Deno.test("MqttClientImpl - latency measurement - sendPing", () => {
  const client = new MqttClientImpl();
  
  // Mock the client's publish method
  let publishCalled = false;
  let publishTopic = "";
  // @ts-ignore - setting up mock for testing
  client["client"] = {
    connected: true,
    publish: function(topic: string, _message: any) {
      publishCalled = true;
      publishTopic = topic;
      return this; // Return this to match MqttClient interface
    }
  };
  
  // Call sendPing
  // @ts-ignore - accessing private method for testing
  client["sendPing"]();
  
  // Verify that ping was sent
  assertEquals(publishCalled, true);
  assertEquals(publishTopic, "alert/ping");
  
  // Verify that pingTimestamp was set
  // @ts-ignore - accessing private property for testing
  assertNotNull(client["pingTimestamp"]);
  
  // Clean up the timer to prevent leaks
  // @ts-ignore - accessing private property for testing
  if (client["pingTimeoutId"] !== null) {
    // @ts-ignore - accessing private property for testing
    clearTimeout(client["pingTimeoutId"]);
    // @ts-ignore - accessing private property for testing
    client["pingTimeoutId"] = null;
  }
});

Deno.test("MqttClientImpl - latency measurement - startLatencyChecks", () => {
  const client = new MqttClientImpl();
  let pingCalled = false;
  
  // Mock sendPing method
  // @ts-ignore - setting up mock for testing
  client["sendPing"] = () => {
    pingCalled = true;
  };
  
  // Call startLatencyChecks
  // @ts-ignore - accessing private method for testing
  client["startLatencyChecks"]();
  
  // Verify that sendPing was called immediately
  assertEquals(pingCalled, true);
  
  // Verify that interval was set
  // @ts-ignore - accessing private property for testing
  assertNotNull(client["latencyCheckInterval"]);
  
  // Clean up
  // @ts-ignore - accessing private method for testing
  client["stopLatencyChecks"]();
});

Deno.test("MqttClientImpl - latency measurement - stopLatencyChecks", () => {
  const client = new MqttClientImpl();
  
  // Set up fake interval and timeout
  // @ts-ignore - setting up for testing
  client["latencyCheckInterval"] = setTimeout(() => {}, 1000);
  // @ts-ignore - setting up for testing
  client["pingTimeoutId"] = setTimeout(() => {}, 1000);
  
  // Call stopLatencyChecks
  // @ts-ignore - accessing private method for testing
  client["stopLatencyChecks"]();
  
  // Verify that interval and timeout were cleared
  // @ts-ignore - accessing private property for testing
  assertEquals(client["latencyCheckInterval"], null);
  // @ts-ignore - accessing private property for testing
  assertEquals(client["pingTimeoutId"], null);
});

Deno.test("MqttClientImpl - destroy method", () => {
  const client = new MqttClientImpl();
  let disconnectCalled = false;
  let stopLatencyChecksCalled = false;
  
  // Mock methods
  // @ts-ignore - setting up mock for testing
  client["disconnect"] = async () => {
    disconnectCalled = true;
  };
  
  // @ts-ignore - setting up mock for testing
  client["stopLatencyChecks"] = () => {
    stopLatencyChecksCalled = true;
  };
  
  // Call destroy
  client.destroy();
  
  // Verify that both methods were called
  assertEquals(stopLatencyChecksCalled, true);
  assertEquals(disconnectCalled, true);
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

// Removed unused function

function assertGreaterThanOrEqual(actual: number, expected: number) {
  if (actual < expected) {
    throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
  }
}