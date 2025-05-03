import { HttpException, HttpStatus } from '@nestjs/common';
import { IsValidMimeTypeConstraint } from './isValidMimeType.validator';

export class IsValidMimeType extends IsValidMimeTypeConstraint {
  validate(mimeType: string, errorMessage?: string): boolean {
    if (super.validate(mimeType)) return true;
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
