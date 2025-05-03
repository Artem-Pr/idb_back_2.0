import { HttpException, HttpStatus } from '@nestjs/common';
import { IsValidFileNameConstraint } from './isValidFileName.validator';
import type { FileNameWithExt } from '../types';

export class IsValidFileName extends IsValidFileNameConstraint {
  validate(
    fileName: string,
    errorMessage?: string,
  ): fileName is FileNameWithExt {
    if (super.validate(fileName)) return true;
    this.throwValidationError(errorMessage);
    return false;
  }

  throwValidationError(message?: string) {
    throw new HttpException(
      new Error(message || this.defaultMessage()),
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }
}
