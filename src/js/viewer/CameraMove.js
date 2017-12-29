
import {
	Object3D,
	Vector3,
	QuadraticBezierCurve3,
	Quaternion,
	Euler,
	Line3,
	Matrix4,
	Math as _Math
} from '../../../../three.js/src/Three';

import { upAxis } from '../core/constants';

function CameraMove ( controls, renderFunction, endCallback ) {

	this.cameraTarget = null;
	this.endPOI = null;
	this.endQuaternion = new Quaternion();

	this.controls = controls;
	this.renderFunction = renderFunction;
	this.endCallback = endCallback;
	this.frameCount = 0;
	this.frames = 0;
	this.targetZoom = 1;
	this.curve = null;
	this.skipNext = false;

	this.moveRequired = false;

	this.doAnimate = this.animate.bind( this );

}

CameraMove.prototype.constructor = CameraMove;

CameraMove.prototype.prepare = function () {

	var vMidpoint = new Vector3();
	var cameraLine = new Line3();
	var v = new Vector3();
	var controlPoint = new Vector3();
	var m4 = new Matrix4();
	var q90 = new Quaternion().setFromAxisAngle( upAxis, - Math.PI / 2 );
	var euler = new Euler();

	return function prepare ( cameraTarget, endPOI ) {

		if ( this.frameCount !== 0 ) return;

		this.skipNext = false;

		var camera = this.controls.object;

		if ( endPOI && endPOI.isBox3 ) {

			// target can be a Box3 in world space
			// setup a target position above the box3 such that it fits the screen

			var size = endPOI.getSize();
			var elevation;

			endPOI = endPOI.getCenter();

			if ( camera.isPerspectiveCamera ) {

				var tan = Math.tan( _Math.DEG2RAD * 0.5 * camera.getEffectiveFOV() );

				var e1 = 1.5 * tan * size.y / 2 + size.z;
				var e2 = tan * camera.aspect * size.x / 2 + size.z;

				elevation = Math.max( e1, e2 );

				this.targetZoom = 1;

				if ( elevation === 0 ) elevation = 100;

			} else {

				var hRatio = ( camera.right - camera.left ) / size.x;
				var vRatio = ( camera.top - camera.bottom ) / size.y;

				this.targetZoom = Math.min( hRatio, vRatio );
				elevation = 600;

			}

			cameraTarget   = endPOI.clone();
			cameraTarget.z = cameraTarget.z + elevation;

		}

		this.cameraTarget = cameraTarget;
		this.endPOI = endPOI;

		this.moveRequired = ( this.cameraTarget !== null || this.endPOI !== null );

		var startPOI = this.controls.target;
		var cameraStart = this.controls.object.position;

		if ( this.moveRequired ) {

			m4.lookAt( ( cameraTarget !== null ? cameraTarget : cameraStart ), endPOI, upAxis );
			this.endQuaternion.setFromRotationMatrix( m4 );
			euler.setFromQuaternion( this.endQuaternion );

			if ( Math.abs( euler.x ) < 0.0001 ) {

				// apply correction if looking verticaly
				this.endQuaternion.multiply( q90 );

			}

		}

		if ( cameraTarget !== null ) {

			if ( cameraTarget.equals( cameraStart ) ) {

				// start and end camera positions are identical.

				this.moveRequired = false;

				if ( endPOI === null ) this.skipNext = true;

			} else {

				if ( endPOI === null ) endPOI = startPOI;

				// get mid point between start and end POI
				vMidpoint.addVectors( startPOI, endPOI ).multiplyScalar( 0.5 );

				// line between camera positions
				cameraLine.set( cameraStart, cameraTarget );

				// closest point on line to POI midpoint
				cameraLine.closestPointToPoint( vMidpoint, true, v );

				// reflect mid point around cameraLine in cameraLine + midPoint plane
				controlPoint.subVectors( v, startPOI ).add( v );

				this.curve = new QuadraticBezierCurve3( cameraStart, controlPoint, cameraTarget );

				return this.curve.getPoints( 20 );

			}

		}

	};

}();

CameraMove.prototype.start = function ( time ) {

	var controls = this.controls;

	if ( this.frameCount === 0 && ! this.skipNext ) {

		if ( this.cameraTarget === null && this.endPOI !== null ) {

			// scale time for simple pans by angle panned through

			var v1 = new Vector3().subVectors( controls.target, controls.object.position );
			var v2 = new Vector3().subVectors( this.endPOI, controls.object.position );

			time = Math.round( time * Math.acos( v1.normalize().dot( v2.normalize() ) ) / Math.PI );

		}

		this.frameCount = time + 1;
		this.frames = this.frameCount;

		controls.enabled = ! this.moveRequired;

		this.animate();

	}

};

CameraMove.prototype.animate = function () {

	var tRemaining = --this.frameCount;
	var controls = this.controls;
	var curve = this.curve;

	if ( tRemaining < 0 ) {

		this.frameCount = 0;
		this.endAnimation();

		return;

	}

	if ( this.moveRequired ) {

		// update camera position

		var camera = controls.object;

		var t =  Math.sin( ( 1 - tRemaining / this.frames ) * Math.PI / 2 );

		if ( curve !== null ) camera.position.copy( this.curve.getPoint( t ) );

		camera.zoom = camera.zoom + ( this.targetZoom - camera.zoom ) * t;

		camera.quaternion.slerp( this.endQuaternion, t );

		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();

	} else {

		controls.update();

	}

	if ( tRemaining === 0 ) {

		// end of animation

		this.endAnimation();

		return;

	}

	requestAnimationFrame( this.doAnimate );

	this.renderFunction();

};

CameraMove.prototype.endAnimation = function () {

	var controls = this.controls;
	this.controls.enabled = true;
	this.moveRequired = false;

	if ( this.endPOI !== null ) controls.target.copy( this.endPOI );

	this.cameraTarget = null;
	this.endPOI = null;
	this.curve = null;

	this.controls.update();

	this.renderFunction();
	this.endCallback();

};

CameraMove.prototype.stop = function () {

	this.frameCount = 1;

};

CameraMove.prototype.cancel = function () {

	this.frameCount = 0;
	this.skipNext = false;

};

export { CameraMove };