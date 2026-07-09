# Apollo gRPC stubs

`gen/` holds **generated** TypeScript stubs for Apollo's `ObjectApi` — do not
edit them by hand. They are produced by `ts-proto` (grpc-js output) from the
Apollo contract, which is the single source of truth in the
[Lexicon](https://github.com/vezril/the-lexicon)
(`src/main/protobuf/apollostorage/grpc/object_api.proto`).

The `.proto` is **not** fork-copied into this repo. `scripts/fetch-proto.sh`
materializes it at a pinned Lexicon ref into `proto/` (gitignored); the
generated stubs in `gen/` are committed so CI and the Docker build need no proto
toolchain.

## Regenerate

```bash
npm run proto:gen     # fetch pinned proto + buf generate
```

To adopt a newer contract version, bump `LEXICON_REF` in
`scripts/fetch-proto.sh`, run the command above, then commit the regenerated
`gen/` output. Config lives in `buf.yaml` / `buf.gen.yaml`.

## What's generated

- `ObjectApiClient` — a `@grpc/grpc-js` client constructor
  (`new ObjectApiClient(address, credentials, options)`), used by the BFF client
  factory (task 2.2).
- `ObjectApiService` — the service definition (streaming flags: `PutObject`
  client-stream, `GetObject` server-stream).
- Message interfaces + `encode`/`decode` codecs. `int64` fields
  (`generation`, `size`) are `string` (JSON-safe, no precision loss).
