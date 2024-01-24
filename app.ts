// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: string, handler: ISubscriber): void;
  unsubscribe(type: string, handler: ISubscriber): void;
}

// type
type Maybe<T> = T | undefined | null;

// implementations
class MachineSaleEvent implements IEvent {
  constructor(
    private readonly _sold: number,
    private readonly _machineId: string
  ) {}

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold;
  }

  type(): string {
    return 'sale';
  }
}

class MachineRefillEvent implements IEvent {
  constructor(
    private readonly _refill: number,
    private readonly _machineId: string
  ) {}

  machineId(): string {
    return this._machineId;
  }

  getRefillQuantity(): number {
    return this._refill;
  }

  type(): string {
    return 'refill';
  }
}

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineSaleEvent): void {
    const machineId: string = event.machineId();
    const targetMachine: Maybe<Machine> = this.machines.find(
      (m) => m.id === machineId
    );
    if (targetMachine) {
      targetMachine.stockLevel -= event.getSoldQuantity();
    } else {
      console.log(`Machine with ${machineId} not found`);
    }
  }
}

class MachineRefillSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineRefillEvent): void {
    const machineId: string = event.machineId();
    const targetMachine: Maybe<Machine> = this.machines.find(
      (m) => m.id === machineId
    );
    if (targetMachine) {
      targetMachine.stockLevel += event.getRefillQuantity();
    } else {
      console.log(`Machine with ${machineId} not found`);
    }
  }
}

class StockWarningSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: IEvent): void {
    console.log('here');
  }
}
// objects
class Machine {
  public stockLevel = 10;
  public id: string;

  constructor(id: string) {
    this.id = id;
  }
}

class PublishSubscriberService implements IPublishSubscribeService {
  private readonly _subscribers: { [key: string]: ISubscriber[] } = {};

  public publish(event: IEvent): void {
    const eventType = event.type();

    if (this._subscribers[eventType]) {
      this._subscribers[eventType].forEach((subscriber) => {
        subscriber.handle(event);
      });
    }

    this._subscribers['stock-warning'].forEach((subscriber) =>
      subscriber.handle(event)
    );
  }

  public subscribe(type: string, handler: ISubscriber): void {
    if (!this._subscribers[type]) {
      this._subscribers[type] = [];
    }

    this._subscribers[type].push(handler);
  }

  public unsubscribe(type: string, handler: ISubscriber): void {
    const subscribers = this._subscribers[type];
    if (subscribers) {
      const handlerIndex = subscribers.indexOf(handler);
      if (handlerIndex != -1) {
        subscribers.splice(handlerIndex, 1);
      }
    }
  }
}

// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';
};

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 8; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
};

// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [
    new Machine('001'),
    new Machine('002'),
    new Machine('003')
  ];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber: MachineSaleSubscriber = new MachineSaleSubscriber(
    machines
  );
  const refillSubscriber: MachineRefillSubscriber = new MachineRefillSubscriber(
    machines
  );
  const stockWarningSubscriber = new StockWarningSubscriber(machines);

  // // create the PubSub service
  const pubSubService: IPublishSubscribeService =
    new PublishSubscriberService();

  pubSubService.subscribe('sale', saleSubscriber);
  pubSubService.subscribe('refill', refillSubscriber);
  pubSubService.subscribe('stock-warning', stockWarningSubscriber);

  // create 5 random events
  const events: IEvent[] = [1, 2, 3, 4, 5].map((i) => eventGenerator());

  // publish the events
  events.map((e) => pubSubService.publish(e));

  pubSubService.unsubscribe('refill', refillSubscriber);
  pubSubService.unsubscribe('sale', saleSubscriber);
})();
