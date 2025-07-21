import { MqttConfig, MqttStatus, createDefaultMqttStatus, updateConnectedStatus, updateDisconnectedStatus } from '@/models';
import { MqttClient } from './mqtt-client.ts';
import * as mqtt from 'mqtt';

/**
 * Implementation of the MqttClient interface
 */
export class MqttClientImpl implements MqttClient {
  private client: mqtt.MqttClient | null = null;
  private status: MqttStatus = createDefaultMqttStatus();
  private statusChangeCallbacks: ((status: MqttStatus) => void)[] = [];
  private config: MqttConfig | null = null;

  /**
   * Connect to the MQTT server using the provided configuration
   * @param config MQTT connection configuration
   */
  async connect(config: MqttConfig): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    this.config = config;
    const url = `mqtt://${config.url}:${config.port}`;
    
    const options: mqtt.IClientOptions = {
      clientId: config.clientId,
      keepalive: config.keepAlive || 60,
      reconnectPeriod: 0, // We'll handle reconnection manually
      clean: true
    };

    if (config.username) {
      options.username = config.username;
    }

    if (config.password) {
      options.password = config.password;
    }

    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(url, options);

        this.client.on('connect', () => {
          this.handleConnect();
          resolve();
        });

        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          reject(err);
        });

        this.client.on('close', () => {
          this.handleDisconnect();
        });

        this.client.on('offline', () => {
          this.handleDisconnect();
        });

        // Set a connection timeout
        const timeout = setTimeout(() => {
          reject(new Error('MQTT connection timeout'));
        }, 10000); // 10 seconds timeout

        // Clear timeout on successful connection
        this.client.once('connect', () => {
          clearTimeout(timeout);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the MQTT server
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        resolve();
        return;
      }

      if (!this.client.connected) {
        this.client.end(true);
        this.client = null;
        resolve();
        return;
      }

      this.client.end(true, {}, () => {
        this.client = null;
        this.handleDisconnect();
        resolve();
      });
    });
  }

  /**
   * Check if the client is currently connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  /**
   * Get the current latency measurement
   * @returns Current latency in milliseconds
   */
  getLatency(): number {
    return this.status.latency;
  }

  /**
   * Register a callback to be called when the connection status changes
   * @param callback Function to call with the updated status
   */
  onStatusChange(callback: (status: MqttStatus) => void): void {
    this.statusChangeCallbacks.push(callback);
    
    // Immediately call with current status
    callback(this.status);
  }

  /**
   * Handle connection established event
   */
  private handleConnect(): void {
    this.status = updateConnectedStatus(this.status);
    this.notifyStatusChange();
  }

  /**
   * Handle disconnection event
   */
  private handleDisconnect(): void {
    this.status = updateDisconnectedStatus(this.status);
    this.notifyStatusChange();
  }

  /**
   * Notify all registered callbacks about status changes
   */
  private notifyStatusChange(): void {
    for (const callback of this.statusChangeCallbacks) {
      callback(this.status);
    }
  }
}