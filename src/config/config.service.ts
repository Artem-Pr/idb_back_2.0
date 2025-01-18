import { Injectable } from '@nestjs/common';

import {
  DEFAULT_DB_NAME,
  DEFAULT_DB_SYNCHRONIZE,
  DEFAULT_HOST,
  DEFAULT_IMAGE_STORE_SERVICE_HOST,
  DEFAULT_IMAGE_STORE_SERVICE_PORT,
  DEFAULT_MONGODB_URI,
  DEFAULT_PORT,
  DEFAULT_WS_HOST,
  DEFAULT_WS_PORT,
  Envs,
  Folders,
  MainDir,
  MainDirPath,
  MainDirPaths,
  Protocols,
  defaultHost,
} from 'src/common/constants';
import type { DBFilePath } from 'src/common/types';

export type Host = `${Protocols}://${typeof defaultHost}`;
export type StaticHost =
  `${Protocols.HTTP | Protocols.HTTPS}://${typeof defaultHost}`;
export type StaticWSHost = `${Protocols.WS}://${typeof defaultHost}`;
export type Domain = `${Host}${`:${number}` | ''}`;
export type StaticDomain = `${StaticHost}${`:${number}` | ''}`;
export type StaticPath<T extends DBFilePath = DBFilePath> =
  `${StaticDomain}/${MainDir}${T}`;

const isValidPort = (
  port: string | number | undefined,
  warningPortName: string,
  defaultPort: number,
): boolean => {
  if (port === undefined || port === null || port === '') {
    console.warn(
      `No ${warningPortName} provided, using default ${defaultPort} port`,
    );
    return false;
  }

  const parsedPort = Number(port);
  if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    console.warn(
      `Invalid ${warningPortName} provided: ${port}, using default ${defaultPort} port`,
    );
    return false;
  } else {
    return true;
  }
};

@Injectable()
export class ConfigService {
  private _port: number = DEFAULT_PORT;
  private _host: StaticHost = DEFAULT_HOST;
  private _WSPort: number = DEFAULT_WS_PORT;
  private _WSHost: StaticWSHost = DEFAULT_WS_HOST;
  private _nodeEnv: Envs = Envs.DEV;
  private _mongoDBUrl: string = DEFAULT_MONGODB_URI;
  private _dbName: string = DEFAULT_DB_NAME;
  private _dbSynchronize: boolean = DEFAULT_DB_SYNCHRONIZE;
  private _imageStoreServicePort: number = DEFAULT_IMAGE_STORE_SERVICE_PORT;
  private _imageStoreServiceHost: string = DEFAULT_IMAGE_STORE_SERVICE_HOST;

  set port(port: string | number | undefined) {
    if (isValidPort(port, 'port', DEFAULT_PORT)) {
      this._port = Number(port);
    } else {
      this._port = DEFAULT_PORT;
    }
  }
  get port(): number {
    return this._port;
  }

  set host(host: StaticHost | undefined) {
    if (!host) {
      console.warn(`No host provided, using default ${DEFAULT_HOST} host`);
      this._host = DEFAULT_HOST;
    } else {
      this._host = host;
    }
  }

  get host(): StaticHost {
    return this._host;
  }

  set wsPort(wsPort: string | number | undefined) {
    if (isValidPort(wsPort, 'ws port', DEFAULT_WS_PORT)) {
      this._WSPort = Number(wsPort);
    } else {
      this._WSPort = DEFAULT_WS_PORT;
    }
  }

  get wsPort(): number {
    return this._WSPort;
  }

  set wsHost(wsHost: StaticWSHost | undefined) {
    if (!wsHost) {
      console.warn(
        `No ws host provided, using default ${DEFAULT_WS_HOST} host`,
      );
      this._WSHost = DEFAULT_WS_HOST;
    } else {
      this._WSHost = wsHost;
    }
  }

  get wsHost(): StaticWSHost {
    return this._WSHost;
  }

  get domain(): StaticDomain {
    if (
      (this._host.startsWith(`${Protocols.HTTP}://`) && this._port === 80) ||
      (this._host.startsWith(`${Protocols.HTTPS}://`) && this._port === 443)
    ) {
      return this._host;
    }
    return `${this._host}:${this._port}`;
  }

  set nodeEnv(nodeEnv: Envs | string | undefined) {
    if (Object.values(Envs).includes(nodeEnv as Envs)) {
      this._nodeEnv = nodeEnv as Envs;
    } else {
      console.warn(
        `Invalid environment provided: ${nodeEnv}, using default ${Envs.DEV} environment`,
      );
      this._nodeEnv = Envs.DEV;
    }
  }
  get nodeEnv(): Envs {
    return this._nodeEnv;
  }

  get rootPaths(): (typeof Folders)[Envs] {
    return Folders[this.nodeEnv];
  }

  get mainDirPath(): MainDirPath {
    return MainDirPaths[this.nodeEnv];
  }

  set mongoDBUrl(mongoDBUrl: string | undefined) {
    if (!mongoDBUrl) {
      console.warn(
        `No mongodb url provided, using default ${DEFAULT_MONGODB_URI} url`,
      );
      this._mongoDBUrl = DEFAULT_MONGODB_URI;
    } else {
      this._mongoDBUrl = mongoDBUrl;
    }
  }
  get mongoDBUrl(): string {
    return this._mongoDBUrl;
  }

  set dbName(dbName: string | undefined) {
    if (!dbName) {
      console.warn(
        `No database name provided, using default ${DEFAULT_DB_NAME}`,
      );
      this._dbName = DEFAULT_DB_NAME;
    } else {
      this._dbName = dbName;
    }
  }
  get dbName(): string {
    return this._dbName;
  }

  set dbSynchronize(dbSynchronize: boolean | string | undefined) {
    if (typeof dbSynchronize === 'boolean') {
      this._dbSynchronize = dbSynchronize;
    } else if (dbSynchronize?.toLowerCase() === 'true') {
      this._dbSynchronize = true;
    } else if (dbSynchronize?.toLowerCase() === 'false') {
      this._dbSynchronize = false;
    } else {
      console.warn(
        `Invalid database synchronization flag provided: ${dbSynchronize}, defaulting to ${DEFAULT_DB_SYNCHRONIZE}`,
      );
      this._dbSynchronize = DEFAULT_DB_SYNCHRONIZE;
    }
  }
  get dbSynchronize(): boolean {
    return this._dbSynchronize;
  }

  set imageStoreServicePort(
    imageStoreServicePort: number | string | undefined,
  ) {
    if (
      isValidPort(
        imageStoreServicePort,
        'image store service port',
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      )
    ) {
      this._imageStoreServicePort = Number(imageStoreServicePort);
    } else {
      this._imageStoreServicePort = DEFAULT_IMAGE_STORE_SERVICE_PORT;
    }
  }
  get imageStoreServicePort(): number {
    return this._imageStoreServicePort;
  }

  set imageStoreServiceHost(imageStoreServiceHost: string | undefined) {
    if (!imageStoreServiceHost) {
      console.warn(
        `No image store service host provided, using default ${DEFAULT_IMAGE_STORE_SERVICE_HOST} host`,
      );
      this._imageStoreServiceHost = DEFAULT_IMAGE_STORE_SERVICE_HOST;
    } else {
      this._imageStoreServiceHost = imageStoreServiceHost;
    }
  }
  get imageStoreServiceHost(): string {
    return this._imageStoreServiceHost;
  }

  get imageStoreServiceUrl(): string {
    return `${this.imageStoreServiceHost}:${this.imageStoreServicePort}`;
  }
}
