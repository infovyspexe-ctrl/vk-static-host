// Язык окна игры. Ручной ?lang= важнее площадки: им пользуется проверка перевода.
// Площадка важнее языка браузера: русская страница не должна открывать английский интерфейс.
export function resolvePlayLanguage(urlLang, platformLang, navigatorLang) {
  const raw = [urlLang, platformLang, navigatorLang].find((value) => value != null && String(value).trim() !== '');
  return String(raw || 'ru').trim().toLowerCase().startsWith('en') ? 'en' : 'ru';
}
