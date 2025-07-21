import { AppConfig, MqttStatus } from "../models/index.ts";
import { MqttClient } from "../mqtt/mqtt-client.ts";
import { StatusRepository } from "../repositories/status-repository.ts";
import { logger } from "./logger-service.ts";
import { AppError, ErrorCode, handleError } from "../utils/error-utils.ts";

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
    config: AppConfig,
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
      logger.info("Connecting to MQTT server...");
      await this.mqttClient.connect(this.config.mqtt);

      this.initialized = true;
      logger.info("Core service initialized successfully");
    } catch (error) {
      // Handle the error with our error utility
      const wrappedError = error instanceof AppError ? error : new AppError(
        `Core service initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCode.INTERNAL_ERROR,
        { component: "CoreService" },
      );

      handleError(wrappedError, "Failed to initialize core service");
      throw wrappedError;
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
      logger.info("Disconnecting from MQTT server...");
      await this.mqttClient.disconnect();

      // Clean up resources
      this.mqttClient.destroy();

      this.initialized = false;
      logger.info("Core service shut down successfully");
    } catch (error) {
      // Handle the error with our error utility
      const wrappedError = error instanceof AppError ? error : new AppError(
        `Core service shutdown failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCode.INTERNAL_ERROR,
        { component: "CoreService" },
      );

      handleError(wrappedError, "Error during core service shutdown");
      throw wrappedError;
    }
  }
}
