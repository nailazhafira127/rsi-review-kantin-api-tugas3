import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, encodedKey] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !encodedKey || !/^[a-f\d]{128}$/i.test(encodedKey)) {
    return false;
  }

  const expectedKey = Buffer.from(encodedKey, 'hex');
  const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;
  return timingSafeEqual(actualKey, expectedKey);
}
