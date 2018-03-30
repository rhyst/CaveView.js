#define saturate(a) clamp( a, 0.0, 1.0 )

const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)

const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );

float unpackRGBAToFloat( const in vec4 v ) {
	return dot( v, UnpackFactors );
}

uniform float minX;
uniform float minY;
uniform float minZ;

uniform float scaleX;
uniform float scaleY;
uniform float rangeZ;

uniform sampler2D depthMap;
uniform float datumShift;
uniform vec3 uLight;

varying vec3 vColor;
varying float vDepth;

void main() {

#ifdef SURFACE

	vec3 sNormal = normalMatrix * normal;

	float dotNL = dot( normalize( sNormal ), uLight );

	vColor = saturate( dotNL ) * color + vec3( 0.3, 0.3, 0.3 );

#else

	vColor = color;

#endif

	vec2 terrainCoords = vec2( ( position.x - minX ) * scaleX, ( position.y - minY ) * scaleY );
	float terrainHeight = unpackRGBAToFloat( texture2D( depthMap, terrainCoords ) );

	vDepth = terrainHeight * rangeZ + datumShift + minZ - position.z;

	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}