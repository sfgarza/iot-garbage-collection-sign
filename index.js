#!/usr/bin/env node
const argv = require('yargs').argv
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var request = require('request');
var recycleLED = new Gpio(17, 'out'); //use GPIO pin 4, and specify that it is output
var trashLED = new Gpio(18, 'out'); //use GPIO pin 4, and specify that it is output
var button = new Gpio(4, 'in', 'both');

if( argv.streetnum && argv.streetname ){
var postdata = 	{ 
        apikey: argv.apikey, 
	streetnumber: argv.streetnum, 
	streetname : argv.streetname, 
	streetsuffix: argv.streetsuffix 
};

request.post({url:'https://us-central1-iot-home-215123.cloudfunctions.net/trash-schedule', form: postdata },function(err,res,body){
  const schedule    = JSON.parse( body );         // Trash schedule recieved from cloud function.
  if( !err && res.statusCode == 200){
    var maybe_exit = true
    var trashDate   = new Date( schedule.trash );
   // var trashDate   = new Date( '05/25/2019' );
    var recycleDate = new Date( schedule.recycle );
    var tomorrow = new Date();                   // Get todays date
   // var recycleDate   = new Date( '05/24/2019' );
    tomorrow.setDate( tomorrow.getDate() + 1 );  // And set it to tomorrow by adding 1 day.
    
    console.log( "Trash: " + trashDate.getMonth() + '/' + trashDate.getDate() );
    console.log( "Recycle: " + recycleDate.getMonth() + '/' + recycleDate.getDate() );
    console.log( "tomorrow: " + tomorrow.getMonth() + '/' + tomorrow.getDate() );
    
    if( tomorrow.getMonth() == trashDate.getMonth() ){
      if( tomorrow.getDate() == trashDate.getDate() ){
        console.log('Trash Day tomorrow');
        maybe_exit = false;
        var trashBlink = setInterval(function(){ blinkLED( trashLED ) }, 1500); //run the blinkLED function every 250ms
      }
      else{
        console.log('No Trash');
      }
    }
    if( tomorrow.getMonth() == recycleDate.getMonth() ){
      if( tomorrow.getDate() == recycleDate.getDate() ){
        console.log('Recycle Day tomorrow');
        maybe_exit = false;
        var recycleBlink = setInterval(function(){ blinkLED( recycleLED ) }, 1500); //run the blinkLED function every 250ms
      }
      else{
        console.log('No Recycling');
      }
    }
    if( maybe_exit === true ){
      endBlink();
    }
  }else{
      // Quickly alternate lights to indicate err.
      var trashBlink = setInterval( function(){blinkLED(trashLED)},150 );
      setTimeout(function () {
	  console.error(schedule.err);
          var recycleBlink = setInterval(function(){ blinkLED( recycleLED ) }, 150); //run the blinkLED function every 250ms
      }, 150)
  }
});

}else{
 console.error('Missing required arguments');
 endBlink();
}
function blinkLED( which ) { //function to start blinking
  if( typeof which !== 'undefined' ){
    if (which.readSync() === 0) { //check the pin state, if the state is 0 (or off)
      which.writeSync(1); //set pin state to 1 (turn LED on)
    } else {
      which.writeSync(0); //set pin state to 0 (turn LED off)
    }
  }
}

function endBlink() { //function to stop blinking
    if( typeof trashBlink !== 'undefined' ){
      clearInterval(trashBlink); // Stop blink intervals
    }
    if( typeof recycleBlink !== 'undefined' ){
      clearInterval(recycleBlink); // Stop blink intervals
    }
    trashLED.writeSync(0); // Turn LED off
    trashLED.unexport(); // Unexport GPIO to free resources
    recycleLED.writeSync(0); // Turn LED off
    recycleLED.unexport(); // Unexport GPIO to free resources
    button.unexport(); // Turn LED off
    process.exit(0)
}

var buttonWatch = button.watch(function(err,value){
	endBlink();
});

