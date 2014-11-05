var fs = require('fs');
var utils = require('utils');
var casper = require('casper').create({
  pageSettings: {
    loadImages: true,
    loadPlugins: false,
    localToRemoteUrlAccessEnabled: true
  },
  viewportSize: {
    width: 1280,
    height: 720
  },
  clientScripts: [
    'scraper.js'
  ],
  verbose: true,
  logLevel: "warning"
});

var initialPage = 'http://inter04.tse.jus.br/ords/eletse/f?p=20103:1:2008412469511874';
var cliOptions = {
  url: casper.cli.options.url || initialPage,
  from: String.prototype.split.call( casper.cli.options.from || '', ',' ),
  to: String.prototype.split.call( casper.cli.options.to || '', ',' )
};

function SelectInput(id, name, parent){
  this.id = id;
  this.name = name;
  this.value = ''; // current selected option value
  this.values = {}; // possible values to navigate
  this.first = null; // The first value
  this.current = null;
  this.from = null; // Where is the begin value
  this.to = null; // Where is the finish value
  this.parent = parent || null; // Parent input
  this.children = null; // Children input
  if (this.parent){
    this.parent.children = this;
  }
  // Number of values to ignore in the begin
  this.shiftValues = 1;
}

function InputList(){
  this['P0_X_TURNO'] = new SelectInput('P0_X_TURNO', 'p_t01');
  this['P0_X_TURNO'].shiftValues = 0;
  this['P0_X_UF'] = new SelectInput('P0_X_UF', 'p_t02', this['P0_X_TURNO'] );
  this['P0_X_MUN'] = new SelectInput('P0_X_MUN', 'p_t03', this['P0_X_UF'] );
  this['P0_X_ZONA'] = new SelectInput('P0_X_ZONA', 'p_t04', this['P0_X_MUN'] );
  this['P0_X_SECAO'] = new SelectInput('P0_X_SECAO', 'p_t05', this['P0_X_ZONA'] );
}
InputList.prototype.getFirst = function (){
  return this['P0_X_TURNO'];
};
InputList.prototype.getLast = function (){
  return this['P0_X_SECAO'];
};

var data = [];
var inputs = new InputList();

function getFilename( form ){
  var currentTime = new Date();
  return [
    'pages/',
    'step-' + form.p_flow_step_id + '/',
    form.p_t01 + '/',
    form.p_t02 + '/',
    form.p_t03 + '/',
    form.p_t04 + '/',
    form.p_t05 + '/',
    currentTime.getFullYear(),
    '-' + ( currentTime.getMonth() + 1 ),
    '-' + currentTime.getDate(),
  ].join('');
}

function getFormValues(){
  // Get form values
  var formValues = this.getFormValues( 'form' );
  // Print form values
  for (var k in formValues){
    this.log( 'Form "' + k + '" has value: ' + formValues[k], 'info' );
  }
  return formValues;
}

function pageChanged(){
  this.echo( 'Open: ' + this.getCurrentUrl() );
  // Define the filename
  var filename = getFilename( getFormValues.call(this) );
  fs.write( filename + '.html', this.getPageContent(), 'w' );
  this.captureSelector( filename + '.png', 'body' );
}

function fillInput( input ){
  // Set the current value based on formValues
  input.value = getFormValues.call(this)[ input.name ];

  // Select the options by type
  var options = this.getElementsInfo( '#' + input.id + ' option' );
  if (!options || options.length === 0){
    this.log( 'No ' + input.id + ' found.', "error" );
    return;
  }
  this.echo( 'Detect ' + input.id + ': ' + input.value );
  var previous = null;
  var shiftValues = input.shiftValues;
  this.log( 'Options founded: ' + options.length, 'info' );
  options.forEach( function (option) {
    var value = option.attributes.value;
    this.log( 'Addeding ' + input.id + ': ' + value, 'info' );
    if (shiftValues > 0){
      shiftValues--;
      this.log( 'value scaped...', 'info' );
      return;
    }
    if (input.values[value]){
      // Don't repeat values!
      return;
    }
    var current = {
      value: value,
      next: null
    };
    // first element
    if (!previous){
      input.first = current;
    } else {
      previous.next = current;
    }

    // Override the first value when there is setting to start from
    // Check if the parent input is also on the from value
    if( input.from && current.value == input.from ) {
      if( !input.parent || input.parent.current && input.parent.from == input.parent.current.value ){
        input.first = current;
      }
    }

    previous = current;
    input.values[value] = current;
  }.bind(this) );

  // Update current input
  input.current = input.current || input.first;
  if (!input.current) {
    return;
  }
  while( input.current.value !== input.value){
    input.current = input.current.next;
    if( !input.current ){
      this.log( 'Input value ' + input.value + ' not found!', 'error' );
      input.value = input.first && input.first.value || null;
      input.current = input.first;
      break;
    }
  }
}

