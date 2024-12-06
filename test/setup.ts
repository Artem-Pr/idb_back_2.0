import { Logger } from '@nestjs/common';

export const debug = jest.fn();
export const errorProcess = jest.fn();
export const finishProcess = jest.fn();
export const logEndpointError = jest.fn();
export const logEndpointFinish = jest.fn();
export const logEndpointStart = jest.fn();
export const logError = jest.fn();
export const logMessage = jest.fn();
export const startProcess = jest.fn();
jest.mock('src/logger/logger.service', () => ({
  CustomLogger: jest.fn().mockImplementation(() => ({
    debug,
    errorProcess,
    finishProcess,
    logEndpointError,
    logEndpointFinish,
    logEndpointStart,
    logError,
    logMessage,
    startProcess,
  })),
}));

jest.spyOn(console, 'error').mockImplementation();
jest.spyOn(Logger.prototype, 'error').mockImplementation();
