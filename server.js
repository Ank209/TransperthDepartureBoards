const express = require('express');
const http = require('http');
const xml2js = require('xml2js');

// Setup Express server
const app = express();
const server = http.createServer(app);

app.use(express.static('public')); // serve frontend files

app.get('/station/:stationName', async (req, res) => {
  const stationName = req.params.stationName;
  console.log(`Retrieving ${stationName}`);
  const response = await fetch(`http://livetimes.transperth.wa.gov.au/LiveTimes.asmx/GetSercoTimesForStation?stationname=${stationName}`);
  const data = await response.text();
  console.log(`${stationName} Retrieved`);
  console.log(data)

  xml2js.parseString(data, (err, result) => {
    if (err) console.error(err);
    const jsonData = formatStationData(result);
    console.log('Parsed data to JSON');
    res.json(jsonData);
  });
});

const formatStationData = (rawJSON) => {
  const trains = [];
  rawJSON.SercoStationResponse.Trips[0].SercoTrip.forEach(train => {
    const platform = train.Platform[0];
    trains.push({
      cars: train.Ncar[0],
      series: train.Series?.[0] ?? undefined,
      platform: platform.substring(platform.length - 1),
      scheduledDeparture: train.Schedule[0], // Non-delayed departure time
      delay: train.Delay[0],
      delayText: train.DisplayDelayTime[0],
      cancelled: train.Cancelled[0] == 'True',
      destination: train.Destination[0],
      minutesDelayed: train.MinutesDelayTime[0],
      line: train.Line[0],
      lineFull: train.LineFull[0],
      stops: train.PatternFullDisplay[0],
      pattern: train.Patterncode[0],
      runId: train.Run?.[0],
      nextId: train.Link?.[0]
    });
  });

  return {
    stationName: rawJSON.SercoStationResponse.Name[0],
    time: rawJSON.SercoStationResponse.LastUpdate[0],
    trains
  }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
