var scrapeData = {};
function dataLoad( log ){
  log = log || console.log.bind(console);
  var tables =  document.querySelectorAll('tbody tr td table');
  tables = Array.prototype.slice.call( tables, 5 );
  var level = scrapeData;
  var levels = [];
  log( 'Tables found: ' + tables.length );
  Array.prototype.forEach.call(tables, function( table ){
    var header = table.querySelector('th');
    header = header && header.textContent;
    log( header );
    level[header] = {};
    level = level[header];
    levels.push(header);
    var tableContents = table.querySelectorAll('th, td');
    var lastTitle;
    if(header === 'Identificação'){
      for( var i = 1; i < tableContents.length; i++){
        var tableContent = tableContents[i];
        if (tableContent.nodeName === 'TH'){
          lastTitle = tableContent.textContent;
        } else {
          level[lastTitle] = tableContent.textContent;
        }
      }
      level = scrapeData;
      levels = [];
      lastTitle = null;
      return;
    }
    if(tableContents.length === 1){
      return;
    }

    if(header === 'Nome do candidato'){
      // Go up a level in the tree
      levels.pop();
      level = null;
      for(var i = 0; i < levels.length; i++){
        if (!level){
          level = scrapeData[levels[i]];
        } else {
          level = level[levels[i]];
        }
      }
      delete level['Nome do candidato'];

      level['Candidatos'] = [];
      for(var i = 3; i < tableContents.length; i = i + 3){
        var candidato = {};
        candidato[tableContents[1].textContent] = tableContents[i].textContent;
        candidato[tableContents[2].textContent] = tableContents[i + 1].textContent;
        candidato[tableContents[3].textContent] = tableContents[i + 2].textContent;
        level['Candidatos'].push(candidato);
      }
      return;
    }

    if(header === 'Total de votos nominais' && (levels[1] === 'Senador' || levels[1] === 'Governador' || levels[1] === 'Presidente')){
      // Go up a level in the tree
      levels.pop();
      level = null;
      for(var i = 0; i < levels.length; i++){
        if (!level){
          level = scrapeData[levels[i]];
        } else {
          level = level[levels[i]];
        }
      }
      delete level['Total de votos nominais'];

      for(var i = 0; i < tableContents.length; i = i + 2){
        level[tableContents[i].textContent] = tableContents[i + 1].textContent;
      }

      // Go up a level in the tree
      levels.pop();
      level = null;
      for(var i = 0; i < levels.length; i++){
        if (!level){
          level = scrapeData[levels[i]];
        } else {
          level = level[levels[i]];
        }
      }
      return;
    }

    if(tableContents[1].nodeName === 'TH' && tableContents[2].nodeName === 'TH' && tableContents[3].nodeName === 'TH'){
      level['Candidatos'] = [];
      if(tableContents.length % 2 === 0){
        for(var i = 4; i < tableContents.length - 4; i = i + 3){
          var candidato = {};
          candidato[tableContents[1].textContent] = tableContents[i].textContent;
          candidato[tableContents[2].textContent] = tableContents[i + 1].textContent;
          candidato[tableContents[3].textContent] = tableContents[i + 2].textContent;
          level['Candidatos'].push(candidato);
        }
      } else {
        level.message = tableContents[4].textContent;
      }
      level[tableContents[tableContents.length - 4].textContent] = tableContents[tableContents.length - 3].textContent;
      level[tableContents[tableContents.length - 2].textContent] = tableContents[tableContents.length - 1].textContent;

      // Go up a level in the tree
      levels.pop();
      level = null;
      for(var i = 0; i < levels.length; i++){
        if (!level){
          level = scrapeData[levels[i]];
        } else {
          level = level[levels[i]];
        }
      }
      return;
    }
    if(tableContents.length === 10){
      // Go up a level in the tree
      levels.pop();
      level = null;
      for(var i = 0; i < levels.length; i++){
        if (!level){
          level = scrapeData[levels[i]];
        } else {
          level = level[levels[i]];
        }
      }

      var lastTitle;
      for( var i = 0; i < tableContents.length; i++){
        var tableContent = tableContents[i];
        if (tableContent.nodeName === 'TH'){
          lastTitle = tableContent.textContent;
        } else {
          level[lastTitle] = tableContent.textContent;
        }
      }

      // Go up a level in the tree
      levels.pop();
      level = null;
      for(var i = 0; i < levels.length; i++){
        if (!level){
          level = scrapeData[levels[i]];
        } else {
          level = level[levels[i]];
        }
      }
      return;
    }

  });
}
