const ja = require('./ja');

// 확장 포인트: en.js, zh.js를 추가한 뒤 여기에 등록하면 됨
const languages = {
  ja
};

function getLanguage(code) {
  if (!code) return languages.ja;
  return languages[code] || languages.ja;
}

module.exports = {
  getLanguage
};

