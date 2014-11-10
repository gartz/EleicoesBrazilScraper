EleicoesBrazilScraper
=====================

Scraper to get all information about results in the Brazilian elections

To run, you need to install casperjs

Running:
```
casperjs eleicoes2014.js
```

Run from a determined position:
```
casperjs eleicoes2014.js --from=158,SC
```
This example will run from second turn in SC

Commands
--------

* **from**: comma separeted IDs where to begin the scraping.
* **to**: comma separeted IDs where it should stop scraping.

How it works
------------

It will create a folder called `pages` with all the tree of screaped pages, all scraped pages will save the HTML, PNG and a JSON with it data.

The filename will be the date that you runned tha scraper. If something change you have a register of it.

Install
-------

Install [casperjs](http://casperjs.org/).
Clone the project `git clone https://github.com/gartz/EleicoesBrazilScraper.git`
Run it: `casperjs eleicoes2014.js`

Next steps
----------

* Create a script that read the JSON and saves in a RDBMS.
* Create a server that allow API consulting the content with query filters.

