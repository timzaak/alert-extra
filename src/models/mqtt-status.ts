/**
 * MQTT Status interface as defined in the design document
 */
export interface MqttStatus {
  connected: boolean;
  latency: number;  // in milliseconds
  lastConnected: string | null;  // ISO timestamp
  lastDisconnected: string | null;  // ISO timestamp
}