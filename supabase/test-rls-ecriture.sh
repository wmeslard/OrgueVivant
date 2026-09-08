#!/usr/bin/env bash
# Non-régression du contrôle d'accès en écriture.
#
# Crée un compte `authenticated` SANS rôle admin, vérifie qu'il peut lire le
# contenu public mais ne peut rien écrire, contrôle que les endpoints /api/admin
# refusent une requête non authentifiée, puis supprime le compte de test.
#
#   ./supabase/test-rls-ecriture.sh [url-du-site]
#
# UPDATE et DELETE ciblent un identifiant inexistant : un refus se manifeste par
# un 401/403 quel que soit le nombre de lignes visées, aucune donnée réelle
# n'est donc touchée.
set -uo pipefail
cd "$(dirname "$0")/.."

SITE="${1:-https://orguevivant.fr}"
val() { grep "^$1=" .env | cut -d= -f2- | tr -d '"'; }
URL=$(val SUPABASE_URL); ANON=$(val SUPABASE_KEY); SVC=$(val SUPABASE_SERVICE_ROLE_KEY)
[ -z "$URL" ] || [ -z "$ANON" ] || [ -z "$SVC" ] && { echo "Clés manquantes dans .env"; exit 2; }

MAIL="audit-rls-$(date +%s)@example.invalid"
PASS="Aud1t-$(date +%s)-Xy!"
NOPE="00000000-0000-0000-0000-000000000000"
USERID=""; CID=""; FAIL=0

ok()  { echo "  ✓ $1"; }
bad() { echo "  ✗ $1"; FAIL=1; }

cleanup() {
  [ -n "$CID" ] && curl -s -X DELETE -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
    "$URL/rest/v1/concerts?id=eq.$CID" -o /dev/null
  [ -n "$USERID" ] && curl -s -X DELETE -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
    "$URL/auth/v1/admin/users/$USERID" -o /dev/null
}
trap cleanup EXIT

echo "Cible : $SITE"

USERID=$(curl -s --max-time 20 -X POST -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MAIL\",\"password\":\"$PASS\",\"email_confirm\":true}" \
  "$URL/auth/v1/admin/users" | python3 -c "import json,sys;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -z "$USERID" ] && { echo "  Impossible de créer le compte de test"; exit 2; }

JWT=$(curl -s --max-time 20 -X POST -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$MAIL\",\"password\":\"$PASS\"}" "$URL/auth/v1/token?grant_type=password" \
  | python3 -c "import json,sys;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
[ -z "$JWT" ] && { echo "  Impossible d'obtenir un jeton"; exit 2; }

req() { curl -s --max-time 20 -o /tmp/rls-w.json -w "%{http_code}" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" "$@"; }
deny() { [ "$2" -ge 400 ] && ok "$1 refusé (http=$2)" || bad "$1 AUTORISÉ (http=$2)"; }

# Lecture publique : doit rester possible
for t in concerts news; do
  c=$(req "$URL/rest/v1/$t?select=id&limit=1")
  [ "$c" -lt 400 ] && ok "lecture $t possible (http=$c)" || bad "lecture $t bloquée (http=$c)"
done

# Écriture : doit être refusée sur les deux tables
c=$(req -X POST -H "Prefer: return=representation" \
  -d '{"title":"AUDIT TEST","date":"2030-01-01","location":"saint_maurice"}' "$URL/rest/v1/concerts")
deny "INSERT concerts" "$c"
[ "$c" -lt 400 ] && CID=$(python3 -c "import json;d=json.load(open('/tmp/rls-w.json'));print(d[0]['id'] if d else '')" 2>/dev/null)

deny "UPDATE concerts" "$(req -X PATCH -d '{"title":"x"}' "$URL/rest/v1/concerts?id=eq.$NOPE")"
deny "DELETE concerts" "$(req -X DELETE "$URL/rest/v1/concerts?id=eq.$NOPE")"
deny "INSERT news"     "$(req -X POST -d '{"title":"x","title_en":"x","body":"x","body_en":"x"}' "$URL/rest/v1/news")"
deny "UPDATE news"     "$(req -X PATCH -d '{"title":"x"}' "$URL/rest/v1/news?id=eq.$NOPE")"
deny "DELETE news"     "$(req -X DELETE "$URL/rest/v1/news?id=eq.$NOPE")"

# Abonnés : aucun accès, même en lecture
deny "lecture abonnés" "$(req "$URL/rest/v1/newsletter_subscribers?select=email")"

# Endpoints d'administration : refus sans session.
# Chaque route est appelée avec la méthode qu'elle implémente réellement, sinon
# un 404 de méthode inconnue serait pris à tort pour une protection.
check_ep() {
  c=$(curl -s --max-time 20 -o /dev/null -w "%{http_code}" -X "$2" \
    -H "Content-Type: application/json" -d '{}' "$SITE$1")
  [ "$c" = "401" ] || [ "$c" = "403" ] \
    && ok "endpoint $1 protégé (http=$c)" || bad "endpoint $1 NON PROTÉGÉ (http=$c)"
}
check_ep /api/admin/concerts POST
check_ep /api/admin/news POST
check_ep /api/admin/newsletter/subscribers GET
check_ep /api/newsletter/broadcast POST

echo
[ "$FAIL" = "0" ] && echo "RÉSULTAT : aucun accès en écriture non autorisé." \
                  || echo "RÉSULTAT : au moins un accès non autorisé détecté."
exit "$FAIL"
