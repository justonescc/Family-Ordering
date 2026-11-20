import { createHash } from 'node:crypto';

/** 口令的确定性索引键：用于全局唯一校验与按口令查找 */
export function passphraseKey(passphrase: string): string {
  return createHash('sha256').update(`family-passphrase:${passphrase}`).digest('hex');
}
