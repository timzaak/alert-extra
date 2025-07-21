import { MqttStatus, createDefaultMqttStatus } from '../models/mqtt-status.ts';

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
    this.status = { ...status };
  }

  /**
   * Gets the current MQTT status
   * @returns The current MQTT status
   */
  getCurrentStatus(): MqttStatus {
    return { ...this.status };
  }
}