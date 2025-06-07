# zombienet-tests

Run zombienet tests via Docker:
```shell
# At project root folder
docker build -t dedot-zombienet --progress=plain --platform linux/amd64 --file=./zombienet-tests/Dockerfile --target=test .
```
