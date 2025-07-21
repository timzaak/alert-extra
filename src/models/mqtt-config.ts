/**
 * MQTT Configuration interface as defined in the design document
 */
export interface MqttConfig {
  url: string;
  port: number;
  username?: string;
  password?: string;
  clientId: string;
  keepAlive?: number;
  pingTopic?: string;
  pongTopic?: string;
}
