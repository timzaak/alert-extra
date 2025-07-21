/**
 * MQTT Status interface as defined in the design document
 */
export interface MqttStatus {
  connected: boolean;
  latency: number; // in milliseconds
  lastConnected: string | null; // ISO timestamp
  lastDisconnected: string | null; // ISO timestamp
}

/**
 * Creates a new MqttStatus object with default values
 * @returns A new MqttStatus object with default values
 */
export function createDefaultMqttStatus(): MqttStatus {
  return {
    connected: false,
    latency: 0,
    lastConnected: null,
    lastDisconnected: null,
  };
}

/**
 * Updates the status to connected state
 * @param status The current status object to update
 * @param latency Optional latency value in milliseconds
 * @returns A new MqttStatus object with updated connected state
 */
export function updateConnectedStatus(
  status: MqttStatus,
  latency?: number,
): MqttStatus {
  const now = new Date().toISOString();
  return {
    ...status,
    connected: true,
    latency: latency !== undefined ? latency : status.latency,
    lastConnected: now,
  };
}

/**
 * Updates the status to disconnected state
 * @param status The current status object to update
 * @returns A new MqttStatus object with updated disconnected state
 */
export function updateDisconnectedStatus(status: MqttStatus): MqttStatus {
  const now = new Date().toISOString();
  return {
    ...status,
    connected: false,
    lastDisconnected: now,
  };
}

/**
 * Updates the latency value in the status
 * @param status The current status object to update
 * @param latency The new latency value in milliseconds
 * @returns A new MqttStatus object with updated latency
 */
export function updateLatency(status: MqttStatus, latency: number): MqttStatus {
  return {
    ...status,
    latency,
  };
}
