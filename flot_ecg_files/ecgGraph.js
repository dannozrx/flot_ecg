var ECG_WIDTH_IN_MM = 1125;
var ECG_HEIGHT_ADJUSTMENT = 32;
var SPINNER_SUFFIX = '_ECGGraph_spinner';
var CHART_SUFFIX = '_chart';
var IMAGE_SUFFIX = '_ECGGraph_image';
var GRAPH_SUFFIX = '_ECGGraph';
var POINTS_BLOCK_SIZE = 63000;
var SECONDS_PER_STRIP = 45;
var POINTS_PER_SEC = 200;
var MAX_POINT_PER_PULL = 18000;
var POINTS_PER_45_SEC = 9000;
var ECG_WIDTH_IN_MM_PER_SECOND = ECG_WIDTH_IN_MM/SECONDS_PER_STRIP;
var TIME_IN_MILLIS_BETWEEN_ECG_POINTS = 5;

$.adjustSize = function(graphId, index, offset, invertData){
	var elem = $('#new_dpi_' + graphId);
	var new_dpi = elem.val();
	$.jqplotResizeECGCanvas(graphId, ECG_WIDTH_IN_MM, ECG_HEIGHT_IN_MM, new_dpi, ECG_HEIGHT_ADJUSTMENT);
	$.plotECGGraph(graphId, rawData[(index-1)], offset, invertData, 0);
	$.positionECGGraphOffset(graphId, offset, false);
}

$.prefix0 = function(valToPrepend) {
	return valToPrepend > 10? valToPrepend : ("0" + valToPrepend);
}

$.convertGivenTimeToNewTZ = function(localDateTime, destination_timezone_offset_in_minutes) {
	var targetTime = new Date(localDateTime);
	var tzDifference = targetTime.getTimezoneOffset() - destination_timezone_offset_in_minutes; 
	var offsetTime = new Date(targetTime.getTime() + tzDifference * 60 * 1000);
	//var newTZTimeYYYYMMDDHHMMSS = offsetTime.toLocaleFormat('%Y-%m-%d %H:%M:%S')
	var yyyy = offsetTime.getFullYear();
	var mm = $.prefix0(offsetTime.getMonth()+1);
	var dd = $.prefix0(offsetTime.getDate());
	var hh = $.prefix0(offsetTime.getHours());
	var mi = $.prefix0(offsetTime.getMinutes());
	var ss = $.prefix0(offsetTime.getSeconds());
	var newTZTimeYYYYMMDDHHMMSS = yyyy +"-"+ mm +"-"+ dd +" "+ hh +":"+ mi +":"+ ss;
	return newTZTimeYYYYMMDDHHMMSS;
}

$.convertGivenTimeToNewTZAsDate = function(localDateTime, destination_timezone_offset_in_minutes) {
	var targetTime = new Date(localDateTime);
	var tzDifference = targetTime.getTimezoneOffset() - destination_timezone_offset_in_minutes; 
	var offsetTime = new Date(targetTime.getTime() + tzDifference * 60 * 1000);
	return offsetTime;
}

$.convertGivenTimeToNewTZMilliseconds = function(localDateTime, destination_timezone_offset_in_minutes) {
	var targetTime = new Date(localDateTime);
	var tzDifference = targetTime.getTimezoneOffset() - destination_timezone_offset_in_minutes; 
	var offsetTime = new Date(targetTime.getTime() + tzDifference * 60 * 1000);
	return offsetTime;
}

$.fn.doesExist = function(){
    return jQuery(this).length > 0;
};

function renderECGGraph(patientId, prefix, rowId, isViewed, roleId, subseg, index, invertData, jsession, xAxisMin, xAxisMax){
	var episodeRowElementIdValue = prefix + rowId;
	var subsegmentOffset = subseg; 
    var dummyData = new Array();
	dummyData[0] = -1;

 	var graphId = prefix + rowId + '_ECGGraph'

	callBackRenderer(index, rowId, graphId, subsegmentOffset, invertData, patientId, xAxisMin, xAxisMax);
}

