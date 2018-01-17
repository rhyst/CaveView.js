
import { CursorMaterial } from './CursorMaterial';
import { DepthMaterial } from './DepthMaterial';
import { DepthCursorMaterial } from './DepthCursorMaterial';
import { DepthMapMaterial } from './DepthMapMaterial';
import { HeightMaterial } from './HeightMaterial';
import { GlyphMaterial } from './GlyphMaterial';
import { GlyphString } from '../core/GlyphString';

import { LineBasicMaterial, MeshLambertMaterial, NoColors, VertexColors } from '../../../../three.js/src/Three';

var cache = new Map();
var viewer;

var cursorMaterials = [];
var depthMaterials = [];
var perSurveyMaterials = {};

function updateMaterialCursor ( material ) {

	viewer.initCursorHeight = material.setCursor( viewer.cursorHeight );

}

function updateCursors( /* event */ ) {

	cursorMaterials.forEach( updateMaterialCursor );

}

function updateDatumShifts( event ) {

	var datumShift = event.value;

	depthMaterials.forEach( _updateMaterialDepth );

	function _updateMaterialDepth ( material ) {

		material.setDatumShift( datumShift );

	}

}


function getHeightMaterial ( type, limits ) {

	var name = 'height' + type;

	var material = cache.get( name );

	if ( material === undefined ) {

		material = new HeightMaterial( type, limits );
		cache.set( name, material );

		perSurveyMaterials[ name ] = material;

	}

	return material;

}

function getDepthMapMaterial ( terrain ) {

	return new DepthMapMaterial( terrain );

}

function getDepthMaterial ( type, limits, terrain ) {

	var name = 'depth' + type;

	var material = cache.get( name );

	if ( material === undefined ) {

		material = new DepthMaterial( type, limits, terrain );

		cache.set( name, material );

		perSurveyMaterials[ name ] = material;
		depthMaterials.push( material );

	}

	return material;

}

function getCursorMaterial ( type, limits ) {

	var name = 'cursor' + type;

	var material = cache.get( name );

	if ( material === undefined ) {

		material = new CursorMaterial( type, limits );

		perSurveyMaterials[ name ] = material;

		cache.set( name, material );

	}

	// restore current cursor

	viewer.initCursorHeight = material.getCursor();

	// set active cursor material for updating

	cursorMaterials[ type ] = material;

	return material;

}

function getDepthCursorMaterial( type, limits, terrain ) {

	var name = 'depthCursor' + type;

	var material = cache.get( name );

	if ( material === undefined ) {

		material = new DepthCursorMaterial( type, limits, terrain );

		perSurveyMaterials[ name ] = material;
		depthMaterials.push( material );

		cache.set( name, material );

	}

	// restore current cursor

	viewer.initCursorHeight = material.getCursor();

	// set active cursor material for updating

	cursorMaterials[ type ] = material;

	return material;

}

function getSurfaceMaterial ( color ) {

	var material = cache.get( 'surface' + color );

	if ( material === undefined ) {

		material = new MeshLambertMaterial( { color: color, vertexColors: NoColors } );
		cache.set( 'surface' + color, material );

	} else {

		material.color.set( color );
		material.needsUpdate = true;

	}

	return material;

}

function getLineMaterial () {

	var material = cache.get( 'line' );

	if ( material === undefined ) {

		material = new LineBasicMaterial( { color: 0xffffff, vertexColors: VertexColors } );
		cache.set( 'line', material );

	}

	return material;

}

function getGlyphMaterial ( glyphAtlasSpec, rotation, colour ) {

	var name = JSON.stringify( glyphAtlasSpec ) + ':' + rotation.toString();

	var material = cache.get( name );

	if ( material === undefined ) {

		material = new GlyphMaterial( glyphAtlasSpec, viewer.container, rotation, colour );
		cache.set( name, material );

	}

	return material;

}

function setTerrain( terrain ) {


	terrain.addEventListener( 'datumShiftChange', updateDatumShifts );

}

function initCache ( Viewer ) {

	cache.clear();

	viewer = Viewer;

	viewer.addEventListener( 'cursorChange', updateCursors );

}

function flushCache() {

	var name;

	for ( name in perSurveyMaterials ) {

		var material = perSurveyMaterials[ name ];

		material.dispose();
		cache.delete( name );

	}

	depthMaterials = [];
	perSurveyMaterials = {};
	GlyphString.cache = new Map();

}

export var Materials = {
	getHeightMaterial:      getHeightMaterial,
	getDepthMapMaterial:    getDepthMapMaterial,
	getDepthMaterial:       getDepthMaterial,
	getDepthCursorMaterial: getDepthCursorMaterial,
	getCursorMaterial:      getCursorMaterial,
	getSurfaceMaterial:     getSurfaceMaterial,
	getLineMaterial:        getLineMaterial,
	getGlyphMaterial:       getGlyphMaterial,
	setTerrain:             setTerrain,
	initCache:              initCache,
	flushCache:             flushCache
};

// EOF