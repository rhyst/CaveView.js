
import { upAxis } from '../core/constants.js';
import { HudObject } from './HudObject.js';

import {
	Vector3, Color, Math as _Math,
	Geometry, RingBufferGeometry, SphereBufferGeometry, BufferAttribute, CylinderBufferGeometry,
	LineBasicMaterial, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
	FrontSide, VertexColors,
	Mesh, LineSegments, Group
} from '../../../../three.js/src/Three.js'; 

function AHI ( container ) {

	var width  = container.clientWidth;
	var height = container.clientHeight;

	var stdWidth  = HudObject.stdWidth;
	var stdMargin = HudObject.stdMargin;

	Group.call( this );

	this.name = "CV.AHI";
	this.domObjects = [];

	this.lastPitch = 0;

	// artificial horizon instrument
	var globe = new Group();

	var ring = new CylinderBufferGeometry( stdWidth * 0.90, stdWidth,  3, 32, 1, true );
	ring.rotateX( Math.PI / 2 );

	var sphere = new SphereBufferGeometry( stdWidth - 10, 31, 31 );
	var bar    = new Geometry();
	var marks  = new Geometry();

	var sv = sphere.getAttribute( 'position' ).count;

	var sphereColors = new BufferAttribute( new Float32Array( sv * 3 ), 3 );

	var colours = [];

	var c1 = new Color( 0x106f8d );
	var c2 = new Color( 0x802100 );

	for ( var i = 0; i < sv; i++ ) {

		if ( i < sv/2 )
			colours.push(  c1 );
		else 
			colours.push(  c2 );

	}

	sphere.addAttribute( 'color', sphereColors.copyColorsArray( colours ) );

	// view orinetation line
	bar.vertices.push( new Vector3( 4 - stdWidth, 0, stdWidth ) );
	bar.vertices.push( new Vector3( stdWidth - 4, 0, stdWidth ) );

	// pitch interval marks
	var m1 = new Vector3(  4, 0, stdWidth - 10 );
	var m2 = new Vector3( -4, 0, stdWidth - 10 );

	var xAxis = new Vector3( 1, 0, 0 );

	for ( var i = 0; i < 12; i++ ) {

		var mn1 = m1.clone();
		var mn2 = m2.clone();

		if ( i % 3 === 0 ) {

			mn1.x =  7;
			mn2.x = -7;

		}

		mn1.applyAxisAngle( xAxis, i * Math.PI / 6 );
		mn2.applyAxisAngle( xAxis, i * Math.PI / 6 ); 

		marks.vertices.push( mn1 );
		marks.vertices.push( mn2 );

	}

	var mRing  = new Mesh( ring, new MeshStandardMaterial( { color: 0x888888, metalness: 0.3 } ) );
	var mSphere  = new Mesh( sphere, new MeshPhysicalMaterial( { vertexColors: VertexColors, metalness: 0.3, clearCoat: 0.9, clearCoatRoughness: 0.3  } ) );
	var mBar   = new LineSegments( bar,   new LineBasicMaterial( { color: 0xcccc00 } ) );
	var mMarks = new LineSegments( marks, new LineBasicMaterial( { color: 0xffffff } ) );

	mSphere.rotateOnAxis( new Vector3( 0, 1, 0 ), Math.PI / 2 );
	mMarks.rotateOnAxis( new Vector3( 1, 0, 0 ), Math.PI / 2 );
	mRing.rotateOnAxis( new Vector3( 0, 0, 1 ), Math.PI / 8 );

	globe.add( mSphere );
	globe.add( mMarks );

	this.add( mRing );
	this.add( globe );
	this.add( mBar );

	var offset = stdWidth + stdMargin;

	this.translateX( -3 * offset );
	this.translateY( offset );

	var panel = document.createElement( "div" );

	panel.classList.add( "cv-ahi" );
	panel.textContent = "";

	container.appendChild( panel );

	this.globe = globe;
	this.txt = panel;

	this.domObjects.push( panel );

	this.addEventListener( "removed", this.removeDomObjects );

	return this;

}

AHI.prototype = Object.create( Group.prototype );

Object.assign( AHI.prototype, HudObject.prototype );

AHI.prototype.contructor = AHI;

AHI.prototype.set = function () {

	var direction = new Vector3();
	var xAxis     = new Vector3( 1, 0, 0 );

	return function set ( vCamera ) {

		vCamera.getWorldDirection( direction );

		var pitch = Math.PI / 2 - direction.angleTo( upAxis );

		if ( pitch === this.lastPitch ) return;

		this.globe.rotateOnAxis( xAxis, pitch - this.lastPitch );
		this.lastPitch = pitch;

		this.txt.textContent = Math.round( _Math.radToDeg( pitch ) )  + "\u00B0";

	}

} ();

export { AHI };

// EOF