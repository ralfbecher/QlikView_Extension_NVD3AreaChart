/*
Created by Ralf Becher - ralf.becher@tiq-solutions.de - TIQ Solutions, Leipzig, Germany
Tested on QV 11.2 SR5

TIQ Solutions takes no responsibility for any code.
Use at your own risk. 
*/

// This checks if the console is present, and if not it 
// sets it to an object with a blank function called log to
// prevent any error. Remove logging for production.
if(!window.console){ window.console = {log: function(){} }; } 

(function ($) {
	//own context, avoiding conflicts with other libraries, $=jQuery
	var _extension = 'NVD3AreaChart';
    var _path = 'Extensions/' + _extension + '/';
	var _pathLong = Qva.Remote + (Qva.Remote.indexOf('?') >= 0 ? '&' : '?') + 'public=only&name=' + _path;
	// detect WebView mode (QlikView Desktop)
	var _webview = window.location.host === 'qlikview';

	// load all libraries as array, don't use nested Qva.LoadScript() calls
	Qv.LoadExtensionScripts([_path + 'js/require.js'], 
		function () {
			require([_path + 'js/d3.v3', _path + 'js/nv.d3.min', _path + 'js/interactiveLayer', _path + 'js/utils'],
				function () {
					Qv.AddExtension(_extension,			
						function () {
							var showOthers = ((this.Layout.Text0.text.toString() * 1) > 0);
							// load css file
							Qva.LoadCSS((_webview ? _path : _pathLong) + 'css/nv.d3.min.css');
							
							// need a unique id to render chart
							var objId = this.Layout.ObjectId.replace("\\", "_"); // chart name in CSS class (eg "QvFrame Document_CH01")

							//console.log(objId);
							if (this.Data.Rows.length > 0) {
								var myDiv = $('<div />').css({
												overflow: 'hidden',
												height: this.GetHeight(),
												width: this.GetWidth()
											}).attr({
												id: objId
											}).appendTo($(this.Element).empty());


								$(document.createElementNS('http://www.w3.org/2000/svg','svg')).css({
												height: this.GetHeight(),
												width: this.GetWidth()}).appendTo(myDiv);
								
								// sizing problem in browser
								//d3.select('#'+objId).append('svg');
								
								// get key elements in QlikView order
								var listKey = [],
									dateKey = [],
									dateVal = 0;
								$.each(this.Data.Rows, function( index, row ) {
									if ($.inArray(row[0].text, listKey) === -1) {
										if (showOthers || row[0].text !== "Others")
											listKey.push(row[0].text);
									}
									dateVal = convertToUnixTime(row[1].text);
									if ($.inArray(dateVal, dateKey) === -1) {
										dateKey.push(dateVal);
									}

								});
								// Transform data set
								var data = d3.nest()
											.key(function(d) { return d.key; }).sortKeys(function(a,b) { return listKey.indexOf(a) - listKey.indexOf(b); })
											.entries(this.Data.Rows.filter(function(row){ return (showOthers || row[0].text !== "Others"); }).map(function(row){
												return {"key" : row[0].text, "x" : convertToUnixTime(row[1].text), "y" : parseFloat(row[2].data)}
											}))
											.map(function(k){
												return {"key": k.key, "values": k.values.map(function(v){return [v.x,v.y]})}
											});
								// need values for all dates for all keys
								data = assignDefaultValues(dateKey, data, 0);
								
								var colors = d3.scale.category20();
								keyColor = function(d, i) {return colors(d.key)};

								var chart;
								nv.addGraph(function() {
								  chart = nv.models.stackedAreaChart()
												.useInteractiveGuideline(true)
												.x(function(d) { return d[0] })
												.y(function(d) { return d[1] })
												.color(keyColor)
												.transitionDuration(0);

								  chart.xAxis
									  .tickFormat(function(d) { return d3.time.format('%x')(new Date(d)) });

								  chart.yAxis
									  .tickFormat(d3.format(',.2f'));

								  d3.select('#'+objId+' svg')
									.datum(data)
									.transition().duration(0)
									.call(chart)
									.each('start', function() {
										setTimeout(function() {
											d3.selectAll('#'+objId+' svg *').each(function() {
											  if(this.__transition__)
												this.__transition__.duration = 1;
											})
										  }, 0)
									  });

								  nv.utils.windowResize(chart.update);
								  return chart;
								});
								
							} else {
								this.Element.html('<p align="center"><b>No resulting rows to display..</b></p>');
							}
							
						});
			});
		});
		
		function convertToUnixTime(_text) {
			return (parseInt(_text)  - 25569)*86400*1000;
		}
		
		function findDate(_date, _arr, _offset) {
			for (var i = _offset, len = _arr.length; i < len; i++) {
				if (_arr[i][0] === _date) return i;
			}
			return -1;
		}
		
		function assignDefaultValues(dates, dataset, defaultValue) {
			var newData = [],
				sortDates = function(a,b){ return a > b ? 1 : -1; },
				sortValues = function(a,b){ return a[0] > b[0] ? 1 : -1; },
				i = -1;
				
			dates.sort(sortDates);
			$.each(dataset, function(index1, setObject){
				var newValues = [],
					lastPos = 0,
					i = -1;
				setObject.values.sort(sortValues);
				$.each(dates, function(index2, theDate){
					i = findDate(theDate, setObject.values, lastPos)
					if (i === -1) {
						newValues.push([theDate,defaultValue]);
					} else {
						newValues.push([theDate,setObject.values[i][1]]);
						lastPos = i;
					}
				});
				newData.push( { key: setObject.key, seriesIndex: setObject.seriesIndex, values: newValues });
			});
			return newData;
		}

})(jQuery);