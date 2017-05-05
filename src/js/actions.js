import Zotero from 'libzotero';

export const SELECT_LIBRARY = 'SELECT_LIBRARY';
export const SELECT_ITEM = 'SELECT_ITEM';

export const REQUEST_FETCH_ITEMS = 'REQUEST_FETCH_ITEMS';
export const RECEIVE_FETCH_ITEMS = 'RECEIVE_FETCH_ITEMS';
export const ERROR_FETCH_ITEMS = 'ERROR_FETCH_ITEMS';

export const REQUEST_FETCH_COLLECTIONS = 'REQUEST_FETCH_COLLECTIONS';
export const RECEIVE_FETCH_COLLECTIONS = 'RECEIVE_FETCH_COLLECTIONS';
export const ERROR_FETCH_COLLECTIONS = 'ERROR_FETCH_COLLECTIONS';

export const REQUEST_UPDATE_ITEM = 'REQUEST_UPDATE_ITEM';
export const RECEIVE_UPDATE_ITEM = 'RECEIVE_UPDATE_ITEM';
export const ERROR_UPDATE_ITEM = 'ERROR_UPDATE_ITEM';

export const REQUEST_CREATOR_TYPES = 'REQUEST_CREATOR_TYPES';
export const RECEIVE_CREATOR_TYPES = 'RECEIVE_CREATOR_TYPES';
export const ERROR_CREATOR_TYPES = 'ERROR_CREATOR_TYPES';

export const REQUEST_CHILD_ITEMS = 'REQUEST_CHILD_ITEMS';
export const RECEIVE_CHILD_ITEMS = 'RECEIVE_CHILD_ITEMS';
export const ERROR_CHILD_ITEMS = 'ERROR_CHILD_ITEMS';

export const TRIGGER_EDITING_ITEM = 'TRIGGER_EDITING_ITEM';
export const TRIGGER_RESIZE_VIEWPORT = 'TRIGGER_RESIZE_VIEWPORT';

export function selectLibrary(type, id, key) {
	let library = new Zotero.Library(type, id, null, key);
	
	return {
		type: SELECT_LIBRARY,
		library: library
	};
}

export function requestCollections(libraryString) {
	return {
		type: REQUEST_FETCH_COLLECTIONS,
		libraryString
	};
}

export function receiveCollections(libraryString, collections) {
	collections.sort(
		(a, b) => a.apiObj.data.name.toUpperCase().localeCompare(b.apiObj.data.name.toUpperCase())
	);
	return {
		type: RECEIVE_FETCH_COLLECTIONS,
		libraryString,
		collections,
		receivedAt: Date.now()
	};
}

export function requestItems(collectionKey) {
	return {
		type: REQUEST_FETCH_ITEMS,
		collectionKey
	};
}

export function receiveItems(collectionKey, items) {
	items.sort(
		(a, b) => {
			return (a.get('title') || '').toUpperCase().localeCompare((b.get('title') || '').toUpperCase());
		}
	);

	return {
		type: RECEIVE_FETCH_ITEMS,
		collectionKey,
		items,
		receivedAt: Date.now()
	};
}

export function selectItem(index) {
	return {
		type: SELECT_ITEM,
		index
	};
}

export function errorFetchingCollection(libraryString, error) {
	return {
		type: ERROR_FETCH_COLLECTIONS,
		libraryString,
		error
	};
}

export function errorFetchingItems(error) {
	return {
		type: ERROR_FETCH_ITEMS,
		error
	};
}

export function sellectItem(index) {
	return {
		type: SELECT_ITEM,
		index
	};
}

//@TODO: add return value
function fetchCollections(library) {
	return async dispatch => {
		dispatch(requestCollections(library.libraryString));
		try {
			await library.loadUpdatedCollections();
			dispatch(receiveCollections(
				library.libraryString,
				library.collections.objectArray
			));
		} catch(error) {
			console.warn(error);
			dispatch(errorFetchingCollection(
				library.libraryString,
				error.message
			));
		}
	};
}

export function fetchCollectionsIfNeeded(library) {
	return (dispatch, getState) => {
		let state = getState();
		if(!state.collections[library]) {
			dispatch(fetchCollections(library));
		}
	};
}


