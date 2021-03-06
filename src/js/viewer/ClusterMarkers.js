
import { FEATURE_ENTRANCES, CLUSTER_MARKERS } from '../core/constants';
import { GlyphString } from '../core/GlyphString';
import { Marker } from './Marker';
import { Object3D, Vector3, Triangle, Plane } from '../Three';

// preallocated objects for projected area calculation and cluster visibility checks

const __a = new Vector3();
const __b = new Vector3();
const __c = new Vector3();
const __d = new Vector3();

const __t1 = new Triangle( __a, __b, __c );
const __t2 = new Triangle( __a, __c, __d );

const __plane = new Plane();

const __v = new Vector3();

function QuadTree ( ctx, xMin, xMax, yMin, yMax ) {

	this.nodes = new Array( 4 );
	this.count = 0;
	this.markers = [];
	this.quadMarker = null;
	this.centroid = new Vector3();
	this.ctx = ctx;

	this.xMin = xMin;
	this.xMax = xMax;

	this.yMin = yMin;
	this.yMax = yMax;

}

QuadTree.prototype.addNode = function ( marker, depth ) {

	// add marker into this quad and recurse to inner quads

	if ( depth-- === 0 ) return;

	const position = marker.position;
	const ctx = this.ctx;

	const xMid = ( this.xMin + this.xMax ) / 2;
	const yMid = ( this.yMin + this.yMax ) / 2;

	this.markers.push( marker );
	this.centroid.add( position );

	this.count++;

	var index = 0;

	if ( position.x > xMid ) index += 1;
	if ( position.y > yMid ) index += 2;

	var subQuad = this.nodes[ index ];

	if ( subQuad === undefined ) {

		switch ( index ) {

		case 0:

			subQuad = new QuadTree( ctx, this.xMin, xMid, this.yMin, yMid );
			break;

		case 1:

			subQuad = new QuadTree( ctx, xMid, this.xMax, this.yMin, yMid );
			break;

		case 2:

			subQuad = new QuadTree( ctx, this.xMin, xMid, yMid, this.yMax );
			break;

		case 3:

			subQuad = new QuadTree( ctx, xMid, this.xMax, yMid, this.yMax );
			break;

		}

		this.nodes[ index ] = subQuad;

	}

	subQuad.addNode( marker, depth );

};

QuadTree.prototype.check = function ( cluster, target, angleFactor, selection ) {

	var subQuad, i;

	for ( i = 0; i < 4; i++ ) {

		subQuad = this.nodes[ i ];

		if ( subQuad !== undefined ) {

			// prune quads that will never be clustered. will not be checked after first pass

			if ( subQuad.count < 2 ) {

				this.nodes[ i ] = undefined;

				continue;

			}

			// test for projected area for quad containing multiple markers

			const area = subQuad.projectedArea( cluster );

			// adjust for inclination to horizontal and distance from camera vs distance between camera and target

			__a.subVectors( cluster.camera.position, target );

			const d2Target = __a.length() * 2;

			__a.normalize();

			__plane.setFromNormalAndCoplanarPoint( __a, cluster.camera.position );

			if ( this.quadMarker === null ) {

				__b.copy( this.centroid.clone().divideScalar( this.count ) ).applyMatrix4( cluster.matrixWorld );

			} else {

				__b.copy( this.quadMarker.position ).applyMatrix4( cluster.matrixWorld );

			}

			const dCluster = Math.abs( __plane.distanceToPoint( __b ) );

			const depthRatio = ( d2Target - dCluster ) / d2Target;

			//console.log( area, 'dr', Math.round( depthRatio * 100 )/100, 'af', Math.round( angleFactor * 100 ) / 100 , '++', Math.round( depthRatio * angleFactor * 100 * 20 ) / 100);

			// cluster markers compensated for angle to the horizontal and distance from camera plane

			if ( area < 10 * depthRatio * ( angleFactor) ) { // FIXME calibrate by screen size ???

				subQuad.clusterMarkers( cluster );

			} else {

				subQuad.showMarkers( selection );
				subQuad.check( cluster, target, angleFactor, selection );

			}

		}

	}

};

QuadTree.prototype.showMarkers = function ( selection ) {

	// show the indiviual markers in this quad

	this.markers.forEach( function ( marker ) {

		marker.visible = selection.contains( marker.stationID );

	} );

	if ( this.quadMarker !== null ) this.quadMarker.visible = false;

};

QuadTree.prototype.hideMarkers = function () {

	// hide the indiviual markers in this quad

	this.markers.forEach( function ( marker ) {

		marker.visible = false;

	} );

	if ( this.quadMarker !== null ) this.quadMarker.visible = false;

};

