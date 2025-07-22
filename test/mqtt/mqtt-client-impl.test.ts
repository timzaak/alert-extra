import { MqttClientImpl } from "../../src/mqtt/mqtt-client-impl.ts";
import { MqttStatus } from "../../src/models/index.ts";

// Simple test implementation that doesn't rely on mocking mqtt module
Deno.test("MqttClientImpl - initialization", () => {
  const client = new MqttClientImpl();
  assertEquals(client.isConnected(), false);
  assertEquals(client.getLatency(), 0);

  // @ts-ignore - accessing private property for testing
  assertEquals(client["reconnecting"], false);
  // @ts-ignore - accessing private property for testing
  assertEquals(client["reconnectAttempts"], 0);
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
    publish: function (topic: string, _message: unknown) {
      publishCalled = true;
      publishTopic = topic;
      return this; // Return this to match MqttClient interface
    },
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
  client["disconnect"] = () => {
    disconnectCalled = true;
    return Promise.resolve();
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

// Removed unused function

function assertGreaterThanOrEqual(actual: number, expected: number) {
  if (actual < expected) {
    throw new Error(
      `Expected ${actual} to be greater than or equal to ${expected}`,
    );
  }
}

Deno.test("MqttClientImpl - reconnection - startReconnection", () => {
  const client = new MqttClientImpl();
  let attemptReconnectionCalled = false;

  // Mock attemptReconnection method
  // @ts-ignore - setting up mock for testing
  client["attemptReconnection"] = () => {
    attemptReconnectionCalled = true;
  };

  // Set config to enable reconnection
  // @ts-ignore - setting up for testing
  client["config"] = {
    url: "test.mosquitto.org",
    port: 1883,
    clientId: "test-client",
  };

  // Call startReconnection
  // @ts-ignore - accessing private method for testing
  client["startReconnection"]();

  // Verify that reconnecting flag is set and attemptReconnection was called
  // @ts-ignore - accessing private property for testing
  assertEquals(client["reconnecting"], true);
  assertEquals(attemptReconnectionCalled, true);

  // Call startReconnection again - should not call attemptReconnection again
  attemptReconnectionCalled = false;
  // @ts-ignore - accessing private method for testing
  client["startReconnection"]();
  assertEquals(attemptReconnectionCalled, false);
});

Deno.test("MqttClientImpl - reconnection - handleDisconnect triggers reconnection", () => {
  const client = new MqttClientImpl();
  let startReconnectionCalled = false;

  // Mock startReconnection method
  // @ts-ignore - setting up mock for testing
  client["startReconnection"] = () => {
    startReconnectionCalled = true;
  };

  // Set config to enable reconnection
  // @ts-ignore - setting up for testing
  client["config"] = {
    url: "test.mosquitto.org",
    port: 1883,
    clientId: "test-client",
  };

  // Call handleDisconnect
  // @ts-ignore - accessing private method for testing
  client["handleDisconnect"]();

  // Verify that startReconnection was called
  assertEquals(startReconnectionCalled, true);

  // Reset and test with reconnecting already true
  startReconnectionCalled = false;
  // @ts-ignore - setting up for testing
  client["reconnecting"] = true;

  // Call handleDisconnect again
  // @ts-ignore - accessing private method for testing
  client["handleDisconnect"]();

  // Verify that startReconnection was not called this time
  assertEquals(startReconnectionCalled, false);
});

Deno.test("MqttClientImpl - reconnection - cancelReconnection", () => {
  const client = new MqttClientImpl();

  // Set up fake reconnect timeout
  // @ts-ignore - setting up for testing
  client["reconnectTimeoutId"] = setTimeout(() => {}, 1000);

  // Call cancelReconnection
  // @ts-ignore - accessing private method for testing
  client["cancelReconnection"]();

  // Verify that timeout was cleared
  // @ts-ignore - accessing private property for testing
  assertEquals(client["reconnectTimeoutId"], null);
});

Deno.test("MqttClientImpl - reconnection - disconnect cancels reconnection", () => {
  const client = new MqttClientImpl();
  let cancelReconnectionCalled = false;

  // Mock methods
  // @ts-ignore - setting up mock for testing
  client["cancelReconnection"] = () => {
    cancelReconnectionCalled = true;
  };

  // @ts-ignore - setting up mock for testing
  client["stopLatencyChecks"] = () => {};

  // Set reconnecting flag
  // @ts-ignore - setting up for testing
  client["reconnecting"] = true;

  // Call disconnect
  client.disconnect();

  // Verify that cancelReconnection was called and reconnecting flag was reset
  assertEquals(cancelReconnectionCalled, true);
  // @ts-ignore - accessing private property for testing
  assertEquals(client["reconnecting"], false);
});

Deno.test("MqttClientImpl - reconnection - destroy resets reconnection state", () => {
  const client = new MqttClientImpl();
  let cancelReconnectionCalled = false;
  let disconnectCalled = false;

  // Mock methods
  // @ts-ignore - setting up mock for testing
  client["cancelReconnection"] = () => {
    cancelReconnectionCalled = true;
  };

  // @ts-ignore - setting up mock for testing
  client["disconnect"] = () => {
    disconnectCalled = true;
    return Promise.resolve();
  };

  // @ts-ignore - setting up mock for testing
  client["stopLatencyChecks"] = () => {};

  // Set reconnection state
  // @ts-ignore - setting up for testing
  client["reconnecting"] = true;
  // @ts-ignore - setting up for testing
  client["reconnectAttempts"] = 5;

  // Call destroy
  client.destroy();

  // Verify that reconnection state was reset
  assertEquals(cancelReconnectionCalled, true);
  assertEquals(disconnectCalled, true);
  // @ts-ignore - accessing private property for testing
  assertEquals(client["reconnecting"], false);
  // @ts-ignore - accessing private property for testing
  assertEquals(client["reconnectAttempts"], 0);
});

Deno.test("MqttClientImpl - reconnection - attemptReconnection with exponential backoff", () => {
  const client = new MqttClientImpl();

  // Mock setTimeout to capture delay value
  const originalSetTimeout = setTimeout;
  let capturedDelay = 0;

  // @ts-ignore - setting up global mock for testing
  globalThis.setTimeout = (_callback: () => void, delay: number) => {
    capturedDelay = delay;
    return 1 as unknown as number; // Return a dummy timeout ID
  };

  // Set config and reconnect attempts
  // @ts-ignore - setting up for testing
  client["config"] = {
    url: "test.mosquitto.org",
    port: 1883,
    clientId: "test-client",
  };
  // @ts-ignore - setting up for testing
  client["reconnectAttempts"] = 0;

  // Call attemptReconnection
  // @ts-ignore - accessing private method for testing
  client["attemptReconnection"]();

  // Verify initial delay (should be INITIAL_RECONNECT_DELAY_MS = 1000)
  assertEquals(capturedDelay, 1000);

  // Set reconnect attempts to 1 and try again
  // @ts-ignore - setting up for testing
  client["reconnectAttempts"] = 1;

  // Call attemptReconnection again
  // @ts-ignore - accessing private method for testing
  client["attemptReconnection"]();

  // Verify delay with backoff (should be 1000 * 1.5^1 = 1500)
  assertEquals(capturedDelay, 1500);

  // Set reconnect attempts to 5 and try again
  // @ts-ignore - setting up for testing
  client["reconnectAttempts"] = 5;

  // Call attemptReconnection again
  // @ts-ignore - accessing private method for testing
  client["attemptReconnection"]();

  // Verify delay with backoff (should be 1000 * 1.5^5 = 7593.75)
  assertEquals(capturedDelay, 7593.75);

  // Set reconnect attempts to a high value that would exceed MAX_RECONNECT_DELAY_MS
  // @ts-ignore - setting up for testing
  client["reconnectAttempts"] = 20;

  // Call attemptReconnection again
  // @ts-ignore - accessing private method for testing
  client["attemptReconnection"]();

  // Verify delay is capped at MAX_RECONNECT_DELAY_MS (30000)
  assertEquals(capturedDelay, 30000);

  // Restore original setTimeout
  // @ts-ignore - restoring global function
  globalThis.setTimeout = originalSetTimeout;
});
