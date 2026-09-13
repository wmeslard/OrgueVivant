/**
 * Texte dans la langue affichée, avec repli sur le français.
 *
 * Les traductions sont produites à l'enregistrement et peuvent manquer : un
 * contenu saisi avant l'ajout du champ, ou une traduction qui a échoué. Le
 * français reste alors affiché, ce qui vaut toujours mieux qu'un blanc.
 */
export function localized(fr?: string | null, en?: string | null, locale?: string): string {
  if (locale === 'en' && en && en.trim()) return en
  return fr ?? ''
}
