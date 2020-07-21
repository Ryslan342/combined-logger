"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const util = __importStar(require("util"));
function repeat(str, count) {
    return str.repeat(count);
}
exports.default = {
    format(message, ...data) {
        return message + '\n' + this.parseObj(data || {}, 0);
    },
    parseObj(obj, tabCount = 0) {
        const tabs = repeat('  ', tabCount);
        let result = '';
        if (!obj) {
            return '';
        }
        else if (typeof obj != 'object') {
            return obj;
        }
        else if (obj instanceof Error) {
            return util.inspect(obj);
        }
        else if (obj instanceof Array) {
            for (let i of obj) {
                result += this.parseObj(i, tabCount + 1) + '\n';
            }
        }
        else {
            for (const key in obj) {
                if (obj instanceof Array) {
                    // @ts-ignore
                    result += `${tabs}${obj[key]},\n`;
                }
                else if (typeof obj[key] === 'object') {
                    if (obj instanceof Array) {
                        // @ts-ignore
                        result += this.parseObj(obj[key], tabCount + 1) + tabs + ',\n';
                    }
                    else {
                        result += `${tabs}${key}: \n` + this.parseObj(obj[key], tabCount + 1);
                    }
                }
                else {
                    result += `${tabs}${key}: ${obj[key]}\n`;
                }
            }
        }
        return result.replace(/[ \n]*$/, '\n');
    },
    size(string = "", size) {
        string = string.slice(0, size);
        return string + " ".repeat(size - string.length);
    }
};
