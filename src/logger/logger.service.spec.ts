import { Logger } from '@nestjs/common';
import { CustomLogger } from './logger.service';

jest.unmock('src/logger/logger.service');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('CustomLogger', () => {
  let customLogger: CustomLogger;
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    customLogger = new CustomLogger('testLogger');
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start and end a timer correctly', async () => {
    const processId = 'testProcessId';
    const processName = 'testProcess';
    const processData = customLogger.startProcess({
      processId,
      processName,
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      `🚀 Process testProcess: testProcessId`,
    );

    await wait(20);

    customLogger.finishProcess(processData);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenLastCalledWith(
      expect.stringContaining(`✅ Process testProcess: testProcessId +`) &&
        expect.stringContaining(`ms`),
    );
  });

  it('should log an error if the timer was not found', () => {
    const processId = 'invalidProcessId';
    const processName = 'testProcess';
    customLogger.finishProcess({ processId, processName });
    expect(errorSpy).toHaveBeenCalledWith(
      `❌ Timer for processId '${processId}' was not found.`,
      undefined,
    );
  });

  it('should log an error process', () => {
    const processId = 'testProcessId';
    const processName = 'testProcess';
    const errorData = { message: 'Error occurred' };

    // with error data
    customLogger.startProcess({ processId, processName });
    customLogger.errorProcess({ processId, processName }, errorData);
    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Process testProcess: testProcessId +0ms',
      [{ message: 'Error occurred' }],
    );

    // and without error data
    customLogger.startProcess({ processId, processName });
    customLogger.errorProcess({ processId, processName });
    expect(errorSpy).toHaveBeenLastCalledWith(
      '❌ Process testProcess: testProcessId +0ms',
      undefined,
    );
  });

  describe('should log an endpoint', () => {
    it('should log endpoint start correctly', () => {
      const endpointData = {
        endpoint: '/test',
        method: 'GET',
        data: { key: 'value' },
      };
      const result = customLogger.logEndpointStart(endpointData);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Endpoint GET (/test)'),
      );
      expect(result).toHaveProperty('processId');
    });

    it('should log endpoint finish correctly', () => {
      const endpointDataWithId = {
        endpoint: '/test',
        method: 'GET',
        data: { key: 'value' },
        processId: '12345',
      };
      customLogger.logEndpointFinish(endpointDataWithId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Endpoint GET (/test): 12345'),
      );
    });

    it('should log endpoint error correctly', () => {
      const endpointDataWithId = {
        endpoint: '/test',
        method: 'GET',
        data: { error: 'An error occurred' },
        processId: '12345',
      };
      customLogger.logEndpointError(endpointDataWithId);

      expect(errorSpy).toHaveBeenNthCalledWith(
        1,
        "❌ Timer for processId '12345' was not found.",
        undefined,
      );
      expect(errorSpy).toHaveBeenNthCalledWith(
        2,
        '❌ Endpoint GET (/test): 12345 ',
        [{ error: 'An error occurred' }],
      );
    });
  });

  it('should log a message', () => {
    const message = 'testMessage';
    const data = { key: 'value' };
    customLogger.logMessage(message, data);
    expect(logSpy).toHaveBeenCalledWith(`${message} - ${JSON.stringify(data)}`);
  });

  it('should log ws input correctly', () => {
    const message = 'testMessage';
    const data = { key: 'value' };
    customLogger.logWSIn(message, data);
    expect(debugSpy).toHaveBeenCalledWith(`WS: ⏪ ${message}`, data);
    customLogger.logWSIn(message);
    expect(debugSpy).toHaveBeenCalledWith(`WS: ⏪ ${message}`);
  });

  it('should log ws output correctly', () => {
    const message = 'testMessage';
    const data = { key: 'value' };
    customLogger.logWSOut(message, data);
    expect(debugSpy).toHaveBeenCalledWith(`WS: ⏩ ${message}`, data);
    customLogger.logWSOut(message);
    expect(debugSpy).toHaveBeenCalledWith(`WS: ⏩ ${message}`);
  });

  it('should log ws error correctly', () => {
    const message = 'testMessage';
    const data = { key: 'value' };
    customLogger.errorWSIn(message, data);
    expect(errorSpy).toHaveBeenCalledWith(`WS ERROR: ⏪ ${message}`, data);
    customLogger.errorWSIn(message);
    expect(errorSpy).toHaveBeenCalledWith(`WS ERROR: ⏪ ${message}`, undefined);
    customLogger.errorWSOut(message, data);
    expect(errorSpy).toHaveBeenCalledWith(`WS ERROR: ⏩ ${message}`, data);
    customLogger.errorWSOut(message);
    expect(errorSpy).toHaveBeenCalledWith(`WS ERROR: ⏩ ${message}`, undefined);
  });

  it('should add data to the message', () => {
    const data = { key: 'mocked data' };
    const errorData = { message: 'Error occurred' };
    const processId = 'testProcessId';
    const processName = 'testProcess';

    // with data
    customLogger.startProcess({ processId, processName, data });
    expect(logSpy).toHaveBeenCalledWith(
      '🚀 Process testProcess: testProcessId - {"key":"mocked data"}',
    );

    // with data
    customLogger.finishProcess({ processId, processName, data });
    expect(logSpy).toHaveBeenLastCalledWith(
      expect.stringContaining(
        `✅ Process testProcess: testProcessId - {"key":"mocked data"} +`,
      ) && expect.stringContaining(`ms`),
    );

    // with error data
    customLogger.errorProcess({ processName }, errorData);
    expect(errorSpy).toHaveBeenNthCalledWith(1, '❌ testProcess', [
      { message: 'Error occurred' },
    ]);
  });
});
