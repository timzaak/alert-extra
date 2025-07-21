import { MqttConfig, MqttStatus } from '@/models';

/**
 * MQTT Client interface as defined in the design document
 */
export interface MqttClient {
  connect(config: MqttConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getLatency(): number;
  onStatusChange(callback: (status: MqttStatus) => void): void;
  destroy(): void;
}

// Implementation added in task 3.1 and 3.2