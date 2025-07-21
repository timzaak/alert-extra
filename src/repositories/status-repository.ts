import { MqttStatus, createDefaultMqttStatus } from '../models/mqtt-status.ts';
import { logger } from '../services/logger-service.ts';

/**
 * Status Repository interface as defined in the design document
 */
export interface StatusRepository {
  updateStatus(status: MqttStatus): void;
  getCurrentStatus(): MqttStatus;
}

/**
 * In-memory implementation of the StatusRepository interface
 */
export class InMemoryStatusRepository implements StatusRepository {
  private status: MqttStatus;

  /**
   * Creates a new instance of InMemoryStatusRepository
   */
  constructor() {
    this.status = createDefaultMqttStatus();
  }

  /**
   * Updates the stored MQTT status
   * @param status The new status to store
   */
  updateStatus(status: MqttStatus): void {
    const previousStatus = this.status;
    this.status = { ...status };
    
    // Log connection state changes
    if (previousStatus.connected !== status.connected) {
      if (status.connected) {
        logger.info('MQTT connection status changed to connected');
      } else {
        logger.warn('MQTT connection status changed to disconnected');
      }
    }
    
    // Log significant latency changes (more than 50ms difference)
    if (Math.abs(previousStatus.latency - status.latency) > 50) {
      logger.debug(`MQTT latency changed from ${previousStatus.latency}ms to ${status.latency}ms`);
    }
  }

  /**
   * Gets the current MQTT status
   * @returns The current MQTT status
   */
  getCurrentStatus(): MqttStatus {
    return { ...this.status };
  }
}