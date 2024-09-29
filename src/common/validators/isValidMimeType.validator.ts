import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { SUPPORTED_MIMETYPE_REGEX } from '../constants';

@ValidatorConstraint({ async: false })
export class IsValidMimeTypeConstraint implements ValidatorConstraintInterface {
  validate(mimeType: string): boolean {
    return SUPPORTED_MIMETYPE_REGEX.test(mimeType);
  }

  defaultMessage(): string {
    return 'mimeType is not supported';
  }
}

export function IsValidMimeType(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      propertyName: propertyName,
      target: object.constructor,
      options: validationOptions,
      constraints: [],
      validator: IsValidMimeTypeConstraint,
    });
  };
}
