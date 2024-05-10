import { Logger } from '@nestjs/common';

jest.mock('src/logger/logger.service', () => ({
  CustomLogger: jest.fn().mockImplementation(() => ({
    startProcess: jest.fn(),
    finishProcess: jest.fn(),
    errorProcess: jest.fn(),
  })),
}));

jest.spyOn(console, 'error').mockImplementation();
jest.spyOn(Logger.prototype, 'error').mockImplementation();
