// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// A minimal contract that is instantiated by the constructor of `Parent`.
contract Child {
    bool public value;

    constructor(bool initValue) {
        value = initValue;
    }
}

/// A contract whose constructor instantiates another contract (`Child`).
/// Deploying `Parent` emits two `Revive.Instantiated` events: the child's first, then the parent's.
contract Parent {
    Child public child;
    uint256 public marker;

    constructor(uint256 initMarker) {
        marker = initMarker;
        child = new Child(true);
    }
}
