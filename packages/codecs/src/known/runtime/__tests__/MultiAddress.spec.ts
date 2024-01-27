import { describe, expect, it } from 'vitest';
import { $MultiAddress } from '../MultiAddress';
import { AccountId32 } from '../../../generic';

describe('MultiAddress', () => {
  it('should decode from address & AccountId32', () => {
    const fromAddress = $MultiAddress.tryEncode('5DUoTNGfoNmWSJNo1LfmqPPhUQpYBNhqGCF52dLjD6K3k5mC');
    const fromAccountId = $MultiAddress.tryEncode(new AccountId32('5DUoTNGfoNmWSJNo1LfmqPPhUQpYBNhqGCF52dLjD6K3k5mC'));
    const fromAccountIdTag = $MultiAddress.tryEncode({
      tag: 'Id',
      value: '5DUoTNGfoNmWSJNo1LfmqPPhUQpYBNhqGCF52dLjD6K3k5mC',
    });

    expect(fromAddress).toEqual(fromAccountId);
    expect(fromAddress).toEqual(fromAccountIdTag);
    expect($MultiAddress.tryDecode(fromAddress)).toEqual($MultiAddress.tryDecode(fromAccountId));
    expect($MultiAddress.tryDecode(fromAddress)).toEqual($MultiAddress.tryDecode(fromAccountIdTag));
  });
});
