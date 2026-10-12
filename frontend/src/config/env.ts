function isLocalIpv4Address(hostname: string): boolean {
  const octets = hostname.split(".");

  if (
    octets.length !== 4 ||
    octets.some((octet) => !/^\d{1,3}$/.test(octet) || Number(octet) > 255)
  ) {
    return false;
  }

  const [first, second] = octets.map(Number);

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function isLocalIpv6Address(hostname: string): boolean {
  const address = hostname.slice(1, -1).toLowerCase();

  if (
    address === "::" ||
    address === "::1" ||
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    /^fe[89ab]/.test(address)
  ) {
    return true;
  }

  if (!address.startsWith("::ffff:")) {
    return false;
  }

  const mappedAddress = address.slice("::ffff:".length);
  if (mappedAddress.includes(".")) {
    return isLocalIpv4Address(mappedAddress);
  }

  const groups = mappedAddress.split(":");
  if (groups.length !== 2 || groups.some((group) => !/^[\da-f]{1,4}$/.test(group))) {
    return false;
  }

  const [upper, lower] = groups.map((group) => Number.parseInt(group, 16));
  const ipv4Address = [
    upper >> 8,
    upper & 255,
    lower >> 8,
    lower & 255,
  ].join(".");

  return isLocalIpv4Address(ipv4Address);
}

function isLocalHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");

  if (normalizedHostname.startsWith("[") && normalizedHostname.endsWith("]")) {
    return isLocalIpv6Address(normalizedHostname);
  }

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "host.docker.internal" ||
    normalizedHostname === "host.containers.internal" ||
    isLocalIpv4Address(normalizedHostname) ||
    !normalizedHostname.includes(".")
  ) {
    return true;
  }

  return [".localhost", ".local", ".test", ".internal", ".lan", ".home.arpa"]
    .some((suffix) => normalizedHostname.endsWith(suffix));
}

export function validateApiUrl(
  value: string | undefined,
  production: boolean,
): string {
  if (!value?.trim()) {
    throw new Error("VITE_API_URL is required.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_API_URL must be a valid HTTP or HTTPS URL.");
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error("VITE_API_URL must be a valid HTTP or HTTPS URL.");
  }

  if (production && isLocalHostname(url.hostname)) {
    throw new Error(
      "VITE_API_URL must not use a local or private host in production.",
    );
  }

  return value;
}
