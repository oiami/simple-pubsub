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

class LowStockWarningEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'low-stock-warning';
  }
}

class StockLevelOkEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'stock-level-ok';
  }
}

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];
  private readonly _pubSubService: IPublishSubscribeService;

  constructor(machines: Machine[], pubSubService: IPublishSubscribeService) {
    this.machines = machines;
    this._pubSubService = pubSubService;
  }

  handle(event: MachineSaleEvent): void {
    const machineId: string = event.machineId();
    const targetMachine: Maybe<Machine> = this.machines.find(
      (machine: Machine) => machine.id === machineId
    );

    if (targetMachine) {
      targetMachine.stockLevel -= event.getSoldQuantity();
      if (targetMachine.stockLevel < 3) {
        this._pubSubService.publish(new LowStockWarningEvent(targetMachine.id));
      }
    } else {
      console.error(`Machine with ${machineId} not found`);
    }
  }
}

class MachineRefillSubscriber implements ISubscriber {
  public machines: Machine[];
  private readonly _pubSubService: IPublishSubscribeService;

  constructor(machines: Machine[], pubSubService: IPublishSubscribeService) {
    this.machines = machines;
    this._pubSubService = pubSubService;
  }

  handle(event: MachineRefillEvent): void {
    const machineId: string = event.machineId();
    const targetMachine: Maybe<Machine> = this.machines.find(
      (machine: Machine) => machine.id === machineId
    );
    if (targetMachine) {
      const currentQty = targetMachine.stockLevel;
      targetMachine.stockLevel = currentQty + event.getRefillQuantity();
      if (currentQty < 3 && targetMachine.stockLevel >= 3) {
        // publish only first time crossing ratio
        this._pubSubService.publish(new StockLevelOkEvent(targetMachine.id));
      } else if (targetMachine.stockLevel < 3) {
        // may be after refill the quantity still low
        this._pubSubService.publish(new LowStockWarningEvent(targetMachine.id));
      }
    } else {
      console.error(`Machine with ${machineId} not found`);
    }
  }
}

class StockWarningSubscriber implements ISubscriber {
  public machines: Machine[];
  private readonly _pubSubService: IPublishSubscribeService;

  constructor(machines: Machine[], pubSubService: IPublishSubscribeService) {
    this.machines = machines;
    this._pubSubService = pubSubService;
  }

  handle(event: LowStockWarningEvent): void {
    // Stock level is low, the machine should be refilled
    this._pubSubService.publish(
      new MachineRefillEvent(Math.floor(Math.random() * 9), event.machineId())
    );
  }
}

class StockLevelOkSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: StockLevelOkEvent): void {
    console.log(`Now the stock level of machine ${event.machineId()} is OK`);
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
  }

  public subscribe(type: string, handler: ISubscriber): void {
    if (!this._subscribers[type]) {
      this._subscribers[type] = [];
    }

    this._subscribers[type].push(handler);
  }

  public unsubscribe(type: string, handler: ISubscriber): void {
    const subscribers: ISubscriber[] = this._subscribers[type];
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
  const random: number = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';
};

const eventGenerator = (): IEvent => {
  const random: number = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
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

  // // create the PubSub service
  const pubSubService: IPublishSubscribeService =
    new PublishSubscriberService();

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber: MachineSaleSubscriber = new MachineSaleSubscriber(
    machines,
    pubSubService
  );
  const refillSubscriber: MachineRefillSubscriber = new MachineRefillSubscriber(
    machines,
    pubSubService
  );

  const stockWarningSubscriber: StockWarningSubscriber =
    new StockWarningSubscriber(machines, pubSubService);

  const stockLevelOkSubscriber: StockLevelOkSubscriber =
    new StockLevelOkSubscriber(machines);

  pubSubService.subscribe('sale', saleSubscriber);
  pubSubService.subscribe('refill', refillSubscriber);
  pubSubService.subscribe('low-stock-warning', stockWarningSubscriber);
  pubSubService.subscribe('stock-level-ok', stockLevelOkSubscriber);

  // create 5 random events
  const events: IEvent[] = [1, 2, 3, 4, 5].map((i) => eventGenerator());

  // publish the events
  events.map((e) => pubSubService.publish(e));

  pubSubService.unsubscribe('refill', refillSubscriber);
  pubSubService.unsubscribe('sale', saleSubscriber);
  pubSubService.unsubscribe('low-stock-warning', stockWarningSubscriber);
  pubSubService.unsubscribe('stock-level-ok', stockLevelOkSubscriber);
})();
