import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { isSupportedExtension } from '../fileNameHelpers';
import type { DBFilePath } from '../types';

@ValidatorConstraint({ async: false })
export class IsValidFilePathConstraint implements ValidatorConstraintInterface {
  validate(filePath: DBFilePath) {
    return isSupportedExtension(filePath) && filePath.startsWith('/');
  }

  defaultMessage() {
    return 'The filePath is not in a valid format. Should contain the leading slash and supported extension and should not be empty.';
  }
}

export const IsValidFilePath = (validationOptions?: ValidationOptions) => {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      propertyName: propertyName,
      target: object.constructor,
      options: validationOptions,
      constraints: [],
      validator: IsValidFilePathConstraint,
    });
  };
};
