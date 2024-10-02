import {
  errorProcess,
  finishProcess,
  logEndpointError,
  logEndpointFinish,
  logEndpointStart,
  startProcess,
} from '../../test/setup';
import { LogMethod, LogController } from './logger.decorator';

describe('LogMethod', () => {
  let originalMethod: jest.Mock;
  let targetClass: any;
  let descriptor: PropertyDescriptor;

  beforeEach(() => {
    originalMethod = jest.fn();
    targetClass = {};
    descriptor = {
      value: originalMethod,
    };
  });

  it('should call the original method and log start, finish, and error', async () => {
    const processName = 'testProcess';
    LogMethod(processName)(targetClass, 'testMethod', descriptor);

    const method = descriptor.value;
    const mockArgs = [1, 2, 3];
    await descriptor.value(...mockArgs);

    expect(startProcess).toHaveBeenCalledWith({ processName });
    expect(originalMethod).toHaveBeenCalledWith(...mockArgs);
    expect(finishProcess).toHaveBeenCalled();
    expect(errorProcess).not.toHaveBeenCalled();

    // Test error handling
    originalMethod.mockImplementationOnce(() => {
      throw new Error('test error');
    });

    try {
      await method.apply(targetClass, mockArgs);
    } catch (err) {
      expect(errorProcess).toHaveBeenCalled();
    }
  });
});

describe('LogController', () => {
  let originalMethod: jest.Mock;
  let targetClass: any;
  let descriptor: PropertyDescriptor;

  beforeEach(() => {
    originalMethod = jest.fn();
    targetClass = {};
    descriptor = {
      value: originalMethod,
    };
  });

  it('should call the original method and log start, finish, and error', async () => {
    const endpoint = 'testEndpoint';
    LogController(endpoint)(targetClass, 'testMethod', descriptor);

    const method = descriptor.value;
    const mockArgs = [1, 2, 3];
    await method.apply(targetClass, mockArgs);

    expect(logEndpointStart).toHaveBeenCalledWith({
      endpoint,
      method: 'testMethod',
    });
    expect(originalMethod).toHaveBeenCalledWith(...mockArgs);
    expect(logEndpointFinish).toHaveBeenCalled();
    expect(logEndpointError).not.toHaveBeenCalled();

    // Test error handling
    originalMethod.mockImplementationOnce(() => {
      throw new Error('test error');
    });

    try {
      await method.apply(targetClass, mockArgs);
    } catch (err) {
      expect(logEndpointError).toHaveBeenCalled();
    }
  });
});
