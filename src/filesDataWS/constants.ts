export enum WebSocketActions {
  CREATE_PREVIEWS = 'CREATE_PREVIEWS',
  CREATE_PREVIEWS_STOP = 'CREATE_PREVIEWS_STOP',
  FILES_TEST = 'FILES_TEST',
  SYNC_PREVIEWS = 'SYNC_PREVIEWS',
  UNKNOWN_ACTION = 'UNKNOWN_ACTION',
  UPDATE_EXIF = 'UPDATE_EXIF',
  UPDATE_EXIF_STOP = 'UPDATE_EXIF_STOP',
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
