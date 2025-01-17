import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import PropTypes from 'prop-types';
import Dropdown from 'reactstrap/es/Dropdown';
import DropdownItem from 'reactstrap/es/DropdownItem';
import DropdownMenu from 'reactstrap/es/DropdownMenu';
import DropdownToggle from 'reactstrap/es/DropdownToggle';
import { stopPropagation, noop } from '../../utils';

import Icon from 'component/ui/icon';
import RichEditor from 'component/rich-editor';
import { dateLocalized } from 'common/format';
import { get } from 'utils';
import { deleteUnusedEmbeddedImages, getAttachmentUrl, updateItem, exportAttachmentWithAnnotations } from 'actions';
import { useForceUpdate } from 'hooks';
import { makePath } from '../../common/navigation';
import Button from '../../component/ui/button';
import Spinner from '../ui/spinner';
import { isTriggerEvent } from '../../common/event';
import { useFocusManager, usePrepForUnmount, usePrevious } from '../../hooks';

const AttachmentDetails = ({ attachmentKey, isReadOnly }) => {
	const dispatch = useDispatch();
	const timeoutRef = useRef(null);
	const shouldUseTabs = useSelector(state => state.device.shouldUseTabs);
	const attachment = useSelector(
		state => get(state, ['libraries', state.current.libraryKey, 'items', attachmentKey], {}),
		shallowEqual
	);
	const libraryKey = useSelector(state => state.current.libraryKey);
	const isFetchingUrl = useSelector(state => get(state, ['libraries', libraryKey, 'attachmentsUrl', attachmentKey, 'isFetching'], false));
	const url = useSelector(state => get(state, ['libraries', libraryKey, 'attachmentsUrl', attachmentKey, 'url']));
	const timestamp = useSelector(state => get(state, ['libraries', libraryKey, 'attachmentsUrl', attachmentKey, 'timestamp'], 0));
	const isPreppingPDF = useSelector(state => state.libraries[libraryKey]?.attachmentsExportPDF[attachmentKey]?.isFetching);
	const preppedPDFURL = useSelector(state => state.libraries[libraryKey]?.attachmentsExportPDF[attachmentKey]?.blobURL);
	const preppedPDFFileName = useSelector(state => state.libraries[libraryKey]?.attachmentsExportPDF[attachmentKey]?.fileName);
	const collectionKey = useSelector(state => state.current.collectionKey);
	const itemKey = useSelector(state => state.current.itemKey);
	const qmode = useSelector(state => state.current.qmode);
	const search = useSelector(state => state.current.search);
	const tags = useSelector(state => state.current.tags);
	const config = useSelector(state => state.config);
	const isTouchOrSmall = useSelector(state => state.device.isTouchOrSmall);
	const prevAttachmentKey = usePrevious(attachmentKey);
	const isStandaloneAttachment = attachmentKey === itemKey;
	const downloadOptionsRef = useRef(null);
	const openInReaderPath = makePath(config, {
		library: libraryKey,
		collection: collectionKey,
		items: isStandaloneAttachment ? [attachmentKey] : [itemKey],
		attachmentKey: isStandaloneAttachment ? null : attachmentKey,
		view: 'reader',
		qmode: qmode,
		search: search,
		tags: tags,
	});

	const isPDF = attachment.contentType === 'application/pdf';
	const hasURL = !!attachment[Symbol.for('links')]?.enclosure;
	const urlIsFresh = url && Date.now() - timestamp < 60000;

	const forceRerender = useForceUpdate();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const { focusBySelector, focusNext, focusPrev, receiveFocus, receiveBlur } = useFocusManager(downloadOptionsRef);

	const handleChangeNote = useCallback((newContent, key) => {
		dispatch(updateItem(key, { note: newContent }));
	}, [dispatch]);

	const handleExport = useCallback(() => {
			dispatch(exportAttachmentWithAnnotations(attachmentKey));
	}, [attachmentKey, dispatch]);

	const handleKeyDown = useCallback(ev => {
		const eventInsideDropdown = ev.currentTarget?.classList.contains('dropdown-item');

		if (eventInsideDropdown && ["ArrowLeft", "ArrowRight", "Escape"].includes(ev.key)) {
			setIsDropdownOpen(false);
			ev.preventDefault();
			ev.stopPropagation();
			focusBySelector('.dropdown-toggle');
		} else if (isTriggerEvent(ev) && !ev.currentTarget?.classList.contains('dropdown-toggle')) {
			// simulate click() on button or link, except for droppdown toggle which handles its own events
			ev.currentTarget.click();
			ev.preventDefault();
			ev.stopPropagation();
		} else if (ev.key === "ArrowLeft") {
			focusPrev(ev);
			setIsDropdownOpen(false);
		} else if (ev.key === "ArrowRight") {
			focusNext(ev);
			setIsDropdownOpen(false);
		}
	}, [focusBySelector, focusNext, focusPrev]);

	const handleToggleDropdown = useCallback(() => {
		setIsDropdownOpen(state => !state);
	}, []);

	useEffect(() => {
		if(urlIsFresh) {
			const urlExpiresTimestamp = timestamp + 60000;
			const urlExpriesFromNow = urlExpiresTimestamp - Date.now();
			clearTimeout(timeoutRef.current);
			timeoutRef.current = setTimeout(forceRerender, urlExpriesFromNow);
		}
		return () => clearTimeout(timeoutRef.current); // eslint-disable-line react-hooks/exhaustive-deps
	}, [forceRerender, urlIsFresh, timestamp, attachmentKey, dispatch, isFetchingUrl]);

	useEffect(() => {
		if (!urlIsFresh && !isFetchingUrl && hasURL) {
			dispatch(getAttachmentUrl(attachmentKey));
		}
	}, [attachmentKey, isFetchingUrl, urlIsFresh, dispatch, hasURL]);

	useEffect(() => {
		if (prevAttachmentKey && prevAttachmentKey !== attachmentKey) {
			dispatch(deleteUnusedEmbeddedImages(prevAttachmentKey));
		}
	}, [attachment, attachmentKey, dispatch, prevAttachmentKey]);

	usePrepForUnmount(lastSeenAttachmentKey => {
		dispatch(deleteUnusedEmbeddedImages(lastSeenAttachmentKey));
	}, attachmentKey);

	return (
		<React.Fragment>
		<ol className="metadata-list">
			{ attachment.url && (
				<li className="metadata">
					<div className="key">
						<label>
							<a target="_blank" rel="nofollow noopener noreferrer" href={ attachment.url }>
								<span className="truncate">Original URL</span>
								<Icon type={ '16/open-link' } className="mouse" width="12" height="12"/>
								<Icon type={ '16/open-link' } className="touch" width="16" height="16"/>
							</a>
						</label>
					</div>
					<div className="value">
						<span className="truncate" title={ attachment.url }>
							{ attachment.url }
						</span>
					</div>
				</li>
			) }
			{ attachment.filename && attachment.linkMode.startsWith('imported') && (
				<React.Fragment>
				<li className="metadata interactable">
					<div className="key">
						<label>
							<span className="truncate">Filename</span>
						</label>
					</div>
					<div className="value">
						<span className="truncate no-link" title={ attachment.filename }>
							<span className="truncate">{ attachment.filename }</span>
						</span>
					</div>
				</li>
				</React.Fragment>
			) }
			{ attachment.accessDate && (
				<li className="metadata">
					<div className="key">
						<label>
							<div className="truncate">
								Access Time
							</div>
						</label>
					</div>
					<div className="value">
						<div className="truncate">{ dateLocalized(new Date((attachment.accessDate))) }</div>
					</div>
				</li>
			) }
			{ attachment.dateModified && (
				<li className="metadata">
					<div className="key">
						<label>
							<div className="truncate">Modified Time</div>
						</label>
					</div>
					<div className="value">
						<div className="truncate">{ dateLocalized(new Date((attachment.dateModified))) }</div>
					</div>
				</li>
			) }
		</ol>
		{ hasURL && (
			<div
				tabIndex={ isTouchOrSmall ? null : 0 }
				onBlur={ isTouchOrSmall ? noop : receiveBlur }
				onFocus={ isTouchOrSmall ? noop : receiveFocus }
				className="download-options"
				ref={ downloadOptionsRef }
			>
				{ isPDF ? (
					<React.Fragment>
					<a
						className="btn btn-default"
						href={ openInReaderPath }
						onClick={ stopPropagation }
						onKeyDown={ handleKeyDown }
						rel="noreferrer"
						role="button"
						target="_blank"
						title="Open in Reader"
						tabIndex={ isTouchOrSmall ? null : -2 }
					>
						Open
					</a>
					<Dropdown
						isOpen={ isDropdownOpen }
						toggle={ handleToggleDropdown }
						className="btn-group"
					>
						{ preppedPDFURL ? (
							<a
								className="btn btn-default export-pdf"
								download={ preppedPDFFileName }
								href={ preppedPDFURL }
								onClick={ stopPropagation }
								onKeyDown={ handleKeyDown }
								rel="noreferrer"
								role="button"
								tabIndex={ isTouchOrSmall ? null : -2 }
								title="Export attachment with annotations"
							>
								Download
							</a>
						) : (
							<Button
								className='btn-default export-pdf'
								disabled={ isPreppingPDF }
								onClick={ handleExport }
								onKeyDown={ handleKeyDown }
								tabIndex={ isTouchOrSmall ? null : -2 }
							>
											{isPreppingPDF ? <React.Fragment>&nbsp;<Spinner className="small" /></React.Fragment> : "Download" }
							</Button>
						) }
						<DropdownToggle
							className="btn-default btn-icon dropdown-toggle"
							color={ null }
							onKeyDown={ handleKeyDown }
							tabIndex={ isTouchOrSmall ? null : -2 }
						>
							<Icon type="16/chevron-9" className="touch" width="16" height="16" />
							<Icon type="16/chevron-7" className="mouse" width="16" height="16" />
						</DropdownToggle>
						<DropdownMenu>
							<DropdownItem
								className="btn"
								href={ url }
								onClick={ stopPropagation }
								onKeyDown={ handleKeyDown }
								rel="noreferrer"
								role="button"
								tabIndex={ isTouchOrSmall ? null : -3 }
								target="_blank"
								title="Download attachment"
							>
								Download (no annotations)
							</DropdownItem>
						</DropdownMenu>
					</Dropdown>
					</React.Fragment>
					) : (
					<a
						className="btn btn-default"
						disabled={ !url }
						href={ url }
						onClick={ stopPropagation }
						onKeyDown={ handleKeyDown }
						rel="noreferrer"
						role="button"
						tabIndex={ isTouchOrSmall ? null : -2 }
						target="_blank"
						title="Download attachment"
					>
						Download
					</a>
				) }
			</div>
		) }
		<RichEditor
			autoresize={ shouldUseTabs ? false : true }
			id={ attachment.key }
			isReadOnly={ isReadOnly }
			value={ attachment.note }
			onChange={ handleChangeNote }
		/>
		</React.Fragment>
	);
}

AttachmentDetails.propTypes = {
	attachmentKey: PropTypes.string.isRequired,
	isReadOnly: PropTypes.bool,
}

export default React.memo(AttachmentDetails);