function callBackRenderer(index, rowId, graphId, subsegmentOffset, invertData, patientId, xAxisMin, xAxisMax) {
	rawData = testECGData;
	rawMarkerData = testMarkerData;
	var totalBlocksToMake = 1;
	var scalingFactorFromUI = $("#scaleFac_" + rowId).val();
	var scalingFactorObj = new ScalingFactorClass();
	scalingFactorObj.scaleFactorValue = scalingFactorFromUI;

	for( i = 0; i < totalBlocksToMake; i++ ){
		var dataSliceToPlot = rawData;
		var graphSectionalWidth = ECG_WIDTH_IN_MM/POINTS_PER_45_SEC * dataSliceToPlot.length;

		var extGraphId = "ne" + rowId + "_ECGGraph";

		if( i > 0 ){
			if(exEcgTd != null) $("#ne" + rowId + "_row").append(exEcgTd);
			extGraphId = "ne" + rowId + '_ECGGraph_' + i + "_cqe";
		}
		var lastCompletedTick = parseInt((POINTS_PER_45_SEC * i)/200) + 1;
		rawMarkerData[(index-1)] = []; // temporary blocking of HR markers
		$.plotECGGraph(extGraphId, dataSliceToPlot, rawMarkerData[(index-1)], subsegmentOffset, invertData, lastCompletedTick, scalingFactorObj, xAxisMin, xAxisMax);
	}
}

function showGraphTime(rowId, xPos) {
	var scrollPosn = $("#ne" + rowId + '_chart').scrollLeft();
	var totalWidth = $("#ne" + rowId + "_row").width();
	var timeWindow = Math.round(scrollPosn/totalWidth * 600);
	$("#messagearea").show();
	$("#messagearea").html("<b>Clicked at (" + xPos + ") </b>");
}

function createTdDivForECG(rowId, ecgBlockIndex, suffix) {
	var extGraphId = "ne" + rowId + '_ECGGraph_' + ecgBlockIndex + "_" + suffix;
	if( !$("#" + extGraphId).doesExist() ) {
		var exEcgDiv = document.createElement('div');
		exEcgDiv.setAttribute('id', extGraphId);
		exEcgDiv.setAttribute('class', 'ecgStrip');
		exEcgDiv.setAttribute('align', 'right');
		exEcgDiv.setAttribute('onClick', 'showGraphTime(' + rowId +')');
		exEcgDiv.setAttribute('style', 'float:left;height:210px;display:block;padding:0px');

		var exEcgHiddenInd = document.createElement('input');
		exEcgHiddenInd.setAttribute("id", "ecg_isEpisodeExtendable_" + rowId);
		exEcgHiddenInd.setAttribute("type", "hidden");

		var extGraphIdCell = "ne" + rowId + '_Cell_' + ecgBlockIndex + "_" + suffix;
		var exEcgTd = document.createElement('td');
		exEcgTd.setAttribute('id', extGraphIdCell);
		exEcgTd.setAttribute('class', 'ecgStrip');
		exEcgTd.setAttribute('align', 'right');
		exEcgTd.setAttribute('style', 'border:0px solid rgb('+ ((ecgBlockIndex+1)*20) + ',0,' + ((ecgBlockIndex+1)*20) + ');padding:0px;display:table-cell;vertical-align:top;height:150px;');
		exEcgTd.appendChild(exEcgHiddenInd);
		exEcgTd.appendChild(exEcgDiv);
		return exEcgTd;
	}
	else{
		return null;
	}
}

function getTimeStampWithPosition(episodeId, patientTimeZone, xPosition, totalScrollWidth) {
	var SCROLL_WINDOW_SPAN_IN_SEC = 8.6;
	var startEpoch = parseInt($("#ecg_startPointOnLeft_" + episodeId).val());
	var endEpoch = parseInt($("#ecg_endPointOnRight_" + episodeId).val());
	var duration = endEpoch - startEpoch;
	var scrollPosnEpochStart = (duration/totalScrollWidth) * xPosition;
	var scrollPosnEpochEnd = scrollPosnEpochStart + SCROLL_WINDOW_SPAN_IN_SEC;
	var timeSpanDateTimeStartInMS =  (startEpoch + scrollPosnEpochStart)*1000;
	var timeSpanDateTimeEndInMS =  (startEpoch + scrollPosnEpochEnd)*1000;
	return new Array(timeSpanDateTimeStartInMS, timeSpanDateTimeEndInMS);
}

