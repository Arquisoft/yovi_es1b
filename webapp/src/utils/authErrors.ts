export const SERVER_ERROR_MESSAGE =
  'Error de los servidores, intentaremos solucionarlo lo antes posible.';

export const isServerOrDatabaseError = (error: string | undefined, status: number): boolean => {
  if (status >= 500) return true;

  const normalized = (error || '').toLowerCase();
  return (
    normalized.includes('database') ||
    normalized.includes('base de datos') ||
    normalized.includes('server') ||
    normalized.includes('servidor') ||
    normalized.includes('connection') ||
    normalized.includes('conex')
  );
};
