'use strict';

var log = require('../../Log.js').Logger('zotero-web-library:collections');

var React = require('react');

var LoadingSpinner = require('./LoadingSpinner.js');

var CollectionRow = React.createClass({
	getDefaultProps: function(){
		return {
			collection:null,
			selectedCollection:'',
			depth:0,
			expandedCollections: {}
		};
	},
	handleCollectionClick: function(evt){
		evt.preventDefault();
		var collectionKey = this.props.collection.get('collectionKey');
		//if current collect
		Zotero.state.clearUrlVars();
		Zotero.state.pathVars['collectionKey'] = collectionKey;
		Zotero.state.pushState();
	},
	handleTwistyClick: function(evt){
		log.debug('handleTwistyClick');
		//toggle expanded state for this collection
		evt.preventDefault();
		var collectionKey = this.props.collection.get('collectionKey');
		var exp = this.props.expandedCollections;
		if(exp[collectionKey]) {
			delete exp[collectionKey];
		} else {
			exp[collectionKey] = true;
		}
		this.props.parentCollectionsInstance.setState({expandedCollections:exp});
		
	},
	render: function() {
		//log.debug("CollectionRow render");
		if(this.props.collection == null){
			return null;
		}
		var collection = this.props.collection;
		var collectionKey = collection.get('key');
		var selectedCollection = this.props.selectedCollection;
		var expandedCollections = this.props.expandedCollections;
		var expanded = expandedCollections[collectionKey] === true;
		var isSelectedCollection = (this.props.selectedCollection == collectionKey);
		
		var childRows = [];
		collection.children.forEach(function(collection) {
			childRows.push(
				<CollectionRow 
					key={collection.get('key')}
					collection={collection}
					selectedCollection={selectedCollection}
					expandedCollections={expandedCollections} />
			);
		});
		var childrenList = null;
		if(collection.hasChildren){
			childrenList = (
				<ul hidden={!expanded}>
					{childRows}
				</ul>
			);
		}
		
		var placeholderClasses = 'placeholder small-icon light-icon pull-left';
		if(expandedCollections[collectionKey] === true) {
			placeholderClasses += ' glyphicon glyphicon-chevron-down clickable';
		} else if(childRows.length > 0) {
			placeholderClasses += ' glyphicon glyphicon-chevron-right clickable';
		}

		return (
			<li className="collection-row">
				<div className="folder-toggle">
					<span className={placeholderClasses} onClick={this.handleTwistyClick}></span>
					<span className="fonticon glyphicons glyphicons-folder-open barefonticon"></span>
				</div>
				<a href={collection.websiteCollectionLink} className={isSelectedCollection ? 'current-collection' : ''} onClick={this.handleCollectionClick}>
					{collection.get('name')}
				</a>
				{childrenList}
			</li>
		);
	}
});

var TrashRow = React.createClass({
	getDefaultProps: function(){
		return {
			collectionKey:'trash',
			selectedCollection:''
		};
	},
	handleClick: function() {
		Zotero.state.clearUrlVars();
		Zotero.state.pathVars['collectionKey'] = this.props.collectionKey;
		Zotero.state.pushState();
	},
	render: function() {
		log.debug('TrashRow render');
		var className = (this.props.selectedCollection == this.props.collectionKey ? 'collection-row current-collection' : 'collection-row' );
		
		return (
			<li className={className}>
				<div className="folder-toggle">
					<span className="sprite-placeholder sprite-icon-16 pull-left dui-icon"></span>
					<span className="glyphicons fonticon glyphicons-bin barefonticon"></span>
				</div>
				Trash
			</li>
		);
	}
});

var Collections = React.createClass({
	getDefaultProps: function() {
	},
	getInitialState: function() {
		var initialCollectionKey = Zotero.state.getUrlVar('collectionKey');
		return {
			collections: null,
			currentCollectionKey:initialCollectionKey,
			expandedCollections: {},
			loading:false
		};
	},
	componentWillMount: function() {
		var reactInstance = this;
		var library = this.props.library;
		
		library.listen('collectionsDirty', reactInstance.syncCollections, {});
		library.listen('libraryCollectionsUpdated', function(){
			reactInstance.setState({collections:library.collections});
		}, {});
		library.listen('selectedCollectionChanged', function(){
			var collectionKey = Zotero.state.getUrlVar('collectionKey');
			reactInstance.setState({currentCollectionKey:collectionKey});
		}, {});
		
		library.listen('cachedDataLoaded', reactInstance.syncCollections, {});
	},
	returnToLibrary: function(evt) {
		evt.preventDefault();
		this.setState({currentCollectionKey:null});
		Zotero.state.clearUrlVars();
        Zotero.state.pushState();
	},
	syncCollections: function(evt) {
		log.debug('react collections syncCollections', 3);
		var reactInstance = this;
		if(this.state.loading){
			return;
		}
		var library = this.props.library;

		//update the widget as soon as we have the cached collections
		this.setState({collections:library.collections, loading:true});

		//sync collections if loaded from cache but not synced
		return library.loadUpdatedCollections()
		.then(function(){
			reactInstance.setState({collections:library.collections, loading:false});
			library.trigger('libraryCollectionsUpdated');
		},
		function(err){
			//sync failed, but we already had some data, so show that
			log.error('Error syncing collections');
			log.error(err);
			reactInstance.setState({collections:library.collections, loading:false});
			library.trigger('libraryCollectionsUpdated');
			Zotero.ui.jsNotificationMessage('Error loading collections. Collections list may not be up to date', 'error');
		});
	},
	render: function() {
		log.debug('Collections render');
		var reactInstance = this;
		var library = this.props.library;
		var collections = this.state.collections;
		if(collections == null){
			return null;
		}
		
		var collectionsArray = this.state.collections.collectionsArray;
		var currentCollectionKey = this.state.currentCollectionKey;
		var libraryUrlIdentifier = '';
		//var libraryUrlIdentifier = (collections == null ? "" : collections.libraryUrlIdentifier);
		
		//Set of collections in an expanded state
		var expandedCollections = this.state.expandedCollections;

		//path from top level collection to currently selected collection, to ensure that we expand
		//them all and the current collection is visible
		var currentCollectionPath = [];
		if(currentCollectionKey !== null){
			var currentCollection = collections.getCollection(currentCollectionKey);
			var c = currentCollection;
			while(true){
				if(c && !c.topLevel){
					var parentCollectionKey = c.get('parentCollection');
					c = collections.getCollection(parentCollectionKey);
					currentCollectionPath.push(parentCollectionKey);
					expandedCollections[parentCollectionKey] = true;
				} else {
					break;
				}
			}
		}
		
		var collectionRows = [];
		collectionsArray.forEach(function(collection){
			if(collection.topLevel){
				collectionRows.push(<CollectionRow
					key={collection.get('key')}
					collection={collection}
					selectedCollection={currentCollectionKey}
					expandedCollections={expandedCollections}
					parentCollectionsInstance={reactInstance} />
				);
			}
		});
		
		var libraryClassName = 'my-library ' + (currentCollectionKey == null ? 'current-collection' : '');
		return (
			<div id="collection-list-div" className="collection-list-container">
				{/*<LoadingSpinner loading={this.state.loading} />*/}
				<ul id="collection-list">
					<li>
						<span className="glyphicons fonticon glyphicons-inbox barefonticon"></span>
						<a onClick={this.returnToLibrary} className={libraryClassName} href={library.libraryBaseWebsiteUrl}>Library</a>
					</li>
					{collectionRows}
					
				</ul>
			</div>
		);
	}
});

module.exports = Collections;
