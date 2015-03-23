var GRAPH_SCALE = 65536;
var ECG_HEIGHT_IN_MM = 30;
var OFFSET_SHADE_WIDTH_IN_MM = 150; // 6 seconds
var SCROLL_ADJUSTMENT = 32.5 // (8.6 seconds - 6 seconds) / 2
var NPERCENT = 0.1; // N = 10%
var avgCountOfMarkersPerECG = 200; // Avg Count Of Markers Per ECG file - Obtained from random sample ECGs
var meanValueToSubtract = GRAPH_SCALE/2;

// Stacked strip common values
var MAX_POINTS_PER_EPISODE = 9000;
var DATA_POINTS_PER_STRIP = 2400;

function ScalingFactorClass() { this.scaleFactorValue = 0; }

$.gatherQRSPeaks = function(ecgData, markerData){
	var peaks = new Array();
	
	for( i = 0; i < markerData.length; i++ ){
        // Each value is the number of millimeters from 0 for the next marker
        // There are 9000 data samples per 45 second strip which is 5 data samples
        // per millisecond ((45 * 1000)/9000) = 5
        // We will divide the number of milliseconds by 5 to determine the 
        // index in the raw data array of the r-peak data point 
        var sampleIndex = Math.round((markerData[i] / 5));
        peaks[i] = Math.abs(ecgData[sampleIndex]);
    }

	return peaks;
}

$.getMedianRPeak = function(qrsPeaks){
	var medianRPeak;

	// Sort the r-peak values in ascending order
	qrsPeaks.sort( function(a, b) {return a - b;});

	// Use the median (aka mid-point of the array) r-peak for the scaling basis
	var medianIndex = Math.floor(qrsPeaks.length/2);

	// Retrieve the median r-peak
    if( qrsPeaks.length % 2 )
        medianRPeak = qrsPeaks[medianIndex];
    else
        medianRPeak = (qrsPeaks[medianIndex-1] + qrsPeaks[medianIndex]) / 2.0;
	return medianRPeak;
}


$.determineStandardDeviation = function(ecgData, mean){
	var total = 0;
	var count = -1;
	for( i = 0; i < ecgData.length; i++ ){
		var dev = (ecgData[i] - mean); // Subtract the mean from the data point value
		total += (dev * dev); // Square the subsequent value and add it to the total
		count++;
	}

	// The standard deviation is the summed up total divide by the number of data points
	return Math.round(Math.sqrt(total / count)); 
}

$.determineScaleFactor = function(mean, stdDev, invertData){
	var scaleFactor = 0;
	
	// The high value is the absolute value of the mean, plus 3, times the standard deviation
	var highValue = (Math.abs(mean) + (5 * stdDev));
	// The scale factor is meanValueToSubtract divided by the high value, then rounded
	scaleFactor = Math.round(meanValueToSubtract / highValue);
	// Correct possibility of the scale factor resulting in 0
	if( scaleFactor == 0 ){
		scaleFactor = 1;
	}
	// Apply inversion if needed
	if( invertData == -1 ){
		scaleFactor = scaleFactor * invertData;
	}
	return scaleFactor;
}

