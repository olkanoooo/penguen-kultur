export const toUpperTR = (str: string) => str.toLocaleUpperCase('tr-TR');

export const toSentenceCaseTR = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1).toLocaleLowerCase('tr-TR');
};

export const toTitleCaseTR = (str: string) => {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR');
    })
    .join(' ');
};
