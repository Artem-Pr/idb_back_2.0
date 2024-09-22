import { Injectable, Logger, Scope } from '@nestjs/common';
import { getRandomId } from 'src/common/utils';

type ProcessData = {
  processId?: string | number;
  processName: string;
  data?: any;
};

type ProcessDataWithId = Omit<ProcessData, 'processId'> & {
  processId: string | number;
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
  startProcess({
    data,
    processId,
    processName,
  }: ProcessData): ProcessDataWithId {
    const id = processId || getRandomId(5);
    this.startTimer(id);
    super.log(
      `🚀 Process ${processName}: ${id}${data ? ` - ${this.formatData(data)}` : ''}`,
    );
    return { processId: id, processName, data };
  }

  finishProcess({ data, processId, processName }: ProcessDataWithId): void {
    const duration = this.endTimer(processId);
    super.log(
      `✅ Process ${processName}: ${processId}${data ? ` - ${this.formatData(data)}` : ''} ${duration}`,
    );
  }

  errorProcess({
    processId,
    processName,
    errorData,
  }: Omit<ProcessData, 'data'> & { errorData?: any }): void {
    const duration = processId ? this.endTimer(processId) : '';
    super.error(
      processId
        ? `❌ Process ${processName}: ${processId}${errorData ? ` - ${this.formatData(errorData)}` : ''} ${duration}`
        : `❌ ${processName}: ${errorData ? this.formatData(errorData) : ''}`,
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
    errorData?: Record<string, any>;
  }): void {
    const methodMessage = method ? `${method}: ` : '';
    const dataMessage = errorData ? ` - ${this.formatData(errorData)}` : '';
    super.error(`${methodMessage}${message}${dataMessage}`);
  }

  private formatData(data?: any): string {
    if (!data) return '';
    return JSON.stringify(data);
  }
}
