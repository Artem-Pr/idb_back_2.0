import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { SortingObject } from 'src/files/types';
import { Sort, SortingFields } from 'src/files/types';

@ValidatorConstraint({ async: false })
export class IsValidSortingConstraint implements ValidatorConstraintInterface {
  fieldNameWithError: string | undefined = undefined;
  errorType: 'field' | 'format' | undefined = undefined;

  validate(sorting?: SortingObject): boolean {
    if (!sorting) {
      return true;
    }

    const isCorrectSort = Object.keys(sorting).every((key) => {
      const isCorrectField = Object.values(SortingFields).includes(key);
      if (!isCorrectField) {
        this.fieldNameWithError = key;
        return false;
      }
      return true;
    });

    if (!isCorrectSort) {
      this.errorType = 'field';
      return false;
    }

    const isCorrectField = Object.entries(sorting).every(([key, value]) => {
      const isCorrectSort = value === Sort.ASC || value === Sort.DESC;
      if (!isCorrectSort) {
        this.fieldNameWithError = key;
        return false;
      }
      return true;
    });

    if (!isCorrectField) {
      this.errorType = 'format';
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return `Sorting ${this.errorType} is not supported. Wrong field: ${this.fieldNameWithError}`;
  }
}

export function IsValidSorting(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      propertyName: propertyName,
      target: object.constructor,
      options: validationOptions,
      constraints: [],
      validator: IsValidSortingConstraint,
    });
  };
}