casper.start( cliOptions.url );

function fillAllInputs() {
  // Add all the values inside the fields founded to their object input representation

  var input = inputs.getFirst();
  while( input ){
    // Fill all inputs
    this.echo( 'Updating input data from: ' + input.id );
    fillInput.call( this, input );
    input = input.children;
  }
}

function formEvaluator( formId ){
  // Do a submit call inside the page
  doSubmit( formId );
}

function scrapePage(){
  var scraperData = {};

  scraperData = this.evaluate( function (){
    dataLoad( __utils__.echo );
    var stringifyScrapeData = JSON.stringify( scrapeData );
    __utils__.log( stringifyScrapeData, 'info' );
    return scrapeData;
  });

  var filename = getFilename( getFormValues.call(this) );
  fs.write( filename + '.json', utils.serialize( scraperData ), 'w' );

  data.push( scraperData );

  this.echo( 'Page scraped =====================================================' );
}

function moveNext( input ){
  if (!input.current){
    return;
  }
  input.current = input.current.next;
  if (!input.current){
    return true;
  }
  this.echo( 'Selected input: ' + input.id );
  this.echo( 'Next value: ' + input.current.value );

  var formData = {};
  formData[ input.name ] = input.current.value;
  this.fill( 'form', formData );
  this.evaluate( formEvaluator, input.id );

  this.then( recursiveScraper );
  return;
}

function updateForm( input, value ){
  var formData = {};
  formData[ input.name ] = value;
  this.fill( 'form', formData );
  this.evaluate( function( formID, formValue){
    var selecteds = document.querySelectorAll('#' + formID + ' [selected]');
    Array.prototype.forEach.call( selecteds, function (el){
      el.removeAttribute('selected');
    });
    var el = document.querySelector( '#' + formID + ' [value="' + formValue + '"]' );
    el.setAttribute('selected', 'selected');
  }, input.id, value );
  this.evaluate( formEvaluator, input.id );
  this.echo( 'Evaluate form change: ' + input.id + ' TO: ' + value );

  while( input ){
    input.values = [];
    input.value = null;
    input.current = null;
    input.first = null;
    input = input.children;
  }

  this.wait( 150, function (){
    this.then( recursiveScraper );
  });
}

function recursiveScraper(){
  pageChanged.apply( this );

  // select first input to fill all of then
  fillAllInputs.call( this );

  var input = inputs.getFirst();

  while( input.value && input.value != '0' && ( input.value in input.values ) ){
    if( !input.children ){
      break;
    }
    input = input.children;
  }
  if( !input.value || input.value == '0' || !( input.value in input.values ) ){
    if( !input.first ){
      updateForm.call( this, input.parent, input.parent.value );
      return;
    }
    updateForm.call( this, input, input.first.value );
    return;
  }
  var regionHeaderLength = this.evaluate(function (){
    return document.querySelectorAll('.t15RegionHeader').length;
  });
  this.log( 'regionHeadersLength: ' + regionHeaderLength, 'info' );
  if( regionHeaderLength === 1 ){
    this.evaluate( formEvaluator, 'PESQUISAR' );
    this.wait( 150, function (){
      this.then( recursiveScraper );
    });
    return;
  }

  // Page ready to be scraped:
  scrapePage.call( this );

  // Move to the next page:
  this.echo( 'Moving to the next... ' );

  if (input.current.next){
    // Stop when 'to' value was scraped
    if( input.current.value == input.to ) return;
    updateForm.call( this, input, input.current.next.value );
  } else {
    var parentInput = input.parent;
    while( parentInput && !parentInput.current.next ){
      parentInput = parentInput.parent;
    }
    if (!parentInput){
      return;
    }
    updateForm.call( this, parentInput, parentInput.current.next.value );
  }
}

casper.then(function () {
  debugger;

  this.echo('Reseting scraper to start the search');

  var input = inputs.getFirst();

  // Fill from foreced values in the inputs
  cliOptions.from.forEach(function (option) {
    if( option === '' ) return;
    input.from = option;
    input = input.children;
  });

  input = inputs.getFirst();

  // Fill to foreced values in the inputs
  cliOptions.to.forEach(function (option) {
    if( option === '' ) return;
    input.to = option;
    input = input.children;
  });

  input = inputs.getFirst();

  fillAllInputs.apply(this);

  // Reset the scraper status
  updateForm.call( this, input, input.first.value );
});

casper.run(function() {
  fs.write( 'data.json', JSON.stringify( data ) , 'w' );
  this.echo('Done.').exit();
});
