import {isWhitespace, isQuote, isBracket, toLiteral} from './utils';

export function lexer (text) {
  if (!text || text.length < 1) { return []; }

  const tokens = [];
  let token = '';
  let index = 0;
  const len = text.length;

  while (index < len) {
    var ch = text.charAt(index++);
    var nch = text.charAt(index);

    if (isWhitespace(ch)) {
      pushToken();
    } else if (isQuote(ch)) {
      tokens.push(scanString(ch));
    } else if (ch === '/' && nch === '*') {
      scanString('*/');
    } else if (ch === '/' && nch === '/') {
      scanString('\n');
    } else if (isBracket(ch) || isBracket(nch) || index === len) {
      token += ch;
      pushToken();
    } else {
      token += ch;
    }
  }

  return tokens;

  function scanString (lch) {
    let token = '';
    const ll = lch.length;
    let nch = null;

    while (index < text.length && nch !== lch) {
      token += text[index++];
      nch = text.substring(index, index + ll);
    }
    index += ll;

    return token;
  }

  function pushToken (t) {
    if (t === undefined && token.length > 0) {
      t = toLiteral(token);
    }
    if (token.length > 0) {
      tokens.push(t);
      token = '';
    }
  }
}
