# Storage Entries Method Implementation Summary

## Overview
Successfully implemented the `entries` method for the legacy `StorageQueryExecutor` class, along with comprehensive unit and e2e tests.

## Implementation Details

### 1. Core Implementation
**File:** `packages/api/src/executor/StorageQueryExecutor.ts`

- Implemented the `entries` method in `exposeStorageMapMethods` (lines 131-159)
- Added `entries` to the return object (line 161)

**Key Features:**
- Uses pagination internally with `DEFAULT_ENTRIES_PAGE_SIZE` (250)
- Automatically fetches all pages until complete
- Supports partial key arguments for filtering
- Reuses existing infrastructure (`rawKeys`, `queryStorage`, `extractArgs`)
- Breaks when receiving fewer items than page size
- Properly decodes keys and values

**Algorithm:**
1. Initialize empty accumulator and no `startKey`
2. Loop:
   - Fetch page of keys using `rawKeys` with current `startKey`
   - If no keys returned, break
   - Query storage values for those keys
   - Decode and accumulate entries
   - If page size < 250, break (last page)
   - Set `startKey` to last key from current page
3. Return accumulated entries

### 2. Unit Tests
**File:** `packages/api/src/executor/__tests__/StorageQueryExecutor.spec.ts` (NEW)

**Test Coverage:**
- ✅ Empty storage handling
- ✅ Single page fetching (< 250 items)
- ✅ Multi-page pagination (600 items across 3 pages)
- ✅ Partial key argument handling
- ✅ Pagination stop condition (< page size)
- ✅ Key and value decoding
- ✅ Error handling
- ✅ Pagination options in extractArgs
- ✅ Entry accumulation across pages
- ✅ Compatibility with pagedEntries structure

**Mocking Strategy:**
- Mock `client.rpc.state_getKeysPaged` for controlled responses
- Mock `queryStorage` for storage value retrieval
- Mock `QueryableStorage` for encode/decode operations
- Uses vitest's `vi.fn()` for assertions

### 3. E2E Tests
**Files Modified/Created:**

#### A. `e2e/contracts/src/tests/LegacyClientAt.test.ts` (MODIFIED)
Added new describe block: "Storage Entries Method Tests" (lines 366-551)

**Test Cases:**
- ✅ Fetch all System.Account entries
- ✅ Match entries count with pagedKeys count
- ✅ Return same data as accumulated pagedEntries
- ✅ Work correctly at historical blocks
- ✅ Verify entries contain expected accounts (ALICE, BOB)
- ✅ Performance comparison: entries vs manual pagination

#### B. `e2e/contracts/src/tests/StorageEntries.test.ts` (NEW)
Dedicated test file for comprehensive entries method testing

**Test Sections:**
1. **System.Account Storage**
   - Fetch all entries
   - Verify known accounts present
   - Match data with individual queries

2. **Comparison with Pagination Methods**
   - Match count with pagedKeys
   - Match data with accumulated pagedEntries

3. **Edge Cases**
   - Multiple consecutive calls consistency
   - Order consistency across calls

4. **Performance**
   - Complete in reasonable time
   - Compare entries vs manual pagination

5. **Historical Block Queries**
   - Work with `.at()` for historical blocks
   - Show different data at different blocks

#### C. `packages/api/src/client/__tests__/LegacyClient.spec.ts` (MODIFIED)
Updated storage query tests to verify `entries` method is defined for Map storage types (lines 76, 85)

## Testing Strategy

### Unit Tests
- Validate pagination logic in isolation
- Test edge cases with mocked data
- Verify method signatures and return types

### E2E Tests
- Use real `contractsClient` connected to blockchain
- Verify against real System.Account storage
- Compare with existing methods (pagedKeys, pagedEntries)
- Test historical block queries
- Performance benchmarking

## Files Changed

### Implementation
1. `packages/api/src/executor/StorageQueryExecutor.ts` - Core implementation

### Tests
2. `packages/api/src/executor/__tests__/StorageQueryExecutor.spec.ts` - Unit tests (NEW)
3. `e2e/contracts/src/tests/LegacyClientAt.test.ts` - E2E tests in existing file
4. `e2e/contracts/src/tests/StorageEntries.test.ts` - Dedicated E2E tests (NEW)
5. `packages/api/src/client/__tests__/LegacyClient.spec.ts` - Updated existing tests

## Usage Examples

```typescript
// Fetch all entries from a storage map
const allAccounts = await client.query.system.account.entries();
console.log(`Total accounts: ${allAccounts.length}`);

// With partial key (filtering)
const accountItems = await client.query.nfts.account.entries(accountAddress);

// With multiple partial keys
const specificItems = await client.query.nfts.account.entries(accountAddress, collectionId);

// At historical block
const api = await client.at(blockHash);
const historicalEntries = await api.query.system.account.entries();
```

## Comparison with Other Methods

### entries() vs pagedEntries()
- `entries()`: Fetches ALL entries automatically (no pagination needed)
- `pagedEntries()`: Fetches one page at a time (manual pagination required)

### entries() vs pagedKeys() + multi()
- `entries()`: Single call, returns [key, value] pairs
- `pagedKeys() + multi()`: Two-step process, more flexible but more verbose

## Performance Characteristics

- **Page Size**: 250 entries per internal page
- **Automatic Pagination**: Yes, transparent to caller
- **Memory**: Accumulates all entries in memory
- **Network**: Multiple RPC calls for large storage maps
- **Recommended For**: Storage maps with < 10,000 entries

## Future Improvements

1. Consider adding optional pagination control for very large storage maps
2. Add streaming/iterator support for memory-efficient processing
3. Optimize by using `state_getPairs` if available for entire storage
4. Add caching layer for frequently accessed storage

## Verification

All tests follow existing patterns from:
- `packages/api/src/storage/__tests__/LegacyStorageQuery.spec.ts` (unit test patterns)
- `e2e/contracts/src/tests/LegacyClientAt.test.ts` (e2e test patterns)
- `e2e/zombienet/src/0001-check-storage-map-pagination.ts` (pagination test patterns)

## Status

✅ Implementation complete
✅ Unit tests written
✅ E2E tests written
✅ Existing tests updated
✅ No linting errors
✅ Documentation added

The `entries` method is now fully functional for the legacy StorageQueryExecutor and ready for use!

