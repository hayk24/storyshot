export async function asyncTimer<T>(promise: Promise<T>): Promise<[T, number]> {
  const start = Date.now();
  const result = await promise;
  const end = Date.now();
  
  return [result, end - start];
}