function callBackRendererExtended(index, rowId, graphId, subsegmentOffset, invertData, maxSecondsAllowed) {
	if( http.readyState == 4 ) {
		if( http.status == 430 ){
			window.location = "./sessionExpired.htm";
		}
		else{
			var dummyMarkerData = new Array(0);
			var tempArray = http.responseText.split(']');
			var preECGDataFilesRaw = tempArray[0].substring(1, tempArray[0].length).trim();
			var postECGDataFilesRaw = tempArray[1].substring(1, tempArray[1].length).trim();
			var episodeOpenedCounter = tempArray[2].substring(1, tempArray[2].length).trim();
			postECGDataFilesRaw = postECGDataFilesRaw.replace(/,$/, "");
			postECGDataFilesRaw = postECGDataFilesRaw.replace(/^,/, "");
			postECGDataFilesRaw = postECGDataFilesRaw.replace(/,,/, ",");
			preECGDataFilesRaw = preECGDataFilesRaw.replace(/,$/, "");
			preECGDataFilesRaw = preECGDataFilesRaw.replace(/^,/, "");
			preECGDataFilesRaw = preECGDataFilesRaw.replace(/,,/, ",");

			var scalingFactorFromUI = $("#scaleFac_" + rowId).val();
			var scalingFactorObj = new ScalingFactorClass();
			scalingFactorObj.scaleFactorValue = scalingFactorFromUI;

			if(rowId > 0) $("#countOfEpisodesOpened").val(episodeOpenedCounter);
			else $("#countOfSearchesDone").val(episodeOpenedCounter);
			var preFileLength = 0;
			var postFileLength = 0;
			var mainGraphIdCell = "ne" + rowId + "_Cell";

			if(rowId == 0) {
				if(postECGDataFilesRaw.length + postECGDataFilesRaw.length == 0) {
					alert("Sorry, there was no data available for the queried time period.");
					$("#ecgLoading").hide();
					return false;
				}
				document.getElementById("ne0_chart").style.display = "block";
				document.getElementById("messagearea_0").style.display = "block";
				document.getElementById("graphTimeDiv_0").style.display = "block";
			}

			if (preECGDataFilesRaw.length == 0) {
				preECGDataFilesList[(index-1)] = preECGDataFilesRaw;
			}
			else {
				if(rowId == 0) MAX_POINT_PER_PULL = $("#ecgSearchDuration").val() * POINTS_PER_SEC; // If ECG search is for 180 sec, then change the MAX_POINT_PER_PULL
				preECGDataFilesList[(index-1)] = preECGDataFilesRaw.split(',');
				preFileLength = preECGDataFilesList[(index-1)].length;
				preECGDataFilesList[(index-1)] = preECGDataFilesList[(index-1)].slice(
												(preFileLength - MAX_POINT_PER_PULL), preFileLength);
				preFileLength = preECGDataFilesList[(index-1)].length;

				if(preFileLength > POINTS_BLOCK_SIZE) {
					alert("Cannot render graphs of timespan > 5 minutes");
					return false;
				}

				var alreadyLoadedPointsLeft = parseInt($("#ecg_pointCountLeft_" + rowId).val());
				var alreadyLoadedBlockCountLeft = Math.round(alreadyLoadedPointsLeft/MAX_POINT_PER_PULL);
				var durationRetrieved = preFileLength/POINTS_PER_SEC;
				var exEcgTd = createTdDivForECG(rowId, alreadyLoadedBlockCountLeft, "pre");
				var extGraphId = "ne" + rowId + '_ECGGraph_' + alreadyLoadedBlockCountLeft + "_pre";

				$("#ne" + rowId + "_row").prepend(exEcgTd);
				$("#ne" + rowId + "_row").css('top', '-30px');

				lastCompletedTick = parseInt((alreadyLoadedPointsLeft + preFileLength)/POINTS_PER_SEC);
				$.jqplotResizeECGCanvas(extGraphId, ECG_WIDTH_IN_MM_PER_SECOND * durationRetrieved, ECG_HEIGHT_IN_MM, $.jqplotGetScreenDPI(), ECG_HEIGHT_ADJUSTMENT);
				$.plotECGGraph(extGraphId, preECGDataFilesList[(index-1)], dummyMarkerData, -1, invertData, -1 * (lastCompletedTick-1), scalingFactorObj);

				$("#scaleFac_" + rowId).val(scalingFactorObj.scaleFactorValue);

				$("#ecg_pointCountLeft_" + rowId).val(alreadyLoadedPointsLeft + preFileLength);
				$("#ecg_startPointOnLeft_" + rowId).val($("#ecg_startPointOnLeft_" + rowId).val()-durationRetrieved);

				secondsOnLeft = parseInt($("#ecg_pointCountLeft_" + rowId).val())/POINTS_PER_SEC;
				if(secondsOnLeft >= maxSecondsAllowed) {
					$("#prevECG_" + rowId).attr('disabled', true);
					$("#prevECG_" + rowId).remove();
				}
				$("#ecg_DataPoints_"+rowId).val(preECGDataFilesRaw + "," + $("#ecg_DataPoints_"+rowId).val());
			}

			if (postECGDataFilesRaw.length == 0) {
				postECGDataFilesList[(index-1)] = postECGDataFilesRaw;
			}
			else {
				postECGDataFilesList[(index-1)] = postECGDataFilesRaw.split(',').slice(0, MAX_POINT_PER_PULL);
				postFileLength = postECGDataFilesList[(index-1)].length;

				var alreadyLoadedPointsRight = parseInt($("#ecg_pointCountRight_" + rowId).val());
				var alreadyLoadedBlockCountRight = Math.round(alreadyLoadedPointsRight/MAX_POINT_PER_PULL);
				var durationRetrieved = Math.round(postFileLength/POINTS_PER_SEC);

				var exEcgTd = createTdDivForECG(rowId, alreadyLoadedBlockCountRight, "post");
				if(exEcgTd != null) $("#ne" + rowId + "_row").append(exEcgTd);
				if(rowId > 0)
					lastCompletedTick = parseInt((POINTS_PER_45_SEC + alreadyLoadedPointsRight)/200) + 1;
				else
					lastCompletedTick = parseInt(alreadyLoadedPointsRight/200) + 1;
				var extGraphId = "ne" + rowId + '_ECGGraph_' + alreadyLoadedBlockCountRight  + "_post";

				$.jqplotResizeECGCanvas(extGraphId, ECG_WIDTH_IN_MM_PER_SECOND * durationRetrieved, ECG_HEIGHT_IN_MM, $.jqplotGetScreenDPI(), ECG_HEIGHT_ADJUSTMENT);
				$.plotECGGraph(extGraphId, postECGDataFilesList[(index-1)], dummyMarkerData, -1, invertData, lastCompletedTick, scalingFactorObj);
				$("#scaleFac_" + rowId).val(scalingFactorObj.scaleFactorValue);

				$("#ecg_pointCountRight_" + rowId).val(alreadyLoadedPointsRight + postFileLength);
				$("#ecg_endPointOnRight_" + rowId).val(parseInt($("#ecg_endPointOnRight_" + rowId).val())+durationRetrieved);

				secondsOnRight = parseInt($("#ecg_pointCountRight_" + rowId).val())/POINTS_PER_SEC;
				if(secondsOnRight >= maxSecondsAllowed) {
					$("#nextECG_" + rowId).attr('disabled', true);
					$("#nextECG_" + rowId).remove();
				}
				$("#ecg_DataPoints_"+rowId).val($("#ecg_DataPoints_"+rowId).val() + "," + postECGDataFilesRaw);
			}
			if(rowId == 0) {
				$("#ne0_chart").show();
				$("#messagearea_0").show();
				$("#graphTimeDiv_0").show();
			}
			$("#ecgLoading").hide();
		}
	}
}


