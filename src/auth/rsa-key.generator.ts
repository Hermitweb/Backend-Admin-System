import { generateKeyPairSync } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

const PRIVATE_KEY_PATH = process.env.RSA_PRIVATE_KEY_PATH || './keys/private.key';
const PUBLIC_KEY_PATH = process.env.RSA_PUBLIC_KEY_PATH || './keys/public.key';

const logger = new Logger('RSAKeyGenerator');

export class RSAKeyGenerator {
  private static instance: RSAKeyGenerator;

  private constructor() {}

  static getInstance(): RSAKeyGenerator {
    if (!RSAKeyGenerator.instance) {
      RSAKeyGenerator.instance = new RSAKeyGenerator();
    }
    return RSAKeyGenerator.instance;
  }

  async ensureKeysExist(): Promise<{ privateKey: string; publicKey: string }> {
    const keysDir = path.dirname(PRIVATE_KEY_PATH);
    
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
      logger.log(`Created keys directory: ${keysDir}`);
    }

    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
      logger.log('RSA key pair already exists');
      return {
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
        publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8'),
      };
    }

    logger.log('Generating new RSA key pair (4096 bit)...');
    const { privateKey, publicKey } = generateKeyPairSync('rsassa-pkcs1-v1_5', {
      modulusLength: 4096,
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
      publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
    
    logger.log(`Private key saved to: ${PRIVATE_KEY_PATH}`);
    logger.log(`Public key saved to: ${PUBLIC_KEY_PATH}`);

    return { privateKey, publicKey };
  }

  getPrivateKey(): string {
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
      throw new Error('Private key does not exist. Run ensureKeysExist() first.');
    }
    return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  }

  getPublicKey(): string {
    if (!fs.existsSync(PUBLIC_KEY_PATH)) {
      throw new Error('Public key does not exist. Run ensureKeysExist() first.');
    }
    return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  }
}
