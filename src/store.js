import {
	createStore,
	combineReducers,
	applyMiddleware
} from 'redux';
import thunk from 'redux-thunk';

import reducers from './reducers';

const windowRef = typeof window === 'undefined' ? {} : window;
// console log middleware
const consoleLog = store => next => action => {
	if (typeof action !== 'function') {
		console.log(action);
	}
	return next(action);
};

// local storage middleware
const localStorageMiddleware = store => next => action => {
	next(action);
	const state = store.getState();

	if (!state || !state.loginAccount || !state.loginAccount.id) {
		return;
	}

	if (windowRef.localStorage && windowRef.localStorage.setItem) {
		windowRef.localStorage.setItem(state.loginAccount.id, JSON.stringify({
			favorites: state.favorites,
			transactionsData: state.transactionsData,
			accountTrades: state.accountTrades
		}));
	}
};
let middleWare;
if (process.env.NODE_ENV !== 'production') {
	middleWare = applyMiddleware(consoleLog, thunk, localStorageMiddleware);
} else {
	middleWare = applyMiddleware(thunk, localStorageMiddleware);
}
// middleware
export default createStore(combineReducers(reducers), middleWare);
