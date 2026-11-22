#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CERT_DIR="$ROOT/.certs"
DOMAIN="local.compressor.tools.kuro-shiba.com"
mkdir -p "$CERT_DIR"

cat > "$CERT_DIR/openssl.cnf" <<EOF
[req]
distinguished_name = subject
prompt = no
req_extensions = server_extensions

[subject]
CN = $DOMAIN

[server_extensions]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = $DOMAIN
EOF

if [[ ! -f "$CERT_DIR/local-ca.key" || ! -f "$CERT_DIR/local-ca.crt" ]]; then
  openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "$CERT_DIR/local-ca.key" \
    -out "$CERT_DIR/local-ca.crt" \
    -subj '/CN=Kuro Shiba Local Development CA'
fi

openssl req -new -newkey rsa:2048 -nodes \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -config "$CERT_DIR/openssl.cnf"
openssl x509 -req \
  -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/local-ca.crt" \
  -CAkey "$CERT_DIR/local-ca.key" \
  -CAcreateserial \
  -out "$CERT_DIR/server.crt" \
  -days 825 \
  -sha256 \
  -extensions server_extensions \
  -extfile "$CERT_DIR/openssl.cnf"

security add-trusted-cert -d -r trustRoot \
  -k "$HOME/Library/Keychains/login.keychain-db" \
  "$CERT_DIR/local-ca.crt"

echo "HTTPS証明書を生成し、ログインキーチェーンへ登録しました: $DOMAIN"
