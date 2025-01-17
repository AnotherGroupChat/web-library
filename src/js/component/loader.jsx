import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Icon from 'component/ui/icon';
import EmbedLibrary from 'component/embedded-library';
import Library from 'component/library';
import { preferencesLoad, initialize, fetchLibrarySettings, fetchAllCollections, fetchAllGroups,
toggleTransitions, triggerResizeViewport } from 'actions';
import { get } from 'utils';

const LoadingCover = () => {
	const maxRequestsPendingSeen = useRef(0);
	const libraryKey = useSelector(state => state.current.libraryKey);
	const requestsPending = useSelector(state => state.libraries[libraryKey]?.sync?.requestsPending);
	const progress = Math.round(((maxRequestsPendingSeen.current - requestsPending) / maxRequestsPendingSeen.current) * 100);

	useEffect(() => {
		if(requestsPending > maxRequestsPendingSeen.current) {
			maxRequestsPendingSeen.current = requestsPending;
		}
	}, [requestsPending])

	return (
		<div className="loading-cover">
			<Icon type={ '32/z' } width="32" height="32" />
			{ (maxRequestsPendingSeen.current > 5 && requestsPending <= maxRequestsPendingSeen.current) && (
				<div className="circular-progress-bar">
					<svg viewBox="0 0 200 200">
						<circle className="back" cx="100" cy="100" r="95" />
						<circle
							className="front"
							strokeDasharray="600"
							strokeDashoffset={ 600 - (600 * (progress/100)) }
							cx="100"
							cy="100"
							r="95"
						/>
					</svg>
				</div>
			) }
		</div>
	);
};

const Loader = () => {
	const dispatch = useDispatch();

	const isEmbedded = useSelector(state => state.config.isEmbedded);
	const libraryKey = useSelector(state => state.current.libraryKey);
	const view = useSelector(state => state.current.view);
	const userLibraryKey = useSelector(state => state.current.userLibraryKey);
	const config = useSelector(state => state.config);
	const itemTypes = useSelector(state => state.meta.itemTypes);
	const itemFields = useSelector(state => state.meta.itemFields);
	const creatorFields = useSelector(state => state.meta.creatorFields);

	const tagColors = useSelector(state => get(state, ['libraries', libraryKey, 'tagColors', 'lookup'], null));
	const isFetchingGroups = useSelector(state => state.fetching.allGroups);
	const isFetchingAllCollections = useSelector(
		state => get(state, ['libraries', libraryKey, 'collections', 'isFetchingAll'], null)
	);
	const hasCheckedCollections = useSelector(
		state => get(state, ['libraries', libraryKey, 'collections', 'totalResults'], null) !== null
	);
	const isReader = view === 'reader';
	const isWaitingForCollections = !isReader && (!hasCheckedCollections || isFetchingAllCollections);

	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (isReader && tagColors && !isFetchingGroups) {
			setIsReady(true);
		} else if(itemTypes && itemFields && creatorFields && tagColors && !isWaitingForCollections && !isFetchingGroups) {
			setIsReady(true);
		}
	}, [itemTypes, itemFields, creatorFields, tagColors, isWaitingForCollections, isFetchingGroups, isReader]);

	useEffect(() => {
		dispatch(preferencesLoad());
		dispatch(initialize());
		dispatch(triggerResizeViewport(window.innerWidth, window.innerHeight));
		dispatch(fetchLibrarySettings(libraryKey));
		dispatch(toggleTransitions(true));

		if(isReader && config.includeUserGroups && libraryKey !== userLibraryKey) {
			// we're in reader mode, but in a group so we still need to fetch groups data
			dispatch(fetchAllGroups(userLibraryKey));
		}

		if(!isReader) {
			dispatch(fetchAllCollections(libraryKey));

			if(config.includeUserGroups) {
				dispatch(fetchAllGroups(userLibraryKey));
			}
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return isReady ? isEmbedded ? <EmbedLibrary /> : <Library /> : isReader ? null : <LoadingCover />;
}

export default Loader;
