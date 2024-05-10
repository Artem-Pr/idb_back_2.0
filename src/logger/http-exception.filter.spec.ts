import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch an HttpException and respond with the proper status and message', () => {
    const mockException = new HttpException(
      'Test error',
      HttpStatus.BAD_REQUEST,
    );
    const mockJson = jest.fn();
    const mockStatus = jest.fn(() => ({
      json: mockJson,
    }));
    const mockGetResponse = jest.fn(() => ({
      status: mockStatus,
    }));
    const mockGetRequest = jest.fn(() => ({
      url: '/test',
    }));
    const mockSwitchToHttp = jest.fn(() => ({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    }));
    const mockArgumentsHost: Partial<ArgumentsHost> = {
      switchToHttp: mockSwitchToHttp as any,
    };

    filter.catch(mockException, mockArgumentsHost as ArgumentsHost);

    expect(mockSwitchToHttp).toHaveBeenCalled();
    expect(mockGetResponse).toHaveBeenCalled();
    expect(mockGetRequest).toHaveBeenCalled();
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: expect.any(String),
      path: '/test',
      message: 'Test error',
    });
  });
});
