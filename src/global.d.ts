declare namespace TSReset {
  type NonFalsy<T> = Exclude<T, false | 0 | '' | null | undefined | 0n>;

  type WidenLiteral<T> = T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends bigint
          ? bigint
          : T extends symbol
            ? symbol
            : T;
}

interface ReadonlyArray<T> {
  includes(
    searchElement: T | (TSReset.WidenLiteral<T> & {}),
    fromIndex?: number,
  ): boolean;
}

interface Array<T> {
  includes(
    searchElement: T | (TSReset.WidenLiteral<T> & {}),
    fromIndex?: number,
  ): boolean;

  filter<S extends T>(
    predicate: BooleanConstructor,
    thisArg?: any,
  ): TSReset.NonFalsy<S>[];
}

interface ReadonlyArray<T> {
  filter<S extends T>(
    predicate: BooleanConstructor,
    thisArg?: any,
  ): TSReset.NonFalsy<S>[];
}

interface ObjectConstructor {
  keys<T>(obj: T): Array<keyof T>;
  keys<T extends string>(obj: Record<T, any>): string[];
}

type RequiredFields<T, K extends keyof T = keyof T> = Required<Pick<T, K>> &
  Omit<T, K>;

type NonNullableFields<T extends object, P extends keyof T = keyof T> = {
  [K in keyof T]: K extends P ? NonNullable<T[K]> : T[K];
};
