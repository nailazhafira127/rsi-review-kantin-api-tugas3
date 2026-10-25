import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openApiDocument } from './openapi.ts';

const outputFile = resolve(process.cwd(), 'src', 'docs', 'swagger-output.json');

async function main(): Promise<void> {
  await writeFile(outputFile, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
  console.log(`Dokumentasi OpenAPI berhasil dibuat: ${outputFile}`);
}

main().catch((error: unknown) => {
  console.error('Gagal membuat dokumentasi OpenAPI:', error);
  process.exitCode = 1;
});
