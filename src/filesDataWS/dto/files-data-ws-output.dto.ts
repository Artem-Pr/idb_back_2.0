import { WSApiStatus, WebSocketActions } from '../constants';

export class FilesDataWSOutputDto<T extends unknown | undefined = undefined> {
  data?: T;
  developerMessage?: string;
  message: string;
  progress?: number;
  status: WSApiStatus;

  constructor(status: WSApiStatus, message: string = '') {
    this.status = status;
    this.message = message || status;
  }
}

export class FilesDataWSActionOutputDto<
  T extends unknown | undefined = undefined,
> {
  action: WebSocketActions;
  data: FilesDataWSOutputDto<T>;

  constructor(
    action?: WebSocketActions | null,
    data?: FilesDataWSOutputDto<T>,
  ) {
    this.action = action || WebSocketActions.UNKNOWN_ACTION;
    this.data = data || new FilesDataWSOutputDto(WSApiStatus.ERROR);
  }

  stringify(pretty: boolean = true): string {
    if (pretty) {
      return JSON.stringify(this, null, 2);
    }
    return JSON.stringify(this);
  }

  dataStringify(pretty: boolean = true): string {
    if (pretty) {
      return JSON.stringify(this.data, null, 2);
    }
    return JSON.stringify(this.data);
  }
}