//@TODO: add return value
function fetchItems(collection, library) {
	return async dispatch => {
		dispatch(requestItems(collection.key));
		try {
			let response = await library.loadItems({
				limit: 50,
				collectionKey: collection.key
			});
			//@TODO: support for paging/infinite scroll
			// response.totalResults
			if(response.status === 200) {
				//@TODO: fix a memory leak/duplicate items in storage
				console.warn('items stored in the library: ', library.items.objectArray.length, library.items.objectArray);
				dispatch(receiveItems(collection.key, response.loadedItems));
			} else {
				//@TODO: handle for various responses including response.backoff == true
				dispatch(errorFetchingItems(`Unexpected response from the API ${response.rawResponse.status} ${response.rawResponse.statusText}`));	
			}

		} catch(error) {
			dispatch(errorFetchingItems(error.message));
		}
	};
}

export function fetchItemsIfNeeded(collection) {
	return (dispatch, getState) => {
		let state = getState();
		if(!state.items[collection]) {
			return dispatch(fetchItems(collection, state.library));
		}
	};
}

export function updateItem(item, fieldKey) {
	return async dispatch => {
		dispatch(requestUpdateItem(item, fieldKey));
		try {
			let responses = await item.writeItem();
			if(responses && responses.length && responses[0].status >= 200 && responses[0].status < 300) {
				let updatedItem = responses[0].returnItems[0];
				if(updatedItem.writeFailure) {
					dispatch(errorUpdateItem(updatedItem.writeFailure.message, item, fieldKey));
				} else {
					dispatch(receiveUpdateItem(item, fieldKey));
					return updatedItem;
				}
			} else {
				dispatch(errorUpdateItem('Unexpected response from the API', item, fieldKey));	
				throw new Error('Unexpected response from the API');
			}
		} catch(c) {
			dispatch(errorUpdateItem(c.message, item, fieldKey));
			throw c;
		}
	};
}


export function requestUpdateItem(item, fieldKey) {
	return {
		type: REQUEST_UPDATE_ITEM,
		item,
		fieldKey
	};
}

export function receiveUpdateItem(item, fieldKey) {
	return {
		type: RECEIVE_UPDATE_ITEM,
		item,
		fieldKey
	};
}

export function errorUpdateItem(error, item, fieldKey) {
	return {
		type: ERROR_UPDATE_ITEM,
		error,
		item,
		fieldKey
	};
}

export function fetchCreatorTypes(itemType) {
	return async dispatch => {
		dispatch(requestCreatorTypes(itemType));
		try {
			let creatorTypes = await Zotero.Item.prototype.getCreatorTypes(itemType);
			dispatch(receiveCreatorTypes(itemType, creatorTypes));
		} catch(error) {
			dispatch(errorCreatorTypes(error.message, itemType));
		}
	};
}

export function requestCreatorTypes(itemType) {
	return {
		type: REQUEST_CREATOR_TYPES,
		itemType
	};
}

export function receiveCreatorTypes(itemType, creatorTypes) {
	return {
		type: RECEIVE_CREATOR_TYPES,
		itemType,
		creatorTypes
	};
}

export function errorCreatorTypes(error, itemType) {
	return {
		type: ERROR_CREATOR_TYPES,
		error,
		itemType
	};
}

// export function fetchChildItems(parentItem) {
// 	return async dispatch => {
// 		dispatch(requestChildItems(parentItem));
// 		try {
// 			let childItems = await parentItem.getChildren();
// 			dispatch(receiveCreatorTypes(itemType, creatorTypes));
// 		} catch(error) {
// 			dispatch(errorCreatorTypes(error.message, itemType));
// 		}
// 	};
// }

export function requestChildItems(parentItem) {
	return {
		type: REQUEST_CHILD_ITEMS,
		parentItem
	};
}

export function receiveChildItems(parentItem, childItems) {
	return {
		type: RECEIVE_CHILD_ITEMS,
		parentItem,
		childItems
	};
}

export function errorChildItems(error, parentItem) {
	return {
		type: ERROR_CHILD_ITEMS,
		error,
		parentItem
	};
}

export function triggerEditingItem(itemKey, editing) {
	return {
		type: TRIGGER_EDITING_ITEM,
		itemKey,
		editing
	};
}

export function triggerResizeViewport(width, height) {
	return {
		type: TRIGGER_RESIZE_VIEWPORT,
		width,
		height
	};
}