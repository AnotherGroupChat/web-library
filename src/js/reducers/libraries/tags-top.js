import deepEqual from 'deep-equal';
import { DROP_COLORED_TAGS_IN_TOP_ITEMS, DROP_TAGS_IN_TOP_ITEMS, ERROR_COLORED_TAGS_IN_TOP_ITEMS,
	ERROR_TAGS_IN_TOP_ITEMS, RECEIVE_ADD_TAGS_TO_ITEMS, RECEIVE_COLORED_TAGS_IN_TOP_ITEMS,
	RECEIVE_CREATE_ITEM, RECEIVE_CREATE_ITEMS, RECEIVE_DELETE_TAGS, RECEIVE_FETCH_ITEMS,
	RECEIVE_MOVE_ITEMS_TRASH, RECEIVE_RECOVER_ITEMS_TRASH, RECEIVE_TAGS_IN_TOP_ITEMS,
	RECEIVE_UPDATE_ITEM, REQUEST_COLORED_TAGS_IN_TOP_ITEMS, REQUEST_TAGS_IN_TOP_ITEMS,
	RECEIVE_LIBRARY_SETTINGS, RECEIVE_UPDATE_LIBRARY_SETTINGS, RECEIVE_DELETE_LIBRARY_SETTINGS, }
	from '../../constants/actions';
import { detectIfItemsChanged, filterTags, populateTags, updateFetchingState } from '../../common/reducers';
import { omit } from '../../common/immutable';

const tagsTop = (state = {}, action, { items } = {}) => {
	switch(action.type) {
		case REQUEST_TAGS_IN_TOP_ITEMS:
			return {
				...state,
				...updateFetchingState(state, action),
			}
		case RECEIVE_TAGS_IN_TOP_ITEMS:
			return {
				...state,
				...populateTags(state, action.tags, action),
				...updateFetchingState(state, action),
			};
		case DROP_TAGS_IN_TOP_ITEMS:
		case ERROR_TAGS_IN_TOP_ITEMS:
			return {
				...state,
				...updateFetchingState(state, action),
			};
		case REQUEST_COLORED_TAGS_IN_TOP_ITEMS:
			return {
				...state,
				isFetchingColoredTags: true,
			}
		case RECEIVE_COLORED_TAGS_IN_TOP_ITEMS:
			return {
				...state,
				coloredTags: action.tags.map(t => t.tag),
				isFetchingColoredTags: false,
			}
		case ERROR_COLORED_TAGS_IN_TOP_ITEMS:
		case DROP_COLORED_TAGS_IN_TOP_ITEMS:
			return {
				...state,
				isFetchingColoredTags: false,
			}
		case RECEIVE_CREATE_ITEM:
			return 'tags' in action.item && action.item.tags.length > 0 ?
				{} : state;
		case RECEIVE_CREATE_ITEMS:
		case RECEIVE_MOVE_ITEMS_TRASH:
		case RECEIVE_RECOVER_ITEMS_TRASH:
			return action.items.some(item => 'tags' in item && item.tags.length > 0) ?
				{} : state;
		case RECEIVE_UPDATE_ITEM:
			return 'tags' in action.patch ? {} : state;
		case RECEIVE_DELETE_TAGS:
			return filterTags(state, action.tags);
		case RECEIVE_ADD_TAGS_TO_ITEMS:
			return {};
		case RECEIVE_FETCH_ITEMS:
			return detectIfItemsChanged(
				action, items,
				(newItem, oldItem = {}) => (!newItem.deleted && !oldItem.deleted) && (!deepEqual(newItem.tags, oldItem.tags))
			) ? {} : state
		case RECEIVE_LIBRARY_SETTINGS:
		case RECEIVE_UPDATE_LIBRARY_SETTINGS:
		case RECEIVE_DELETE_LIBRARY_SETTINGS:
			return omit(state, 'coloredTags');
		default:
			return state;
	}
};

export default tagsTop;