$.positionECGGraphOffset = function(graphId, offset, showOverlay){
	// The element to control is the outer div of the graph div element.
	// We have the graph div id, so we just need to get it's parent.
	var episodeId = graphId.split("_")[0].substring(2, graphId.split("_")[0].length);
	var parentElement = $("#ne" + episodeId + "_chart");
	// Calculate the number of pixels to scroll to the left
	// We add 2.5 millimeters to the offset due to padding to the left of the graph
	// that is not taken into account by the offset value stored in the database.
	// If we scroll to here, the shaded area will be left justified within the viewing area
	var left_scroll_position = $.jqplotMetricToPixels((offset + 2.5), $.jqplotGetScreenDPI());
	// The view port is 8.6 seconds and the shaded area is 6 seconds.
	// So, we will take the difference and adjust the scroll position
	var adjusted_scroll_position = left_scroll_position - $.jqplotMetricToPixels(SCROLL_ADJUSTMENT, $.jqplotGetScreenDPI());
	parentElement.scrollLeft(adjusted_scroll_position);
	
	// Now we need to reposition the loading overlay
	if( showOverlay ){
		var overlayElement = $('#' + graphId + '_spinner');
		if( overlayElement.length ){
			var currOffset = overlayElement.offset();
			currOffset.left += (adjusted_scroll_position - 10);
			overlayElement.offset(currOffset);
		}
	}
}

