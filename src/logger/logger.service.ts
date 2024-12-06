import { Injectable, Logger, Scope } from '@nestjs/common';
import { getRandomId } from 'src/common/utils';

type ProcessData = {
  processId?: string | number;
  processName: string;
  data?: any;
};

type EndpointData = {
  endpoint: string;
  method: string;
  data?: any;
};

type EndpointDataWithId = EndpointData & {
  processId?: string | number;
};

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger extends Logger {
  private startTimes: Map<string, [number, number]> = new Map();

  private startTimer(processId: string | number): void {
    this.startTimes.set(processId.toString(), process.hrtime());
  }

  private endTimer(processId: string | number): string {
    const startTime = this.startTimes.get(processId.toString());
    if (startTime) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1e6;
      this.startTimes.delete(processId.toString());
      return `+${duration.toFixed()}ms`;
    } else {
      this.logError({
        message: `❌ Timer for processId '${processId}' was not found.`,
      });
      return '';
    }
  }
  startProcess({ data, processId, processName }: ProcessData): ProcessData {
    const id = processId || getRandomId(5);
    this.startTimer(id);
    super.log(
      `🚀 Process ${processName}: ${id}${data ? ` - ${this.formatData(data)}` : ''}`,
    );
    return { processId: id, processName, data };
  }

  finishProcess({ data, processId, processName }: ProcessData): void {
    const duration = processId ? this.endTimer(processId) : '';
    super.log(
      `✅ Process ${processName}: ${processId}${data ? ` - ${this.formatData(data)}` : ''} ${duration}`,
    );
  }

  errorProcess({ processId, processName }: ProcessData, errorData?: any): void {
    const duration = processId ? this.endTimer(processId) : '';
    super.error(
      processId
        ? `❌ Process ${processName}: ${processId} ${duration}`
        : `❌ ${processName}`,
      errorData && [errorData],
    );
  }

  logEndpointStart({
    endpoint,
    method,
    data,
  }: EndpointData): EndpointDataWithId {
    const id = getRandomId(5);
    this.startTimer(id);
    super.log(
      `🚀 Endpoint ${method} (${endpoint}): ${id}${data ? ` - ${this.formatData(data)}` : ''}`,
    );
    return { endpoint, method, data, processId: id };
  }

  logEndpointFinish({
    endpoint,
    method,
    data,
    processId,
  }: EndpointDataWithId): void {
    const duration = processId ? this.endTimer(processId) : '';
    super.log(
      `✅ Endpoint ${method} (${endpoint}): ${processId}${data ? ` - ${this.formatData(data)}` : ''} ${duration}`,
    );
  }

  logEndpointError({
    endpoint,
    method,
    data: errorData,
    processId,
  }: EndpointDataWithId): void {
    const duration = processId ? this.endTimer(processId) : '';
    super.error(
      `❌ Endpoint ${method} (${endpoint}): ${processId} ${duration}`,
      errorData && [errorData],
    );
  }

  logMessage(message: string, data?: Record<string, any>): void {
    super.log(`${message} - ${this.formatData(data)}`);
  }

  logError({
    message,
    method,
    errorData,
  }: {
    message: string;
    method?: string;
    errorData?: unknown;
  }): void {
    const methodMessage = method ? `${method}: ` : '';
    super.error(`${methodMessage}${message}`, errorData && [errorData]);
  }

  private formatData(data?: any): string {
    if (!data) return '';
    return JSON.stringify(data);
  }
}
