export async function sleep(time: number = 0): Promise<void> {
  await Promise.resolve();
  
  if (time <= 0){
    return;
  }

  return new Promise(resolve => setTimeout(() => resolve(), time));
}
