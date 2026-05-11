"""Kindle Exporter PRO License Key Generator

Usage:
    python keygen-kindle.py           # Generate a single key
    python keygen-kindle.py -n 5      # Generate 5 keys
    python keygen-kindle.py -v KEY    # Verify a key

Format: KINDLE-XXXX-XXXX-XXXX-XXXX
Each key includes a checksum digit for offline validation.
"""

import secrets
import sys

SECRET = sum(b'KINDLE-EXPORTER-PRO-2024')
DIGITS = '0123456789'


def _checksum(parts):
    s = sum(ord(c) * (i + 1) for i, c in enumerate(''.join(parts))) ^ SECRET
    return str(s % 10)


def generate_key():
    groups = []
    for _ in range(3):
        groups.append(''.join(secrets.choice(DIGITS) for _ in range(4)))
    cs = _checksum(groups)
    groups.append(cs * 4)
    return f"KINDLE-{'-'.join(groups)}"


def verify_key(key):
    key = key.strip().upper()
    parts = key.split('-')
    if len(parts) != 5 or parts[0] != 'KINDLE':
        return False
    for p in parts[1:]:
        if len(p) != 4 or not all(c in DIGITS for c in p):
            return False
    expected_cs = _checksum(parts[1:4])
    return parts[4] == expected_cs * 4


if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == '-v' and len(sys.argv) > 2:
            k = sys.argv[2]
            status = 'GOOD' if verify_key(k) else 'BAD'
            print(f"[{status}] {k}")
        elif sys.argv[1] == '-n':
            n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            for _ in range(n):
                k = generate_key()
                assert verify_key(k), f"Self-test failed for {k}"
                print(k)
        else:
            print(f"Usage: {sys.argv[0]} [-n COUNT] [-v KEY]")
    else:
        k = generate_key()
        assert verify_key(k), f"Self-test failed for {k}"
        print(k)
