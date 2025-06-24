import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysEventEmitterService } from './exif-keys-event-emitter.service';

describe('ExifKeysEventEmitterService', () => {
  let service: ExifKeysEventEmitterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExifKeysEventEmitterService],
    }).compile();

    service = module.get<ExifKeysEventEmitterService>(
      ExifKeysEventEmitterService,
    );
  });

  afterEach(() => {
    // Clear all listeners after each test to prevent interference
    service.getEventNames().forEach((eventName) => {
      service.removeAllListeners(eventName);
    });
  });

  describe('emit and on', () => {
    it('should emit event to registered listener', () => {
      // Arrange
      const mockHandler = jest.fn();
      const eventData = { message: 'test' };
      const eventName = 'test.event';

      service.on(eventName, mockHandler);

      // Act
      service.emit(eventName, eventData);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(eventData);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should emit event to multiple listeners', () => {
      // Arrange
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const eventData = { message: 'test' };
      const eventName = 'test.event';

      service.on(eventName, mockHandler1);
      service.on(eventName, mockHandler2);

      // Act
      service.emit(eventName, eventData);

      // Assert
      expect(mockHandler1).toHaveBeenCalledWith(eventData);
      expect(mockHandler2).toHaveBeenCalledWith(eventData);
      expect(mockHandler1).toHaveBeenCalledTimes(1);
      expect(mockHandler2).toHaveBeenCalledTimes(1);
    });

    it('should not emit to unregistered events', () => {
      // Arrange
      const mockHandler = jest.fn();
      const eventData = { message: 'test' };

      service.on('test.event', mockHandler);

      // Act
      service.emit('different.event', eventData);

      // Assert
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle multiple emissions to same listener', () => {
      // Arrange
      const mockHandler = jest.fn();
      const eventName = 'test.event';

      service.on(eventName, mockHandler);

      // Act
      service.emit(eventName, { count: 1 });
      service.emit(eventName, { count: 2 });

      // Assert
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockHandler).toHaveBeenNthCalledWith(1, { count: 1 });
      expect(mockHandler).toHaveBeenNthCalledWith(2, { count: 2 });
    });

    it('should handle errors in event handlers without stopping other handlers', () => {
      // Arrange
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();
      const eventName = 'test.event';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.on(eventName, errorHandler);
      service.on(eventName, goodHandler);

      // Act
      service.emit(eventName, { data: 'test' });

      // Assert
      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler for test.event'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('off', () => {
    it('should remove specific handler', () => {
      // Arrange
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const eventName = 'test.event';

      service.on(eventName, mockHandler1);
      service.on(eventName, mockHandler2);

      // Act
      service.off(eventName, mockHandler1);
      service.emit(eventName, { data: 'test' });

      // Assert
      expect(mockHandler1).not.toHaveBeenCalled();
      expect(mockHandler2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle removing non-existent handler', () => {
      // Arrange
      const mockHandler = jest.fn();
      const nonExistentHandler = jest.fn();
      const eventName = 'test.event';

      service.on(eventName, mockHandler);

      // Act
      service.off(eventName, nonExistentHandler);
      service.emit(eventName, { data: 'test' });

      // Assert
      expect(mockHandler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle removing handler from non-existent event', () => {
      // Arrange
      const mockHandler = jest.fn();

      // Act & Assert
      expect(() => {
        service.off('non.existent.event', mockHandler);
      }).not.toThrow();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      // Arrange
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const eventName = 'test.event';

      service.on(eventName, mockHandler1);
      service.on(eventName, mockHandler2);

      // Act
      service.removeAllListeners(eventName);
      service.emit(eventName, { data: 'test' });

      // Assert
      expect(mockHandler1).not.toHaveBeenCalled();
      expect(mockHandler2).not.toHaveBeenCalled();
    });

    it('should not affect other events', () => {
      // Arrange
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();

      service.on('event1', mockHandler1);
      service.on('event2', mockHandler2);

      // Act
      service.removeAllListeners('event1');
      service.emit('event1', { data: 'test1' });
      service.emit('event2', { data: 'test2' });

      // Assert
      expect(mockHandler1).not.toHaveBeenCalled();
      expect(mockHandler2).toHaveBeenCalledWith({ data: 'test2' });
    });

    it('should handle removing listeners from non-existent event', () => {
      // Act & Assert
      expect(() => {
        service.removeAllListeners('non.existent.event');
      }).not.toThrow();
    });
  });

  describe('getEventNames', () => {
    it('should return empty array when no events registered', () => {
      // Act
      const eventNames = service.getEventNames();

      // Assert
      expect(eventNames).toEqual([]);
    });

    it('should return registered event names', () => {
      // Arrange
      const mockHandler = jest.fn();
      service.on('event1', mockHandler);
      service.on('event2', mockHandler);

      // Act
      const eventNames = service.getEventNames();

      // Assert
      expect(eventNames).toContain('event1');
      expect(eventNames).toContain('event2');
      expect(eventNames).toHaveLength(2);
    });

    it('should not include events that had all listeners removed', () => {
      // Arrange
      const mockHandler = jest.fn();
      service.on('event1', mockHandler);
      service.on('event2', mockHandler);
      service.removeAllListeners('event1');

      // Act
      const eventNames = service.getEventNames();

      // Assert
      expect(eventNames).not.toContain('event1');
      expect(eventNames).toContain('event2');
      expect(eventNames).toHaveLength(1);
    });
  });

  describe('getListenerCount', () => {
    it('should return 0 for non-existent event', () => {
      // Act
      const count = service.getListenerCount('non.existent');

      // Assert
      expect(count).toBe(0);
    });

    it('should return correct listener count', () => {
      // Arrange
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const eventName = 'test.event';

      service.on(eventName, mockHandler1);
      service.on(eventName, mockHandler2);

      // Act
      const count = service.getListenerCount(eventName);

      // Assert
      expect(count).toBe(2);
    });

    it('should update count when listeners are removed', () => {
      // Arrange
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const eventName = 'test.event';

      service.on(eventName, mockHandler1);
      service.on(eventName, mockHandler2);

      // Act
      service.off(eventName, mockHandler1);
      const count = service.getListenerCount(eventName);

      // Assert
      expect(count).toBe(1);
    });

    it('should return 0 after all listeners removed', () => {
      // Arrange
      const mockHandler = jest.fn();
      const eventName = 'test.event';

      service.on(eventName, mockHandler);
      service.removeAllListeners(eventName);

      // Act
      const count = service.getListenerCount(eventName);

      // Assert
      expect(count).toBe(0);
    });
  });
});
