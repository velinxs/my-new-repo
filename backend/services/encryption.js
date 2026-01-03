import crypto from 'crypto';

/**
 * Encryption Service
 * Provides E2E encryption for private tasks
 *
 * Uses ECIES (Elliptic Curve Integrated Encryption Scheme):
 * - ECDH for key agreement
 * - AES-256-GCM for symmetric encryption
 * - P-256 curve (secp256r1)
 */

class EncryptionService {
  /**
   * Generate a new key pair for an agent
   * @returns {Object} { publicKey, privateKey } in PEM format
   */
  generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    return { publicKey, privateKey };
  }

  /**
   * Encrypt data with recipient's public key
   * @param {string} data - Data to encrypt
   * @param {string} recipientPublicKey - Recipient's public key (PEM)
   * @returns {Object} { encryptedData, ephemeralPublicKey, iv, authTag }
   */
  encrypt(data, recipientPublicKey) {
    // Generate ephemeral key pair
    const { publicKey: ephemeralPublicKey, privateKey: ephemeralPrivateKey } =
      this.generateKeyPair();

    // Perform ECDH to derive shared secret
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(
      crypto.createPrivateKey(ephemeralPrivateKey).export({
        type: 'sec1',
        format: 'der'
      })
    );

    const recipientPublicKeyObj = crypto.createPublicKey(recipientPublicKey);
    const recipientPublicKeyDer = recipientPublicKeyObj.export({
      type: 'spki',
      format: 'der'
    });

    // Extract the public key point (skip the DER header)
    const publicKeyPoint = recipientPublicKeyDer.slice(-65);
    const sharedSecret = ecdh.computeSecret(publicKeyPoint);

    // Derive encryption key from shared secret
    const encryptionKey = crypto.createHash('sha256').update(sharedSecret).digest();

    // Encrypt data with AES-256-GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

    let encryptedData = cipher.update(data, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      encryptedData,
      ephemeralPublicKey,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  /**
   * Decrypt data with private key
   * @param {Object} encryptedPayload - { encryptedData, ephemeralPublicKey, iv, authTag }
   * @param {string} recipientPrivateKey - Recipient's private key (PEM)
   * @returns {string} Decrypted data
   */
  decrypt(encryptedPayload, recipientPrivateKey) {
    const { encryptedData, ephemeralPublicKey, iv, authTag } = encryptedPayload;

    // Perform ECDH to derive shared secret
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(
      crypto.createPrivateKey(recipientPrivateKey).export({
        type: 'sec1',
        format: 'der'
      })
    );

    const ephemeralPublicKeyObj = crypto.createPublicKey(ephemeralPublicKey);
    const ephemeralPublicKeyDer = ephemeralPublicKeyObj.export({
      type: 'spki',
      format: 'der'
    });

    // Extract the public key point
    const publicKeyPoint = ephemeralPublicKeyDer.slice(-65);
    const sharedSecret = ecdh.computeSecret(publicKeyPoint);

    // Derive decryption key
    const decryptionKey = crypto.createHash('sha256').update(sharedSecret).digest();

    // Decrypt data
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      decryptionKey,
      Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash data for verification (SHA-256)
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Sign data with private key
   */
  sign(data, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify signature
   */
  verify(data, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }
}

export default new EncryptionService();
