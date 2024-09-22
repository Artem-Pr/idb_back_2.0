import { Logger } from '@nestjs/common';
import { CustomLogger } from './logger.service';

jest.unmock('src/logger/logger.service');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('CustomLogger', () => {
  let customLogger: CustomLogger;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    customLogger = new CustomLogger('testLogger');
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
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
      expect.stringContaining(
        `❌ Timer for processId '${processId}' was not found.`,
      ),
    );
  });

  it('should log an error process', () => {
    const processId = 'testProcessId';
    const processName = 'testProcess';
    const errorData = { message: 'Error occurred' };

    // with error data
    customLogger.startProcess({ processId, processName });
    customLogger.errorProcess({ processId, processName, errorData });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `❌ Process testProcess: testProcessId - {\"message\":\"Error occurred\"} +`,
      ),
    );

    // and without error data
    customLogger.startProcess({ processId, processName });
    customLogger.errorProcess({ processId, processName });
    expect(errorSpy).toHaveBeenLastCalledWith(
      expect.stringContaining(`❌ Process testProcess: testProcessId +`),
    );
  });

  it('should log a message', () => {
    const message = 'testMessage';
    const data = { key: 'value' };
    customLogger.logMessage(message, data);
    expect(logSpy).toHaveBeenCalledWith(`${message} - ${JSON.stringify(data)}`);
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
    customLogger.errorProcess({ processName, errorData });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `❌ testProcess: {\"message\":\"Error occurred\"}`,
      ),
    );

    // and without error data
    customLogger.errorProcess({ processName });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`❌ testProcess: `),
    );
  });
});
