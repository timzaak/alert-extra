import { MqttConfig } from "./mqtt-config.ts";

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
