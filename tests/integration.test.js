import test from 'tape'
import crypto from 'crypto'
import * as header from '../src/header'
import * as metadata from '../src/metadata'
import * as file from '../src/file'
import * as scCrypto from '../src/crypto'
import { fromUInt32BE } from '../src/buffer'

test('integration', (t) => {
  // t.plan(1)

  // -- ENCRYPTION ---

  const headerObj = {
    magic: header.MAGIC,
    version: 0,
    reserved: 0,
    versionTag: 'seco-test-1',
    appName: 'Exodus',
    appVersion: 'v1.0.0'
  }
  const headerBuf = header.serialize(headerObj)

  // includes a random scrypt.. may need to change
  let metadataObj = metadata.create()

  const dataToEncrypt = {
    superSecret: 'this is a secret message',
    agent: 'James Bond'
  }

  const message = new Buffer(JSON.stringify(dataToEncrypt), 'utf8')

  const secretKey = crypto.randomBytes(32)
  const passphrase = 'open sesame'

  const { authTag, iv, blob } = scCrypto.aesEncrypt(secretKey, message)
  metadataObj.blob = { authTag, iv }

  metadataObj.blobKey = scCrypto.boxEncrypt(passphrase, secretKey, metadataObj.scrypt)
  metadataObj.blobKey.key = metadataObj.blobKey.blob
  delete metadataObj.blobKey.blob

  const metadataBuf = metadata.serialize(metadataObj)

  const totalBuf = Buffer.concat([metadataBuf, fromUInt32BE(blob.byteLength), blob])

  const fileObj = {
    header: headerBuf,
    checksum: scCrypto.sha256(totalBuf),
    metadata: metadataBuf,
    blob
  }

  const fileBuf = file.encode(fileObj)

  // -- DECRYPTION --

  // const decFileObj = file.decode(fileBuf)
  const decTotalBuf = fileBuf.slice(header.HEADER_LEN_BYTES + 32)

  t.deepEqual(scCrypto.sha256(decTotalBuf), fileObj.checksum, 'checksums equal')

  t.end()
})
