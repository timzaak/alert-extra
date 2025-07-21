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
      // Load configuration from file
      const configFile = await Deno.readTextFile(configPath);
      const fileConfig = JSON.parse(configFile) as AppConfig;
      
      // Merge with environment variables if they exist
      const config = this.mergeWithEnvironment(fileConfig);
      
      // Validate the configuration
      this.validateConfig(config);
      
      this.config = config;
      return config;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
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
      throw new Error('Server configuration is missing');
    }
    if (typeof config.server.port !== 'number' || config.server.port <= 0) {
      throw new Error('Server port must be a positive number');
    }
    if (!config.server.host) {
      throw new Error('Server host is missing');
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
      throw new Error('MQTT configuration is missing');
    }
    if (!mqttConfig.url) {
      throw new Error('MQTT URL is missing');
    }
    if (typeof mqttConfig.port !== 'number' || mqttConfig.port <= 0) {
      throw new Error('MQTT port must be a positive number');
    }
    if (!mqttConfig.clientId) {
      throw new Error('MQTT client ID is missing');
    }
    
    // Optional fields validation
    if (mqttConfig.keepAlive !== undefined && 
        (typeof mqttConfig.keepAlive !== 'number' || mqttConfig.keepAlive <= 0)) {
      throw new Error('MQTT keep alive must be a positive number');
    }
  }
}