QuadTree.prototype.clusterMarkers = function ( cluster ) {

	var i;

	// hide the indiviual markers in this quad

	this.hideMarkers();

	// hide quadMarkers for contained quads

	for ( i = 0; i < 4; i++ ) {

		const subQuad = this.nodes[ i ];

		if ( subQuad !== undefined ) subQuad.hideQuadMarkers();

	}

	if ( this.quadMarker === null ) {

		const quadMarker = new Marker( this.ctx, this.count );

		// set to center of distribution of markers in this quad.
		quadMarker.position.copy( this.centroid ).divideScalar( this.count );
		quadMarker.layers.set( CLUSTER_MARKERS );

		if ( cluster.heightProvider !== null ) {

			quadMarker.adjustHeight( cluster.heightProvider );

		}

		cluster.addStatic( quadMarker );

		this.quadMarker = quadMarker;

	}

	this.quadMarker.visible = true;

};

QuadTree.prototype.hideQuadMarkers = function () {

	var i;

	if ( this.quadMarker ) this.quadMarker.visible = false;

	for ( i = 0; i < 4; i++ ) {

		const subQuad = this.nodes[ i ];

		if ( subQuad !== undefined ) subQuad.hideQuadMarkers();

	}

};

QuadTree.prototype.projectedArea = function ( cluster ) {

	const camera = cluster.camera;
	const matrixWorld = cluster.matrixWorld;
	const zAverage = this.centroid.z / this.count;

	__a.set( this.xMin, this.yMin, zAverage ).applyMatrix4( matrixWorld ).project( camera );
	__b.set( this.xMin, this.yMax, zAverage ).applyMatrix4( matrixWorld ).project( camera );
	__c.set( this.xMax, this.yMax, zAverage ).applyMatrix4( matrixWorld ).project( camera );
	__d.set( this.xMax, this.yMin, zAverage ).applyMatrix4( matrixWorld ).project( camera );

	return __t1.getArea() + __t2.getArea();

};

function ClusterMarkers ( ctx, limits, maxDepth ) {

	Object3D.call( this );

	const min = limits.min;
	const max = limits.max;

	this.maxDepth = maxDepth;

	this.type = 'CV.ClusterMarker';

	this.quadTree = new QuadTree( ctx, min.x, max.x, min.y, max.y );
	this.heightProvider = null;
	this.labels = [];
	this.ctx = ctx;

	this.addEventListener( 'removed', this.onRemoved );

	return this;

}

ClusterMarkers.prototype = Object.create( Object3D.prototype );

ClusterMarkers.prototype.addHeightProvider = function ( func ) {

	this.heightProvider = func;

	this.traverse( function _setHeight( obj ) {

		if ( obj.isMarker ) obj.adjustHeight( func );

	} );

};

ClusterMarkers.prototype.onRemoved = function () {

	this.traverse(

		function _traverse ( obj ) {

			if ( obj.type === 'GlyphString' ) { obj.geometry.dispose(); }

		}

	);

};

ClusterMarkers.prototype.addMarker = function ( node, label ) {

	const cfg = this.ctx.cfg;
	const materials = this.ctx.materials;

	// create marker
	const atlasSpec = {
		background: cfg.themeColorCSS( 'stations.entrances.background' ),
		color: cfg.themeColorCSS( 'stations.entrances.text' ),
		font: 'normal helvetica,sans-serif'
	};

	const material = materials.getGlyphMaterial( atlasSpec, Math.PI / 4 );

	material.depthTest = true;
	material.transparent = false;
	material.alphaTest = 0;

	const marker = new GlyphString( label, material, this.ctx );

	marker.layers.set( FEATURE_ENTRANCES );
	marker.position.copy( node.p );
	marker.stationID = node.id;

	this.labels.push( marker );
	this.quadTree.addNode( marker, this.maxDepth );

	this.addStatic( marker );

	return marker;

};

ClusterMarkers.prototype.cluster = function ( camera, target, selectedStationSet ) {

	// determine which labels are too close together to be usefully displayed as separate objects.

	// immediate exit if only a single label or none.

	if ( this.children.length < 2 ) return;

	this.camera = camera;

	const angle = this.camera.getWorldDirection( __v ).dot( Object3D.DefaultUp );

	this.quadTree.check( this, target, Math.max( 0.05, 1 - Math.cos( angle ) ), selectedStationSet );

	return;

};

export { ClusterMarkers };

// EOF