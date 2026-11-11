/*
  Réglages du site « Leeamm X Ange ».

  Tant que SUPABASE_URL et SUPABASE_ANON_KEY sont vides, le site tourne en MODE DÉMO :
  tout est enregistré uniquement sur l'appareil qui l'ouvre (pratique pour essayer).

  Pour partager le contenu en direct à deux, remplis les 3 premières lignes
  en suivant le guide LISEZ-MOI.md.
*/
window.APP_CONFIG = {
  SUPABASE_URL: "https://cescmokmsqzmawdqcwyl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_af8W1pmhxcDc0_J8nDwNkA_vFBATfe8",
  SHARED_EMAIL: "ange.cornillet@icloud.com",

  BUCKET: "souvenirs",

  // Dates à retenir (format AAAA-MM-JJ)
  KEY_DATES: {
    first: { date: "2025-06-14", concept: "Premier message", ref: "bonjour Leeamm" },
    couple: { date: "2026-08-20", concept: "Début de relation amoureuse", ref: "je t'aime - je t'aime aussi" }
  },

  // Lieux proposés d'office pour les moments ensemble
  PLACE_PRESETS: ["Chez Leeamm", "Chez Ange", "Chez la mamie de Ange"]
};
