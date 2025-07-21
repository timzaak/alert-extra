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
}

// Implementation will be added in task 3.1