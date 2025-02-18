#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const util = require('util');

const generateKeyPair = util.promisify(crypto.generateKeyPair);

async function main() {
  const [proc, command, keyFile] = process.argv.slice(1);
  if (!keyFile || !['encrypt', 'decrypt', 'genkey'].includes(command)) {
    console.log(`Usage:
      ${proc} encrypt RECIPIENT_KEYFILE.pub < PLAINTEXT
      ${proc} decrypt MY_KEYFILE.priv < ENCRYPTED
      ${proc} genkey MY_KEYFILE`);
    process.exit(1);
    return;
  }

  if (command === 'encrypt') {
    // Encrypt data using the recipient's public key.
    const key = fs.readFileSync(keyFile, {encoding: 'utf8'});
    const plaintext = fs.readFileSync(0);
    try {
      const encrypted = crypto.publicEncrypt({key}, plaintext).toString('base64');
      console.log(encrypted);
    } catch (e) {
      if (!/data too large/.test(e.message)) { throw e; }
      // For too large data, generate and encrypt a symmetric key first.
      const symKey = crypto.randomBytes(32);
      const encryptedKey = crypto.publicEncrypt({key}, symKey).toString('base64');

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', symKey, iv);
      let encryptedText = cipher.update(plaintext, 'utf8', 'base64');
      encryptedText += cipher.final('base64');
      console.log(`$${iv.toString('base64')}$${encryptedKey}$${encryptedText}`);
    }

  } else if (command === 'decrypt') {
    // Decrypt data using your own private key.
    const key = fs.readFileSync(keyFile, {encoding: 'utf8'});
    const fullText = fs.readFileSync(0, {encoding: 'utf8'})
    let plaintext;
    if (fullText.startsWith('$')) {
      const [ivText, encryptedKey, encryptedText] = fullText.split('$').slice(1);
      const iv = Buffer.from(ivText, 'base64');
      const symKey = crypto.privateDecrypt({key}, Buffer.from(encryptedKey, 'base64'));
      const decipher = crypto.createDecipheriv('aes-256-cbc', symKey, iv);
      plaintext = decipher.update(encryptedText, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
    } else {
      const encrypted = Buffer.from(fullText, 'base64');
      plaintext = crypto.privateDecrypt({key}, encrypted);
    }
    fs.writeFileSync(1, plaintext);

  } else if (command === 'genkey') {
    // Generate a new RSA key pair.
    const {publicKey, privateKey} = await generateKeyPair('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {type: 'spki', format: 'pem'},
      privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
    });
    fs.writeFileSync(keyFile + '.priv', privateKey, {mode: 0o600});
    fs.writeFileSync(keyFile + '.pub', publicKey);
    console.log(`Generated key into ${keyFile}.priv and ${keyFile}.pub`);
  }
}

main().catch(err => console.warn("ERROR", err));