$.scaleData = function(rawData, rawMarkerData, invertData, customZoom, scaleFactorObj, createStrips) {
	var ecgData = new Array();
	var count = 0;
	var total = 0;
	var stdDevTotal = 0;
	var topNPeaks;
	var medianRPeak;
	var qrsPeaks;
	var scaleFactor = 0;
	if( scaleFactorObj ){ 
		scaleFactor = scaleFactorObj.scaleFactorValue;
	}

	var totalRaw = 0;
	var countRaw = 0;
	for( i = 0; i < rawData.length; i++ ){
		totalRaw += rawData[i];
		countRaw++;
	}
		
	if( countRaw > 0 ) {
		var avg = totalRaw/countRaw;
	}

	if( rawData.length > 1 ){
		for( i = 0; i < rawData.length; i++ ){
			ecgData[i] = (rawData[i] - meanValueToSubtract); // Reduce each value by center point val and put it in the new array
		}
		invertData = invertData * -1; // Fix for backend processing bug. All ecg data is stored invertted and must be corrected.
		if( !scaleFactor || scaleFactor == 0 ) { // If scaling factor is 0 then calculate it

			// if R peak set is empty, pick up top n% of ecg values.
			if(rawMarkerData.length < 2) {
				//Pick up only the distinct values
				var toSortEcgData=ecgData.filter(function(itm,i,ecgData){
					return i == ecgData.indexOf(itm);
				});
				toSortEcgData.sort( function(a, b) {return b - a;});
				if(customZoom > 0) {
					var beginFrom = toSortEcgData.length * 0.2;
					var endAt = toSortEcgData.length * (0.2+customZoom);
					positiveQrsPeaks = toSortEcgData.slice(beginFrom, endAt);
				} else {
					var topNPercent = toSortEcgData.length * NPERCENT;
					positiveQrsPeaks = toSortEcgData.slice(0, topNPercent);
				}
				qrsPeaks = positiveQrsPeaks;
				medianRPeak = $.getMedianRPeak(qrsPeaks);
			}
			else {
				qrsPeaks = $.gatherQRSPeaks(ecgData, rawMarkerData);
				medianRPeak = $.getMedianRPeak(qrsPeaks);
			}
			// The scale factor will be 0.8 * meanValueToSubtract (max value) / medianRPeak
			scaleFactor = (0.8 * meanValueToSubtract) / medianRPeak;
		} // If scaling factor is 0]

		if( !scaleFactorObj ){
			scaleFactorObj = new ScalingFactorClass();	
		} 
		scaleFactorObj.scaleFactorValue = scaleFactor;

		if( createStrips == true ){
			// For greater efficiency, we will create the strips here, rather than later.
		 	var ecgStripData = new Array();
			ecgStripData[0] = new Array();
			var layerIndex = 0;
			var subIndex = 0;

			for( i = 0; i < ecgData.length; i++ ){
				if( i <= MAX_POINTS_PER_EPISODE ){ 
					if( subIndex >= DATA_POINTS_PER_STRIP ){
						layerIndex++;
						ecgStripData[layerIndex] = new Array();
						subIndex = 0;
					}
					// Adjust the value by multiplying by the scale factor.
					var scaledValue = (ecgData[i] * scaleFactor * invertData) + meanValueToSubtract;
					// Then round the value and put it back into the array.
					ecgStripData[layerIndex][subIndex] = Math.round(scaledValue);
					subIndex++;
				}
			}
			return ecgStripData;
		}	
		else{
			for( i = 0; i < ecgData.length; i++ ){
				// Adjust the value by multiplying by the scale factor.
				var scaledValue = (ecgData[i] * scaleFactor * invertData) + meanValueToSubtract;
				// Then round the value and put it back into the array.
				ecgData[i] = Math.round(scaledValue);
			}
			return ecgData;
		}	
	}
	else{
		ecgData = rawData;
		return ecgData;
	}
}


$.xAxisFormatter = function(tickValue, axis) {
	var tempTickValue = tickValue / 40;
	var returnValue;

	if( (tempTickValue % 5) === 0 && (tempTickValue / 5) != 0 ){
	// if( (tempTickValue % 5) === 0 ){
		returnValue = tempTickValue / 5;
		console.log('ReturnValue ' + returnValue);

		if( (returnValue % 6) === 0 && returnValue != 0 ){
			var padding = 10;
			if( returnValue > 10 ){
				padding = 15;
			}
			returnValue = '<div style="color: rgb(0, 0, 0); font-size: 11px; font-weight: normal; background-color: rgb(249, 252, 88); padding: 0px ' + padding + 'px 0px 3px; border: 1px solid rgb(0, 0, 0); border-top-left-radius: 2px; border-top-right-radius: 2px; border-bottom-right-radius: 2px; border-bottom-left-radius: 2px;">' + returnValue + '</div>';
		}
	}
	else{
		returnValue = '';
	}
	return returnValue;
}

$.yAxisFormatter = function(tickValue, axis) {
	return '';
}

$.generateTwoDimensionalArray = function(singleDimensionArray) {
	var genData = new Array();
	for( i = 0; i < singleDimensionArray.length; i++ ){
		var temp = new Array();
		temp.push(i);
		temp.push(singleDimensionArray[i]);
		genData.push(temp);
	}
	return genData;
}
