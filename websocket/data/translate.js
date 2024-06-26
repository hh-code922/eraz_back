import {readFileSync, existsSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from "path";

export default function getLangText(data, partnerInfo) {
    const lang = data.culture;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    let langPath = join(__dirname, 'lang', `${lang}.json`);

    if (existsSync(langPath))
        langPath = join(__dirname, 'lang', 'en.json');

    const langData = readFileSync(langPath);
    const currentCurrency = data.isDemo ? 'FUN' : partnerInfo.currencyId;
    const parsedLang = JSON.parse(langData);
    parsedLang.min_bet_info += ' ' + currentCurrency + ' ' + partnerInfo.minBet;
    parsedLang.max_bet_info += ' ' + currentCurrency + ' ' + partnerInfo.maxBet;
    return parsedLang;
}