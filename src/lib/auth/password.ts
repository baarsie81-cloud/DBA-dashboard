import { compare } from "bcryptjs";

/** Dummy hash so bcrypt always runs (timing). Not a valid password. */
const DUMMY_HASH =
  "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

/**
 * Verifies the shared organisation credentials against env vars.
 * Always runs a bcrypt compare to reduce timing differences.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUsername = process.env.AUTH_USERNAME;
  const passwordHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedUsername || !passwordHash) {
    return false;
  }

  const usernameMatches = username === expectedUsername;
  const hashToCheck = usernameMatches ? passwordHash : DUMMY_HASH;

  let passwordMatches = false;
  try {
    passwordMatches = await compare(password, hashToCheck);
  } catch {
    passwordMatches = false;
  }

  return usernameMatches && passwordMatches;
}
