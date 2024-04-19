// Copyright 2017-2024 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { stringCamelCase, stringUpperFirst, stringLowerFirst, stringSnakeCase } from '../cases.js';

describe('cases', () => {
  describe('stringCamelCase', (): void => {
    it('works correctly', (): void => {
      expect(stringCamelCase('Snake_case-...SomethingSomething    spaced')).toBe('snakeCaseSomethingSomethingSpaced');
    });

    it('works correctly for String (class', (): void => {
      expect(stringCamelCase(String('Foo_bar-baz---test-_ spaced....Extra'))).toBe('fooBarBazTestSpacedExtra');
    });

    it('adjusts all-uppercase', (): void => {
      expect(stringCamelCase('DEDUP_KEY_PREFIX')).toEqual('dedupKeyPrefix');
      expect(stringCamelCase(String('DEDUP_KEY_PREFIX'))).toEqual('dedupKeyPrefix');
      expect(stringCamelCase('SOMETHING')).toEqual('something');
      expect(stringCamelCase('NMap')).toEqual('nMap');
    });

    it('adjusts all-uppercase + digits', (): void => {
      expect(stringCamelCase('SS58 PreFIX')).toEqual('ss58PreFIX');
      expect(stringCamelCase('SS58Prefix')).toEqual('ss58Prefix');
      expect(stringCamelCase('UUID64')).toEqual('uuid64');
      expect(stringCamelCase('BLAKE2B')).toEqual('blake2b');
      expect(stringCamelCase('NFTOrder')).toEqual('nftOrder');
      expect(stringCamelCase('EVM')).toEqual('evm');
      expect(stringCamelCase('A')).toEqual('a');
      expect(stringCamelCase('A1')).toEqual('a1');
      expect(stringCamelCase('A1b')).toEqual('a1b');
      expect(stringCamelCase('A1B')).toEqual('a1b');
      expect(stringCamelCase('RawVRFOutput')).toEqual('rawVRFOutput');
    });

    it('adjusts with leading _', (): void => {
      expect(stringCamelCase('_reserved')).toEqual('reserved');
    });

    it('adjusts with minimal chars per part', (): void => {
      expect(stringCamelCase('_a_b_c_def')).toEqual('aBCDef');
    });
  });

  describe('stringLowerFirst', (): void => {
    it("lowers the first letter if it's a capital letter", (): void => {
      expect(stringLowerFirst('ABC')).toBe('aBC');
    });

    it("lowers the first letter if it's a capital letter (String)", (): void => {
      expect(stringLowerFirst(String('ABC'))).toBe('aBC');
    });

    it("lowers the first letter if it's a lowercase letter", (): void => {
      expect(stringLowerFirst('abc')).toBe('abc');
    });

    it('returns undefined as empty', (): void => {
      expect(stringLowerFirst()).toBe('');
    });

    it('returns null as empty', (): void => {
      expect(stringLowerFirst(null)).toBe('');
    });
  });

  describe('stringUpperFirst', (): void => {
    it("uppers the first letter if it's a capital letter", (): void => {
      expect(stringUpperFirst('ABC')).toBe('ABC');
    });

    it("uppers the first letter if it's a lowercase letter", (): void => {
      expect(stringUpperFirst('abc')).toBe('Abc');
    });

    it("uppers the first letter if it's a lowercase letter (String)", (): void => {
      expect(stringUpperFirst(String('abc'))).toBe('Abc');
    });

    it('returns undefined as empty', (): void => {
      expect(stringUpperFirst()).toBe('');
    });

    it('returns null as empty', (): void => {
      expect(stringUpperFirst(null)).toBe('');
    });
  });

  describe('stringSnakeCase', () => {
    it.each([
      { input: 'anExampleWithCamelCase', expected: 'an_example_with_camel_case' },
      { input: 'AnExampleWithPascalCase', expected: 'an_example_with_pascal_case' },
    ])('should turn camelCase or pascalCase string to snakeCase string', ({ input, expected }) => {
      expect(stringSnakeCase(input)).toEqual(expected);
    });
  });
});
