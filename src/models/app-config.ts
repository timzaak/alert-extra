import { MqttConfig } from './mqtt-config';

/**
 * Application configuration interface
 */
export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  mqtt: MqttConfig;
}