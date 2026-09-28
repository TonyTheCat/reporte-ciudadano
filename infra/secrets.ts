// Valor por defecto vacío: sin captcha hasta configurarlo con
//   npx sst secret set TurnstileSecret <valor> --stage production
export const turnstileSecret = new sst.Secret("TurnstileSecret", "");

// Sal para hashear IPs (nunca se guardan en claro).
export const ipSalt = new random.RandomPassword("IpSalt", { length: 32, special: false });
