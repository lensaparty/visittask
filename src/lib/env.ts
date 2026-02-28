export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getJwtSecret() {
  return requireEnv("JWT_SECRET");
}

export function getDefaultImportedUserPassword() {
  return process.env.DEFAULT_IMPORTED_USER_PASSWORD ?? "Password123!";
}
