import { ConfigService, StaticHost, StaticWSHost } from './config.service';
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
  MainDirPath,
} from 'src/common/constants';

describe('ConfigService', () => {
  let configService: ConfigService;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    configService = new ConfigService();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
  });
  describe('HTTP and WS ports', () => {
    describe('HTTP port', () => {
      it('should return the default HTTP port if no port is set', () => {
        expect(configService.port).toBe(DEFAULT_PORT);
      });

      it('should properly set a valid HTTP port number', () => {
        const validPort = 3001;
        configService.port = validPort;
        expect(configService.port).toBe(validPort);
      });

      it('should accept a string that is a valid HTTP port number', () => {
        const validPort = '3002';
        configService.port = validPort;
        expect(configService.port).toBe(Number(validPort));
      });

      it('should warn and use the default HTTP port when given a non-numeric string', () => {
        const invalidPort = 'notAPort';
        configService.port = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid port provided: ${invalidPort}, using default ${DEFAULT_PORT} port`,
        );
        expect(configService.port).toBe(DEFAULT_PORT);
      });

      it('should warn and use the default HTTP port when given null', () => {
        configService.port = null as any;
        expect(console.warn).toHaveBeenCalledWith(
          `No port provided, using default ${DEFAULT_PORT} port`,
        );
        expect(configService.port).toBe(DEFAULT_PORT);
      });

      it('should warn and use the default HTTP port when given undefined', () => {
        configService.port = undefined;
        expect(console.warn).toHaveBeenCalledWith(
          `No port provided, using default ${DEFAULT_PORT} port`,
        );
        expect(configService.port).toBe(DEFAULT_PORT);
      });

      it('should warn and use the default HTTP port when given an empty string', () => {
        configService.port = '';
        expect(console.warn).toHaveBeenCalledWith(
          `No port provided, using default ${DEFAULT_PORT} port`,
        );
        expect(configService.port).toBe(DEFAULT_PORT);
      });

      it('should warn and use the default HTTP port when given a negative number', () => {
        const invalidPort = -3000;
        configService.port = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid port provided: ${invalidPort}, using default ${DEFAULT_PORT} port`,
        );
        expect(configService.port).toBe(DEFAULT_PORT);
      });

      it('should warn and use the default HTTP port when given a number greater than 65535', () => {
        const invalidPort = 70000;
        configService.port = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid port provided: ${invalidPort}, using default ${DEFAULT_PORT} port`,
        );
        expect(configService.port).toBe(DEFAULT_PORT);
      });

      it('should warn and use the default HTTP port when given zero', () => {
        const invalidPort = 0;
        configService.port = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid port provided: ${invalidPort}, using default ${DEFAULT_PORT} port`,
        );
        expect(configService.port).toBe(DEFAULT_PORT);
      });
    });
    describe('WS port', () => {
      it('should return the default WS port if no port is set', () => {
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });

      it('should properly set a valid WS port number', () => {
        const validPort = 3001;
        configService.wsPort = validPort;
        expect(configService.wsPort).toBe(validPort);
      });

      it('should accept a string that is a valid WS port number', () => {
        const validPort = '3002';
        configService.wsPort = validPort;
        expect(configService.wsPort).toBe(Number(validPort));
      });

      it('should warn and use the default WS port when given a non-numeric string', () => {
        const invalidPort = 'notAPort';
        configService.wsPort = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid ws port provided: ${invalidPort}, using default ${DEFAULT_WS_PORT} port`,
        );
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });

      it('should warn and use the default WS port when given null', () => {
        configService.wsPort = null as any;
        expect(console.warn).toHaveBeenCalledWith(
          `No ws port provided, using default ${DEFAULT_WS_PORT} port`,
        );
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });

      it('should warn and use the default WS port when given undefined', () => {
        configService.wsPort = undefined;
        expect(console.warn).toHaveBeenCalledWith(
          `No ws port provided, using default ${DEFAULT_WS_PORT} port`,
        );
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });

      it('should warn and use the default WS port when given an empty string', () => {
        configService.wsPort = '';
        expect(console.warn).toHaveBeenCalledWith(
          `No ws port provided, using default ${DEFAULT_WS_PORT} port`,
        );
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });

      it('should warn and use the default WS port when given a negative number', () => {
        const invalidPort = -3000;
        configService.wsPort = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid ws port provided: ${invalidPort}, using default ${DEFAULT_WS_PORT} port`,
        );
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });

      it('should warn and use the default WS port when given a number greater than 65535', () => {
        const invalidPort = 70000;
        configService.wsPort = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid ws port provided: ${invalidPort}, using default ${DEFAULT_WS_PORT} port`,
        );
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });

      it('should warn and use the default WS port when given zero', () => {
        const invalidPort = 0;
        configService.wsPort = invalidPort;
        expect(console.warn).toHaveBeenCalledWith(
          `Invalid ws port provided: ${invalidPort}, using default ${DEFAULT_WS_PORT} port`,
        );
        expect(configService.wsPort).toBe(DEFAULT_WS_PORT);
      });
    });
  });
  describe('HTTP and WS hosts', () => {
    describe('HTTP host', () => {
      it('should return the default HTTP host if no HTTP host is set', () => {
        expect(configService.host).toBe(DEFAULT_HOST);
      });

      it('should properly set a valid HTTP host', () => {
        const validHost: StaticHost = 'https://localhost';
        configService.host = validHost;
        expect(configService.host).toBe(validHost);
      });

      it('should warn and use the default HTTP host when given undefined', () => {
        configService.host = undefined;
        expect(console.warn).toHaveBeenCalledWith(
          `No host provided, using default ${DEFAULT_HOST} host`,
        );
        expect(configService.host).toBe(DEFAULT_HOST);
      });

      it('should warn and use the default HTTP host when given null', () => {
        configService.host = null as unknown as StaticHost;
        expect(console.warn).toHaveBeenCalledWith(
          `No host provided, using default ${DEFAULT_HOST} host`,
        );
        expect(configService.host).toBe(DEFAULT_HOST);
      });

      it('should warn and use the default HTTP host when given an empty string', () => {
        configService.host = '' as unknown as StaticHost;
        expect(console.warn).toHaveBeenCalledWith(
          `No host provided, using default ${DEFAULT_HOST} host`,
        );
        expect(configService.host).toBe(DEFAULT_HOST);
      });
    });
    describe('WS host', () => {
      it('should return the default WS host if no WS host is set', () => {
        expect(configService.wsHost).toBe(DEFAULT_WS_HOST);
      });

      it('should properly set a valid WS host', () => {
        const validHost: StaticWSHost = 'ws://localhost';
        configService.wsHost = validHost;
        expect(configService.wsHost).toBe(validHost);
      });

      it('should warn and use the default WS host when given undefined', () => {
        configService.wsHost = undefined;
        expect(console.warn).toHaveBeenCalledWith(
          `No ws host provided, using default ${DEFAULT_WS_HOST} host`,
        );
        expect(configService.wsHost).toBe(DEFAULT_WS_HOST);
      });

      it('should warn and use the default WS host when given null', () => {
        configService.wsHost = null as unknown as StaticWSHost;
        expect(console.warn).toHaveBeenCalledWith(
          `No ws host provided, using default ${DEFAULT_WS_HOST} host`,
        );
        expect(configService.wsHost).toBe(DEFAULT_WS_HOST);
      });

      it('should warn and use the default WS host when given an empty string', () => {
        configService.wsHost = '' as unknown as StaticWSHost;
        expect(console.warn).toHaveBeenCalledWith(
          `No ws host provided, using default ${DEFAULT_WS_HOST} host`,
        );
        expect(configService.wsHost).toBe(DEFAULT_WS_HOST);
      });
    });
  });
  describe('domain', () => {
    it('should return the correct domain with the default port and host', () => {
      expect(configService.domain).toBe(`${DEFAULT_HOST}:${DEFAULT_PORT}`);
    });

    it('should return the correct domain with a custom port', () => {
      const customPort = 4000;
      configService.port = customPort;
      expect(configService.domain).toBe(`${DEFAULT_HOST}:${customPort}`);
    });

    it('should return the correct domain with a custom host', () => {
      const customHost: StaticHost = 'https://localhost';
      configService.host = customHost;
      expect(configService.domain).toBe(`${customHost}:${DEFAULT_PORT}`);
    });

    it('should return the correct domain with both a custom port and host', () => {
      const customPort = 4000;
      const customHost: StaticHost = 'https://localhost';
      configService.port = customPort;
      configService.host = customHost;
      expect(configService.domain).toBe(`${customHost}:${customPort}`);
    });

    it('should not include the port in the domain if the port is the default HTTP port (80)', () => {
      const customHost: StaticHost = 'http://localhost';
      configService.host = customHost;
      configService.port = 80; // Default HTTP port which should be omitted
      expect(configService.domain).toBe(customHost);
    });

    it('should not include the port in the domain if the port is the default HTTPS port (443)', () => {
      const customHost: StaticHost = 'https://localhost';
      configService.host = customHost;
      configService.port = 443; // Default HTTPS port which should be omitted
      expect(configService.domain).toBe(customHost);
    });
  });
  describe('nodeEnv', () => {
    it('should return the default environment if no environment is set', () => {
      expect(configService.nodeEnv).toBe(Envs.DEV);
    });

    it('should properly set a valid environment', () => {
      configService.nodeEnv = Envs.TEST;
      expect(configService.nodeEnv).toBe(Envs.TEST);
    });

    it('should warn and set the default environment when given an invalid environment', () => {
      const invalidEnv = 'invalidEnv';
      configService.nodeEnv = invalidEnv as Envs;
      expect(console.warn).toHaveBeenCalledWith(
        `Invalid environment provided: ${invalidEnv}, using default ${Envs.DEV} environment`,
      );
      expect(configService.nodeEnv).toBe(Envs.DEV);
    });

    it('should warn and set the default environment when given undefined', () => {
      configService.nodeEnv = undefined;
      expect(console.warn).toHaveBeenCalledWith(
        `Invalid environment provided: undefined, using default ${Envs.DEV} environment`,
      );
      expect(configService.nodeEnv).toBe(Envs.DEV);
    });
  });
  describe('rootPaths', () => {
    it('should return development paths when the environment is not set', () => {
      expect(configService.rootPaths).toMatchInlineSnapshot(`
        {
          "previews": "/Volumes/Lexar_SL500/MEGA_sync/IDBase/previews",
          "temp": "/Volumes/Lexar_SL500/MEGA_sync/IDBase/temp",
          "volumes": "/Volumes/Lexar_SL500/MEGA_sync/IDBase/volumes",
        }
      `);
    });

    it('should return test paths when the environment is test', () => {
      configService.nodeEnv = Envs.TEST;
      expect(configService.rootPaths).toEqual({
        temp: 'test-data/temp',
        volumes: 'test-data/volumes',
        previews: 'test-data/previews',
      });
    });

    it('should return production paths when the environment is production', () => {
      configService.nodeEnv = Envs.PROD;
      expect(configService.rootPaths).toEqual(Folders[Envs.PROD]);
      expect(configService.rootPaths).toMatchInlineSnapshot(`
        {
          "previews": "/Users/artempriadkin/Development/test-data/previews",
          "temp": "/Users/artempriadkin/Development/test-data/temp",
          "volumes": "/Users/artempriadkin/Development/test-data/volumes",
        }
      `);
    });

    it('should return docker paths when the environment is docker', () => {
      configService.nodeEnv = Envs.DOCKER;
      expect(configService.rootPaths).toEqual(Folders[Envs.DOCKER]);
    });
  });
  describe('mainDirPath', () => {
    it('should return default directory path when the environment is not set', () => {
      expect(configService.mainDirPath).toBe(MainDirPath.dev);
    });

    it('should return the main directory path based on the current environment', () => {
      configService.nodeEnv = Envs.DEV;
      expect(configService.mainDirPath).toBe(MainDirPath.dev);
    });

    it('should return the main directory path for staging environment', () => {
      configService.nodeEnv = Envs.TEST;
      expect(configService.mainDirPath).toBe(MainDirPath.test);
    });

    it('should return the main directory path for production environment', () => {
      configService.nodeEnv = Envs.PROD;
      expect(configService.mainDirPath).toBe(MainDirPath.prod);
    });

    it('should handle custom environment and return the corresponding main directory path', () => {
      configService.nodeEnv = Envs.DOCKER;
      expect(configService.mainDirPath).toBe(MainDirPath.docker);
    });

    it('should handle edge case of nodeEnv being null and return default development directory path', () => {
      configService.nodeEnv = null as any;
      expect(configService.mainDirPath).toBe(MainDirPath.dev);
    });
  });
  describe('mongoDBUrl', () => {
    it('should return the default MongoDB URL if no URL is set', () => {
      expect(configService.mongoDBUrl).toBe(DEFAULT_MONGODB_URI);
    });

    it('should properly set a custom MongoDB URL', () => {
      const customMongoDBUrl = 'mongodb://customhost:27017/mydb';
      configService.mongoDBUrl = customMongoDBUrl;
      expect(configService.mongoDBUrl).toBe(customMongoDBUrl);
    });

    it('should warn and use the default MongoDB URL when given undefined', () => {
      configService.mongoDBUrl = undefined;
      expect(console.warn).toHaveBeenCalledWith(
        `No mongodb url provided, using default ${DEFAULT_MONGODB_URI} url`,
      );
      expect(configService.mongoDBUrl).toBe(DEFAULT_MONGODB_URI);
    });
  });
  describe('dbName', () => {
    it('should return the default database name if no name is set', () => {
      expect(configService.dbName).toBe(DEFAULT_DB_NAME);
    });

    it('should properly set a custom database name', () => {
      const customDbName = 'CustomDB';
      configService.dbName = customDbName;
      expect(configService.dbName).toBe(customDbName);
    });

    it('should warn and use the default database name when given undefined', () => {
      configService.dbName = undefined;
      expect(console.warn).toHaveBeenCalledWith(
        `No database name provided, using default ${DEFAULT_DB_NAME}`,
      );
      expect(configService.dbName).toBe(DEFAULT_DB_NAME);
    });
  });
  describe('dbSynchronize', () => {
    it('should return the default DB synchronize value if no value is set', () => {
      expect(configService.dbSynchronize).toBe(DEFAULT_DB_SYNCHRONIZE);
    });

    it('should properly set DB synchronize to true', () => {
      configService.dbSynchronize = true;
      expect(configService.dbSynchronize).toBe(true);
    });

    it('should properly set DB synchronize to false', () => {
      configService.dbSynchronize = false;
      expect(configService.dbSynchronize).toBe(false);
    });

    it('should properly interpret string "true" as boolean true', () => {
      configService.dbSynchronize = 'true';
      expect(configService.dbSynchronize).toBe(true);
    });

    it('should properly interpret string "false" as boolean false', () => {
      configService.dbSynchronize = 'false';
      expect(configService.dbSynchronize).toBe(false);
    });

    it('should warn and use the default DB synchronize value when given an invalid value', () => {
      configService.dbSynchronize = 'invalidValue' as unknown as boolean;
      expect(console.warn).toHaveBeenCalledWith(
        `Invalid database synchronization flag provided: invalidValue, defaulting to ${DEFAULT_DB_SYNCHRONIZE}`,
      );
      expect(configService.dbSynchronize).toBe(DEFAULT_DB_SYNCHRONIZE);
    });
  });
  describe('imageStoreServicePort', () => {
    it('should return the default image store service port if no port is set', () => {
      configService.imageStoreServicePort = undefined;
      expect(configService.imageStoreServicePort).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      );
    });

    it('should properly set a valid image store service port number', () => {
      const validPort = 3001;
      configService.imageStoreServicePort = validPort;
      expect(configService.imageStoreServicePort).toBe(validPort);
    });

    it('should accept a string that is a valid image store service port number', () => {
      const validPort = '3002';
      configService.imageStoreServicePort = validPort;
      expect(configService.imageStoreServicePort).toBe(Number(validPort));
    });

    it('should warn and use the default image store service port when given a non-numeric string', () => {
      const invalidPort = 'notAPort';
      configService.imageStoreServicePort = invalidPort;
      expect(console.warn).toHaveBeenCalledWith(
        `Invalid image store service port provided: ${invalidPort}, using default ${DEFAULT_IMAGE_STORE_SERVICE_PORT} port`,
      );
      expect(configService.imageStoreServicePort).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      );
    });

    it('should warn and use the default image store service port when given null', () => {
      configService.imageStoreServicePort = null as any;
      expect(console.warn).toHaveBeenCalledWith(
        `No image store service port provided, using default ${DEFAULT_IMAGE_STORE_SERVICE_PORT} port`,
      );
      expect(configService.imageStoreServicePort).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      );
    });

    it('should warn and use the default image store service port when given an empty string', () => {
      configService.imageStoreServicePort = '';
      expect(console.warn).toHaveBeenCalledWith(
        `No image store service port provided, using default ${DEFAULT_IMAGE_STORE_SERVICE_PORT} port`,
      );
      expect(configService.imageStoreServicePort).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      );
    });

    it('should warn and use the default image store service port when given a negative number', () => {
      const invalidPort = -3000;
      configService.imageStoreServicePort = invalidPort;
      expect(console.warn).toHaveBeenCalledWith(
        `Invalid image store service port provided: ${invalidPort}, using default ${DEFAULT_IMAGE_STORE_SERVICE_PORT} port`,
      );
      expect(configService.imageStoreServicePort).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      );
    });

    it('should warn and use the default image store service port when given a number greater than 65535', () => {
      const invalidPort = 70000;
      configService.imageStoreServicePort = invalidPort;
      expect(console.warn).toHaveBeenCalledWith(
        `Invalid image store service port provided: ${invalidPort}, using default ${DEFAULT_IMAGE_STORE_SERVICE_PORT} port`,
      );
      expect(configService.imageStoreServicePort).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      );
    });

    it('should warn and use the default image store service port when given zero', () => {
      const invalidPort = 0;
      configService.imageStoreServicePort = invalidPort;
      expect(console.warn).toHaveBeenCalledWith(
        `Invalid image store service port provided: ${invalidPort}, using default ${DEFAULT_IMAGE_STORE_SERVICE_PORT} port`,
      );
      expect(configService.imageStoreServicePort).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_PORT,
      );
    });
  });
  describe('imageStoreServiceHost', () => {
    it('should return the default image store service host if no host is set', () => {
      configService.imageStoreServiceHost = undefined;
      expect(configService.imageStoreServiceHost).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_HOST,
      );
    });

    it('should properly set a valid image store service host', () => {
      const validHost = 'http://validhost.com';
      configService.imageStoreServiceHost = validHost;
      expect(configService.imageStoreServiceHost).toBe(validHost);
    });

    it('should warn and use the default image store service host when given undefined', () => {
      configService.imageStoreServiceHost = undefined;
      expect(console.warn).toHaveBeenCalledWith(
        `No image store service host provided, using default ${DEFAULT_IMAGE_STORE_SERVICE_HOST} host`,
      );
      expect(configService.imageStoreServiceHost).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_HOST,
      );
    });

    it('should warn and use the default image store service host when given an empty string', () => {
      configService.imageStoreServiceHost = '';
      expect(console.warn).toHaveBeenCalledWith(
        `No image store service host provided, using default ${DEFAULT_IMAGE_STORE_SERVICE_HOST} host`,
      );
      expect(configService.imageStoreServiceHost).toBe(
        DEFAULT_IMAGE_STORE_SERVICE_HOST,
      );
    });
  });
  describe('imageStoreServiceUrl', () => {
    it('should return the correct image store service URL with the default host and port', () => {
      expect(configService.imageStoreServiceUrl).toBe(
        `${DEFAULT_IMAGE_STORE_SERVICE_HOST}:${DEFAULT_IMAGE_STORE_SERVICE_PORT}`,
      );
    });

    it('should return the correct image store service URL with a custom port', () => {
      const customPort = 4002;
      configService.imageStoreServicePort = customPort;
      expect(configService.imageStoreServiceUrl).toBe(
        `${DEFAULT_IMAGE_STORE_SERVICE_HOST}:${customPort}`,
      );
    });

    it('should return the correct image store service URL with a custom host', () => {
      const customHost = 'http://customimagestore';
      configService.imageStoreServiceHost = customHost;
      expect(configService.imageStoreServiceUrl).toBe(
        `${customHost}:${DEFAULT_IMAGE_STORE_SERVICE_PORT}`,
      );
    });
  });
});
