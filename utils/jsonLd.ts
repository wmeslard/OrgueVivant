/**
 * Sérialise un objet en JSON-LD sûr pour une insertion dans `<script>`.
 *
 * `JSON.stringify` seul est vulnérable : sa sortie peut contenir la chaîne
 * littérale `</script>` (ou `<!--`), que l'analyseur HTML interprète comme la
 * fin de la balise, quel que soit le contexte JavaScript. Un contenu de concert
 * tel que `</script><img src=x onerror=…>` permettrait alors d'injecter du code
 * exécuté chez tous les visiteurs.
 *
 * On échappe donc `<`, `>` et `&` en séquences unicode — valides en JSON,
 * transparentes pour les lecteurs de données structurées (Google, schema.org),
 * et qui rendent l'évasion de balise impossible. U+2028/U+2029 sont également
 * neutralisés : littéraux légaux en JSON mais séparateurs de ligne en
 * JavaScript, ils casseraient le script. Les motifs les visent par échappement
 * unicode dans la source, sans quoi ce fichier serait lui-même invalide.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
