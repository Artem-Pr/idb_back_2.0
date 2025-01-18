export enum WebSocketActions {
  SYNC_PREVIEWS = 'SYNC_PREVIEWS',
  CREATE_PREVIEWS = 'CREATE_PREVIEWS',
  CREATE_PREVIEWS_STOP = 'CREATE_PREVIEWS_STOP',
  FILES_TEST = 'FILES_TEST',
  UNKNOWN_ACTION = 'UNKNOWN_ACTION',
}

export enum WSApiStatus {
  BUSY = 'busy',
  DONE = 'done',
  ERROR = 'error',
  INIT = 'init',
  PENDING = 'pending',
  PENDING_ERROR = 'pending-error',
  PENDING_SUCCESS = 'pending-success',
  READY = 'ready',
  STOPPED = 'stopped',
}
