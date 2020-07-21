import * as util from 'util';

function repeat(str: string, count: number) {
  return str.repeat(count);
}

export default {
  format(message: string, ...data: any[]) {
    return message + '\n' + this.parseObj(data || {}, 0);
  },
  parseObj(obj: any, tabCount: number = 0) {
    const tabs = repeat('  ', tabCount);
    let result = '';

    if (!obj) {
      return '';
    } else if (typeof obj != 'object') {
      return obj;
    } else if (obj instanceof Error) {
      return util.inspect(obj);
    } else if (obj instanceof Array) {
      for (let i of obj) {
        result += this.parseObj(i, tabCount + 1) + '\n';
      }
    } else {
      for (const key in obj) {
        if (obj instanceof Array) {
          // @ts-ignore
          result += `${ tabs }${ obj[key] },\n`;
        } else if (typeof obj[key] === 'object') {
          if (obj instanceof Array) {
            // @ts-ignore
            result += this.parseObj(obj[key], tabCount + 1) + tabs + ',\n';
          } else {
            result += `${ tabs }${ key }: \n` + this.parseObj(obj[key], tabCount + 1)
          }
        } else {
          result += `${ tabs }${ key }: ${ obj[key] }\n`;
        }
      }
    }

    return result.replace(/[ \n]*$/, '\n');
  },
  size(string: string = "", size: number) {
    string = string.slice(0, size);

    return string + " ".repeat(size - string.length);
  }
};
