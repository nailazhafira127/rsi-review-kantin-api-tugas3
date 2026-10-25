export function sqlErrorNumber(err: any): number | undefined {
  return (
    err?.number ??
    err?.cause?.number ??
    err?.cause?.originalError?.info?.number ??
    err?.originalError?.info?.number
  );
}

export const isUniqueViolation = (err: unknown) => [2601, 2627].includes(sqlErrorNumber(err) ?? 0);
export const isForeignKeyViolation = (err: unknown) => sqlErrorNumber(err) === 547;