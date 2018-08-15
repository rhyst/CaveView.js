
import { Shaders } from '../shaders/Shaders';
import { ShaderMaterial } from '../Three';
import { Cfg } from '../core/lib';

function ContourMaterial ( survey, viewer ) {

	this.baseAdjust = survey.offsets.z;

	const terrain = survey.terrain;
	const zAdjust = this.baseAdjust + terrain.activeDatumShift;

	ShaderMaterial.call( this, {
		vertexShader:    Shaders.contourVertexShader,
		fragmentShader:  Shaders.contourFragmentShader,
		depthWrite:      false,
		type:            'CV.ContourMaterial',
		uniforms: {
			uLight:          { value: viewer.surfaceLightDirection },
			zAdjust:         { value: zAdjust },
			contourInterval: { value: Cfg.themeValue( 'shading.contours.interval' ) },
			contourColor:    { value: Cfg.themeColor( 'shading.contours.line' ) },
			contourColor10:  { value: Cfg.themeColor( 'shading.contours.line10' ) },
			baseColor:       { value: Cfg.themeColor( 'shading.contours.base' ) },
			opacity:         { value: 0.5 }
		}
	} );

	this.transparent = true;

	this.extensions.derivatives = true;

	Object.defineProperty( this, 'opacity', {
		writeable: true,
		get: function () { return this.uniforms.opacity.value; },
		set: function ( value ) { this.uniforms.opacity.value = value; }
	} );

	this.callback = this.lightingChanged.bind( this );

	viewer.addEventListener( 'lightingChange', this.callback );

	return this;

}

ContourMaterial.prototype = Object.create( ShaderMaterial.prototype );

ContourMaterial.prototype.lightingChanged = function ( event ) {

	this.uniforms.uLight.value = event.position;

};

ContourMaterial.prototype.setDatumShift = function ( shift ) {

	this.uniforms.zAdjust.value = this.baseAdjust + shift;

};

ContourMaterial.prototype.dispose = function ( viewer ) {

	viewer.removeEventListener( 'lightingChange', this.callback );

	ShaderMaterial.prototype.dispose.call( this );

};

export { ContourMaterial };

// EOF