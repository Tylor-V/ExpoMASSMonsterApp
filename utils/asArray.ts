export const asArray = <T,>(value: any): T[] =>
  Array.isArray(value) ? value : [];
