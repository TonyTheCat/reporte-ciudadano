// geoBoundaries publica los nombres de Paraguay sin tildes; esto los corrige para mostrarlos.

const DEPARTMENTS: Record<string, string> = {
  "ALTO PARAGUAY": "Alto Paraguay",
  "ALTO PARANA": "Alto Paraná",
  AMAMBAY: "Amambay",
  ASUNCION: "Asunción",
  BOQUERON: "Boquerón",
  CAAGUAZU: "Caaguazú",
  CAAZAPA: "Caazapá",
  CANINDEYU: "Canindeyú",
  CENTRAL: "Central",
  CONCEPCION: "Concepción",
  CORDILLERA: "Cordillera",
  GUAIRA: "Guairá",
  ITAPUA: "Itapúa",
  MISIONES: "Misiones",
  "ÑEEMBUCU": "Ñeembucú",
  PARAGUARI: "Paraguarí",
  "PRESIDENTE HAYES": "Presidente Hayes",
  "SAN PEDRO": "San Pedro",
};

const WORDS: Record<string, string> = {
  Asuncion: "Asunción", Concepcion: "Concepción", Encarnacion: "Encarnación", Caacupe: "Caacupé",
  Caaguazu: "Caaguazú", Caazapa: "Caazapá", Capiata: "Capiatá", Aregua: "Areguá", Itaugua: "Itauguá",
  Lambare: "Lambaré", Ypacarai: "Ypacaraí", Ypane: "Ypané", Guarambare: "Guarambaré", Paraguari: "Paraguarí",
  Parana: "Paraná", Lopez: "López", Jose: "José", Maria: "María", Ita: "Itá", Belen: "Belén",
  Humaita: "Humaitá", Tobati: "Tobatí", Atyra: "Atyrá", Yaguaron: "Yaguarón", Carapegua: "Carapeguá",
  Pirayu: "Pirayú", Martinez: "Martínez", Raul: "Raúl", Leon: "León", Simon: "Simón", Bolivar: "Bolívar",
  Tomas: "Tomás", Joaquin: "Joaquín", Cristobal: "Cristóbal", Damian: "Damián", Lazaro: "Lázaro",
  Union: "Unión", Liberacion: "Liberación", Repatriacion: "Repatriación", Jesus: "Jesús", Moises: "Moisés",
  Baez: "Báez", Diaz: "Díaz", Resquin: "Resquín", Morinigo: "Morínigo", Perez: "Pérez", Alvarez: "Álvarez",
  Felix: "Félix", Bahia: "Bahía", Saldivar: "Saldívar", Falcon: "Falcón", Chore: "Choré", Tacuati: "Tacuatí",
  Yhu: "Yhú", Tavai: "Tavaí", Yguazu: "Yguazú", Guazu: "Guazú", Cua: "Cuá", Pucu: "Pucú", Umbu: "Umbú",
  Ybyrarobana: "Ybyrarobaná", Itacurubi: "Itacurubí", Canindeyu: "Canindeyú", Neembucu: "Ñeembucú",
  "Ñeembucu": "Ñeembucú", Itapua: "Itapúa", Guaira: "Guairá", Bruguez: "Brúguez", Garay: "Garay",
  Estanislao: "Estanislao", Mbuyapey: "Mbuyapey", Ybycui: "Ybycuí", Yvycui: "Ybycuí", Acahay: "Acahay",
  Caapucu: "Caapucú", Quyquyho: "Quyquyhó", Tebicuary: "Tebicuary", Itakyry: "Itakyry", Iruña: "Iruña",
  Yasy: "Yasy", Olimpo: "Olimpo", Fassardi: "Fassardi", Ocampos: "Ocampos", Katuete: "Katueté",
  Ñacunday: "Ñacunday", Hernandarias: "Hernandarias", Cambyreta: "Cambyretá", Pirapo: "Pirapó",
  Delparana: "del Paraná", Vaqueria: "Vaquería", Yataity: "Yataity", Tavapy: "Tavapy", Capiibary: "Capiíbary",
  Itape: "Itapé", Abai: "Abaí", Sapucai: "Sapucai", Villalbin: "Villalbín", Obligado: "Obligado",
};

const LOWER = new Set(["De", "Del", "La", "Las", "Los", "Y"]);

export function departmentName(raw: string): string {
  return DEPARTMENTS[raw.trim().toUpperCase()] ?? titleCase(raw);
}

export function districtName(raw: string): string {
  return titleCase(raw);
}

function titleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      const t = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      if (i > 0 && LOWER.has(t)) return t.toLowerCase();
      return WORDS[t] ?? (w.includes(".") || /\d/.test(w) ? w : t);
    })
    .join(" ")
    .replace(/´/g, "'");
}
