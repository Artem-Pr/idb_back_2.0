import { ConfigService } from './config.service';

let configService: ConfigService;

export const setGlobalConfigService = (service: ConfigService): void => {
  configService = service;
};

export const getGlobalConfigService = (): ConfigService => {
  if (!configService) {
    throw new Error('ConfigService has not been set!');
  }
  return configService;
};

// How to use:   private configService = getGlobalConfigService();
