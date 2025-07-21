import { MqttStatus } from '@/models';

/**
 * Core Service interface as defined in the design document
 */
export interface CoreService {
  initialize(): Promise<void>;
  getMqttStatus(): MqttStatus;
  shutdown(): Promise<void>;
}

// Implementation will be added in task 4.1