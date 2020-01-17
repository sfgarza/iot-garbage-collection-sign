#!/usr/bin/env node
/**
 * This node script will make an API call that checks my local garbage collection schedule. 
 * If Trash or Recycling is being collected the next day their corresponding light will blink
 * until the button is pressed to reset it
 * Usage:
 * POSTURL=https://yourcloudfunctionurl.net/trash-schedule node index.js --streetnum=123 --streetname=Main --streetsuffix=St --apikey=XXXXXXXXX
 * 
 * Suggested Crontab:
 * 00 17 * * * /usr/local/bin/node POSTURL=https://yourcloudfunctionurl.net/trash-schedule /home/pi/iot-garbage-schedule/index.js  --streetnum=123 --streetname=Main --streetsuffix=St --apikey=XXXXXXXXX >/dev/null 2>&1
 */
const argv = require('yargs').argv 
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var request = require('request');
var recycleLED = new Gpio(17, 'out'); //use GPIO pin 4, and specify that it is output
var trashLED = new Gpio(18, 'out'); //use GPIO pin 4, and specify that it is output
var button = new Gpio(4, 'in', 'both');
const posturl = process.env.POSTURL;

/**
 * Blink LED of your choosing
 * 
 * @param  {Gpio} which Initialized output Gpio pin
 * @return void
 */
function blinkLED( which ) { //function to start blinking
  if( typeof which !== 'undefined' ){
    if (which.readSync() === 0) { //check the pin state, if the state is 0 (or off)
      which.writeSync(1); //set pin state to 1 (turn LED on)
    } else {
      which.writeSync(0); //set pin state to 0 (turn LED off)
    }
  }
}

/**
 * Turn off Lights, unset pins, & exit program.
 * @return void
 */
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

// Turn off blinking lights & exit when button is pressed.
var buttonWatch = button.watch(function(err,value){
	endBlink();
});

// Check if required fields have been supplied.`
if( argv.streetnum && argv.streetname ){
  // Set request body data using inputs.
  var postdata = 	{ 
    apikey: argv.apikey, 
    streetnumber: argv.streetnum, 
    streetname : argv.streetname, 
    streetsuffix: argv.streetsuffix 
  };
  
  // Make request to Google Cloud function that scrapes the San Diego trash collection website.
  request.post({url: posturl, form: postdata },function(err,res,body){
    const schedule    = JSON.parse( body );  // Weekly trash collection schedule.
    
    if( !err && res.statusCode == 200){
      var maybe_exit = true
      var trashDate   = new Date( schedule.trash );
      var recycleDate = new Date( schedule.recycle );
      var tomorrow = new Date();                   // Get todays date
      tomorrow.setDate( tomorrow.getDate() + 1 );  // And set it to tomorrow by adding 1 day.
      
      console.log( "Trash: " + trashDate.getMonth() + '/' + trashDate.getDate() );
      console.log( "Recycle: " + recycleDate.getMonth() + '/' + recycleDate.getDate() );
      console.log( "tomorrow: " + tomorrow.getMonth() + '/' + tomorrow.getDate() );
      
      // Blink trash light if tomorrow is trash day.
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
      // Blink recycle light if tomorrow is recycle day.
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
      // Exit program if its not trash day yet
      if( maybe_exit === true ){
        endBlink();
      }
    }else{
      // Quickly alternate blinking lights to indicate error.
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