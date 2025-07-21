import { MqttConfig, MqttStatus, createDefaultMqttStatus, updateConnectedStatus, updateDisconnectedStatus, updateLatency } from '@/models';
import { MqttClient } from './mqtt-client.ts';
import * as mqtt from 'mqtt';

// Topic used for ping/pong latency measurement
const PING_TOPIC = 'alert/ping';
const PONG_TOPIC = 'alert/pong';

// Reconnection constants
const INITIAL_RECONNECT_DELAY_MS = 1000; // Start with 1 second delay
const MAX_RECONNECT_DELAY_MS = 30000;    // Maximum 30 seconds delay
const RECONNECT_BACKOFF_FACTOR = 1.5;    // Exponential backoff factor

/**
 * Implementation of the MqttClient interface
 */
export class MqttClientImpl implements MqttClient {
  private client: mqtt.MqttClient | null = null;
  private status: MqttStatus = createDefaultMqttStatus();
  private statusChangeCallbacks: ((status: MqttStatus) => void)[] = [];
  private config: MqttConfig | null = null;
  private latencyCheckInterval: number | null = null;
  private pingTimestamp: number | null = null;
  private pingTimeoutId: number | null = null;
  private reconnectTimeoutId: number | null = null;
  private reconnectAttempts: number = 0;
  private reconnecting: boolean = false;

  /**
   * Connect to the MQTT server using the provided configuration
   * @param config MQTT connection configuration
   */
  async connect(config: MqttConfig): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    // Cancel any pending reconnection attempts
    this.cancelReconnection();

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
          // Reset reconnection state on successful connection
          this.reconnecting = false;
          this.reconnectAttempts = 0;
          
          this.handleConnect();
          
          // Subscribe to pong topic for latency measurement
          this.client?.subscribe(PONG_TOPIC, (err) => {
            if (err) {
              console.error('Failed to subscribe to pong topic:', err);
            }
          });
          
          // Setup message handler for pong messages
          this.client?.on('message', (topic, message) => {
            if (topic === PONG_TOPIC) {
              this.handlePongMessage(message);
            }
          });
          
          // Start periodic latency checks
          this.startLatencyChecks();
          
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
    // Stop latency checks when disconnecting
    this.stopLatencyChecks();
    
    // Cancel any pending reconnection attempts
    this.cancelReconnection();
    this.reconnecting = false;
    
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
    
    // Start reconnection process if we have a config and aren't already reconnecting
    if (this.config && !this.reconnecting) {
      this.startReconnection();
    }
  }
  
  /**
   * Start the reconnection process with exponential backoff
   */
  private startReconnection(): void {
    // Don't start reconnection if we're already reconnecting
    if (this.reconnecting) {
      return;
    }
    
    this.reconnecting = true;
    this.attemptReconnection();
  }
  
  /**
   * Attempt to reconnect to the MQTT server with exponential backoff
   */
  private attemptReconnection(): void {
    // Cancel any existing reconnection attempt
    this.cancelReconnection();
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(RECONNECT_BACKOFF_FACTOR, this.reconnectAttempts),
      MAX_RECONNECT_DELAY_MS
    );
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    // Schedule reconnection attempt
    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectTimeoutId = null;
      
      try {
        if (this.config) {
          console.log(`Reconnecting to MQTT server (attempt ${this.reconnectAttempts + 1})...`);
          await this.connect(this.config);
          
          // Reset reconnection state on successful connection
          this.reconnectAttempts = 0;
          this.reconnecting = false;
          console.log('Reconnection successful');
        }
      } catch (error) {
        console.error('Reconnection failed:', error);
        
        // Increment attempt counter and try again
        this.reconnectAttempts++;
        this.attemptReconnection();
      }
    }, delay) as unknown as number;
  }
  
  /**
   * Cancel any pending reconnection attempts
   */
  private cancelReconnection(): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Notify all registered callbacks about status changes
   */
  private notifyStatusChange(): void {
    for (const callback of this.statusChangeCallbacks) {
      callback(this.status);
    }
  }

  /**
   * Start periodic latency checks
   * Sends ping messages at regular intervals to measure latency
   */
  private startLatencyChecks(): void {
    // Clear any existing interval
    this.stopLatencyChecks();
    
    // Start new interval (every 30 seconds)
    this.latencyCheckInterval = setInterval(() => {
      this.sendPing();
    }, 30000) as unknown as number;
    
    // Perform an initial latency check
    this.sendPing();
  }

  /**
   * Stop periodic latency checks
   */
  private stopLatencyChecks(): void {
    if (this.latencyCheckInterval !== null) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }
    
    // Clear any pending ping timeout
    if (this.pingTimeoutId !== null) {
      clearTimeout(this.pingTimeoutId);
      this.pingTimeoutId = null;
    }
  }

  /**
   * Send a ping message to measure latency
   */
  private sendPing(): void {
    if (!this.client?.connected) {
      return;
    }
    
    // Clear any existing ping timeout
    if (this.pingTimeoutId !== null) {
      clearTimeout(this.pingTimeoutId);
    }
    
    // Generate a unique ping ID
    const pingId = Date.now().toString();
    
    // Store the current timestamp
    this.pingTimestamp = performance.now();
    
    // Publish ping message
    this.client.publish(PING_TOPIC, pingId, { qos: 0 });
    
    // Set timeout for ping response (5 seconds)
    this.pingTimeoutId = setTimeout(() => {
      // If we don't get a response, consider it a timeout
      console.warn('Ping timeout - no response received');
      this.pingTimestamp = null;
      this.pingTimeoutId = null;
    }, 5000) as unknown as number;
  }

  /**
   * Handle pong message received from the broker
   * @param message The message payload
   */
  private handlePongMessage(_message: Uint8Array): void {
    // If we have a pending ping, calculate the latency
    if (this.pingTimestamp !== null) {
      const now = performance.now();
      const latency = Math.round(now - this.pingTimestamp);
      
      // Update the status with the new latency
      this.status = updateLatency(this.status, latency);
      this.notifyStatusChange();
      
      // Clear the ping timestamp and timeout
      this.pingTimestamp = null;
      if (this.pingTimeoutId !== null) {
        clearTimeout(this.pingTimeoutId);
        this.pingTimeoutId = null;
      }
    }
  }
  
  /**
   * Clean up resources when the client is destroyed
   */
  destroy(): void {
    this.stopLatencyChecks();
    this.cancelReconnection();
    this.reconnecting = false;
    this.reconnectAttempts = 0;
    this.disconnect();
  }
}