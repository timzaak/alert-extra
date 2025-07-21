import { logger } from './logger-service.ts';
import { AppError, ErrorCode, handleError } from '../utils/error-utils.ts';

// Define interfaces locally to avoid import issues
interface MqttConfig {
  url: string;
  port: number;
  username?: string;
  password?: string;
  clientId: string;
  keepAlive?: number;
}

interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  mqtt: MqttConfig;
}

/**
 * Configuration Service for loading and validating application configuration
 */
export class ConfigService {
  private config: AppConfig | null = null;

  /**
   * Load configuration from file and environment variables
   * @param configPath Path to the configuration file
   * @returns The loaded configuration
   */
  public async loadConfig(configPath: string = 'config/default.json'): Promise<AppConfig> {
    try {
      logger.debug(`Loading configuration from ${configPath}`);
      
      // Load configuration from file
      const configFile = await Deno.readTextFile(configPath);
      const fileConfig = JSON.parse(configFile) as AppConfig;
      logger.debug('Configuration file loaded successfully');
      
      // Merge with environment variables if they exist
      const config = this.mergeWithEnvironment(fileConfig);
      logger.debug('Configuration merged with environment variables');
      
      // Validate the configuration
      this.validateConfig(config);
      logger.debug('Configuration validated successfully');
      
      this.config = config;
      return config;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        const notFoundError = new AppError(
          `Configuration file not found: ${configPath}`,
          ErrorCode.CONFIG_ERROR,
          { configPath }
        );
        handleError(notFoundError, 'Configuration loading error');
        throw notFoundError;
      }
      
      const configError = new AppError(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCode.CONFIG_ERROR,
        { configPath }
      );
      handleError(configError, 'Configuration loading error');
      throw configError;
    }
  }

  /**
   * Get the loaded configuration
   * @returns The loaded configuration
   * @throws Error if configuration has not been loaded
   */
  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration has not been loaded');
    }
    return this.config;
  }

  /**
   * Merge file configuration with environment variables
   * @param fileConfig Configuration loaded from file
   * @returns Merged configuration
   */
  private mergeWithEnvironment(fileConfig: AppConfig): AppConfig {
    const config = { ...fileConfig };

    // Server configuration from environment
    if (Deno.env.get('SERVER_PORT')) {
      config.server.port = parseInt(Deno.env.get('SERVER_PORT') || '3000', 10);
    }
    if (Deno.env.get('SERVER_HOST')) {
      config.server.host = Deno.env.get('SERVER_HOST') || '0.0.0.0';
    }

    // MQTT configuration from environment
    if (Deno.env.get('MQTT_URL')) {
      config.mqtt.url = Deno.env.get('MQTT_URL') || 'mqtt://localhost';
    }
    if (Deno.env.get('MQTT_PORT')) {
      config.mqtt.port = parseInt(Deno.env.get('MQTT_PORT') || '1883', 10);
    }
    if (Deno.env.get('MQTT_USERNAME')) {
      config.mqtt.username = Deno.env.get('MQTT_USERNAME');
    }
    if (Deno.env.get('MQTT_PASSWORD')) {
      config.mqtt.password = Deno.env.get('MQTT_PASSWORD');
    }
    if (Deno.env.get('MQTT_CLIENT_ID')) {
      config.mqtt.clientId = Deno.env.get('MQTT_CLIENT_ID') || 'alert-mqtt-monitor';
    }
    if (Deno.env.get('MQTT_KEEP_ALIVE')) {
      config.mqtt.keepAlive = parseInt(Deno.env.get('MQTT_KEEP_ALIVE') || '60', 10);
    }

    return config;
  }

  /**
   * Validate the configuration
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: AppConfig): void {
    // Validate server configuration
    if (!config.server) {
      throw new AppError(
        'Server configuration is missing',
        ErrorCode.CONFIG_ERROR,
        { config }
      );
    }
    if (typeof config.server.port !== 'number' || config.server.port <= 0) {
      throw new AppError(
        'Server port must be a positive number',
        ErrorCode.CONFIG_ERROR,
        { port: config.server.port }
      );
    }
    if (!config.server.host) {
      throw new AppError(
        'Server host is missing',
        ErrorCode.CONFIG_ERROR,
        { server: config.server }
      );
    }

    // Validate MQTT configuration
    this.validateMqttConfig(config.mqtt);
  }

  /**
   * Validate MQTT configuration
   * @param mqttConfig MQTT configuration to validate
   * @throws Error if MQTT configuration is invalid
   */
  private validateMqttConfig(mqttConfig: MqttConfig): void {
    if (!mqttConfig) {
      throw new AppError(
        'MQTT configuration is missing',
        ErrorCode.CONFIG_ERROR,
        { section: 'mqtt' }
      );
    }
    if (!mqttConfig.url) {
      throw new AppError(
        'MQTT URL is missing',
        ErrorCode.CONFIG_ERROR,
        { mqtt: mqttConfig }
      );
    }
    if (typeof mqttConfig.port !== 'number' || mqttConfig.port <= 0) {
      throw new AppError(
        'MQTT port must be a positive number',
        ErrorCode.CONFIG_ERROR,
        { port: mqttConfig.port }
      );
    }
    if (!mqttConfig.clientId) {
      throw new AppError(
        'MQTT client ID is missing',
        ErrorCode.CONFIG_ERROR,
        { mqtt: mqttConfig }
      );
    }
    
    // Optional fields validation
    if (mqttConfig.keepAlive !== undefined && 
        (typeof mqttConfig.keepAlive !== 'number' || mqttConfig.keepAlive <= 0)) {
      throw new AppError(
        'MQTT keep alive must be a positive number',
        ErrorCode.CONFIG_ERROR,
        { keepAlive: mqttConfig.keepAlive }
      );
    }
  }
}