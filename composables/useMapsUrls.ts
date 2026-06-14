const DIRECTIONS: Record<string, string> = {
  saint_maurice: 'https://www.google.com/maps/dir//%C3%89glise+Saint-Maurice+de+Lille,+Parv.+Saint-Maurice,+59800+Lille/@50.6357131,3.062632,16z/data=!4m18!1m8!3m7!1s0x47c2d58976929357:0x3735a99b609805cc!2s%C3%89glise+Saint-Maurice+de+Lille!8m2!3d50.6357131!4d3.0670094!15sChvDiWdsaXNlIFNhaW50LU1hdXJpY2UgTGlsbGVaHSIbw6lnbGlzZSBzYWludCBtYXVyaWNlIGxpbGxlkgEPY2F0aG9saWNfY2h1cmNo4AEA!16s%2Fm%2F05h2f34!4m8!1m0!1m5!1m1!1s0x47c2d58976929357:0x3735a99b609805cc!2m2!1d3.0669963!2d50.6357084!3e0?entry=ttu',
  saint_etienne: 'https://www.google.com/maps/dir//Catholic+Church+of+Saint-%C3%89tienne,+Lille,+47+Rue+de+l%27H%C3%B4pital+Militaire,+59000+Lille/@50.6351968,3.0600039,17z/data=!4m17!1m7!3m6!1s0x47c32a78f9907b19:0x2dcd44cec90ec6b8!2sCatholic+Church+of+Saint-%C3%89tienne,+Lille!8m2!3d50.6351968!4d3.0600039!16s%2Fm%2F05h3c3g!4m8!1m0!1m5!1m1!1s0x47c32a78f9907b19:0x2dcd44cec90ec6b8!2m2!1d3.0600039!2d50.6351968!3e0?entry=ttu',
}

const PLACE: Record<string, string> = {
  saint_maurice: 'https://www.google.com/maps/place/%C3%89glise+Saint-Maurice+de+Lille/@50.6357131,3.062632,16z/data=!4m6!3m5!1s0x47c2d58976929357:0x3735a99b609805cc!8m2!3d50.6357131!4d3.0670094!16s%2Fm%2F05h2f34?entry=ttu',
  saint_etienne: 'https://www.google.com/maps/place/Catholic+Church+of+Saint-%C3%89tienne,+Lille/@50.6351968,3.0600039,17z/data=!4m6!3m5!1s0x47c32a78f9907b19:0x2dcd44cec90ec6b8!8m2!3d50.6351968!4d3.0600039!16s%2Fm%2F05h3c3g?entry=ttu',
}

export function useMapsUrls(location: Ref<string> | ComputedRef<string>) {
  const directionsUrl = computed(() => DIRECTIONS[location.value] ?? '')
  const placeUrl      = computed(() => PLACE[location.value] ?? '')
  return { directionsUrl, placeUrl }
}
