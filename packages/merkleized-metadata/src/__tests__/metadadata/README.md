# Getting the metadata

```shell
# Gets the metadata as version 15
echo '{"id":1,"jsonrpc":"2.0","method":"state_call","params":["Metadata_metadata_at_version", "0x0f000000"]}' | websocat -n1 -B 99999999 wss://dot-rpc.stakeworld.io
```

---
Source: https://github.com/bkchr/merkleized-metadata/tree/main/fixtures