import { MutableGlyphString } from '../core/GlyphString';

import { RingBufferGeometry, Object3D, Mesh, Float32BufferAttribute } from '../Three';

function ProgressDial ( hudObject, addText, ring, viewer ) {

	const cfg = hudObject.ctx.cfg;
	const materials = hudObject.ctx.materials;
	const stdWidth  = hudObject.stdWidth;
	const stdMargin = hudObject.stdMargin;

	const offset = stdWidth + stdMargin;

	const gap = ring === 0 ? 0 : 1;
	const segments = 50;
	const geometry = new RingBufferGeometry( stdWidth * ( 0.9 - ring * 0.1 ), stdWidth * ( 1 - ring * 0.1 ) - gap, segments );

	const colorCount = 2 * ( segments + 1);

	const backgroundColor = cfg.themeColor( 'hud.progressBackground' );
	const setColor = cfg.themeColor( 'hud.progress' );

	const colorsSrc = [];

	for ( var i = 0; i < colorCount; i++ ) colorsSrc.push( backgroundColor );

	const colors = new Float32BufferAttribute( colorCount * 3, 3 );

	geometry.setAttribute( 'color', colors );

	hudObject.dropBuffers( geometry );

	this.colorsSrc = colorsSrc;
	this.backgroundColor = backgroundColor;
	this.setColor = setColor;
	this.viewer = viewer;

	Mesh.call( this, geometry, materials.getPlainMaterial() );

	this.name = 'CV.ProgressDial';

	this.translateX( -offset * 5 );
	this.translateY(  offset );

	this.rotateOnAxis( Object3D.DefaultUp, Math.PI / 2 );

	this.visible = false;
	this.isVisible = true;

	this.color = cfg.themeValue( 'hud.progress' );

	if ( addText ) {

		var glyphMaterial = materials.getGlyphMaterial( hudObject.atlasSpec, 0 );

		const pcent = new MutableGlyphString( '----', glyphMaterial );

		pcent.translateY( pcent.getWidth() / 2 );
		pcent.translateX( -10 );

		this.add( pcent );
		this.pcent = pcent;

	} else {

		this.pcent = null;

	}

	return this;

}

ProgressDial.prototype = Object.create( Mesh.prototype );

ProgressDial.prototype.colorRange = function ( range, color ) {

	const colors = this.geometry.getAttribute( 'color' );
	const colorsSrc = this.colorsSrc;

	const segmentMax = Math.round( range / 2 );
	const end = colorsSrc.length - 1;

	for ( var i = 0; i < segmentMax + 1; i++ ) {

		colorsSrc[ end - i ] = color;
		colorsSrc[ end - i - 50 ] = color;

	}

	colors.copyColorsArray( colorsSrc );
	colors.needsUpdate = true;

};

ProgressDial.prototype.set = function ( progress ) {

	if ( progress === this.progress ) return;

	this.progress = progress;

	const l = Math.floor( Math.min( 100, Math.round( progress ) ) / 2 ) * 2;
	const pcent = this.pcent;

	this.colorRange( l, this.setColor );

	if ( pcent !== null ) {

		var pcentValue = Math.round( progress ) + '%';

		pcent.replaceString( pcentValue.padStart( 4, ' ' ) );
		pcent.translateY( pcent.getWidth() / 2 - pcent.position.y );

	}

	this.viewer.renderView();

};

ProgressDial.prototype.start = function () {

	this.colorRange( 100, this.backgroundColor );

	this.progress = 0;
	this.visible = true;

	if ( this.pcent !== null ) this.pcent.replaceString( '  0%' );

	this.viewer.renderView();

};

ProgressDial.prototype.end = function () {

	const self = this;

	setTimeout( function endProgress () { self.visible = false; self.viewer.renderView(); }, 500 );

};

ProgressDial.prototype.setVisibility = function ( visibility ) {

	this.isVisible = visibility;
	this.visible = ( this.visible && visibility );

};

ProgressDial.prototype.watch = function ( obj ) {

	obj.addEventListener( 'progress', this.handleProgess.bind( this ) );

};

ProgressDial.prototype.handleProgess = function ( event ) {

	switch ( event.name ) {

	case 'start':

		this.start();
		break;

	case 'set':

		this.set( event.progress );
		break;

	case 'end':

		this.end();
		break;

	}

};

export { ProgressDial };

// EOF