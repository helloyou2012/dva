import expect from 'expect';
import React from 'react';
import dva from '../src/index';

const delay = (timeout) => new Promise(resolve => setTimeout(resolve, timeout));

describe('effects', () => {

  it('type error', () => {
    const app = dva();
    expect(_ => {
      app.model({
        namespace: '_',
        effects: [],
      });
    }).toThrow(/app.model: effects should be Object/);
    expect(_ => {
      app.model({
        namespace: '_',
        effects: '_',
      });
    }).toThrow(/app.model: effects should be Object/);
    expect(_ => {
      app.model({
        namespace: '_',
        effects: {},
      });
    }).toNotThrow();
  });

  it('put action', (done) => {
    const app = dva();
    app.model({
      namespace: 'count',
      state: 0,
      reducers: {
        add(state, { payload }) { return state + payload || 1 },
      },
      effects: {
        *addDelay({ payload }, { put, call }) {
          yield call(delay, 100);
          yield put({ type: 'add', payload });
        },
      },
    });
    app.router(_ => <div />);
    app.start();
    app._store.dispatch({ type: 'count/addDelay', payload: 2});
    expect(app._store.getState().count).toEqual(0);
    setTimeout(_ => {
      expect(app._store.getState().count).toEqual(2);
      done();
    }, 200);
  });

  it('put action with namespace will get a warning', (done) => {
    const app = dva();
    app.model({
      namespace: 'count',
      state: 0,
      reducers: {
        add(state, { payload }) { return state + payload || 1 },
      },
      effects: {
        *addDelay({ payload }, { put, call }) {
          yield call(delay, 100);
          yield put({ type: 'count/add', payload });
        },
      },
    });
    app.router(_ => <div />);
    app.start();
    app._store.dispatch({ type: 'count/addDelay', payload: 2});
    expect(app._store.getState().count).toEqual(0);
    setTimeout(_ => {
      expect(app._store.getState().count).toEqual(2);
      done();
    }, 200);
  });

  it('dispatch action for other models', () => {
    const app = dva();
    app.model({
      namespace: 'loading',
      state: false,
      reducers: {
        show() { return true; },
      },
    });
    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        *addDelay(_, { put, call }) {
          yield put({ type: 'loading/show' });
        },
      },
    });
    app.router(_ => <div />);
    app.start();
    app._store.dispatch({ type: 'count/addDelay'});
    expect(app._store.getState().loading).toEqual(true);
  });

  it('onError', () => {
    const errors = [];
    const app = dva({
      onError: (error) => {
        errors.push(error.message);
      }
    });
    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        *addDelay() {
          throw new Error('effect error');
        },
      },
    });
    app.router(({ history }) => <div />);
    app.start();
    app._store.dispatch({ type: 'count/addDelay' });
    expect(errors).toEqual(['effect error']);
  });

  it('type: takeLatest', (done) => {
    const app = dva();
    const takeLatest = { type: 'takeLatest' };
    app.model({
      namespace: 'count',
      state: 0,
      reducers: {
        add(state, { payload }) { return state + payload || 1 },
      },
      effects: {
        addDelay: [function*({ payload }, { call, put }) {
          yield call(delay, 100);
          yield put({ type: 'add', payload });
        }, takeLatest],
      },
    });
    app.router(_ => <div />);
    app.start();

    // Only catch the last one.
    app._store.dispatch({ type: 'count/addDelay', payload: 2 });
    app._store.dispatch({ type: 'count/addDelay', payload: 3 });

    setTimeout(() => {
      expect(app._store.getState().count).toEqual(3);
      done();
    }, 200);
  });


  it('type: watcher', (done) => {
    const watcher = { type: 'watcher' };
    const app = dva();
    app.model({
      namespace: 'count',
      state: 0,
      reducers: {
        add(state, { payload }) { return state + payload || 1 },
      },
      effects: {
        addWatcher: [function*({ take, put, call }) {
          /*eslint-disable no-constant-condition*/
          while (true) {
            const { payload } = yield take('add');
            yield call(delay, 100);
            yield put({ type: 'add', payload });
          }
        }, watcher],
      }
    });
    app.router(({ history }) => <div />);
    app.start();

    // Only catch the first one.
    app._store.dispatch({ type: 'add', payload: 2 });
    app._store.dispatch({ type: 'add', payload: 3 });

    setTimeout(() => {
      expect(app._store.getState().count).toEqual(2);
      done();
    }, 200);
  });

  xit('nonvalid type', () => {
    const app = dva();
    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        addDelay: [function*() {}, { type: 'nonvalid' }],
      },
    });
    app.router(_ => <div />);

    expect(_ => {
      app.start();
    }).toThrow(/app.start: effect type should be takeEvery, takeLatest or watcher/);
  });

});

