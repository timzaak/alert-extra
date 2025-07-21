#!/usr/bin/env -S deno run --allow-read --allow-env

import { ConfigManagerImpl } from './src/services/config-manager.ts';

async function testConfigIntegration() {
  console.log('Testing ConfigManager with actual config file...');
  
  const configManager = new ConfigManagerImpl('./config/default.json');
  
  try {
    const config = await configManager.loadConfig();
    console.log('✅ Config loaded successfully!');
    console.log('MQTT Host:', config.mqtt.host);
    console.log('MQTT Port:', config.mqtt.port);
    console.log('Server Port:', config.server.port);
    console.log('Check Interval:', config.monitoring.checkInterval);
    
    // Test validation
    const isValid = configManager.validateConfig(config);
    console.log('✅ Config validation:', isValid ? 'PASSED' : 'FAILED');
    
    // Test getConfig
    const retrievedConfig = configManager.getConfig();
    console.log('✅ Config retrieval:', retrievedConfig.mqtt.host === config.mqtt.host ? 'PASSED' : 'FAILED');
    
    console.log('\n🎉 All integration tests passed!');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await testConfigIntegration();
}