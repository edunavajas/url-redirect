#!/usr/bin/env bun
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Uso: bun run scripts/generate-password.ts <tu-contraseña>');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log('\n✅ Hash generado:');
console.log(`ADMIN_PASSWORD=${hash}`);
console.log('\nCopia este valor en tu archivo .env o en Coolify env vars\n');