$.positionECGImageOffset = function(imageId, offset){
	// The element to control is the outer div of the graph div element.
	// We have the image id, so we just need to get it's parent, which is the div, then get it's parent.
	var divElement = $('#' + imageId).parent();
    var parentElement = divElement.parent();
    var offsetInSeconds = offset / $.jqplotMillimetersPerSecond();
	var pixPerSec = 6770 / SECONDS_PER_STRIP;
	// If we scroll to here, the shaded area will be left justified within the viewing area
	var left_scroll_position = pixPerSec * offsetInSeconds; 
	// The view port is 8.6 seconds and the shaded area is 6 seconds.
	// So, we will take the difference and adjust the scroll position
	var adjusted_scroll_position = left_scroll_position - (pixPerSec * 2.3);

	parentElement.scrollLeft(adjusted_scroll_position);
}

$.plotECGGraph = function(graphId, csvData, csvMarkerData, shadeStartSeconds, invertData, lastCompletedTick, scalingFactorObj, xAxisMin, xAxisMax){
 	var x_axis_data_points = csvData.length;
 	var customzoom = 0;
 	var scaledData = $.scaleData(csvData, csvMarkerData, invertData, customzoom, scalingFactorObj, false);
 	var renderData = $.generateTwoDimensionalArray(scaledData);

	$.plot('#' + graphId, [{ data: renderData, color: '#000000', lines:{ lineWidth: 1 }, shadowSize: 0 }], 
	{
		grid:{
			color: '#FFC0CB',
			borderWidth: 1,
			borderColor: '#FFC0CB',
			backGroundColor: '#FFFFFF',
			clickable: false,
			hoverable: false,
			autoHighlight: false,
			markings: function (axes) {
			    var markings = [];
			    if( shadeStartSeconds >= 0 ){
	        		markings.push({ color: "#D7E7FF", xaxis: { from: (shadeStartSeconds * 200), to: ((shadeStartSeconds + 6) * 200) } });
			    }
			    for(var x = 1; x < 30; x++ ){
			        markings.push({ color: "#FFC0CB", lineWidth: 1, yaxis: { from: (x * 2184.5), to: (x * 2184.5) } });
			    }
				//for( var x = 8; x < axes.xaxis.max; x +=8 ){
				for( var x = (xAxisMin + 8); x < xAxisMax; x += 8 ){
					//console.log('X: ' + x);
					markings.push({ color: "#FFC0CB", lineWidth: 1, xaxis: { from: x, to: x } });
				}
			    for( var x = 1; x < 6; x++ ){
			        markings.push({ color: "#858687", lineWidth: 1.5, yaxis: { from: (x * 10922), to: (x * 10922) } });
			    }
 				//for (var x = 40; x < axes.xaxis.max; x += 40 ){
 				for( var x = (xAxisMin + 40); x < xAxisMax; x += 40 ){
        			markings.push({ color: "#858687", lineWidth: 1.5, xaxis: { from: x, to: x } });
        		}
			    return markings;
			}			
		},
		xaxes: [{ 
			min: xAxisMin, 
			max: xAxisMax, 
			tickSize: 8, 
			font:{
				size: 11,
				lineheight: 13,
				style: "normal",
				weight: "normal",
			 	family: "sans-serif",
			 	variant: "small-caps",
			 	color: "#000000"
			},
			tickFormatter: $.xAxisFormatter
		}],
		yaxes: [{ 
			min: 0, 
			max: 65536, 
			tickSize: 2184,
			tickFormatter: $.yAxisFormatter
		}]
	});

}

$.fn.restrict = function( chars ) {
	return this.keydown(function(e) {
		var found = false, i = -1;
		while(chars[++i] && !found) {
			found = chars[i] == String.fromCharCode(e.which).toLowerCase() || chars[i] == e.which;
		}
		found || e.preventDefault();
	});
};

function setCorrectedTimeoffset (){
	$.getJSON("ajax/getPatientTimeOffsets.htm",{
		patientTimeZone:$("#patientTimezone").val(),
		ecg_date:$("#ecg_date").val()
	},
	function(data) {
		$("#patientTimezoneOffsetInSec").val(data.timezoneOffsetInSeconds);
		$("#patientTimezoneOffsetHHMM").val(data.timezoneOffsetHHMM);
	});
}
