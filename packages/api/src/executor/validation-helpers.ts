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
  type: 'runtimeApi' | 'viewFunction' | 'storage';
}

/**
 * Build a comprehensive API compatibility error with detailed information
 */
export function buildCompatibilityError(
  originalError: Error,
  params: ParamSpec[],
  args: any[],
  context: ValidationContext,
  registry: TypeRegistry,
): ApiCompatibilityError {
  const lines: string[] = [];

  // Header
  lines.push(`API Compatibility Error: ${context.apiName}`);
  lines.push('');

  // Check parameter count mismatch
  if (args.length !== params.length) {
    lines.push(
      `Expected ${params.length} parameter${params.length !== 1 ? 's' : ''} but received ${args.length}`,
    );
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
      paramErrors.push(`  [${i}] (unexpected)`);
      continue;
    }

    if (value === undefined && i >= args.length) {
      // Missing argument
      paramErrors.push(`  [${i}] ${param.name}: missing`);
      continue;
    }

    // Try to validate the parameter
    try {
      const $codec = findCodec(param, registry);
      if ($codec) {
        $codec.assert?.(value);
        // Valid parameter
        paramErrors.push(`  [${i}] ${param.name}: ✓ valid`);
      }
    } catch (error) {
      // Invalid parameter
      paramErrors.push(`  [${i}] ${param.name}: ✗ invalid input type`);
    }
  }

  if (paramErrors.length > 0) {
    lines.push('Parameters:');
    lines.push(...paramErrors);
    lines.push('');
  }

  // Add suggestion
  lines.push('This may indicate your API definitions are outdated.');
  lines.push('Consider regenerating chain types with:');
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
