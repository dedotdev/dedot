import type { TypeRegistry } from '@dedot/codecs';
import type { AnyShape } from '@dedot/shape';
import { ApiCompatibilityError, isNumber } from '@dedot/utils';

/**
 * Parameter specification for validation
 */
export interface ParamSpec {
  name: string;
  typeId?: number;
  codec?: AnyShape;
}

/**
 * Context for error messages
 */
export interface ValidationContext {
  apiName: string;
  registry: TypeRegistry;
  itemIndex?: number;
}

/**
 * Check if a codec is an Option type
 */
export function isOptionCodec(codec: AnyShape): boolean {
  try {
    const metadata = codec?.metadata?.[0];
    return metadata?.name === '$.option';
  } catch {
    return false;
  }
}

/**
 * Check if a parameter is optional (wrapped in Option)
 */
export function isOptionalParam(param: ParamSpec, registry: TypeRegistry): boolean {
  // Check direct codec first
  if (param.codec) {
    return isOptionCodec(param.codec);
  }

  // Check via typeId using registry
  if (isNumber(param.typeId)) {
    try {
      const type = registry.findType(param.typeId);
      return type.typeDef.type === 'Enum' && type.path.join('::') === 'Option';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Pad args array with undefined for missing trailing optional parameters.
 * This allows users to omit optional parameters at the end of the parameter list.
 */
export function padArgsForOptionalParams<T extends ParamSpec>(args: any[], params: T[], registry: TypeRegistry): any[] {
  // If args already match params length, no padding needed
  if (args.length === params.length) {
    return args;
  }

  // If more args than params, validation will fail later
  if (args.length > params.length) {
    return args;
  }

  // Check that all missing parameters are optional
  for (let i = args.length; i < params.length; i++) {
    const param = params[i];
    if (!isOptionalParam(param, registry)) {
      // Required parameter is missing, let the validation fail naturally
      return args;
    }
  }

  // All missing parameters are optional, pad with undefined
  return [...args, ...Array(params.length - args.length).fill(undefined)];
}

/**
 * Format a value for display in error messages
 * Stringifies and truncates to 20 characters max
 */
function formatValue(value: any): string {
  try {
    let str: string;

    if (typeof value === 'string') {
      str = JSON.stringify(value);
    } else if (typeof value === 'undefined') {
      str = 'undefined';
    } else if (value === null) {
      str = 'null';
    } else if (typeof value === 'bigint') {
      str = `${value}n`;
    } else if (typeof value === 'object') {
      // For objects/arrays, use JSON.stringify
      str = JSON.stringify(value);
    } else {
      str = String(value);
    }

    // Truncate to 20 characters
    if (str.length > 20) {
      return str.slice(0, 20) + '...';
    }
    return str;
  } catch {
    return '[complex value]';
  }
}

/**
 * Build a comprehensive API compatibility error with detailed information
 */
export function buildCompatibilityError(
  originalError: Error,
  params: ParamSpec[],
  args: any[],
  context: ValidationContext,
): ApiCompatibilityError {
  const lines: string[] = [];

  // Header
  if (context.itemIndex !== undefined) {
    lines.push(`API Compatibility Error: ${context.apiName} (item ${context.itemIndex})`);
  } else {
    lines.push(`API Compatibility Error: ${context.apiName}`);
  }
  lines.push('');

  // Check parameter count mismatch
  if (args.length !== params.length) {
    lines.push(`Expected ${params.length} parameter${params.length !== 1 ? 's' : ''} but received ${args.length}`);
    lines.push('');
  }

  // Validate each parameter and report errors
  const paramErrors: string[] = [];
  const maxParams = Math.max(args.length, params.length);

  for (let i = 0; i < maxParams; i++) {
    const param = params[i];
    const value = args[i];

    if (!param) {
      // Extra argument provided
      paramErrors.push(`  [${i}] (unexpected) - value: ${formatValue(value)}`);
      continue;
    }

    if (value === undefined && i >= args.length) {
      // Missing argument - check if it's actually optional
      const isOptional = isOptionalParam(param, context.registry);
      if (isOptional) {
        paramErrors.push(`  [${i}] ${param.name}: omitted (optional)`);
      } else {
        paramErrors.push(`  [${i}] ${param.name}: ✗ required parameter missing - value: undefined`);
      }
      continue;
    }

    // Try to validate the parameter
    try {
      const $codec = findCodec(param, context.registry);
      if ($codec) {
        $codec.assert?.(value);
        // Valid parameter
        paramErrors.push(`  [${i}] ${param.name}: ✓ valid`);
      }
    } catch (error) {
      // Invalid parameter
      paramErrors.push(`  [${i}] ${param.name}: ✗ invalid input type - value: ${formatValue(value)}`);
    }
  }

  if (paramErrors.length > 0) {
    lines.push('Parameters:');
    lines.push(...paramErrors);
    lines.push('');
  }

  // Add suggestion
  lines.push('This may indicate your chaintypes definitions are outdated.');
  lines.push('Consider regenerating chaintypes with:');
  lines.push('  npx dedot chaintypes -w <your-chain-endpoint>');

  return new ApiCompatibilityError(lines.join('\n'));
}

/**
 * Find codec for a parameter (internal helper)
 */
function findCodec(param: ParamSpec, registry: TypeRegistry): AnyShape | undefined {
  if (param.codec) return param.codec;
  if (isNumber(param.typeId)) {
    try {
      return registry.findCodec(param.typeId);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
