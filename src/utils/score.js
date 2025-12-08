/**
 * 점수를 그리디 알고리즘으로 byte와 bit로 변환
 * @param {number} totalBits - 총 점수 (bit 단위)
 * @returns {{byte: number, bit: number}} - byte와 bit 객체
 * 
 * 예시:
 * - 75bit → { byte: 9, bit: 3 }  (9*8 + 3 = 75)
 * - 100bit → { byte: 12, bit: 4 } (12*8 + 4 = 100)
 */
const convertScoreToBitByte = (totalBits) => {
  if (!totalBits || totalBits < 0) {
    return { byte: 0, bit: 0 };
  }

  // 반올림하여 정수로 만듦
  const roundedBits = Math.round(totalBits);

  // 그리디: 큰 단위(byte)부터 채움
  const bytes = Math.floor(roundedBits / 8);
  const bits = roundedBits % 8;

  return {
    byte: bytes,
    bit: bits
  };
};

/**
 * byte와 bit를 다시 총 bit로 변환
 * @param {number} bytes - byte 값
 * @param {number} bits - bit 값
 * @returns {number} - 총 bit 수
 */
const convertBitByteToScore = (bytes, bits) => {
  return bytes * 8 + bits;
};

module.exports = {
  convertScoreToBitByte,
  convertBitByteToScore
};
