import * as bcrypt from 'bcrypt';

/**
 * The one place a password is turned into a hash, and the one place a candidate
 * is checked against one.
 *
 * Extracted when change-password would have become the third inline
 * `bcrypt.hash(pw, 10)` in this domain. The cost factor is the thing worth
 * centralising: raising it later must move every hashing site at once, and a
 * site left behind would keep minting weaker hashes indefinitely, invisibly.
 */
const BCRYPT_COST = 10;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/**
 * `hash` is nullable because `UserEntity.passwordHash` is: an account created
 * through a social login has none. Verifying against a null hash is `false`,
 * never a crash — bcrypt.compare on a null throws, and a caller who forgot the
 * null check would otherwise turn a passwordless account into a 500.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plaintext, hash);
}
