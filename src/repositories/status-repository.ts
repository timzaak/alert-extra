import { MqttStatus } from '@/models';

/**
 * Status Repository interface as defined in the design document
 */
export interface StatusRepository {
  updateStatus(status: MqttStatus): void;
  getCurrentStatus(): MqttStatus;
}

// Implementation will be added in task 2.2