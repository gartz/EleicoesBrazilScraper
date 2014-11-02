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

function SelectInput(id, name, parent){
  this.id = id;
  this.name = name;
  this.value = ''; // current selected option value
  this.values = {}; // possible values to navigate
  this.first = null; // The first value
  this.current = null;
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

function Boletim(){
  // Data abot the boletim
}

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
    previous = current;
    input.values[value] = current;
  }.bind(this) );
}

casper.start( initialPage );

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
};

function scrapePage(){
  var scrapeData = this.evaluate( function (){
    dataLoad();
    var stringifyScrapeData = JSON.stringify( scrapeData );
    __utils__.echo(stringifyScrapeData);
    return scrapeData;
  });

  var filename = getFilename( getFormValues.call(this) );
  fs.write( filename + '.json', utils.serialize( scrapeData ), 'w' );

  data.push( scrapeData );

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

var lastInput;
function recursiveScraper(){
  pageChanged.apply( this );

  // select first input to fill all of then
  fillAllInputs.call( this );

  var input;
  for( var k in inputs ) if( inputs.hasOwnProperty(k) ){
    this.echo( 'Input: ' + inputs[k].id + ' Current value: ' + inputs[k].value );
    if( !input && ( !inputs[k].value || inputs[k].value == '0' ) ){
      input = inputs[k];
    }
  }
  if( !input ){
    this.echo( 'End of the tree search.' );

    var regionHeaderLength = this.evaluate(function (){
      return document.querySelectorAll('.t15RegionHeader').length;
    });

    this.log( 'regionHeadersLength: ' + regionHeaderLength, 'info' );
    if( regionHeaderLength === 1 ){
      this.evaluate( formEvaluator, 'PESQUISAR' );

      this.then( recursiveScraper );
      return;
    }

    // Page ready to be scraped:
    scrapePage.call( this );

    // Move to the next page:
    this.echo( 'Moving to the next... ' );
    moveNext.call( this, lastInput );

    if( !lastInput.current ){
      while( !lastInput.current && lastInput.parent ){
        lastInput = lastInput.parent;
      }
      this.echo( 'Moving to the parent...' );
      this.echo( 'Input: ' + lastInput.id );
      while( lastInput && moveNext.call( this, lastInput ) ){
        lastInput = lastInput.parent;
      }
    }

    return;
  }
  if ( !input.first ){
    this.log( 'No values found in this input ['+ input.id +'], updating last input value', 'info');
    input = input.parent;
  }
  this.echo( 'Selected input: ' + input.id );
  this.echo( 'First value: ' + input.first.value );
  input.current = input.first;
  lastInput = input;

  var formData = {};
  formData[ input.name ] = input.first.value;
  this.fill( 'form', formData );
  this.evaluate( formEvaluator, input.id );

  this.then( recursiveScraper );
}

casper.then(function () {
  this.echo('Reseting scraper to start the search');
  fillAllInputs.apply(this);

  // Reset the scraper status
  var input = inputs.getFirst().children;
  var formData = {};
  formData[ input.name ] = input.first.value;
  this.fill( 'form', formData );
  this.evaluate( formEvaluator, input.id );
  this.echo( 'Evaluate form change: ' + input.id + ' TO: ' + input.first.value );

  this.then( recursiveScraper );
});

casper.run(function() {
  fs.write( 'data.json', JSON.stringify( data ) , 'w' );
  this.echo('Done.').exit();
});
