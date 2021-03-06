import { Popup } from './Popup.js';

function StationPopup ( ctx, station, survey, depth, formatter, showDistance, warnings ) {

	Popup.call( this, ctx );

	const position = survey.getGeographicalPosition( station.p );

	var name = station.getPath();
	var long = false;
	var tmp;
	var lines = null;

	// reduce name length if too long

	while ( name.length > 20 ) {

		tmp = name.split( '.' );
		tmp.shift();

		name = tmp.join( '.' );
		long = true;

	}

	var distance;

	if ( showDistance ) {

		distance = station.distance !== Infinity ? Math.round( station.distance ) : 'unconnected';

	} else {

		distance = null;

	}

	if ( long ) name = '...' + name;

	this.addLine( name );

	if ( warnings && station.messageText !== undefined ) {

		this.addLine( station.messageText );

	} else {

		if ( formatter !== undefined ) {

			lines = formatter( survey.CRS, position, depth, distance );

		}

		if ( lines !== null ) {

			for ( let i = 0; i < lines.length; i++ ) {

				this.addLine( lines[ i ] );

			}

		} else {

			this.addLine( 'x: ' + Math.round( position.x ) + ' m, y: ' + Math.round( position.y ) + ' m' ).addLine( 'z: ' + Math.round( position.z ) + ' m' );

			if ( depth !== null ) this.addLine( 'depth from surface: ' + Math.round( depth ) + ' m' );

			if ( showDistance ) {

				this.addLine( 'distance: ' + distance + '\u202fm' );

			}

		}

	}

	this.finish();

	this.position.copy( station.p );

	return this;

}

StationPopup.prototype = Object.create( Popup.prototype );

export { StationPopup };