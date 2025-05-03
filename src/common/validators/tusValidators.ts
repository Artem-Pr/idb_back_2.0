import { CustomLogger } from 'src/logger/logger.service';
import { IsValidMimeType as IsValidMimeTypeClass } from './isValidMimeType';
import { HttpStatus } from '@nestjs/common';
import { IsValidFileName as IsValidFileNameClass } from './isValidFileName';
import type { FileNameWithExt, SupportedMimetypes } from '../types';

const logger = new CustomLogger('TusValidators');

const tusThrowError = (error: any): void => {
  logger.logError({
    message: error.message,
    errorData: error,
  });

  throw {
    status_code: error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    body: error.message || 'Something went wrong',
  };
};

export function validateMimeType(
  mimeType: string,
  errorMessage?: string,
): asserts mimeType is SupportedMimetypes['allFiles'] {
  try {
    const validator = new IsValidMimeTypeClass();
    validator.validate(mimeType, errorMessage);
  } catch (error) {
    tusThrowError(error);
  }
}

export function validateFileName(
  fileName: string,
  errorMessage?: string,
): asserts fileName is FileNameWithExt {
  try {
    const validator = new IsValidFileNameClass();
    validator.validate(fileName, errorMessage);
  } catch (error) {
    tusThrowError(error);
  }
}
