import { CustomLogger } from 'src/logger/logger.service';

export function LogMethod(processName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = new CustomLogger(target.constructor.name);
      const process = logger.startProcess({
        processName: processName || propertyKey,
      });

      try {
        const result = await originalMethod.apply(this, args);
        logger.finishProcess(process);
        return result;
      } catch (error) {
        logger.errorProcess(
          { processName: processName || propertyKey },
          error.message,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

export function LogController(endpoint: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = new CustomLogger(target.constructor.name, {
        timestamp: true,
      });
      const process = logger.logEndpointStart({
        endpoint,
        method: propertyKey,
      });

      try {
        const result = await originalMethod.apply(this, args);
        logger.logEndpointFinish(process);
        return result;
      } catch (error) {
        logger.logEndpointError(process);
        throw error;
      }
    };

    return descriptor;
  };
}
