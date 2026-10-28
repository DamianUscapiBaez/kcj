function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa .env.example.`);
  }
  return value;
}

export function getDatabaseUrl(): string {
  return required("DATABASE_URL");
}
