import { Injectable, Logger, Scope } from '@nestjs/common';

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
      this.logError(`❌ Timer for processId '${processId}' was not found.`);
      return '';
    }
  }
  startProcess(
    processId: string | number,
    processName: string,
    data?: any,
  ): void {
    this.startTimer(processId);
    super.log(
      `🚀 Process ${processName}: ${processId}${data ? ` - ${this.formatData(data)}` : ''}`,
    );
  }

  finishProcess(
    processId: string | number,
    processName: string,
    data?: any,
  ): void {
    const duration = this.endTimer(processId);
    super.log(
      `✅ Process ${processName}: ${processId}${data ? ` - ${this.formatData(data)}` : ''} ${duration}`,
    );
  }

  errorProcess({
    processId,
    processName,
    errorData,
  }: {
    processId?: string | number;
    processName: string;
    errorData?: any;
  }): void {
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

  logError(message: string, errorData?: Record<string, any>): void {
    super.error(`${message} - ${this.formatData(errorData)}`);
  }

  private formatData(data?: any): string {
    if (!data) return '';
    return JSON.stringify(data);
  }
}
