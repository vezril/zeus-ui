#!/usr/bin/env bash
#
# Fetch the Apollo gRPC contract from the Lexicon at a PINNED ref into ./proto.
#
# The proto is the single source of truth and lives in the Lexicon — Zeus does
# NOT fork-copy it into version control (./proto is gitignored). This script
# materializes it on demand so `buf generate` can produce the TS stubs
# (src/lib/apollo/gen, which ARE committed so CI/Docker build without a proto
# toolchain). Bump LEXICON_REF here when adopting a new contract version, then
# re-run `npm run proto:gen` and commit the regenerated stubs.
#
# Overridable via env:
#   LEXICON_DIR  path to a local Lexicon checkout (default: ../the-lexicon)
#   LEXICON_REF  git ref/SHA to pin the contract to (default: the pin below)
set -euo pipefail

# Pinned to the commit that introduced the Apollo ObjectApi contract.
LEXICON_REF="${LEXICON_REF:-8c8610045e5abdf278c7d9e7f4965606559dae97}"
LEXICON_DIR="${LEXICON_DIR:-../the-lexicon}"
PROTO_PATH="src/main/protobuf/apollostorage/grpc/object_api.proto"
DEST="proto/apollostorage/grpc/object_api.proto"

if [ ! -d "$LEXICON_DIR/.git" ]; then
  echo "ERROR: no Lexicon checkout at '$LEXICON_DIR'." >&2
  echo "       Clone https://github.com/vezril/the-lexicon or set LEXICON_DIR." >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
echo "Fetching $PROTO_PATH @ ${LEXICON_REF:0:12} from $LEXICON_DIR"
git -C "$LEXICON_DIR" show "$LEXICON_REF:$PROTO_PATH" > "$DEST"
echo "Wrote $DEST"
