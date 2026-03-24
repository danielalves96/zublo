var totpCoreBase = typeof __hooks !== "undefined" ? (__hooks + "/lib") : __dirname;
var totpCore = require(totpCoreBase + "/pure/totp-core.js");

function generateBackupCodes(randomStringWithAlphabet) {
  var createCode = randomStringWithAlphabet || function (length, alphabet) {
    return $security.randomStringWithAlphabet(length, alphabet);
  };

  var codes = [];
  var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (var index = 0; index < 8; index++) {
    codes.push(createCode(4, alphabet) + "-" + createCode(4, alphabet));
  }
  return codes;
}

module.exports = {
  _sha1: totpCore._sha1,
  _hmacSha1: totpCore._hmacSha1,
  _base32Decode: totpCore._base32Decode,
  counterToBytes: totpCore.counterToBytes,
  truncateHmacToOtp: totpCore.truncateHmacToOtp,
  generateTOTPAt: totpCore.generateTOTPAt,
  verifyTOTPAt: totpCore.verifyTOTPAt,
  verifyTOTP: totpCore.verifyTOTP,
  normalizeBackupCode: totpCore.normalizeBackupCode,
  findBackupCodeIndex: totpCore.findBackupCodeIndex,
  generateBackupCodes: generateBackupCodes,
};
