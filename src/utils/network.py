"""
src/utils/network.py
--------------------
Network utility supporting reliable DNS resolution and stream downloading
for datasets across academic and open repositories (Hugging Face, McAuley Lab, GitHub).
"""

import os
import socket
import struct
import logging
import urllib.request
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

_DNS_RESOLVER_IP = "8.8.8.8"
_DNS_CACHE = {}


def resolve_domain(domain: str, dns_server: str = _DNS_RESOLVER_IP) -> str:
    """Resolve an IPv4 address for a domain using an explicit DNS server via raw UDP."""
    if domain in _DNS_CACHE:
        return _DNS_CACHE[domain]

    # Quick check if it's already an IP
    try:
        socket.inet_aton(domain)
        return domain
    except socket.error:
        pass

    try:
        ID = 0x1234
        flags = 0x0100  # Standard query, recursion desired
        header = struct.pack("!HHHHHH", ID, flags, 1, 0, 0, 0)
        qname = b"".join(bytes([len(p)]) + p.encode("ascii") for p in domain.split(".")) + b"\x00"
        question = qname + struct.pack("!HH", 1, 1)

        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(4.0)
        sock.sendto(header + question, (dns_server, 53))
        data, _ = sock.recvfrom(1024)
        sock.close()

        idx = 12 + len(question)
        while idx < len(data):
            if (data[idx] & 0xC0) == 0xC0:
                idx += 2
            else:
                while data[idx] != 0:
                    idx += 1 + data[idx]
                idx += 1
            if idx + 10 > len(data):
                break
            rtype, rclass, ttl, rdlength = struct.unpack("!HHIH", data[idx:idx+10])
            idx += 10
            if rtype == 1 and rdlength == 4:
                ip = socket.inet_ntoa(data[idx:idx+4])
                _DNS_CACHE[domain] = ip
                return ip
            idx += rdlength
    except Exception as e:
        logging.warning("Custom DNS lookup failed for %s: %s", domain, e)

    return None


# Enable socket getaddrinfo hook to automatically resolve domains if system DNS fails
_orig_getaddrinfo = socket.getaddrinfo


def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    try:
        return _orig_getaddrinfo(host, port, family, type, proto, flags)
    except Exception:
        ip = resolve_domain(str(host))
        if ip:
            return _orig_getaddrinfo(ip, port, family, type, proto, flags)
        raise


def enable_reliable_dns():
    """Patches socket.getaddrinfo so all Python network calls resolve reliably."""
    socket.getaddrinfo = _patched_getaddrinfo


def download_file(url: str, output_path: str, headers: dict = None, chunk_size: int = 65536) -> str:
    """Download a file with reliable DNS and progress tracking."""
    enable_reliable_dns()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    default_headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0"}
    if headers:
        default_headers.update(headers)

    response = requests.get(url, headers=default_headers, stream=True, timeout=60)
    response.raise_for_status()

    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:
                f.write(chunk)

    logging.info("Saved %s (%.2f MB)", output_path, os.path.getsize(output_path) / (1024 * 1024))
    return output_path
