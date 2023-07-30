import * as humps from 'humps';
import * as path from 'path';
import { exists, readJson } from 'fs-extra';

const dictMap = new Map<string, any>();

export function getWordArray(character: string): Array<string> {
  let formatChar = character.replace(/"/g, '');
  const capitalizes = formatChar.match(/[A-Z\s]{2,}/g);
  if (capitalizes && capitalizes.length) {
    capitalizes.map((item) => {
      formatChar = formatChar.replace(item, humps.pascalize(item.toLowerCase()));
    });
  }
  if (!formatChar) {
    return [];
  }
  if (/^[A-Z]+$/.test(character)) {
    return [character.toLowerCase()];
  }
  return Array.from(new Set(humps.decamelize(humps.camelize(formatChar), { separator: '|' }).split('|')));
}

type QueryResult = {
  t: string;
  p: string;
};

export async function query(word: string): Promise<QueryResult | undefined> {
  if (!word) { return; };

  const prefix = word.substring(0, 2);
  if (!dictMap.has(prefix)) {
    const jsonFilePath = path.join(path.dirname(__dirname), 'dict', `${prefix}.json`);
    if (await exists(jsonFilePath)) {
      dictMap.set(prefix, await readJson(jsonFilePath));
    } else {
      dictMap.set(prefix, null);
      return;
    }
  }

  const dict = dictMap.get(prefix);
  if (dict) {
    const data = dict[word];
    if (data) {
      return typeof data === 'string'
        ? {
          t: data,
          p: '',
        }
        : {
          t: data.t,
          p: data.p,
        };
    }
  }
}