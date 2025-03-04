import { Task } from './queue';

export async function runParallel<Result, Worker>(
  tasks: () => AsyncGenerator<Task<Result, Worker>, void>,
  workers: Worker[]
) {
  const results: Result[] = [];

  const generator = tasks();

  await Promise.all(
    [...new Array(workers.length).keys()].map(
      (idx) =>
        new Promise<void>((resolve, reject) => {
          async function nextTask() {
            const { done, value: task } = await generator.next();

            if (done === true || !task) {
              return resolve();
            }

            try {
              const worker = workers[idx];
              const result = await task(worker);
              results.push(result);

              return await nextTask();
            } catch (error) {
              reject(error);
            }
          }

          return nextTask();
        })
    )
  );

  return results;
}
