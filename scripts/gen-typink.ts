#!/usr/bin/env tsx
import { generateContractTypes, generateSolContractTypes, GeneratedResult } from '@dedot/codegen';
import { ensureSupportedContractMetadataVersion } from '@dedot/contracts';
import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface ProcessResult {
  file: string;
  success: boolean;
  message: string;
  result?: GeneratedResult;
}

async function findContractMetadataFiles(): Promise<string[]> {
  const patterns = [
    // All JSON files in examples folder
    'examples/**/*.json',
    // All JSON files in e2e folder
    // 'e2e/**/*.json',
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: process.cwd() });
    files.push(...matches.map((f) => path.resolve(f)));
  }

  // Filter out non-contract files
  return files.filter((file) => {
    const basename = path.basename(file);
    // Exclude node_modules directory
    if (file.includes('node_modules')) {
      return false;
    }
    // Exclude package.json, tsconfig files, and other non-contract files
    return (
      !basename.startsWith('tsconfig') &&
      basename !== 'package.json' &&
      basename !== 'package-lock.json' &&
      basename !== '.eslintrc.json' &&
      basename !== 'jest.config.json' &&
      basename !== 'abi.ts' &&
      basename.endsWith('.json')
    );
  });
}

function isInkMetadata(metadata: any): boolean {
  return typeof metadata === 'object' && metadata !== null && 'version' in metadata;
}

function isSolidityAbi(metadata: any): boolean {
  return (
    Array.isArray(metadata) &&
    metadata.length > 0 &&
    metadata.some((item: any) => item.type === 'function' || item.type === 'constructor' || item.type === 'event')
  );
}

async function processContractMetadata(metadataFile: string): Promise<ProcessResult> {
  const dirName = path.dirname(metadataFile);

  try {
    console.log(`\n📄 Processing: ${metadataFile}`);

    // Read and parse metadata
    const content = fs.readFileSync(metadataFile, 'utf-8');
    const metadata = JSON.parse(content);

    // Extract contract name from filename
    const contractName = path.basename(metadataFile, '.json');

    // Determine output directory (create a subfolder next to the metadata file)
    const outputDir = path.join(dirName);

    // Settings for generation
    const extension = 'd.ts';
    const subpath = true;

    let result: GeneratedResult;

    if (isInkMetadata(metadata)) {
      // Validate ink! metadata version
      ensureSupportedContractMetadataVersion(metadata);
      console.log(`   ✓ Detected ink! contract (version ${metadata.version})`);

      // Generate ink! contract types
      result = await generateContractTypes(metadata, contractName, outputDir, extension, subpath);
    } else if (isSolidityAbi(metadata)) {
      console.log(`   ✓ Detected Solidity ABI`);

      // Generate Solidity contract types
      result = await generateSolContractTypes(metadata, contractName, outputDir, extension, subpath);
    } else {
      return {
        file: metadataFile,
        success: false,
        message: 'Unknown metadata format (neither ink! nor Solidity ABI)',
      };
    }

    console.log(`   ✓ Generated types in: ${result.outputFolder}`);
    console.log(`   ✓ Interface: ${result.interfaceName}`);

    return {
      file: metadataFile,
      success: true,
      message: 'Successfully generated types',
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ✗ Error: ${errorMessage}`);

    return {
      file: metadataFile,
      success: false,
      message: errorMessage,
    };
  }
}

async function main() {
  console.log('🚀 Starting Typink type generation for all contracts...\n');

  try {
    // Find all contract metadata files
    const files = await findContractMetadataFiles();

    if (files.length === 0) {
      console.log('No contract metadata files found.');
      return;
    }

    console.log(`Found ${files.length} contract metadata file(s):`);
    files.forEach((f) => console.log(`  - ${path.relative(process.cwd(), f)}`));

    // Process each file
    const results: ProcessResult[] = [];
    for (const file of files) {
      const result = await processContractMetadata(file);
      results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ Successfully processed: ${successful.length}`);
    if (successful.length > 0) {
      successful.forEach((r) => {
        console.log(`   - ${path.relative(process.cwd(), r.file)}`);
        if (r.result) {
          console.log(`     → ${path.relative(process.cwd(), r.result.outputFolder)}`);
        }
      });
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed to process: ${failed.length}`);
      failed.forEach((r) => {
        console.log(`   - ${path.relative(process.cwd(), r.file)}`);
        console.log(`     Error: ${r.message}`);
      });
    }

    console.log('\n🎉 Done!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
