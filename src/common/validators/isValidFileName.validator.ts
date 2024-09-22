import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { isSupportedExtension } from '../fileNameHelpers';
import type { FileNameWithExt } from '../types';

@ValidatorConstraint({ async: false })
export class IsValidFileNameConstraint implements ValidatorConstraintInterface {
  validate(fileName: FileNameWithExt) {
    return isSupportedExtension(fileName) && !fileName.startsWith('/');
  }

  defaultMessage() {
    return 'The file name is not in a valid format. Remove the leading slash or check the extension and should not be empty.';
  }
}

export const IsValidFileName = (validationOptions?: ValidationOptions) => {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      propertyName: propertyName,
      target: object.constructor,
      options: validationOptions,
      constraints: [],
      validator: IsValidFileNameConstraint,
    });
  };
};
