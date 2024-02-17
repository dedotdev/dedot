import { AssertState, createShape, metadata, Shape, ShapeDecodeError, ShapeEncodeError } from 'subshape';

export type Result<OK, KO> = { isOk: true; isErr?: false; value: OK } | { isOk?: false; isErr: true; err: KO };

export function Result<TI, TO, UI, UO>($ok: Shape<TI, TO>, $err: Shape<UI, UO>): Shape<Result<TI, UI>, Result<TO, UO>> {
  return createShape({
    metadata: metadata('$.Result', Result, $ok, $err),
    staticSize: 1 + Math.max($ok.staticSize, $err.staticSize),
    subEncode(buffer, value) {
      if (value.isOk !== undefined) {
        buffer.array[buffer.index++] = value.isOk ? 0 : 1;
      } else if (value.isErr !== undefined) {
        buffer.array[buffer.index++] = value.isErr ? 1 : 0;
      } else {
        throw new ShapeEncodeError(this, buffer, 'Invalid result discriminant');
      }

      if (value.isOk || !value.isErr) {
        $ok.subEncode(buffer, value.value as TI);
      } else {
        $err.subEncode(buffer, value.err as UI);
      }
    },
    subDecode(buffer): Result<TO, UO> {
      switch (buffer.array[buffer.index++]) {
        case 0: {
          return {
            isOk: true,
            isErr: false,
            value: $ok.subDecode(buffer),
          };
        }
        case 1: {
          return {
            isOk: false,
            isErr: true,
            err: $err.subDecode(buffer),
          };
        }
        default: {
          throw new ShapeDecodeError(this, buffer, 'Result discriminant neither 0 nor 1');
        }
      }
    },
    subAssert(assert: AssertState) {
      const value = assert.value as Result<any, any>;
      if (value.isOk === true) {
        $ok.subAssert(value.value);
      } else if (value.isErr === true) {
        $err.subAssert(value.err);
      }
    },
  });
}
