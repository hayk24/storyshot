export type QueueController<Request> = {
  push: (request: Request) => void;
}

export type Task<Result, Worker> = (worker: Worker) => Promise<Result>;

type CreateDelegationTask<Request, Result, Worker> = (
  request: Request,
  controller: QueueController<Request>,
) => Task<Result, Worker>;

export class Queue<Request, Result, Worker> {
  private isContinue = true;
  private readonly createDelegationTask;
  private readonly futureRequests: Promise<Request>[] = [];

  constructor( initialRequests: Request[], createDelegationTask: CreateDelegationTask<Request, Result, Worker>) {
    this.createDelegationTask = createDelegationTask;

    for (const request of initialRequests) {
      this.push(request);
    }
  }

  push(request: Request) {
    this.futureRequests.push(Promise.resolve(request));
  }

  close() {
    this.isContinue = false;
  }

  async *tasks(): AsyncGenerator<Task<Result, Worker>, void> {
    const controller = this.createQueueController();
    
    while (this.isContinue === true && this.futureRequests.length > 0) {
      try {
        const futureRequest = this.futureRequests.shift()!;
        const request = await futureRequest;
        yield this.createTask(request, controller);
      } catch (error) {}
    }
  }

  createQueueController(): QueueController<Request> {
    return {
      push: this.push.bind(this),
    };
  }

  private createTask(request: Request, controller: QueueController<Request>) {
    const delegateTask = this.createDelegationTask(request, controller);

    return async (worker: Worker) => {
      const result = await delegateTask(worker);
      
      if (this.futureRequests.length === 0) {
        this.close();
      }

      return result;
    };
  }
}
