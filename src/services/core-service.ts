import { AppConfig, MqttStatus } from '../models/index.ts';
import { MqttClient } from '../mqtt/mqtt-client.ts';
import { StatusRepository } from '../repositories/status-repository.ts';

/**
 * Core Service interface as defined in the design document
 */
export interface CoreService {
  initialize(): Promise<void>;
  getMqttStatus(): MqttStatus;
  shutdown(): Promise<void>;
}

/**
 * Implementation of the Core Service interface
 */
export class CoreServiceImpl implements CoreService {
  private mqttClient: MqttClient;
  private statusRepository: StatusRepository;
  private config: AppConfig;
  private initialized: boolean = false;

  /**
   * Creates a new instance of CoreServiceImpl
   * @param mqttClient MQTT client implementation
   * @param statusRepository Status repository implementation
   * @param config Application configuration
   */
  constructor(
    mqttClient: MqttClient,
    statusRepository: StatusRepository,
    config: AppConfig
  ) {
    this.mqttClient = mqttClient;
    this.statusRepository = statusRepository;
    this.config = config;
  }

  /**
   * Initialize the core service
   * - Connects to the MQTT server
   * - Sets up status change handlers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Set up status change handler
      this.mqttClient.onStatusChange((status: MqttStatus) => {
        this.statusRepository.updateStatus(status);
      });

      // Connect to MQTT server
      await this.mqttClient.connect(this.config.mqtt);
      
      this.initialized = true;
      console.log('Core service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize core service:', error);
      if (error instanceof Error) {
        throw new Error(`Core service initialization failed: ${error.message}`);
      } else {
        throw new Error('Core service initialization failed: Unknown error');
      }
    }
  }

  /**
   * Get the current MQTT status
   * @returns Current MQTT status
   */
  getMqttStatus(): MqttStatus {
    return this.statusRepository.getCurrentStatus();
  }

  /**
   * Shutdown the core service
   * - Disconnects from the MQTT server
   * - Cleans up resources
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Disconnect from MQTT server
      await this.mqttClient.disconnect();
      
      // Clean up resources
      this.mqttClient.destroy();
      
      this.initialized = false;
      console.log('Core service shut down successfully');
    } catch (error) {
      console.error('Error during core service shutdown:', error);
      if (error instanceof Error) {
        throw new Error(`Core service shutdown failed: ${error.message}`);
      } else {
        throw new Error('Core service shutdown failed: Unknown error');
      }
    }
  }
}