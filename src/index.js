import Rx, {Observable as O} from "rx"

function RxAdapter(obs) {
  this.o = obs
}

function RxBus() {
  this.s = new Rx.Subject()
}

Object.assign(RxAdapter.prototype, {
  get(multicast) {
    return multicast !== false ? this.o.share() : this.o
  },
  getp() {
    return this.o.shareReplay(1)
  },
  multicast() {
    return new RxAdapter(this.o.share())
  },
  map(fn) {
    return new RxAdapter(this.o.map(fn))
  },
  tap(fn) {
    return new RxAdapter(this.o.do(fn))
  },
  filter(fn) {
    return new RxAdapter(this.o.filter(fn))
  },
  doOnCompleted(fn) {
    return new RxAdapter(this.o.doOnCompleted(fn))
  },
  scan(fn, seed) {
    return new RxAdapter(this.o.startWith(seed).scan(fn))
  },
  flatMap(fn) {
    return new RxAdapter(this.o.flatMap(x => fn(x).get(false)))
  },
  flatMapLatest(fn) {
    return new RxAdapter(this.o.flatMapLatest(x => fn(x).get(false)))
  },
  skipDuplicates(eq) {
    return new RxAdapter(eq ? this.o.distinctUntilChanged(x => x, eq) : this.o.distinctUntilChanged())
  },
  hot(replay) {
    const obs = replay ? this.o.replay(null, 1) : this.o.publish()
    const disposable = obs.connect()
    const dispose = () => disposable.dispose()
    return [new RxAdapter(obs), dispose]
  },
  subscribe(observer) {
    const disposable = this.o.subscribe(observer.next, observer.error, observer.completed)
    return () => disposable.dispose()
  }
})

Object.assign(RxBus.prototype, {
  obs() {
    return new RxAdapter(this.s ? this.s.asObservable() : O.empty())
  },
  next(val) {
    this.s && this.s.onNext(val)
  },
  completed() {
    if (this.s) {
      const s = this.s
      this.s = void 0
      s.onCompleted()
      s.dispose()
    }
  },
  error(err) {
    if (this.s) {
      const s = this.s
      this.s = void 0
      s.onError(err)
      s.dispose()
    }
  }
})


Object.assign(RxAdapter, {
  is(obs) {
    return obs && O.isObservable(obs)
  },
  create(fn) {
    return new RxAdapter(O.create(o => {
      return fn(toObserver(o))
    }))
  },
  just(val) {
    return new RxAdapter(O.just(val))
  },
  never() {
    return new RxAdapter(O.never())
  },
  empty() {
    return new RxAdapter(O.empty())
  },
  error(err) {
    return new RxAdapter(O.throw(err))
  },
  combine(list) {
    return new RxAdapter(list.length === 0 ? O.just([]) : O.combineLatest(list.map(o => o.get(false))))
  },
  merge(obs) {
    return new RxAdapter(O.merge(obs.map(o => o.get(false))))
  },
  subscriptionToDispose(disposable) {
    return () => disposable.dispose()
  },
  disposeToSubscription(dispose) {
    return {dispose}
  },
  disposeMany(disposes) {
    const disposable = new Rx.CompositeDisposable(disposes.map(dispose => ({dispose})))
    return () => disposable.dispose()
  },
  bus() {
    return new RxBus()
  }
})

function toObserver(o) {
  return {
    next: val => o.onNext(val),
    completed: () => o.onCompleted(),
    error: err => o.onError(err)
  }
}


Rx.TSERS = RxAdapter
module.exports = Rx
