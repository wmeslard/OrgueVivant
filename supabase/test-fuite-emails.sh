#!/usr/bin/env bash
# Test de non-régression : les adresses des abonnés ne doivent JAMAIS être
# lisibles avec la clé publique, celle qui est embarquée dans le navigateur.
#
# Insère un abonné témoin en `.invalid` (domaine réservé, aucun courrier
# possible), tente de le lire avec la clé publique, puis nettoie.
#
#   ./supabase/test-fuite-emails.sh [url-du-site]
#
# Nécessite SUPABASE_URL, SUPABASE_KEY et SUPABASE_SERVICE_ROLE_KEY dans .env
set -uo pipefail
cd "$(dirname "$0")/.."

SITE="${1:-https://orguevivant.fr}"
val() { grep "^$1=" .env | cut -d= -f2- | tr -d '"'; }
URL=$(val SUPABASE_URL); ANON=$(val SUPABASE_KEY); SVC=$(val SUPABASE_SERVICE_ROLE_KEY)
[ -z "$URL" ] || [ -z "$ANON" ] || [ -z "$SVC" ] && { echo "Clés manquantes dans .env"; exit 2; }

MAIL="audit-rls-$(date +%s)@example.invalid"
FAIL=0
ok()   { echo "  ✓ $1"; }
bad()  { echo "  ✗ $1"; FAIL=1; }

cleanup() {
  curl -s --max-time 20 -X DELETE -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
    "$URL/rest/v1/newsletter_subscribers?email=like.*example.invalid" -o /dev/null
}
trap cleanup EXIT

echo "Cible : $SITE"

# 1. Écriture directe avec la clé publique
code=$(curl -s --max-time 20 -o /dev/null -w "%{http_code}" -X POST \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"email":"anon-write@example.invalid"}' "$URL/rest/v1/newsletter_subscribers")
[ "$code" -ge 400 ] && ok "écriture directe refusée (http=$code)" || bad "ÉCRITURE DIRECTE AUTORISÉE (http=$code)"

# 2. Abonné témoin via l'API publique du site
curl -s --max-time 25 -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$MAIL\"}" "$SITE/api/newsletter/subscribe" -o /dev/null

# 3. Lecture avec la clé publique.
#    Deux issues acceptables : un refus explicite (RLS + droits révoqués), ou
#    une liste vide (RLS filtre les lignes). Seules des lignes renvoyées
#    constituent une fuite.
code=$(curl -s --max-time 20 -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$URL/rest/v1/newsletter_subscribers?select=email" -o /tmp/rls-anon.json -w "%{http_code}")
if [ "$code" -ge 400 ]; then
  ok "lecture refusée avec la clé publique (http=$code)"
else
  n=$(python3 -c "import json;d=json.load(open('/tmp/rls-anon.json'));print(len(d) if isinstance(d,list) else -1)" 2>/dev/null || echo -1)
  if [ "$n" = "0" ]; then ok "aucune adresse lisible publiquement"
  else bad "FUITE : $n ligne(s) lisible(s) avec la clé publique"; fi
fi

# 4. Le témoin a-t-il bien été enregistré ? (sinon le test 3 est vide de sens)
m=$(curl -s --max-time 20 -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
  "$URL/rest/v1/newsletter_subscribers?select=id&email=eq.$MAIL" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
[ "$m" = "1" ] && ok "témoin bien enregistré, le test est concluant" || bad "témoin absent : test non concluant"

# 5. Diffusion protégée
code=$(curl -s --max-time 20 -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" -d '{"type":"news","data":{"title":"x"}}' \
  "$SITE/api/newsletter/broadcast")
[ "$code" = "401" ] || [ "$code" = "403" ] && ok "diffusion protégée (http=$code)" || bad "DIFFUSION NON PROTÉGÉE (http=$code)"

echo
[ "$FAIL" = "0" ] && echo "RÉSULTAT : aucune fuite détectée." || echo "RÉSULTAT : au moins un problème détecté."
exit "$FAIL"
