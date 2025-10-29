import { handler as processQueue } from './process.ts';

export default async function main() {
  await processQueue();
}

main();
